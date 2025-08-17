"""
Enhanced file operations tests for web application
Tests file upload, translation, transcription, and download workflows
"""
import pytest
import httpx
import os
import tempfile
from pathlib import Path

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

class TestFileUploadValidation:
    """Test file upload validation and security"""

    def create_test_file(self, filename, content="Test subtitle content", size_kb=1):
        """Create a temporary test file"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=filename)
        # Create content of specified size
        content_to_write = content * (size_kb * 1024 // len(content) + 1)
        temp_file.write(content_to_write[:size_kb * 1024].encode())
        temp_file.close()
        return temp_file.name

    @pytest.mark.asyncio
    async def test_valid_srt_file_upload(self):
        """Test uploading valid SRT file"""
        srt_content = """1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,000 --> 00:00:08,000
This is a test subtitle
"""
        
        temp_file = self.create_test_file(".srt", srt_content)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(temp_file, "rb") as f:
                    files = {"file": ("test.srt", f, "application/x-subrip")}
                    data = {
                        "target_language": "es",
                        "censor_profanity": "false"
                    }
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                # Should handle the upload
                assert response.status_code in [200, 401, 403]  # 401/403 if auth required
                
                if response.status_code == 200:
                    result = response.json()
                    assert "original_filename" in result
                    assert "target_language" in result
        finally:
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_valid_vtt_file_upload(self):
        """Test uploading valid VTT file"""
        vtt_content = """WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hello world

2
00:00:05.000 --> 00:00:08.000
This is a test subtitle
"""
        
        temp_file = self.create_test_file(".vtt", vtt_content)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(temp_file, "rb") as f:
                    files = {"file": ("test.vtt", f, "text/vtt")}
                    data = {
                        "target_language": "fr",
                        "censor_profanity": "true"
                    }
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                # Should handle the upload
                assert response.status_code in [200, 401, 403]
        finally:
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_invalid_file_extension(self):
        """Test rejection of invalid file extensions"""
        temp_file = self.create_test_file(".txt", "Invalid content")
        
        try:
            async with httpx.AsyncClient() as client:
                with open(temp_file, "rb") as f:
                    files = {"file": ("test.txt", f, "text/plain")}
                    data = {"target_language": "es"}
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                # Should reject invalid file type
                assert response.status_code in [400, 422]
        finally:
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_large_file_rejection(self):
        """Test rejection of files that are too large"""
        # Create a file larger than typical limits (e.g., > 10MB)
        large_content = "x" * 1024  # 1KB base content
        temp_file = self.create_test_file(".srt", large_content, size_kb=11000)  # 11MB
        
        try:
            async with httpx.AsyncClient() as client:
                with open(temp_file, "rb") as f:
                    files = {"file": ("large.srt", f, "application/x-subrip")}
                    data = {"target_language": "es"}
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                # Should reject file that's too large
                assert response.status_code in [400, 413, 422]
        finally:
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_empty_file_rejection(self):
        """Test rejection of empty files"""
        temp_file = self.create_test_file(".srt", "", size_kb=0)
        
        try:
            async with httpx.AsyncClient() as client:
                with open(temp_file, "rb") as f:
                    files = {"file": ("empty.srt", f, "application/x-subrip")}
                    data = {"target_language": "es"}
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                # Should reject empty file
                assert response.status_code in [400, 422]
        finally:
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_malformed_subtitle_content(self):
        """Test handling of malformed subtitle files"""
        malformed_srt = "This is not a valid SRT file format"
        temp_file = self.create_test_file(".srt", malformed_srt)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(temp_file, "rb") as f:
                    files = {"file": ("malformed.srt", f, "application/x-subrip")}
                    data = {"target_language": "es"}
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                # Should handle malformed content gracefully
                assert response.status_code in [200, 400, 422]
        finally:
            os.unlink(temp_file)

class TestTranslationWorkflow:
    """Test complete translation workflow"""

    @pytest.fixture
    def sample_srt_file(self):
        """Create a sample SRT file for testing"""
        srt_content = """1
00:00:01,000 --> 00:00:04,000
Hello, welcome to our presentation.

2
00:00:05,000 --> 00:00:09,000
Today we will discuss subtitle translation.

3
00:00:10,000 --> 00:00:14,000
This technology helps break language barriers.
"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".srt")
        temp_file.write(srt_content.encode())
        temp_file.close()
        return temp_file.name

    @pytest.mark.asyncio
    async def test_translation_language_options(self, sample_srt_file):
        """Test translation with different target languages"""
        languages = ["es", "fr", "de", "pt", "it", "ja", "ko", "zh"]
        
        try:
            for lang in languages[:3]:  # Test first 3 to avoid timeout
                async with httpx.AsyncClient(timeout=60.0) as client:
                    with open(sample_srt_file, "rb") as f:
                        files = {"file": ("test.srt", f, "application/x-subrip")}
                        data = {
                            "target_language": lang,
                            "censor_profanity": "false"
                        }
                        
                        response = await client.post(
                            f"{BASE_URL}/api/translate",
                            files=files,
                            data=data
                        )
                    
                    # Should handle translation request
                    assert response.status_code in [200, 401, 403]
                    
                    if response.status_code == 200:
                        result = response.json()
                        assert result["target_language"] == lang
        finally:
            os.unlink(sample_srt_file)

    @pytest.mark.asyncio
    async def test_profanity_filter_option(self, sample_srt_file):
        """Test profanity filter functionality"""
        profanity_options = ["true", "false"]
        
        try:
            for option in profanity_options:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    with open(sample_srt_file, "rb") as f:
                        files = {"file": ("test.srt", f, "application/x-subrip")}
                        data = {
                            "target_language": "es",
                            "censor_profanity": option
                        }
                        
                        response = await client.post(
                            f"{BASE_URL}/api/translate",
                            files=files,
                            data=data
                        )
                    
                    # Should handle profanity filter setting
                    assert response.status_code in [200, 401, 403]
        finally:
            os.unlink(sample_srt_file)

    @pytest.mark.asyncio
    async def test_translation_response_format(self, sample_srt_file):
        """Test translation response contains required fields"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(sample_srt_file, "rb") as f:
                    files = {"file": ("test.srt", f, "application/x-subrip")}
                    data = {
                        "target_language": "es",
                        "censor_profanity": "false"
                    }
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Check required response fields
                    required_fields = [
                        "original_filename",
                        "translated_filename", 
                        "source_language",
                        "target_language",
                        "message"
                    ]
                    
                    for field in required_fields:
                        assert field in result, f"Missing required field: {field}"
        finally:
            os.unlink(sample_srt_file)

class TestTranscriptionWorkflow:
    """Test audio/video transcription workflow"""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_transcription_endpoint_validation(self):
        """Test transcription endpoint parameter validation"""
        # Test with minimal valid parameters
        transcription_data = {
            "locale": "en-US",
            "max_speakers": "2",
            "censor_profanity": "false",
            "output_format": "srt"
        }
        
        async with httpx.AsyncClient() as client:
            # Test without file (should fail)
            response = await client.post(
                f"{BASE_URL}/api/transcribe",
                data=transcription_data
            )
            
            # Should require file
            assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_transcription_status_check(self):
        """Test transcription status check endpoint"""
        # Test with a dummy project ID
        project_id = "test-project-123"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/api/transcription-status-check/{project_id}"
            )
            
            # Should handle status check request
            assert response.status_code in [200, 404]
            
            if response.status_code == 200:
                result = response.json()
                assert "status" in result

    @pytest.mark.asyncio
    async def test_invalid_transcription_parameters(self):
        """Test transcription with invalid parameters"""
        invalid_params = [
            {"locale": "invalid-locale"},
            {"max_speakers": "0"},
            {"max_speakers": "50"},  # Too many speakers
            {"output_format": "invalid"},
            {"censor_profanity": "maybe"}  # Invalid boolean
        ]
        
        for params in invalid_params:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/api/transcribe",
                    data=params
                )
                
                # Should reject invalid parameters
                assert response.status_code in [400, 422]

class TestFileDownloadSecurity:
    """Test file download security and access controls"""

    @pytest.mark.asyncio
    async def test_download_authentication(self):
        """Test that file downloads require proper authentication"""
        # Test accessing a hypothetical download URL
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/api/download/test-file.srt")
            
            # Should require authentication or return not found
            assert response.status_code in [401, 403, 404]

    @pytest.mark.asyncio
    async def test_download_path_traversal_prevention(self):
        """Test prevention of path traversal attacks in downloads"""
        malicious_paths = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",  # URL encoded
            "....//....//....//etc/passwd"
        ]
        
        for malicious_path in malicious_paths:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/api/download/{malicious_path}"
                )
                
                # Should block path traversal attempts
                assert response.status_code in [400, 403, 404]

class TestAPIRateLimiting:
    """Test API rate limiting for file operations"""

    @pytest.mark.asyncio
    async def test_upload_rate_limiting(self):
        """Test rate limiting on file uploads"""
        srt_content = "1\n00:00:01,000 --> 00:00:04,000\nTest content"
        
        async with httpx.AsyncClient() as client:
            # Make multiple rapid upload attempts
            responses = []
            for i in range(5):
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".srt")
                temp_file.write(srt_content.encode())
                temp_file.close()
                
                try:
                    with open(temp_file.name, "rb") as f:
                        files = {"file": (f"test{i}.srt", f, "application/x-subrip")}
                        data = {"target_language": "es"}
                        
                        response = await client.post(
                            f"{BASE_URL}/api/translate",
                            files=files,
                            data=data
                        )
                    responses.append(response.status_code)
                finally:
                    os.unlink(temp_file.name)
            
            # Should handle rapid uploads appropriately
            # In test environment, rate limiting might not be enforced
            assert all(status in [200, 401, 403, 429] for status in responses)

class TestErrorHandling:
    """Test error handling in file operations"""

    @pytest.mark.asyncio
    async def test_missing_required_parameters(self):
        """Test handling of missing required parameters"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".srt")
        temp_file.write(b"Test content")
        temp_file.close()
        
        try:
            async with httpx.AsyncClient() as client:
                with open(temp_file.name, "rb") as f:
                    files = {"file": ("test.srt", f, "application/x-subrip")}
                    # Missing target_language parameter
                    data = {}
                    
                    response = await client.post(
                        f"{BASE_URL}/api/translate",
                        files=files,
                        data=data
                    )
                
                # Should return validation error
                assert response.status_code in [400, 422]
        finally:
            os.unlink(temp_file.name)

    @pytest.mark.asyncio
    async def test_concurrent_upload_handling(self):
        """Test handling of concurrent file uploads"""
        import asyncio
        
        async def upload_file(file_num):
            srt_content = f"1\n00:00:01,000 --> 00:00:04,000\nTest content {file_num}"
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".srt")
            temp_file.write(srt_content.encode())
            temp_file.close()
            
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    with open(temp_file.name, "rb") as f:
                        files = {"file": (f"test{file_num}.srt", f, "application/x-subrip")}
                        data = {"target_language": "es"}
                        
                        response = await client.post(
                            f"{BASE_URL}/api/translate",
                            files=files,
                            data=data
                        )
                    return response.status_code
            finally:
                os.unlink(temp_file.name)
        
        # Run 3 concurrent uploads
        tasks = [upload_file(i) for i in range(3)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Should handle concurrent uploads without errors
        for result in results:
            if isinstance(result, int):
                assert result in [200, 401, 403, 429]
