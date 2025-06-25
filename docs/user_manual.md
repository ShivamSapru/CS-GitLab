# ☁️ Azure Blob Storage

## 1. Set Up Azure Storage Account in Azure Portal

1.  **Log in to Azure Portal:** Go to [portal.azure.com](https://portal.azure.com).

2.  **Create a Storage Account:**
    * In the Azure Portal search bar, type "Storage accounts" and select it.
    * Click `+ Create`.
    * Fill in the required details:
        * **Subscription:** Choose your Azure subscription.
        * **Resource group:** Create a new one or select an existing one (e.g., `subtitle-translator-rg`).
        * **Storage account name:** Choose a globally unique name (e.g., `mysubtitlestorage123`). This name will be part of your blob URLs.
        * **Region:** Select a region close to you or your users (e.g., `uksouth`).
        * **Performance:** Standard (for general purpose).
        * **Redundancy:** Locally-redundant storage (LRS) is fine for development.
    * Click `Review + Create`, then `Create`. Wait for the deployment to complete.

3.  **Create Blob Containers:**
    Once your storage account is deployed:
    * Navigate to your newly created Storage Account.
    * In the left-hand menu, under "Data storage," select `Containers`.
    * Click `+ Container` to create two new containers:
        * **Name:** `original-subtitles`
        * **Public access level:** `Private (no anonymous access)`
        * Click `Create`.
        * Repeat for the second container:
        * **Name:** `translated-subtitles`
        * **Public access level:** `Private (no anonymous access)`
        * Click `Create`.

4.  **Get the Connection String:**
    Your application will use a connection string to authenticate with the Storage Account.
    * In your Storage Account, in the left-hand menu, under "Security + networking," select `Access keys`.
    * You will see `key1` and `key2`. Copy the **Connection string** for `key1`. This is a long string that starts with `DefaultEndpointsProtocol=https;...`. Keep this safe!

## 2. Configure Environment Variables (`storage/.env`)

Now, you'll create a new `.env` file specifically for your Azure Storage connection string.

1.  **Create `storage/.env` file:** In the root of your project (`CS-GitLab/CS-GitLab`), create a new directory named `storage` if it doesn't exist. Inside the `storage` directory, create a new file named `.env`.

2.  **Add Connection String:** Open `CS-GitLab/CS-GitLab/storage/.env` and add the following line, replacing `YOUR_AZURE_STORAGE_CONNECTION_STRING` with the value you copied from the Azure Portal:

    ```
    AZURE_STORAGE_CONNECTION_STRING=YOUR_AZURE_STORAGE_CONNECTION_STRING
    ```

    *Example:*

    ```
    AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=mysubtitlestorage123;AccountKey=AbcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcDEF/GHIJKLMN+OPQRSTUVWXY/Z==;EndpointSuffix=core.windows.net
    ```

3.  **Ensure `backend/.env` is also present:** Remember your `backend/.env` file (located in `CS-GitLab/CS-GitLab/backend/.env`)

---

## 🚀 Docker Deployment

Follow these steps to get the application up and running on your local machine using Docker Compose.

### Prerequisites

* **Git:** [Install Git](https://git-scm.com/downloads)

* **Docker Desktop:** [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

* **Azure Translator Resource:** You will need an active Azure AI Translator resource. Obtain its **Subscription Key** and **Region**.

* **Google Cloud Project & OAuth Credentials:**
    * Create a Google Cloud Project if you don't have one.
    * Enable the Google People API.
    * Create OAuth 2.0 Client IDs (Web application type).
    * **Authorized JavaScript origins:** `http://localhost:3000`
    * **Authorized redirect URIs:** `http://localhost:8000/auth/callback`

### 1. Clone the Repository

First, clone the project repository to your local machine:

```bash
git clone [https://gitlab.com/](https://gitlab.com/)<your-username>/CS-GitLab.git # Replace with your actual GitLab URL
cd CS-GitLab/CS-GitLab
```

### 2. Configure Environment Variables

The application uses `.env` files for configuration. You need to create these files in specific locations:

* **`./backend/.env`**: For backend-specific settings (Azure Translator, Google OAuth, Session Key, Database URL, Debug mode).

* **`./storage/.env`**: For Azure Blob Storage connection string.

---

### 3. Run the Application with Docker Compose

Navigate to the root directory of your cloned repository (`CS-GitLab/CS-GitLab`) in your terminal or PowerShell and run the following commands:

#### a. Clean up previous runs (optional, but recommended for fresh start)

```bash
docker compose down --volumes --rmi all
```

This command stops and removes all containers, networks, and volumes, and removes all images built by `docker compose build`. Useful for a clean slate.

#### b. Build the Docker images

```bash
docker compose build --no-cache
```

This command builds the Docker images for your `backend` and `frontend` services from scratch, ensuring all code changes and dependencies are picked up.

#### c. Start all services

```bash
docker compose up
```

This command will start all services defined in your `docker-compose.yml` file (`db`, `backend`, `frontend`). You will see logs from all services in your terminal.

---

## 🌍 Accessing the Application

Once `docker compose up` is running and all services are stable:

* **Frontend Application:** Open your web browser and go to `http://localhost:3000`

* **Backend API Documentation (Swagger UI):** Open your web browser and go to `http://localhost:8000/docs`
