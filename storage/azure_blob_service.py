import os
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient
from azure.core.exceptions import ResourceExistsError
# from dotenv import load_dotenv

# Load environment variables from .env file (for local dev)
# load_dotenv()

# Configuration
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
if not AZURE_STORAGE_CONNECTION_STRING:
    print("Error: AZURE_STORAGE_CONNECTION_STRING environment variable not set.")
    exit(1)

ORIGINAL_SUBTITLES_CONTAINER = "original-subtitles"
TRANSLATED_SUBTITLES_CONTAINER = "translated-subtitles"

# Initialize Azure Blob Service Client
try:
    blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    print("Azure Blob Storage client initialized.")
except Exception as e:
    print(f"Critical Error: Failed to initialize Azure Blob Storage client: {e}")
    exit(1)

def get_container_client(container_name: str) -> ContainerClient:
    """Retrieves a ContainerClient, ensuring the container exists with private access."""
    container_client = blob_service_client.get_container_client(container_name)
    try:
        container_client.create_container(public_access="off")
    except ResourceExistsError:
        pass
    except Exception as e:
        if "InvalidHeaderValue" in str(e) and "x-ms-blob-public-access" in str(e) and "off" in str(e):
            print(f"Info: Container '{container_name}' already exists and is private. (Harmless warning): {e}")
        else:
            print(f"Warning: Could not ensure container '{container_name}' exists: {e}")
    return container_client

# --- Blob Operations (Core Functions for App) ---

def upload_subtitle_file(
    container_name: str,
    user_id: str,
    project_id: str,
    file_name: str,
    file_content_bytes: bytes
) -> str | None:
    """Uploads a subtitle file using user_id/project_id/file_name structure."""
    container_client = get_container_client(container_name)
    blob_name = f"{user_id}/{project_id}/{file_name}"
    blob_client: BlobClient = container_client.get_blob_client(blob_name)

    try:
        blob_client.upload_blob(file_content_bytes, overwrite=True)
        print(f"Uploaded '{blob_name}' to '{container_name}'.")
        return blob_name
    except Exception as e:
        print(f"Error uploading '{blob_name}': {e}")
        return None

def download_subtitle_file(
    container_name: str,
    user_id: str,
    project_id: str,
    file_name: str
) -> bytes | None:
    """Downloads a subtitle file."""
    container_client = get_container_client(container_name)
    blob_name = f"{user_id}/{project_id}/{file_name}"
    blob_client: BlobClient = container_client.get_blob_client(blob_name)

    try:
        download_stream = blob_client.download_blob()
        file_data = download_stream.readall()
        print(f"Downloaded '{blob_name}' from '{container_name}'.")
        return file_data
    except Exception as e:
        print(f"Error downloading '{blob_name}'. It might not exist or there's an access issue. Details: {e}")
        return None

def list_subtitle_files(
    container_name: str,
    user_id: str | None = None,
    project_id: str | None = None
) -> list[str]:
    """Lists subtitle files, optionally filtered by user_id/project_id."""
    container_client = get_container_client(container_name)
    
    prefix = ""
    if user_id:
        prefix += f"{user_id}/"
        if project_id:
            prefix += f"{project_id}/"

    blobs_list = []
    try:
        for blob in container_client.list_blobs(name_starts_with=prefix):
            blobs_list.append(blob.name)
        print(f"Listed {len(blobs_list)} blobs in '{container_name}' with prefix '{prefix}'.")
        return blobs_list
    except Exception as e:
        print(f"Error listing blobs in '{container_name}': {e}")
        return []

def delete_subtitle_file(
    container_name: str,
    user_id: str,
    project_id: str,
    file_name: str
) -> bool:
    """Deletes a subtitle file."""
    container_client = get_container_client(container_name)
    blob_name = f"{user_id}/{project_id}/{file_name}"
    blob_client: BlobClient = container_client.get_blob_client(blob_name)

    try:
        blob_client.delete_blob()
        print(f"Deleted '{blob_name}' from '{container_name}'.")
        return True
    except Exception as e:
        print(f"Error deleting '{blob_name}': {e}")
        return False

# Example Usage (for testing this module directly)
if __name__ == "__main__":
    print("\n--- Running Azure Blob Storage Examples ---")

    test_user_id = "demo_user_alpha"
    test_project_id = "test_project_beta"
    original_file_name = "test_input.srt"
    translated_file_name = "test_output.fr.srt"
    original_content = b"1\n00:00:00,000 --> 00:00:02,000\nThis is original content."
    translated_content = b"1\n00:00:00,000 --> 00:00:02,000\nCeci est le contenu traduit."

    print("\nAttempting to upload original subtitle...")
    upload_subtitle_file(ORIGINAL_SUBTITLES_CONTAINER, test_user_id, test_project_id, original_file_name, original_content)

    print("\nAttempting to upload translated subtitle...")
    upload_subtitle_file(TRANSLATED_SUBTITLES_CONTAINER, test_user_id, test_project_id, translated_file_name, translated_content)

    print(f"\nListing original subtitles for {test_user_id}/{test_project_id}...")
    files = list_subtitle_files(ORIGINAL_SUBTITLES_CONTAINER, user_id=test_user_id, project_id=test_project_id)
    for f in files: print(f"- {f}")

    print(f"\nDownloading original subtitle '{original_file_name}'...")
    data = download_subtitle_file(ORIGINAL_SUBTITLES_CONTAINER, test_user_id, test_project_id, original_file_name)
    if data: print(f"Downloaded content:\n{data.decode('utf-8')}")

    print(f"\nAttempting to delete translated subtitle '{translated_file_name}'...")
    delete_subtitle_file(TRANSLATED_SUBTITLES_CONTAINER, test_user_id, test_project_id, translated_file_name)

    print("\n--- Examples Finished ---")
