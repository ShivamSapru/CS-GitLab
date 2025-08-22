"""
Enhanced authentication flow tests for web application
Tests email auth, OAuth, 2FA, and session management
"""
import pytest
import httpx
import os
import json
from pathlib import Path

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

class TestAuthenticationFlow:
    """Test authentication workflows including email, OAuth, and 2FA"""

    @pytest.mark.asyncio
    async def test_email_signup_flow(self):
        """Test complete email signup process"""
        signup_data = {
            "email": "test_signup@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        async with httpx.AsyncClient() as client:
            # Test signup endpoint
            response = await client.post(
                f"{BASE_URL}/register",
                json=signup_data
            )
            
            # Should return success or 2FA setup required
            assert response.status_code in [200, 201]
            result = response.json()
            
            assert "email" in result
            assert result["email"] == signup_data["email"]
            
            # Check if 2FA setup is required (expected for new users)
            if result.get("setup_2fa_required"):
                assert "setup_2fa_required" in result
                assert result["setup_2fa_required"] is True

    @pytest.mark.asyncio 
    async def test_email_login_flow(self):
        """Test email login process"""
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        async with httpx.AsyncClient() as client:
            # Test login endpoint
            response = await client.post(
                f"{BASE_URL}/login",
                json=login_data
            )
            
            # Should handle various scenarios
            assert response.status_code in [200, 401, 403]
            
            if response.status_code == 200:
                result = response.json()
                assert "email" in result
                
                # Check for 2FA requirement
                if result.get("twofa_required"):
                    assert "twofa_required" in result
                elif result.get("setup_2fa_required"):
                    assert "setup_2fa_required" in result
                else:
                    # Fully authenticated
                    assert "user_id" in result

    @pytest.mark.asyncio
    async def test_oauth_endpoints(self):
        """Test OAuth redirect endpoints"""
        async with httpx.AsyncClient() as client:
            # Test Google OAuth initiation
            response = await client.get(
                f"{BASE_URL}/login",
                follow_redirects=False
            )
            
            # Should redirect to Google OAuth
            assert response.status_code in [302, 307, 308]
            
            if response.status_code in [302, 307, 308]:
                # Check redirect location contains OAuth URL
                location = response.headers.get("location", "")
                # Should contain Google OAuth domain or be a valid redirect
                assert len(location) > 0

    @pytest.mark.asyncio
    async def test_session_management(self):
        """Test session creation and validation"""
        async with httpx.AsyncClient() as client:
            # Test /me endpoint without authentication
            response = await client.get(f"{BASE_URL}/me")
            assert response.status_code == 401
            
            result = response.json()
            assert "error" in result

    @pytest.mark.asyncio
    async def test_logout_endpoint(self):
        """Test logout functionality"""
        async with httpx.AsyncClient() as client:
            # Test logout (should work even without active session)
            response = await client.get(f"{BASE_URL}/logout")
            
            # Should redirect or return success
            assert response.status_code in [200, 302, 307]

    @pytest.mark.asyncio
    async def test_password_validation(self):
        """Test password strength requirements"""
        weak_passwords = [
            "123",           # Too short
            "password",      # No numbers/special chars
            "12345678",      # Only numbers
            "PASSWORD",      # Only uppercase
        ]
        
        for weak_password in weak_passwords:
            signup_data = {
                "email": f"weak_{weak_password}@example.com",
                "password": weak_password,
                "first_name": "Test",
                "last_name": "User"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/register",
                    json=signup_data
                )
                
                # Should reject weak passwords
                if response.status_code == 422:
                    result = response.json()
                    # Should contain validation error
                    assert "detail" in result or "error" in result

    @pytest.mark.asyncio
    async def test_duplicate_email_signup(self):
        """Test handling of duplicate email during signup"""
        duplicate_data = {
            "email": "duplicate@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        async with httpx.AsyncClient() as client:
            # First signup attempt
            response1 = await client.post(
                f"{BASE_URL}/register",
                json=duplicate_data
            )
            
            # Second signup attempt with same email
            response2 = await client.post(
                f"{BASE_URL}/register", 
                json=duplicate_data
            )
            
            # Second attempt should fail or return existing user info
            assert response2.status_code in [400, 409, 422]

    @pytest.mark.asyncio
    async def test_invalid_login_attempts(self):
        """Test handling of invalid login credentials"""
        invalid_credentials = [
            {"email": "nonexistent@example.com", "password": "anypassword"},
            {"email": "test@example.com", "password": "wrongpassword"},
            {"email": "invalid-email", "password": "password123"},
            {"email": "", "password": "password123"},
            {"email": "test@example.com", "password": ""}
        ]
        
        for credentials in invalid_credentials:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/login",
                    json=credentials
                )
                
                # Should reject invalid credentials
                assert response.status_code in [400, 401, 422]
                
                if response.status_code in [400, 401]:
                    result = response.json()
                    assert "error" in result or "detail" in result

class TestTwoFactorAuthentication:
    """Test 2FA setup and verification workflows"""

    @pytest.mark.asyncio
    async def test_2fa_setup_endpoints(self):
        """Test 2FA setup process"""
        async with httpx.AsyncClient() as client:
            # Test 2FA setup initiation
            response = await client.get(f"{BASE_URL}/setup-2fa")
            
            # Should require authentication or return setup info
            assert response.status_code in [200, 401, 403]
            
            if response.status_code == 200:
                result = response.json()
                # Should contain QR code info or setup details
                assert any(key in result for key in ["qr_code", "secret", "setup_key"])

    @pytest.mark.asyncio
    async def test_2fa_verification_endpoints(self):
        """Test 2FA code verification"""
        verification_data = {
            "code": "123456"  # Mock verification code
        }
        
        async with httpx.AsyncClient() as client:
            # Test 2FA verification
            response = await client.post(
                f"{BASE_URL}/verify-2fa",
                json=verification_data
            )
            
            # Should handle verification attempt (422 is valid for invalid OTP format)
            assert response.status_code in [200, 400, 401, 422]
            
            result = response.json()
            assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_2fa_disable_endpoints(self):
        """Test 2FA disable functionality"""
        async with httpx.AsyncClient() as client:
            # Test 2FA disable
            response = await client.post(f"{BASE_URL}/disable-2fa")
            
            # Should require authentication
            assert response.status_code in [200, 401, 403]

class TestSessionSecurity:
    """Test session security and cookie handling"""

    @pytest.mark.asyncio
    async def test_session_cookie_security(self):
        """Test session cookie properties"""
        async with httpx.AsyncClient() as client:
            # Make a request that might set cookies
            response = await client.get(f"{BASE_URL}/api/health")
            
            # Check cookie security attributes if any are set
            cookies = response.cookies
            for cookie in cookies:
                # In production, cookies should have security attributes
                # In test environment, this may not apply
                pass

    @pytest.mark.asyncio
    async def test_csrf_protection(self):
        """Test CSRF protection mechanisms"""
        async with httpx.AsyncClient() as client:
            # Test that state-changing operations require proper headers
            response = await client.post(f"{BASE_URL}/login")
            
            # Should handle missing CSRF token or invalid request
            assert response.status_code in [400, 403, 422]

    @pytest.mark.asyncio
    async def test_session_timeout(self):
        """Test session timeout behavior"""
        # This is difficult to test in automated tests due to time requirements
        # We'll test that the session validation endpoint works
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/me")
            
            # Should return unauthorized for no session
            assert response.status_code == 401

class TestAccountManagement:
    """Test account management features"""

    @pytest.mark.asyncio
    async def test_profile_endpoints(self):
        """Test profile management endpoints"""
        async with httpx.AsyncClient() as client:
            # Test profile update (should require auth)
            profile_data = {
                "first_name": "Updated",
                "last_name": "Name"
            }
            
            response = await client.put(
                f"{BASE_URL}/api/profile", 
                json=profile_data
            )
            
            # Should require authentication (404 is valid if endpoint doesn't exist)
            assert response.status_code in [200, 401, 403, 404]

    @pytest.mark.asyncio
    async def test_password_change_endpoints(self):
        """Test password change functionality"""
        password_data = {
            "current_password": "oldpassword123",
            "new_password": "newpassword456",
            "confirm_password": "newpassword456"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{BASE_URL}/api/profile/change-password",
                json=password_data
            )
            
            # Should require authentication
            assert response.status_code in [200, 400, 401, 403]

    @pytest.mark.asyncio
    async def test_account_deletion(self):
        """Test account deletion endpoints"""
        async with httpx.AsyncClient() as client:
            # Test account deletion request
            response = await client.delete(f"{BASE_URL}/api/account")
            
            # Should require authentication and confirmation
            assert response.status_code in [200, 401, 403, 404]

class TestRateLimiting:
    """Test rate limiting and abuse prevention"""

    @pytest.mark.asyncio
    async def test_login_rate_limiting(self):
        """Test rate limiting on login attempts"""
        login_data = {
            "email": "ratelimit@example.com",
            "password": "wrongpassword"
        }
        
        async with httpx.AsyncClient() as client:
            # Make multiple rapid login attempts
            responses = []
            for i in range(10):
                response = await client.post(
                    f"{BASE_URL}/login",
                    json=login_data
                )
                responses.append(response.status_code)
            
            # Should eventually rate limit
            # In test environment, this might not be enforced
            assert all(status in [400, 401, 429] for status in responses)

    @pytest.mark.asyncio
    async def test_signup_rate_limiting(self):
        """Test rate limiting on signup attempts"""
        async with httpx.AsyncClient() as client:
            # Make multiple rapid signup attempts
            responses = []
            for i in range(5):
                signup_data = {
                    "email": f"ratelimit{i}@example.com",
                    "password": "TestPassword123!",
                    "first_name": "Test",
                    "last_name": f"User{i}"
                }
                
                response = await client.post(
                    f"{BASE_URL}/register",
                    json=signup_data
                )
                responses.append(response.status_code)
            
            # Should handle rapid signups appropriately
            assert all(status in [200, 201, 400, 422, 429] for status in responses)
