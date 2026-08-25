# PostgreSQL Setup Guide

This guide will walk you through setting up a PostgreSQL database for the Artisan AI backend, updating dependencies, and running the application with the new configuration.

## 1. Install PostgreSQL
If you haven't already, download and install PostgreSQL for Windows from the [official website](https://www.postgresql.org/download/windows/).
During installation:
- Remember the **password** you set for the default `postgres` user.
- Leave the default port as `5432` unless you have a specific reason to change it.

## 2. Create the Database
Once installed, open **pgAdmin** (which comes with the installation) or use the `psql` command-line tool.
Create a new database named `kala_setu`:
```sql
CREATE DATABASE kala_setu;
```

## 3. Environment Configuration
A `.env` file has been created in the `backend/` directory. Open it and update the `POSTGRES_PASSWORD` with the password you set during the PostgreSQL installation.

```env
USE_POSTGRES=true
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_actual_password_here
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=kala_setu
```

## 4. Install Dependencies
You may need to install the required Python packages for PostgreSQL connection and `.env` file loading.

Open your terminal in the `backend` directory, activate your virtual environment, and run:
```powershell
.\venv\Scripts\activate
pip install psycopg2-binary python-dotenv
```

## 5. Running the Backend
To start the backend using the new `.env` configuration, run uvicorn with the `--env-file` flag:
```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```
Alternatively, if you're using `run.bat`, you might want to modify it to include `--env-file .env` in the backend start command.


