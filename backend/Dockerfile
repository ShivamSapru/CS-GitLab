# backend/Dockerfile

# Use a Python base image
FROM python:3.10-slim-buster

# Set the working directory inside the container
WORKDIR /app

# Set environment variables for non-interactive installs
ENV PYTHONUNBUFFERED 1 \
    PIP_NO_CACHE_DIR 1 \
    PIP_DISABLE_PIP_VERSION_CHECK 1

COPY ./backend/requirements.txt /app/backend/requirements.txt
RUN pip install -r /app/backend/requirements.txt

# Copy the entire backend and storage application code into the container
# This copies the backend folder and storage folder into /app/
COPY ./backend /app/backend
COPY ./storage /app/storage

# Crucially, copy the .env files into the container at the expected locations
# main.py expects backend/.env inside its directory
# azure_blob_service.py expects storage/.env inside its directory
COPY ./backend/.env /app/backend/.env
COPY ./storage/.env /app/storage/.env

# Expose the port Uvicorn will run on
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

