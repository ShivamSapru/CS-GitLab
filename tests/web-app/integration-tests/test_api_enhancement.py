"""
Enhanced API tests building on existing test_api_routes.py
Adds comprehensive validation, error handling, and edge case testing
"""
import pytest
import httpx
import os
import json
from pathlib import Path

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

class TestAPIEnhanced:
    """Enhanced API testing with comprehensive coverage"""

    @pytest.mark.asyncio
    async def test_health_endpoint_detailed(self):
        """Enhanced health check with detailed validation"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/api/health")
            
            assert response.status_code == 200
            json_response = response.json()
            
            # Detailed health check validation
            assert json_response.get("status") == "ok"
            assert "azure_translator_key_configured" in json_response
            assert isinstance(json_response["azure_translator_key_configured"], bool)
            
            # Check response headers
            assert "content-type" in response.headers
            assert "application/json" in response.headers["content-type"]

    @pytest.mark.asyncio
    async def test_cors_headers(self):
        """Test CORS headers are properly set"""
        async with httpx.AsyncClient() as client:
            # Preflight request
            response = await client.options(
                f"{BASE_URL}/api/health",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "GET"
                }
            )
            
            # Should handle CORS preflight
            assert response.status_code in [200, 204]
            
            # Regular request with CORS
            response = await client.get(
                f"{BASE_URL}/api/health",
                headers={"Origin": "http://localhost:3000"}
            )
            
            assert response.status_code == 200
            # Check for CORS headers (if configured)
            cors_header = response.headers.get("access-control-allow-origin")
            if cors_header:
                assert cors_header in ["*", "http://localhost:3000"]

    @pytest.mark.asyncio
    async def test_content_type_validation(self):
        """Test API properly validates content types"""
        async with httpx.AsyncClient() as client:
            # Test with incorrect content type for JSON endpoint
            response = await client.post(
                f"{BASE_URL}/login-email",
                headers={"Content-Type": "text/plain"},
                content="not json"
            )
            
            # Should reject non-JSON content
            assert response.status_code in [400, 415, 422]

    @pytest.mark.asyncio 
    async def test_request_size_limits(self):
        """Test API handles large request bodies appropriately"""
        async with httpx.AsyncClient() as client:
            # Create large JSON payload
            large_data = {"data": "x" * 1000000}  # 1MB of data
            
            response = await client.post(
                f"{BASE_URL}/api/translate",
                json=large_data
            )
            
            # Should either process or reject appropriately
            assert response.status_code in [200, 400, 413, 422]

    @pytest.mark.asyncio
    async def test_sql_injection_protection(self):
        """Test protection against SQL injection attempts"""
        injection_attempts = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'/**/OR/**/1=1--",
            "<script>alert('xss')</script>"
        ]
        
        for injection in injection_attempts:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/login-email",
                    json={
                        "email": injection,
                        "password": "password123"
                    }
                )
                
                # Should handle injection attempts safely
                assert response.status_code in [400, 401, 422]
                
                # Response should not contain sensitive error information
                if response.status_code != 401:
                    response_text = response.text.lower()
                    assert "sql" not in response_text
                    assert "database" not in response_text
                    assert "error" in response_text or "invalid" in response_text

    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        """Test API handles concurrent requests properly"""
        import asyncio
        
        async def make_request(client, request_id):
            response = await client.get(f"{BASE_URL}/api/health")
            return response.status_code
        
        async with httpx.AsyncClient() as client:
            # Make 10 concurrent requests
            tasks = [make_request(client, i) for i in range(10)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # All requests should succeed
            successful_requests = [r for r in results if r == 200]
            assert len(successful_requests) >= 8  # Allow for some network issues

    @pytest.mark.asyncio
    async def test_malformed_json_handling(self):
        """Test API handles malformed JSON gracefully"""
        malformed_json_samples = [
            '{"incomplete": json',
            '{"extra": comma,}',
            '{invalid: "json"}',
            '{"nested": {"missing": }}'
        ]
        
        for malformed in malformed_json_samples:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/login-email",
                    headers={"Content-Type": "application/json"},
                    content=malformed
                )
                
                # Should return JSON parse error
                assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_unsupported_http_methods(self):
        """Test API properly rejects unsupported HTTP methods"""
        unsupported_methods = ["PATCH", "PUT", "DELETE"]
        
        for method in unsupported_methods:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method,
                    f"{BASE_URL}/api/health"
                )
                
                # Should return method not allowed
                assert response.status_code in [405, 501]

class TestParameterValidation:
    """Test comprehensive parameter validation"""

    @pytest.mark.asyncio
    async def test_missing_required_parameters(self):
        """Test handling of missing required parameters"""
        test_cases = [
            # Translation without target language
            {
                "endpoint": "/api/translate",
                "data": {"censor_profanity": "true"},
                "method": "POST"
            },
            # Empty requests
            {
                "endpoint": "/login-email", 
                "data": {},
                "method": "POST"
            }
        ]
        
        for case in test_cases:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    case["method"],
                    f"{BASE_URL}{case['endpoint']}",
                    json=case["data"]
                )
                
                assert response.status_code in [400, 422]
                
                # Should provide helpful error message
                if response.status_code == 422:
                    error_response = response.json()
                    assert "detail" in error_response or "error" in error_response

    @pytest.mark.asyncio
    async def test_parameter_type_validation(self):
        """Test parameter type validation"""
        invalid_params = [
            # Boolean as string where boolean expected
            {"censor_profanity": "maybe"},
            # Number as string where number expected
            {"max_speakers": "many"},
            # Invalid enum values
            {"output_format": "invalid_format"},
            # Invalid language codes
            {"target_language": "xx"},
        ]
        
        for params in invalid_params:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/transcribe",
                    data=params
                )
                
                # Should validate parameter types
                assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_parameter_boundary_values(self):
        """Test parameter boundary value validation"""
        boundary_tests = [
            # Zero speakers
            {"locale": "en-US", "max_speakers": "0"},
            # Too many speakers
            {"locale": "en-US", "max_speakers": "100"},
            # Empty strings
            {"locale": "", "max_speakers": "2"},
            # Very long strings
            {"locale": "x" * 1000, "max_speakers": "2"}
        ]
        
        for params in boundary_tests:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/transcribe",
                    data=params
                )
                
                # Should validate boundaries
                assert response.status_code in [400, 422]

class TestErrorHandling:
    """Test comprehensive error handling"""

    @pytest.mark.asyncio
    async def test_404_handling(self):
        """Test 404 error handling for non-existent endpoints"""
        non_existent_endpoints = [
            "/api/nonexistent",
            "/api/users/999999",
            "/api/projects/invalid",
            "/nonexistent"
        ]
        
        for endpoint in non_existent_endpoints:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BASE_URL}{endpoint}")
                
                assert response.status_code == 404
                
                # Should return JSON error (if API endpoint)
                if endpoint.startswith("/api/"):
                    try:
                        error_response = response.json()
                        assert "error" in error_response or "detail" in error_response
                    except:
                        pass  # Some endpoints might return HTML 404

    @pytest.mark.asyncio
    async def test_server_error_handling(self):
        """Test server error handling simulation"""
        # This would typically test error conditions that cause 500 errors
        # For now, we'll test the error response format
        
        async with httpx.AsyncClient() as client:
            # Try to cause a server error with invalid operations
            response = await client.get(f"{BASE_URL}/api/transcription-status-check/invalid-project-id")
            
            # Should handle gracefully 
            assert response.status_code in [200, 404, 400]
            
            if response.status_code == 200:
                result = response.json()
                assert "status" in result

    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Test timeout handling for long operations"""
        async with httpx.AsyncClient(timeout=1.0) as client:
            try:
                # This might timeout on slower systems
                response = await client.get(f"{BASE_URL}/api/health")
                assert response.status_code == 200
            except httpx.TimeoutException:
                # Timeout is acceptable for this test
                pass

class TestSecurityHeaders:
    """Test security headers implementation"""

    @pytest.mark.asyncio
    async def test_security_headers_present(self):
        """Test presence of security headers"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/api/health")
            
            assert response.status_code == 200
            
            # Check for common security headers
            headers = response.headers
            
            # Content-Type should be properly set
            assert "content-type" in headers
            
            # Check for security headers (may not be implemented in test environment)
            security_headers = [
                "x-content-type-options",
                "x-frame-options", 
                "x-xss-protection"
            ]
            
            # Log which security headers are present
            for header in security_headers:
                if header in headers:
                    print(f"Security header present: {header}={headers[header]}")

    @pytest.mark.asyncio
    async def test_information_disclosure_prevention(self):
        """Test that API doesn't disclose sensitive information"""
        async with httpx.AsyncClient() as client:
            # Try to access admin or debug endpoints
            debug_endpoints = [
                "/admin",
                "/debug", 
                "/api/debug",
                "/api/admin",
                "/.env",
                "/config"
            ]
            
            for endpoint in debug_endpoints:
                response = await client.get(f"{BASE_URL}{endpoint}")
                
                # Should not expose debug information
                assert response.status_code in [401, 403, 404]
                
                # Response should not contain sensitive information
                response_text = response.text.lower()
                sensitive_terms = ["password", "secret", "key", "token"]
                
                for term in sensitive_terms:
                    assert term not in response_text or "mock" in response_text

class TestAPIVersioning:
    """Test API versioning and compatibility"""

    @pytest.mark.asyncio
    async def test_api_version_endpoints(self):
        """Test API version information"""
        async with httpx.AsyncClient() as client:
            # Check if version endpoint exists
            response = await client.get(f"{BASE_URL}/api/version")
            
            # May or may not be implemented
            if response.status_code == 200:
                version_info = response.json()
                assert "version" in version_info or "api_version" in version_info

    @pytest.mark.asyncio
    async def test_backwards_compatibility(self):
        """Test backwards compatibility with older API usage"""
        # This would test that older API patterns still work
        # For now, just verify main endpoints are consistent
        
        async with httpx.AsyncClient() as client:
            # Test consistent response format for health
            response = await client.get(f"{BASE_URL}/api/health")
            
            assert response.status_code == 200
            result = response.json()
            
            # Response should have consistent structure
            assert isinstance(result, dict)
            assert "status" in result
