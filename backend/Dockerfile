# Use a Python base image
FROM python:3.9-slim-buster

WORKDIR /app

# COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Port: 8000
EXPOSE 8000 # Using 8000 as a placeholder for the backend's listening port.

# Command to run Python application.
CMD ["python", "main.py"]
