# Use a Python base image
FROM python:3.10-slim-bookworm

# Set the working directory inside the container
WORKDIR /app

# Set environment variables for non-interactive installs
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install ffmpeg and other required system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg gcc libffi-dev libssl-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY ./backend/requirements.txt /app/backend/requirements.txt
RUN pip install -r /app/backend/requirements.txt
RUN pip install --force-reinstall bcrypt cryptography

# Copy the backend and storage folders
COPY ./backend /app/backend
COPY ./storage /app/storage

# Copy .env files
COPY ./.env /app/.env

# Expose the port Uvicorn will run on
EXPOSE 8000

# Run the FastAPI app with Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
