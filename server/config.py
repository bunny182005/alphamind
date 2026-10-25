"""Server configuration options and telemetry constants."""
from pydantic_settings import BaseSettings


class ServerSettings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    SSE_HEARTBEAT_INTERVAL: float = 15.0


server_settings = ServerSettings()
