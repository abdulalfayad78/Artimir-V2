from dataclasses import dataclass
from enum import Enum


class ParsedLineKind(str, Enum):
    ready = "ready"
    position = "position"
    ok_stopped = "ok_stopped"
    ok_moving_to = "ok_moving_to"
    ok_homing = "ok_homing"
    event = "event"
    error = "error"
    empty = "empty"
    invalid = "invalid"


@dataclass(frozen=True)
class ParsedLine:
    kind: ParsedLineKind
    raw: str
    message: str = ""
    position_mm: float | None = None
    position_known: bool | None = None
    target_mm: float | None = None


def parse_arduino_line(line: str | bytes | None) -> ParsedLine:
    if line is None:
        return ParsedLine(
            kind=ParsedLineKind.empty,
            raw="",
            message="empty line",
        )

    if isinstance(line, bytes):
        try:
            raw = line.decode("utf-8", errors="replace").strip()
        except Exception:
            raw = ""
    else:
        raw = str(line).strip()

    if not raw:
        return ParsedLine(
            kind=ParsedLineKind.empty,
            raw=raw,
            message="empty line",
        )

    if raw == "READY":
        return ParsedLine(kind=ParsedLineKind.ready, raw=raw)

    if raw.startswith("POS:"):
        return parse_position(raw)

    if raw == "OK:STOPPED":
        return ParsedLine(kind=ParsedLineKind.ok_stopped, raw=raw)

    if raw.startswith("OK:MOVING_TO"):
        return parse_moving_to(raw)

    if raw == "OK:HOMING":
        return ParsedLine(kind=ParsedLineKind.ok_homing, raw=raw)

    if raw.startswith("EVENT:"):
        return ParsedLine(
            kind=ParsedLineKind.event,
            raw=raw,
            message=raw.removeprefix("EVENT:"),
        )

    if raw.startswith("ERR:"):
        return ParsedLine(
            kind=ParsedLineKind.error,
            raw=raw,
            message=raw.removeprefix("ERR:") or "arduino error",
        )

    return ParsedLine(
        kind=ParsedLineKind.invalid,
        raw=raw,
        message="invalid protocol line",
    )


def parse_position(raw: str) -> ParsedLine:
    parts = raw.split(":")
    if len(parts) != 4 or parts[0] != "POS" or parts[2] != "KNOWN":
        return ParsedLine(
            kind=ParsedLineKind.invalid,
            raw=raw,
            message="invalid position format",
        )

    try:
        position_mm = float(parts[1])
    except ValueError:
        return ParsedLine(
            kind=ParsedLineKind.invalid,
            raw=raw,
            message="invalid position value",
        )

    if parts[3] not in {"0", "1"}:
        return ParsedLine(
            kind=ParsedLineKind.invalid,
            raw=raw,
            message="invalid position known flag",
        )

    return ParsedLine(
        kind=ParsedLineKind.position,
        raw=raw,
        position_mm=position_mm,
        position_known=parts[3] == "1",
    )


def parse_moving_to(raw: str) -> ParsedLine:
    parts = raw.split(":")
    if len(parts) == 2 and raw == "OK:MOVING_TO":
        return ParsedLine(kind=ParsedLineKind.ok_moving_to, raw=raw)

    if len(parts) != 3 or parts[0] != "OK" or parts[1] != "MOVING_TO":
        return ParsedLine(
            kind=ParsedLineKind.invalid,
            raw=raw,
            message="invalid moving response format",
        )

    try:
        target_mm = float(parts[2])
    except ValueError:
        return ParsedLine(
            kind=ParsedLineKind.invalid,
            raw=raw,
            message="invalid moving target value",
        )

    return ParsedLine(
        kind=ParsedLineKind.ok_moving_to,
        raw=raw,
        target_mm=target_mm,
    )


def is_command_response(parsed: ParsedLine) -> bool:
    return parsed.kind in {
        ParsedLineKind.ready,
        ParsedLineKind.position,
        ParsedLineKind.ok_stopped,
        ParsedLineKind.ok_moving_to,
        ParsedLineKind.ok_homing,
        ParsedLineKind.error,
    }
