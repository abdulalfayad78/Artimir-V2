from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import (
    EventsResponse,
    HealthResponse,
    HomeResponse,
    MotorStatus,
    MoveToRequest,
    MoveToResponse,
    StopResponse,
)
from app.motor_controller import MotorController


settings = get_settings()
controller = MotorController(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    controller.start()
    try:
        yield
    finally:
        controller.shutdown()


app = FastAPI(
    title="Artimir Local Motor Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    status = controller.health()
    return HealthResponse(
        ok=status.last_error is None,
        host=settings.host,
        port=settings.port,
        status=status,
    )


@app.get("/motor/status", response_model=MotorStatus)
def motor_status() -> MotorStatus:
    return controller.status()


@app.post("/motor/stop", response_model=StopResponse)
def motor_stop() -> StopResponse:
    return controller.stop()


@app.post("/motor/move-to", response_model=MoveToResponse)
def motor_move_to(request: MoveToRequest) -> MoveToResponse:
    return controller.move_to(request.target_mm)


@app.post("/motor/home", response_model=HomeResponse)
def motor_home() -> HomeResponse:
    return controller.home()


@app.get("/motor/events", response_model=EventsResponse)
def motor_events() -> EventsResponse:
    return EventsResponse(events=controller.events())
