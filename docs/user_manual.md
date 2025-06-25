## 🛠️ Getting Started

### Step 0: Create Your Environment File

1. Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and insert the necessary credentials using the steps below.

---

## 🔐 Authentication Setup

This app supports two types of login:

* **Google OAuth 2.0 Login**
* **Email + Password Login**

FastAPI sessions are secured using cookie-based sessions via `SessionMiddleware`.

### Step 1: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (or create a new one).
3. Navigate to: `APIs & Services > Credentials`.
4. Click **Create Credentials > OAuth client ID**.
5. Choose **Web application**.
6. Under **Authorized JavaScript origins**, add:

   * `http://localhost:3000`
7. Under **Authorized redirect URIs**, add:

   * `http://localhost:8000/auth/callback`
8. Save and copy:

   * **Client ID**
   * **Client Secret**

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

### Step 2: Session Secret Key

Generate a secure key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Add this to your `.env` file:

```env
SESSION_SECRET_KEY=your_generated_secret_key
```

---

## 🌐 Azure AI Translator Setup

To enable subtitle translation:

1. Go to [Azure Portal](https://portal.azure.com/).
2. Navigate to **Create a resource > AI + Machine Learning > Translator**.
3. Fill in the required fields:

   * **Resource Name**: e.g., `subtitle-translator-api`
   * **Region**: e.g., `northeurope`
   * **Pricing Tier**: Choose **F0 (free)** or **S1 (standard)**
4. Click **Review + Create**, then **Create**.
5. Once the resource is created:

   * Go to **Keys and Endpoint**
   * Copy:

     * **Key 1**
     * **Region**
     * **Endpoint** (e.g., `https://api.cognitive.microsofttranslator.com/`)

Add these to your `.env` file:

```env
AZURE_SUBSCRIPTION_KEY=your_key_1
AZURE_REGION=your_region
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_LANGUAGES_URL=https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation
```

---

## Integrating with PostgreSQL

### Step 1: Install PostgreSQL:
https://www.postgresql.org/download/

Create a new database (eg. Subtitle_translator) from pgAdmin

### Step 2: Update .env:
In your .env file, add the following:
```env
DATABASE_URL=postgresql+psycopg2://<username>:<password>@localhost:5432/<your_db_name>
```

### Step 3: Install psycpog2:
```bash
pip install psycopg2-binary
```

### Step 4: Initialize the DB Tables:
From the /backend directory, run:
```bash
python init_db.py
``` 

### Optional: Test DB Connection:
You can test if your database is connected by hitting this FastAPI endpoint:
```bash
GET http://localhost:8000/db-test
```
If successful, it will return:
```json
{ "message": "Database connection successful" }
```

## Running the Project

### Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Start the Frontend

```bash
cd frontend
npm install
npm run dev
```
---

## 🚀 Setup and Installation

Follow these steps to get the application up and running on your local machine using Docker Compose.

### Prerequisites

* **Git:** [Install Git](https://git-scm.com/downloads)

* **Docker Desktop:** [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)

* **Azure Translator Resource**

* **Google Cloud Project & OAuth Credentials**

### 1. Clone the Repository

First, clone the project repository to your local machine: git clone [https://gitlab.com/](https://github.com/ShivamSapru/CS-GitLab.git)

### 2. Configure Environment Variables

The application uses `.env` files for configuration. You need to create these files in specific locations:

* **`./backend/.env`**: For backend-specific settings (Azure Translator, Google OAuth, Session Key, Database URL, Debug mode).

* **`./storage/.env`**: For Azure Blob Storage connection string.

---

### 3. Run the Application with Docker Compose

Navigate to the root directory of your cloned repository (`CS-GitLab`) in your terminal or PowerShell and run the following commands:

#### a. Clean up previous runs (optional, but recommended for fresh start)
docker compose down --volumes --rmi all

This command stops and removes all containers, networks, and volumes, and removes all images built by `docker compose build`.

#### b. Build the Docker images
docker compose build --no-cache

This command builds the Docker image services from scratch.

#### c. Start all services

docker compose up

This command will start all services defined in `docker-compose.yml` file (`db`, `backend`, `frontend`). You will see logs from all services in your terminal.

---

## 🌍 Accessing the Application

Once `docker compose up` is running and all services are stable:

* **Frontend Application:** Open your web browser and go to `http://localhost:3000`

* **Backend API Documentation (Swagger UI):** Open your web browser and go to `http://localhost:8000/docs`

---
