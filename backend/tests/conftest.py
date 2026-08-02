"""Shared pytest fixtures for Tyre Express backend tests."""
import os
import requests
import pytest

# Prefer explicit env; frontend .env exposes EXPO_PUBLIC_BACKEND_URL
BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://emergency-assist-106.preview.emergentagent.com"
).rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
