#!/usr/bin/env python3
"""
Debug script to test connection to FastAPI server before running tests
"""
import os
import time
import httpx
import sys

def test_connection(base_url="http://localhost:8000", max_attempts=10):
    """Test connection to FastAPI server"""
    
    print(f"Testing connection to {base_url}")
    print(f"Environment variables:")
    env_vars_to_check = [
        "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_HOSTNAME", "TEST_BASE_URL",
        "AZURE_TRANSLATOR_KEY", "AZURE_TRANSLATOR_ENDPOINT", "AZURE_TRANSLATOR_REGION"
    ]
    for key in env_vars_to_check:
        value = os.getenv(key, 'Not set')
        # Don't show full value for keys, just indicate if set
        if 'KEY' in key:
            display_value = "***SET***" if value != 'Not set' else 'Not set'
        else:
            display_value = value
        print(f"  {key}: {display_value}")
    
    print(f"\nAttempting to connect (max {max_attempts} attempts)...")
    
    for attempt in range(1, max_attempts + 1):
        try:
            response = httpx.get(f"{base_url}/api/health", timeout=5.0)
            print(f"✅ Attempt {attempt}: Success! Status: {response.status_code}")
            if response.status_code == 200:
                json_response = response.json()
                print(f"Response: {json_response}")
                print(f"Azure Translator configured: {json_response.get('azure_translator_key_configured', 'unknown')}")
                return True
            else:
                print(f"Unexpected status code: {response.status_code}")
                print(f"Response text: {response.text}")
        except httpx.ConnectError as e:
            print(f"❌ Attempt {attempt}: Connection failed - {e}")
        except httpx.TimeoutException:
            print(f"⏱️ Attempt {attempt}: Timeout")
        except Exception as e:
            print(f"💥 Attempt {attempt}: Unexpected error - {e}")
        
        if attempt < max_attempts:
            print("   Waiting 2 seconds before retry...")
            time.sleep(2)
    
    print(f"\n❌ Failed to connect after {max_attempts} attempts")
    return False

def test_postgres_connection():
    """Test PostgreSQL connection"""
    try:
        import psycopg2
        conn_params = {
            'host': os.getenv('POSTGRES_HOSTNAME', 'localhost'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'user': os.getenv('POSTGRES_USER'),
            'password': os.getenv('POSTGRES_PASSWORD'),
            'database': os.getenv('POSTGRES_DB')
        }
        
        print(f"\nTesting PostgreSQL connection:")
        print(f"Host: {conn_params['host']}:{conn_params['port']}")
        print(f"User: {conn_params['user']}")
        print(f"Database: {conn_params['database']}")
        
        # Only test if all required params are set
        if all(conn_params.values()):
            conn = psycopg2.connect(**conn_params)
            conn.close()
            print("✅ PostgreSQL connection successful")
            return True
        else:
            print("⚠️ PostgreSQL parameters not fully configured, skipping connection test")
            return None
    except ImportError:
        print("⚠️ psycopg2 not available, skipping PostgreSQL test")
        return None
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False

if __name__ == "__main__":
    base_url = os.getenv("TEST_BASE_URL", "http://localhost:8000")
    
    # Test PostgreSQL first
    postgres_ok = test_postgres_connection()
    
    # Test FastAPI connection
    fastapi_ok = test_connection(base_url)
    
    if fastapi_ok:
        print("\n✅ All connections successful! Ready to run tests.")
        sys.exit(0)
    else:
        print("\n❌ Connection test failed. Check server status.")
        sys.exit(1)
