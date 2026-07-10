from __future__ import annotations

from collections import deque
from datetime import UTC, datetime
from threading import Lock

from app.config import MotorServiceSettings
from app.models import (
    MotorConnectionState,
    MotorError,
    MotorEvent,
    HomeResponse,
    MotorMode,
    MotorMotionState,
    MotorStatus,
    MoveToResponse,
    StopResponse,
)
from app.protocol import ParsedLine, ParsedLineKind
from app.serial_transport import MotorSerialError, SerialTransport
from app.simulated_transport import SimulatedTransport


class MotorController:
    def __init__(self, settings: MotorServiceSettings):
        self.settings = settings
        self.mode = MotorMode(settings.mode)
        self._event_lock = Lock()
        self._event_id = 0
        self._events: deque[MotorEvent] = deque(
            maxlen=settings.event_buffer_size,
        )
        self._status = MotorStatus(
            mode=self.mode,
            connection=MotorConnectionState.disconnected,
        )
        self.transport = self._create_transport()

    def _create_transport(self):
        if self.mode == MotorMode.hardware:
            return SerialTransport(self.settings, event_sink=self._record_event)
        return SimulatedTransport(self.settings)

    def start(self) -> None:
        try:
            self.transport.start()
            self._status.connection = MotorConnectionState.connected
            self._status.last_error = None
            if self.mode == MotorMode.simulation:
                self._status.motion = MotorMotionState.ready
        except MotorSerialError as exc:
            self._set_error(exc.code, exc.safe_message)
        except Exception:
            self._set_error(
                "TRANSPORT_START_FAILED",
                "Motor transport failed to start.",
            )

    def shutdown(self) -> None:
        try:
            self.transport.close()
        finally:
            self._status.connection = MotorConnectionState.disconnected

    def health(self) -> MotorStatus:
        return self._status.model_copy(deep=True)

    def status(self) -> MotorStatus:
        try:
            parsed = self.transport.status()
            self._apply_parsed_response(parsed)
            self._status.connection = MotorConnectionState.connected
            self._status.last_error = None
        except MotorSerialError as exc:
            self._set_error(exc.code, exc.safe_message)
        except Exception:
            self._set_error(
                "STATUS_FAILED",
                "Unable to read motor status.",
            )

        return self.health()

    def stop(self) -> StopResponse:
        try:
            parsed = self.transport.stop()
            self._apply_parsed_response(parsed)
            self._status.connection = MotorConnectionState.connected
            self._status.last_error = None
            return StopResponse(ok=True, status=self.health())
        except MotorSerialError as exc:
            error = self._set_error(exc.code, exc.safe_message)
        except Exception:
            error = self._set_error(
                "STOP_FAILED",
                "Unable to stop the motor.",
            )

        return StopResponse(ok=False, status=self.health(), error=error)

    def move_to(self, target_mm: float) -> MoveToResponse:
        validation_error = self._validate_move_request(target_mm)
        if validation_error:
            return MoveToResponse(
                ok=False,
                status=self.health(),
                target_mm=target_mm,
                error=validation_error,
            )

        previous_position_mm = self._status.position_mm
        try:
            self._status.motion = MotorMotionState.moving
            self._status.updated_at = datetime.now(UTC)
            parsed = self.transport.move_to(target_mm)
            self._apply_parsed_response(parsed)
            self._status.position_mm = target_mm
            self._status.position_known = True
            self._status.motion = MotorMotionState.stopped
            self._status.connection = MotorConnectionState.connected
            self._status.last_error = None
            self._status.updated_at = datetime.now(UTC)
            return MoveToResponse(
                ok=True,
                status=self.health(),
                target_mm=target_mm,
            )
        except MotorSerialError as exc:
            if previous_position_mm is not None:
                self._status.position_mm = previous_position_mm
            error = self._set_error(exc.code, exc.safe_message)
        except Exception:
            if previous_position_mm is not None:
                self._status.position_mm = previous_position_mm
            error = self._set_error(
                "MOVE_FAILED",
                "Unable to move the motor.",
            )

        return MoveToResponse(
            ok=False,
            status=self.health(),
            target_mm=target_mm,
            error=error,
        )

    def home(self) -> HomeResponse:
        validation_error = self._validate_home_request()
        if validation_error:
            return HomeResponse(
                ok=False,
                status=self.health(),
                error=validation_error,
            )

        try:
            self._status.motion = MotorMotionState.homing
            self._status.position_mm = None
            self._status.position_known = False
            self._status.updated_at = datetime.now(UTC)
            parsed = self.transport.home()
            self._apply_parsed_response(parsed)
            self._status.position_mm = 0.0
            self._status.position_known = True
            self._status.motion = MotorMotionState.stopped
            self._status.connection = MotorConnectionState.connected
            self._status.last_error = None
            self._status.updated_at = datetime.now(UTC)
            return HomeResponse(ok=True, status=self.health())
        except MotorSerialError as exc:
            self._status.position_mm = None
            self._status.position_known = False
            error = self._set_error(exc.code, exc.safe_message)
        except Exception:
            self._status.position_mm = None
            self._status.position_known = False
            error = self._set_error(
                "HOME_FAILED",
                "Unable to home the motor.",
            )

        return HomeResponse(
            ok=False,
            status=self.health(),
            error=error,
        )

    def _validate_home_request(self) -> MotorError | None:
        if self._status.last_error is not None:
            return MotorError(
                code="MOTOR_ERROR_ACTIVE",
                message="Clear the active motor error before homing.",
            )

        if self._status.connection != MotorConnectionState.connected:
            return MotorError(
                code="MOTOR_DISCONNECTED",
                message="Motor transport must be connected before homing.",
            )

        if self._status.motion in {
            MotorMotionState.moving,
            MotorMotionState.homing,
        }:
            return MotorError(
                code="MOTOR_ALREADY_ACTIVE",
                message="Motor is already moving or homing.",
            )

        return None

    def _validate_move_request(self, target_mm: float) -> MotorError | None:
        if self._status.last_error is not None:
            return MotorError(
                code="MOTOR_ERROR_ACTIVE",
                message="Clear the active motor error before moving.",
            )

        if self._status.connection != MotorConnectionState.connected:
            return MotorError(
                code="MOTOR_DISCONNECTED",
                message="Motor transport must be connected before moving.",
            )

        if self._status.motion in {
            MotorMotionState.moving,
            MotorMotionState.homing,
        }:
            return MotorError(
                code="MOTOR_ALREADY_MOVING",
                message="Motor is already moving or homing.",
            )

        if target_mm < 0 or target_mm > 500:
            return MotorError(
                code="TARGET_OUT_OF_RANGE",
                message="Target must be between 0 and 500 mm.",
            )

        if not self._status.position_known or self._status.position_mm is None:
            return MotorError(
                code="POSITION_UNKNOWN",
                message="Current motor position must be known before moving.",
            )

        if abs(target_mm - self._status.position_mm) > self.settings.max_step_mm:
            return MotorError(
                code="MAX_STEP_EXCEEDED",
                message=f"Move is limited to {self.settings.max_step_mm:g} mm per request.",
            )

        return None

    def events(self) -> list[MotorEvent]:
        drained = getattr(self.transport, "drain_events", lambda: [])()
        for parsed in drained:
            self._record_event(parsed)

        with self._event_lock:
            return list(self._events)

    def _apply_parsed_response(self, parsed: ParsedLine) -> None:
        if parsed.kind == ParsedLineKind.position:
            self._status.position_mm = (
                parsed.position_mm if parsed.position_known else None
            )
            self._status.position_known = bool(parsed.position_known)
            self._status.motion = MotorMotionState.ready
            self._status.updated_at = datetime.now(UTC)
            return

        if parsed.kind == ParsedLineKind.ok_stopped:
            self._status.motion = MotorMotionState.stopped
            self._status.updated_at = datetime.now(UTC)
            return

        if parsed.kind == ParsedLineKind.ok_moving_to:
            self._status.motion = MotorMotionState.moving
            self._status.updated_at = datetime.now(UTC)
            return

        if parsed.kind == ParsedLineKind.ok_homing:
            self._status.motion = MotorMotionState.homing
            self._status.position_mm = None
            self._status.position_known = False
            self._status.updated_at = datetime.now(UTC)
            return

        if parsed.kind == ParsedLineKind.ready:
            self._status.motion = MotorMotionState.ready
            self._status.updated_at = datetime.now(UTC)
            return

        if parsed.kind == ParsedLineKind.error:
            self._set_error("ARDUINO_ERROR", parsed.message)
            return

        self._set_error(
            "INVALID_RESPONSE",
            "Arduino returned an invalid response.",
        )

    def _record_event(self, parsed: ParsedLine) -> None:
        with self._event_lock:
            self._event_id += 1
            self._events.append(
                MotorEvent(
                    id=self._event_id,
                    timestamp=datetime.now(UTC),
                    type=parsed.kind.value,
                    message=parsed.message,
                    raw=parsed.raw,
                ),
            )

    def _set_error(self, code: str, message: str) -> MotorError:
        error = MotorError(code=code, message=message)
        self._status.connection = (
            MotorConnectionState.disconnected
            if code
            in {
                "SERIAL_PORT_NOT_CONFIGURED",
                "SERIAL_CONNECTION_FAILED",
                "SERIAL_DISCONNECTED",
                "TRANSPORT_START_FAILED",
            }
            else MotorConnectionState.error
        )
        self._status.motion = MotorMotionState.error
        self._status.last_error = error
        return error
