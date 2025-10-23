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
        echo Creating and starting MongoDB container...
        docker run --name webgme-mongo -d -p 27017:27017 mongo:4.4
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Failed to start MongoDB container.
            echo Please ensure Docker Desktop is running.
            pause
            exit /b 1
        )
        echo MongoDB container created and started.
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
echo Press Ctrl+C to stop the server.
echo ======================================
echo.

npm start
