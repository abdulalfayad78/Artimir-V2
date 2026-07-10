from __future__ import annotations

import queue
import threading
import time
from collections.abc import Callable
from contextlib import nullcontext

from app.config import MotorServiceSettings
from app.protocol import ParsedLine, ParsedLineKind, is_command_response, parse_arduino_line


class MotorSerialError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.safe_message = message


class SerialTransport:
    """Hardware transport with one continuous serial reader thread."""

    mode = "hardware"

    def __init__(
        self,
        settings: MotorServiceSettings,
        event_sink: Callable[[ParsedLine], None] | None = None,
    ):
        self.settings = settings
        self.event_sink = event_sink
        self.connected = False
        self._serial = None
        self._reader_thread: threading.Thread | None = None
        self._stop_reader = threading.Event()
        self._response_queue: queue.Queue[ParsedLine] = queue.Queue()
        self._command_lock = threading.Lock()
        self._write_lock = threading.Lock()
        self._pending_lock = threading.Lock()
        self._pending_command: str | None = None
        self._pending_response_kinds: set[ParsedLineKind] | None = None

    def start(self) -> None:
        if not self.settings.serial_port:
            raise MotorSerialError(
                "SERIAL_PORT_NOT_CONFIGURED",
                "Hardware mode requires MOTOR_SERIAL_PORT.",
            )

        try:
            import serial
        except ImportError as exc:
            raise MotorSerialError(
                "PYSERIAL_UNAVAILABLE",
                "pyserial is required in hardware mode.",
            ) from exc

        try:
            self._serial = serial.Serial(
                port=self.settings.serial_port,
                baudrate=self.settings.serial_baudrate,
                timeout=self.settings.serial_timeout_seconds,
            )
        except Exception as exc:
            raise MotorSerialError(
                "SERIAL_CONNECTION_FAILED",
                "Unable to open the configured Arduino serial port.",
            ) from exc

        self.connected = True
        self._stop_reader.clear()
        self._reader_thread = threading.Thread(
            target=self._read_loop,
            name="artimir-motor-serial-reader",
            daemon=True,
        )
        self._reader_thread.start()

    def _read_loop(self) -> None:
        while not self._stop_reader.is_set():
            try:
                line = self._serial.readline() if self._serial else b""
            except Exception:
                self.connected = False
                if self.event_sink:
                    self.event_sink(
                        parse_arduino_line("ERR:SERIAL_DISCONNECTED"),
                    )
                break

            self._handle_parsed_line(parse_arduino_line(line))

    def _handle_parsed_line(self, parsed: ParsedLine) -> None:
        if parsed.kind == ParsedLineKind.empty:
            return

        with self._pending_lock:
            pending_command = self._pending_command
            pending_response_kinds = self._pending_response_kinds

        if (
            pending_command
            and
            pending_response_kinds
            and (
                parsed.kind in pending_response_kinds
                or parsed.kind == ParsedLineKind.error
            )
        ):
            self._response_queue.put(parsed)
            return

        if self.event_sink:
            self.event_sink(parsed)

    def _send_command(
        self,
        command: str,
        expected_kinds: set[ParsedLineKind],
        *,
        timeout_seconds: float | None = None,
        use_command_lock: bool = True,
    ) -> ParsedLine:
        if not self.connected or self._serial is None:
            raise MotorSerialError(
                "SERIAL_DISCONNECTED",
                "Arduino serial transport is disconnected.",
            )

        command_context = self._command_lock if use_command_lock else nullcontext()

        with command_context:
            try:
                with self._pending_lock:
                    self._pending_command = command
                    self._pending_response_kinds = set(expected_kinds)

                self._write_command(command)
            except Exception as exc:
                with self._pending_lock:
                    self._pending_command = None
                    self._pending_response_kinds = None
                self.connected = False
                raise MotorSerialError(
                    "SERIAL_WRITE_FAILED",
                    "Unable to write command to Arduino.",
                ) from exc

            try:
                return self._wait_for_response(
                    command,
                    expected_kinds,
                    timeout_seconds or self.settings.command_timeout_seconds,
                )
            finally:
                with self._pending_lock:
                    if self._pending_command == command:
                        self._pending_command = None
                        self._pending_response_kinds = None

    def _write_command(self, command: str) -> None:
        with self._write_lock:
            self._serial.write(f"{command}\n".encode("ascii"))
            self._serial.flush()

    def _wait_for_response(
        self,
        command: str,
        expected_kinds: set[ParsedLineKind],
        timeout_seconds: float,
    ) -> ParsedLine:
        deadline = time.monotonic() + timeout_seconds

        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise MotorSerialError(
                    "COMMAND_TIMEOUT",
                    f"Arduino did not answer {command} before timeout.",
                )

            try:
                response = self._response_queue.get(timeout=remaining)
            except queue.Empty as exc:
                raise MotorSerialError(
                    "COMMAND_TIMEOUT",
                    f"Arduino did not answer {command} before timeout.",
                ) from exc

            if response.kind == ParsedLineKind.error:
                raise MotorSerialError(
                    "ARDUINO_ERROR",
                    response.message or "Arduino returned an error.",
                )

            if response.kind in expected_kinds:
                return response

            if self.event_sink:
                self.event_sink(response)

    def status(self) -> ParsedLine:
        response = self._send_command(
            "STATUS",
            {ParsedLineKind.position},
        )
        if response.kind.value != "position":
            raise MotorSerialError(
                "INVALID_STATUS_RESPONSE",
                "Arduino returned an invalid STATUS response.",
            )
        return response

    def stop(self) -> ParsedLine:
        response = self._send_command(
            "STOP",
            {ParsedLineKind.ok_stopped},
            use_command_lock=False,
        )
        if response.kind.value != "ok_stopped":
            raise MotorSerialError(
                "INVALID_STOP_RESPONSE",
                "Arduino returned an invalid STOP response.",
            )
        return response

    def move_to(self, target_mm: float) -> ParsedLine:
        command = f"MOVE:{target_mm:.2f}"
        with self._command_lock:
            try:
                with self._pending_lock:
                    self._pending_command = command
                    self._pending_response_kinds = {
                        ParsedLineKind.ok_moving_to,
                        ParsedLineKind.event,
                    }

                self._write_command(command)
                movement_ack = self._wait_for_move_ack(command, target_mm)
                self._wait_for_arrival(command)
                return movement_ack
            except MotorSerialError as exc:
                if exc.code == "COMMAND_TIMEOUT":
                    try:
                        self.stop()
                    except Exception:
                        pass
                    raise MotorSerialError(
                        "MOVEMENT_TIMEOUT",
                        "Motor movement timed out before EVENT:ARRIVED.",
                    ) from exc
                raise
            except Exception as exc:
                raise MotorSerialError(
                    "MOVE_FAILED",
                    "Unable to complete the motor movement.",
                ) from exc
            finally:
                with self._pending_lock:
                    if self._pending_command == command:
                        self._pending_command = None
                        self._pending_response_kinds = None

    def _wait_for_move_ack(self, command: str, target_mm: float) -> ParsedLine:
        while True:
            response = self._wait_for_response(
                command,
                {ParsedLineKind.ok_moving_to, ParsedLineKind.event},
                self.settings.command_timeout_seconds,
            )

            if response.kind == ParsedLineKind.event:
                if response.message == "ARRIVED":
                    if self.event_sink:
                        self.event_sink(response)
                    continue
                if self.event_sink:
                    self.event_sink(response)
                continue

            if response.target_mm is None or abs(response.target_mm - target_mm) > 0.001:
                raise MotorSerialError(
                    "INVALID_MOVE_ACK",
                    "Arduino acknowledged a different MOVE target.",
                )

            return response

    def _wait_for_arrival(self, command: str) -> ParsedLine:
        while True:
            response = self._wait_for_response(
                command,
                {ParsedLineKind.event},
                self.settings.move_timeout_seconds,
            )

            if response.message == "ARRIVED":
                return response

            if self.event_sink:
                self.event_sink(response)

    def home(self) -> ParsedLine:
        command = "HOME"
        with self._command_lock:
            try:
                with self._pending_lock:
                    self._pending_command = command
                    self._pending_response_kinds = {
                        ParsedLineKind.ok_homing,
                        ParsedLineKind.event,
                    }

                self._write_command(command)
                homing_ack = self._wait_for_homing_ack(command)
                self._wait_for_homed(command)
                return homing_ack
            except MotorSerialError as exc:
                if exc.code == "COMMAND_TIMEOUT":
                    try:
                        self.stop()
                    except Exception:
                        pass
                    raise MotorSerialError(
                        "HOME_TIMEOUT",
                        "Motor homing timed out before EVENT:HOMED.",
                    ) from exc
                raise
            except Exception as exc:
                raise MotorSerialError(
                    "HOME_FAILED",
                    "Unable to complete motor homing.",
                ) from exc
            finally:
                with self._pending_lock:
                    if self._pending_command == command:
                        self._pending_command = None
                        self._pending_response_kinds = None

    def _wait_for_homing_ack(self, command: str) -> ParsedLine:
        while True:
            response = self._wait_for_response(
                command,
                {ParsedLineKind.ok_homing, ParsedLineKind.event},
                self.settings.command_timeout_seconds,
            )

            if response.kind == ParsedLineKind.event:
                if self.event_sink:
                    self.event_sink(response)
                continue

            return response

    def _wait_for_homed(self, command: str) -> ParsedLine:
        while True:
            response = self._wait_for_response(
                command,
                {ParsedLineKind.event},
                self.settings.home_timeout_seconds,
            )

            if response.message == "HOMED":
                return response

            if self.event_sink:
                self.event_sink(response)

    def close(self) -> None:
        if self.connected:
            try:
                self.stop()
            except Exception:
                pass

        self._stop_reader.set()
        if self._reader_thread and self._reader_thread.is_alive():
            self._reader_thread.join(timeout=1.0)

        if self._serial is not None:
            try:
                self._serial.close()
            except Exception:
                pass

        self.connected = False
