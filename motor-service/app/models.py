from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field


class MotorMode(str, Enum):
    simulation = "simulation"
    hardware = "hardware"


class MotorConnectionState(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    error = "error"


class MotorMotionState(str, Enum):
    ready = "ready"
    stopped = "stopped"
    moving = "moving"
    homing = "homing"
    unknown = "unknown"
    error = "error"


class MotorError(BaseModel):
    code: str
    message: str


class MotorStatus(BaseModel):
    mode: MotorMode
    connection: MotorConnectionState
    motion: MotorMotionState = MotorMotionState.unknown
    position_mm: float | None = None
    position_known: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_error: MotorError | None = None


class HealthResponse(BaseModel):
    ok: bool
    service: str = "artimir-motor-service"
    host: str
    port: int
    status: MotorStatus


class StopResponse(BaseModel):
    ok: bool
    status: MotorStatus
    error: MotorError | None = None


class MoveToRequest(BaseModel):
    target_mm: float


class MoveToResponse(BaseModel):
    ok: bool
    status: MotorStatus
    target_mm: float
    error: MotorError | None = None


class HomeResponse(BaseModel):
    ok: bool
    status: MotorStatus
    error: MotorError | None = None


class MotorEvent(BaseModel):
    id: int
    timestamp: datetime
    type: str
    message: str
    raw: str


class EventsResponse(BaseModel):
    events: list[MotorEvent] = Field(default_factory=list)
