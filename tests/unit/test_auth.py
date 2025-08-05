import pytest
from backend.auth.auth_utils import hash_password, verify_password, create_access_token
from jose import jwt
from datetime import datetime, timedelta

# These should match your backend settings
SECRET_KEY = "36d054b3e9caffa00977da468c5bb49c89c3c52806b333a5dc06043794dfe5bf"
ALGORITHM = "HS256"

def test_password_hashing_and_verification():
    plain = "MyStrongPassword123"
    hashed = hash_password(plain)

    assert hashed != plain, "Hash should not match plain password"
    assert verify_password(plain, hashed), "Password verification failed"

def test_password_verification_failure():
    plain = "CorrectPassword"
    wrong = "WrongPassword"
    hashed = hash_password(plain)

    assert not verify_password(wrong, hashed), "Verification should fail for wrong password"

def test_access_token_creation_and_decoding():
    user_data = {"sub": "testuser@example.com"}
    token = create_access_token(user_data)

    assert isinstance(token, str)
    assert len(token) > 20

    # Decode to verify contents
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == user_data["sub"]
    assert "exp" in decoded
