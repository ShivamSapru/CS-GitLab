# Use a Python base image
FROM python:3.9-slim-buster

WORKDIR /app

# Copy only requirements first for better layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the code
COPY . .

# Port: 8000
EXPOSE 8000

# Command to run Python application.
CMD ["python", "main.py"]
