from app.protocol import ParsedLineKind, parse_arduino_line


def test_parse_ready():
    parsed = parse_arduino_line("READY")
    assert parsed.kind == ParsedLineKind.ready


def test_parse_status_position_known():
    parsed = parse_arduino_line("POS:250.00:KNOWN:1")
    assert parsed.kind == ParsedLineKind.position
    assert parsed.position_mm == 250.0
    assert parsed.position_known is True


def test_parse_status_position_unknown():
    parsed = parse_arduino_line("POS:-1:KNOWN:0")
    assert parsed.kind == ParsedLineKind.position
    assert parsed.position_mm == -1
    assert parsed.position_known is False


def test_parse_stop_and_moving_responses():
    assert parse_arduino_line("OK:STOPPED").kind == ParsedLineKind.ok_stopped
    assert parse_arduino_line("OK:MOVING_TO").kind == ParsedLineKind.ok_moving_to
    moving = parse_arduino_line("OK:MOVING_TO:55.00")
    assert moving.kind == ParsedLineKind.ok_moving_to
    assert moving.target_mm == 55.0
    assert parse_arduino_line("OK:HOMING").kind == ParsedLineKind.ok_homing


def test_parse_event_and_error():
    event = parse_arduino_line("EVENT:LIMIT_LOW")
    error = parse_arduino_line("ERR:LIMIT_HIGH")
    assert event.kind == ParsedLineKind.event
    assert event.message == "LIMIT_LOW"
    assert error.kind == ParsedLineKind.error
    assert error.message == "LIMIT_HIGH"


def test_invalid_status_format_is_rejected():
    assert parse_arduino_line("POS:250").kind == ParsedLineKind.invalid
    assert parse_arduino_line("POS:250:KNOWN:2").kind == ParsedLineKind.invalid
    assert parse_arduino_line("UNKNOWN").kind == ParsedLineKind.invalid
