from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MotorServiceSettings(BaseSettings):
    """Runtime configuration for the local motor service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MOTOR_",
        extra="ignore",
    )

    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000, ge=1, le=65535)
    mode: Literal["simulation", "hardware"] = "simulation"

    serial_port: str | None = None
    serial_baudrate: int = Field(default=115200, ge=1200)
    serial_timeout_seconds: float = Field(default=0.2, gt=0)
    command_timeout_seconds: float = Field(default=1.5, gt=0)
    max_step_mm: float = Field(default=10.0, gt=0)
    move_timeout_seconds: float = Field(default=10.0, gt=0)
    home_timeout_seconds: float = Field(default=45.0, gt=0)
    allowed_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    event_buffer_size: int = Field(default=100, ge=1, le=1000)
    simulation_position_mm: float = 250.0
    simulation_position_known: bool = True

    @property
    def cors_allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> MotorServiceSettings:
    return MotorServiceSettings()
