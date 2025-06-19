# Use a Python base image
FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# # Using 8000 as a placeholder for the backends listening port.
EXPOSE 8000

# Run Python application
CMD ["python", "main.py"]
