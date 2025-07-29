import pytest
import requests

def test_app_running():
    url = "http://localhost:3000/dashboard" #localhost
    try:
        response = requests.get(url, timeout=5)
        assert response.status_code == 200

    except requests.exceptions.RequestException as e:
        pytest.fail(f"App is not running: {e}")