"""Unit tests for server configuration settings."""
from server.config import ServerSettings


def test_server_settings():
    settings = ServerSettings()
    assert settings.PORT == 8000
    assert "http://localhost:5173" in settings.CORS_ORIGINS
