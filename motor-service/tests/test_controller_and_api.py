from concurrent.futures import ThreadPoolExecutor
from threading import Event

from fastapi.testclient import TestClient

from app.config import MotorServiceSettings
from app.motor_controller import MotorController
from app.protocol import parse_arduino_line
from app.serial_transport import MotorSerialError, SerialTransport


class FakeSerial:
    def __init__(self):
        self.written = []
        self.write_event = Event()

    def write(self, payload):
        self.written.append(payload)
        self.write_event.set()

    def flush(self):
        pass


class ImmediateResponseSerial(FakeSerial):
    def __init__(self, on_write):
        super().__init__()
        self.on_write = on_write

    def write(self, payload):
        super().write(payload)
        self.on_write(payload)


def test_simulation_status_and_stop():
    settings = MotorServiceSettings(mode="simulation")
    controller = MotorController(settings)
    controller.start()

    status = controller.status()
    assert status.connection == "connected"
    assert status.position_mm == 250.0
    assert status.position_known is True

    stop = controller.stop()
    assert stop.ok is True
    assert stop.status.motion == "stopped"

    controller.shutdown()


def test_event_buffer_is_limited_and_timestamped():
    settings = MotorServiceSettings(mode="simulation", event_buffer_size=2)
    controller = MotorController(settings)
    controller._record_event(parse_arduino_line("EVENT:A"))
    controller._record_event(parse_arduino_line("EVENT:B"))
    controller._record_event(parse_arduino_line("EVENT:C"))

    events = controller.events()
    assert len(events) == 2
    assert [event.message for event in events] == ["B", "C"]
    assert events[0].timestamp is not None


def test_hardware_without_serial_port_exposes_normalized_disconnected_state():
    settings = MotorServiceSettings(mode="hardware", serial_port=None)
    controller = MotorController(settings)
    controller.start()

    status = controller.health()
    assert status.connection == "disconnected"
    assert status.last_error.code == "SERIAL_PORT_NOT_CONFIGURED"


def test_serial_status_ignores_ready_until_position_response():
    settings = MotorServiceSettings(mode="hardware")
    captured_events = []
    transport = SerialTransport(settings, event_sink=captured_events.append)
    transport.connected = True
    transport._serial = FakeSerial()
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(transport.status)
        assert transport._serial.write_event.wait(timeout=0.1)
        transport._handle_parsed_line(parse_arduino_line("READY"))
        transport._handle_parsed_line(parse_arduino_line("POS:250.00:KNOWN:1"))
        parsed = future.result(timeout=0.2)

    assert parsed.position_mm == 250.0
    assert transport._serial.written == [b"STATUS\n"]
    assert [event.raw for event in captured_events] == ["READY"]


def test_serial_thread_correlates_status_after_ready_without_timeout():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
    )
    captured_events = []
    transport = SerialTransport(settings, event_sink=captured_events.append)
    transport.connected = True
    transport._serial = FakeSerial()

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(transport.status)
        assert transport._serial.write_event.wait(timeout=0.1)
        transport._handle_parsed_line(parse_arduino_line("READY"))
        transport._handle_parsed_line(parse_arduino_line("POS:50.00:KNOWN:1"))
        parsed = future.result(timeout=0.2)

    assert parsed.position_mm == 50.0
    assert parsed.position_known is True
    assert [event.raw for event in captured_events] == ["READY"]


def test_serial_thread_keeps_event_before_status_response():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
    )
    captured_events = []
    transport = SerialTransport(settings, event_sink=captured_events.append)
    transport.connected = True
    transport._serial = FakeSerial()

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(transport.status)
        assert transport._serial.write_event.wait(timeout=0.1)
        transport._handle_parsed_line(parse_arduino_line("EVENT:ARRIVED"))
        transport._handle_parsed_line(parse_arduino_line("POS:50.00:KNOWN:1"))
        parsed = future.result(timeout=0.2)

    assert parsed.position_mm == 50.0
    assert parsed.position_known is True
    assert [event.raw for event in captured_events] == ["EVENT:ARRIVED"]


def test_serial_status_accepts_immediate_position_during_write():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
    )
    captured_events = []
    transport = SerialTransport(settings, event_sink=captured_events.append)
    transport.connected = True

    def inject_response(payload):
        assert payload == b"STATUS\n"
        transport._handle_parsed_line(
            parse_arduino_line("POS:50.00:KNOWN:1"),
        )

    transport._serial = ImmediateResponseSerial(inject_response)

    parsed = transport.status()

    assert parsed.position_mm == 50.0
    assert parsed.position_known is True
    assert captured_events == []


def test_serial_stop_accepts_immediate_stopped_during_write():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
    )
    captured_events = []
    transport = SerialTransport(settings, event_sink=captured_events.append)
    transport.connected = True

    def inject_response(payload):
        assert payload == b"STOP\n"
        transport._handle_parsed_line(parse_arduino_line("OK:STOPPED"))

    transport._serial = ImmediateResponseSerial(inject_response)

    parsed = transport.stop()

    assert parsed.kind.value == "ok_stopped"
    assert captured_events == []


def test_api_imports_and_serves_simulation(monkeypatch):
    monkeypatch.setenv("MOTOR_MODE", "simulation")
    monkeypatch.delenv("MOTOR_SERIAL_PORT", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    from app.api import app

    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["ok"] is True
        assert health.json()["host"] == "127.0.0.1"
        assert health.json()["port"] == 8000

        status = client.get("/motor/status")
        assert status.status_code == 200
        assert status.json()["position_mm"] == 250.0

        move = client.post("/motor/move-to", json={"target_mm": 255.0})
        assert move.status_code == 200
        assert move.json()["ok"] is True
        assert move.json()["status"]["position_mm"] == 255.0

        home = client.post("/motor/home")
        assert home.status_code == 200
        assert home.json()["ok"] is True
        assert home.json()["status"]["position_mm"] == 0.0
        assert home.json()["status"]["position_known"] is True

        stop = client.post("/motor/stop")
        assert stop.status_code == 200
        assert stop.json()["ok"] is True

        events = client.get("/motor/events")
        assert events.status_code == 200
        assert [event["raw"] for event in events.json()["events"]] == [
            "EVENT:ARRIVED",
            "EVENT:HOMED",
        ]


def test_cors_allows_only_local_vite_origins(monkeypatch):
    monkeypatch.setenv("MOTOR_MODE", "simulation")
    from app.config import get_settings

    get_settings.cache_clear()
    from app.api import app

    with TestClient(app) as client:
        localhost = client.options(
            "/motor/status",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        loopback = client.options(
            "/motor/stop",
            headers={
                "Origin": "http://127.0.0.1:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        external = client.options(
            "/motor/status",
            headers={
                "Origin": "http://example.com",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert localhost.headers["access-control-allow-origin"] == (
        "http://localhost:5173"
    )
    assert loopback.headers["access-control-allow-origin"] == (
        "http://127.0.0.1:5173"
    )
    assert "access-control-allow-origin" not in external.headers


def test_motor_service_host_defaults_to_loopback():
    settings = MotorServiceSettings()
    assert settings.host == "127.0.0.1"


def test_simulated_move_to_valid_50_to_55():
    settings = MotorServiceSettings(
        mode="simulation",
        simulation_position_mm=50,
        max_step_mm=10,
    )
    controller = MotorController(settings)
    controller.start()
    controller.status()

    response = controller.move_to(55)

    assert response.ok is True
    assert response.status.position_mm == 55
    assert response.status.position_known is True
    assert response.status.motion == "stopped"


def test_move_to_rejects_target_out_of_range():
    controller = MotorController(
        MotorServiceSettings(mode="simulation", simulation_position_mm=50),
    )
    controller.start()
    controller.status()

    response = controller.move_to(501)

    assert response.ok is False
    assert response.error.code == "TARGET_OUT_OF_RANGE"


def test_move_to_rejects_step_over_10_mm():
    controller = MotorController(
        MotorServiceSettings(
            mode="simulation",
            simulation_position_mm=50,
            max_step_mm=10,
        ),
    )
    controller.start()
    controller.status()

    response = controller.move_to(61)

    assert response.ok is False
    assert response.error.code == "MAX_STEP_EXCEEDED"


def test_move_to_rejects_unknown_position():
    controller = MotorController(MotorServiceSettings(mode="simulation"))
    controller.start()

    response = controller.move_to(55)

    assert response.ok is False
    assert response.error.code == "POSITION_UNKNOWN"


def test_move_to_rejects_already_moving_motor():
    controller = MotorController(
        MotorServiceSettings(mode="simulation", simulation_position_mm=50),
    )
    controller.start()
    controller.status()
    controller._status.motion = "moving"

    response = controller.move_to(55)

    assert response.ok is False
    assert response.error.code == "MOTOR_ALREADY_MOVING"


def test_move_to_rejects_active_error():
    controller = MotorController(
        MotorServiceSettings(mode="simulation", simulation_position_mm=50),
    )
    controller.start()
    controller.status()
    controller._set_error("TEST_ERROR", "Test error")

    response = controller.move_to(55)

    assert response.ok is False
    assert response.error.code == "MOTOR_ERROR_ACTIVE"


def test_serial_move_to_rejects_incorrect_moving_ack():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
        move_timeout_seconds=0.2,
    )
    transport = SerialTransport(settings, event_sink=lambda _event: None)
    transport.connected = True

    def inject_response(payload):
        assert payload == b"MOVE:55.00\n"
        transport._handle_parsed_line(parse_arduino_line("OK:MOVING_TO:56.00"))

    transport._serial = ImmediateResponseSerial(inject_response)

    try:
        transport.move_to(55)
        raise AssertionError("move_to should have failed")
    except MotorSerialError as error:
        assert error.code == "INVALID_MOVE_ACK"


def test_serial_move_to_waits_for_event_arrived():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
        move_timeout_seconds=0.2,
    )
    transport = SerialTransport(settings, event_sink=lambda _event: None)
    transport.connected = True

    def inject_response(payload):
        assert payload == b"MOVE:55.00\n"
        transport._handle_parsed_line(parse_arduino_line("OK:MOVING_TO:55.00"))
        transport._handle_parsed_line(parse_arduino_line("EVENT:ARRIVED"))

    transport._serial = ImmediateResponseSerial(inject_response)

    parsed = transport.move_to(55)

    assert parsed.kind.value == "ok_moving_to"
    assert parsed.target_mm == 55


def test_serial_move_to_timeout_sends_stop():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
        move_timeout_seconds=0.01,
    )
    transport = SerialTransport(settings, event_sink=lambda _event: None)
    transport.connected = True

    def inject_response(payload):
        if payload == b"MOVE:55.00\n":
            transport._handle_parsed_line(parse_arduino_line("OK:MOVING_TO:55.00"))

    transport._serial = ImmediateResponseSerial(inject_response)

    try:
        transport.move_to(55)
        raise AssertionError("move_to should have timed out")
    except MotorSerialError as error:
        assert error.code == "MOVEMENT_TIMEOUT"

    assert transport._serial.written == [b"MOVE:55.00\n", b"STOP\n"]


class TimeoutMoveTransport:
    connected = True

    def start(self):
        pass

    def close(self):
        pass

    def status(self):
        return parse_arduino_line("POS:50.00:KNOWN:1")

    def stop(self):
        return parse_arduino_line("OK:STOPPED")

    def move_to(self, _target_mm):
        raise MotorSerialError(
            "MOVEMENT_TIMEOUT",
            "Motor movement timed out before EVENT:ARRIVED.",
        )

    def drain_events(self):
        return []


def test_move_to_timeout_returns_normalized_error_and_preserves_position():
    controller = MotorController(MotorServiceSettings(mode="simulation"))
    controller.transport = TimeoutMoveTransport()
    controller.start()
    controller.status()

    response = controller.move_to(55)

    assert response.ok is False
    assert response.error.code == "MOVEMENT_TIMEOUT"
    assert response.status.position_mm == 50
    assert response.status.motion == "error"


def test_simulated_home_valid_sets_position_zero_after_homed():
    controller = MotorController(
        MotorServiceSettings(mode="simulation", simulation_position_mm=50),
    )
    controller.start()
    controller.status()

    response = controller.home()

    assert response.ok is True
    assert response.status.position_mm == 0.0
    assert response.status.position_known is True
    assert response.status.motion == "stopped"
    assert [event.raw for event in controller.events()] == ["EVENT:HOMED"]


def test_home_rejects_disconnected_transport():
    controller = MotorController(MotorServiceSettings(mode="simulation"))

    response = controller.home()

    assert response.ok is False
    assert response.error.code == "MOTOR_DISCONNECTED"


def test_home_rejects_already_moving_or_homing():
    controller = MotorController(MotorServiceSettings(mode="simulation"))
    controller.start()
    controller._status.motion = "moving"

    moving_response = controller.home()

    controller._status.motion = "homing"
    homing_response = controller.home()

    assert moving_response.ok is False
    assert moving_response.error.code == "MOTOR_ALREADY_ACTIVE"
    assert homing_response.ok is False
    assert homing_response.error.code == "MOTOR_ALREADY_ACTIVE"


def test_home_rejects_active_error():
    controller = MotorController(MotorServiceSettings(mode="simulation"))
    controller.start()
    controller._set_error("TEST_ERROR", "Test error")

    response = controller.home()

    assert response.ok is False
    assert response.error.code == "MOTOR_ERROR_ACTIVE"


def test_serial_home_waits_for_homing_and_homed():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
        home_timeout_seconds=0.2,
    )
    transport = SerialTransport(settings, event_sink=lambda _event: None)
    transport.connected = True

    def inject_response(payload):
        assert payload == b"HOME\n"
        transport._handle_parsed_line(parse_arduino_line("OK:HOMING"))
        transport._handle_parsed_line(parse_arduino_line("EVENT:HOMED"))

    transport._serial = ImmediateResponseSerial(inject_response)

    parsed = transport.home()

    assert parsed.kind.value == "ok_homing"


def test_home_position_unknown_until_homed_then_zero_known():
    class DelayedHomeTransport:
        connected = True

        def start(self):
            pass

        def close(self):
            pass

        def status(self):
            return parse_arduino_line("POS:50.00:KNOWN:1")

        def stop(self):
            return parse_arduino_line("OK:STOPPED")

        def home(self):
            assert controller._status.motion == "homing"
            assert controller._status.position_mm is None
            assert controller._status.position_known is False
            return parse_arduino_line("OK:HOMING")

        def drain_events(self):
            return []

    controller = MotorController(MotorServiceSettings(mode="simulation"))
    controller.transport = DelayedHomeTransport()
    controller.start()
    controller.status()

    response = controller.home()

    assert response.ok is True
    assert response.status.position_mm == 0.0
    assert response.status.position_known is True


def test_serial_home_timeout_sends_stop():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
        home_timeout_seconds=0.01,
    )
    transport = SerialTransport(settings, event_sink=lambda _event: None)
    transport.connected = True

    def inject_response(payload):
        if payload == b"HOME\n":
            transport._handle_parsed_line(parse_arduino_line("OK:HOMING"))

    transport._serial = ImmediateResponseSerial(inject_response)

    try:
        transport.home()
        raise AssertionError("home should have timed out")
    except MotorSerialError as error:
        assert error.code == "HOME_TIMEOUT"

    assert transport._serial.written == [b"HOME\n", b"STOP\n"]


class TimeoutHomeTransport:
    connected = True

    def start(self):
        pass

    def close(self):
        pass

    def status(self):
        return parse_arduino_line("POS:50.00:KNOWN:1")

    def stop(self):
        return parse_arduino_line("OK:STOPPED")

    def home(self):
        raise MotorSerialError(
            "HOME_TIMEOUT",
            "Motor homing timed out before EVENT:HOMED.",
        )

    def drain_events(self):
        return []


def test_home_timeout_returns_normalized_error_and_unknown_position():
    controller = MotorController(MotorServiceSettings(mode="simulation"))
    controller.transport = TimeoutHomeTransport()
    controller.start()
    controller.status()

    response = controller.home()

    assert response.ok is False
    assert response.error.code == "HOME_TIMEOUT"
    assert response.status.position_mm is None
    assert response.status.position_known is False
    assert response.status.motion == "error"


def test_stop_remains_prioritary_during_home():
    settings = MotorServiceSettings(
        mode="hardware",
        command_timeout_seconds=0.2,
        home_timeout_seconds=0.2,
    )
    transport = SerialTransport(settings, event_sink=lambda _event: None)
    transport.connected = True

    def inject_response(payload):
        if payload == b"HOME\n":
            transport._handle_parsed_line(parse_arduino_line("OK:HOMING"))
        elif payload == b"STOP\n":
            transport._handle_parsed_line(parse_arduino_line("OK:STOPPED"))

    transport._serial = ImmediateResponseSerial(inject_response)

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(transport.home)
        assert transport._serial.write_event.wait(timeout=0.1)
        stop_response = transport.stop()
        try:
            future.result(timeout=0.4)
        except MotorSerialError:
            pass

    assert stop_response.kind.value == "ok_stopped"
    assert b"STOP\n" in transport._serial.written


def test_start_does_not_launch_home_automatically():
    class NoAutoHomeTransport:
        connected = True

        def __init__(self):
            self.home_called = False

        def start(self):
            pass

        def close(self):
            pass

        def status(self):
            return parse_arduino_line("POS:50.00:KNOWN:1")

        def stop(self):
            return parse_arduino_line("OK:STOPPED")

        def home(self):
            self.home_called = True
            return parse_arduino_line("OK:HOMING")

        def drain_events(self):
            return []

    controller = MotorController(MotorServiceSettings(mode="simulation"))
    transport = NoAutoHomeTransport()
    controller.transport = transport

    controller.start()

    assert transport.home_called is False
