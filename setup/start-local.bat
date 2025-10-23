@echo off
REM Quick start script for WebGME on Windows
REM This script checks MongoDB and starts the WebGME server

echo ======================================
echo WebGME Local Development Starter
echo ======================================
echo.

REM Check if MongoDB container is running
echo [1/2] Checking MongoDB...
docker ps --filter "name=webgme-mongo" --format "{{.Names}}" | findstr /C:"webgme-mongo" > nul

if %ERRORLEVEL% NEQ 0 (
    echo MongoDB container not found. Checking if it exists but is stopped...
    docker ps -a --filter "name=webgme-mongo" --format "{{.Names}}" | findstr /C:"webgme-mongo" > nul

    if %ERRORLEVEL% NEQ 0 (
        echo Creating and starting MongoDB container with persistent storage...
        docker run --name webgme-mongo -d -p 27017:27017 -v webgme-data:/data/db mongo:4.4
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Failed to start MongoDB container.
            echo Please ensure Docker Desktop is running.
            pause
            exit /b 1
        )
        echo MongoDB container created and started with persistent volume 'webgme-data'.
        echo Your project data will persist across container restarts.
    ) else (
        echo Starting existing MongoDB container...
        docker start webgme-mongo
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Failed to start MongoDB container.
            pause
            exit /b 1
        )
        echo MongoDB container started.
    )
) else (
    echo MongoDB container is already running.
)

echo.
echo [2/2] Starting WebGME server...
echo.
echo WebGME will be available at:
echo   http://127.0.0.1:8888
echo.
echo Press Ctrl+C to stop the server (auto-backup will run).
echo ======================================
echo.

npm start

REM Automatically backup when server stops
echo.
echo.
echo ======================================
echo Server stopped. Creating backup...
echo ======================================
echo.

REM Create backup directory with timestamp
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=mongodb-backup\backup_%TIMESTAMP%

echo Creating backup in %BACKUP_DIR%...

REM Create backup directory
if not exist "mongodb-backup" mkdir mongodb-backup

REM Backup the database
docker exec webgme-mongo mongodump --out=/dump --quiet 2>nul
if %ERRORLEVEL% EQU 0 (
    docker cp webgme-mongo:/dump "%BACKUP_DIR%" 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo Backup created: %BACKUP_DIR%

        REM Keep only the last 5 backups
        pushd mongodb-backup 2>nul
        for /f "skip=4 delims=" %%i in ('dir /b /o-d backup_* 2^>nul') do rd /s /q "%%i" 2>nul
        popd
    ) else (
        echo Backup failed - could not copy files.
    )
) else (
    echo Backup skipped - MongoDB container not accessible.
)

echo.
echo Done!
echo.
