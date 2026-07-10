from __future__ import annotations

from app.config import MotorServiceSettings
from app.protocol import ParsedLine, parse_arduino_line


class SimulatedTransport:
    """Deterministic transport used by default and by tests."""

    mode = "simulation"

    def __init__(self, settings: MotorServiceSettings):
        self.settings = settings
        self.connected = False
        self.position_mm = settings.simulation_position_mm
        self.position_known = settings.simulation_position_known
        self._events: list[ParsedLine] = []

    def start(self) -> None:
        self.connected = True

    def close(self) -> None:
        self.connected = False

    def status(self) -> ParsedLine:
        if not self.connected:
            raise RuntimeError("TRANSPORT_DISCONNECTED")

        known = "1" if self.position_known else "0"
        position = self.position_mm if self.position_known else -1
        return parse_arduino_line(f"POS:{position:.2f}:KNOWN:{known}")

    def stop(self) -> ParsedLine:
        if not self.connected:
            raise RuntimeError("TRANSPORT_DISCONNECTED")

        return parse_arduino_line("OK:STOPPED")

    def move_to(self, target_mm: float) -> ParsedLine:
        if not self.connected:
            raise RuntimeError("TRANSPORT_DISCONNECTED")

        moving = parse_arduino_line(f"OK:MOVING_TO:{target_mm:.2f}")
        self._events.append(parse_arduino_line("EVENT:ARRIVED"))
        self.position_mm = target_mm
        self.position_known = True
        return moving

    def home(self) -> ParsedLine:
        if not self.connected:
            raise RuntimeError("TRANSPORT_DISCONNECTED")

        homing = parse_arduino_line("OK:HOMING")
        self._events.append(parse_arduino_line("EVENT:HOMED"))
        self.position_mm = 0.0
        self.position_known = True
        return homing

    def drain_events(self) -> list[ParsedLine]:
        events = self._events
        self._events = []
        return events
