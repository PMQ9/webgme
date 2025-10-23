#!/bin/bash
# Quick start script for WebGME on Unix/Linux/macOS
# This script checks MongoDB and starts the WebGME server

echo "======================================"
echo "WebGME Local Development Starter"
echo "======================================"
echo ""

# Check if MongoDB container is running
echo "[1/2] Checking MongoDB..."
if docker ps --filter "name=webgme-mongo" --format "{{.Names}}" | grep -q "webgme-mongo"; then
    echo "MongoDB container is already running."
else
    # Check if container exists but is stopped
    if docker ps -a --filter "name=webgme-mongo" --format "{{.Names}}" | grep -q "webgme-mongo"; then
        echo "Starting existing MongoDB container..."
        docker start webgme-mongo
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to start MongoDB container."
            exit 1
        fi
        echo "MongoDB container started."
    else
        echo "Creating and starting MongoDB container..."
        docker run --name webgme-mongo -d -p 27017:27017 mongo:4.4
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to start MongoDB container."
            echo "Please ensure Docker is running."
            exit 1
        fi
        echo "MongoDB container created and started."
    fi
fi

echo ""
echo "[2/2] Starting WebGME server..."
echo ""
echo "WebGME will be available at:"
echo "  http://127.0.0.1:8888"
echo ""
echo "Press Ctrl+C to stop the server."
echo "======================================"
echo ""

npm start
