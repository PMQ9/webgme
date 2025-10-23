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
        echo "Creating and starting MongoDB container with persistent storage..."
        docker run --name webgme-mongo -d -p 27017:27017 -v webgme-data:/data/db mongo:4.4
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to start MongoDB container."
            echo "Please ensure Docker is running."
            exit 1
        fi
        echo "MongoDB container created and started with persistent volume 'webgme-data'."
        echo "Your project data will persist across container restarts."
    fi
fi

echo ""
echo "[2/2] Starting WebGME server..."
echo ""
echo "WebGME will be available at:"
echo "  http://127.0.0.1:8888"
echo ""
echo "Press Ctrl+C to stop the server (auto-backup will run)."
echo "======================================"
echo ""

# Function to handle backup on exit
cleanup() {
    echo ""
    echo ""
    echo "======================================"
    echo "Server stopped. Creating backup..."
    echo "======================================"
    echo ""

    # Create backup directory with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="mongodb-backup/backup_${TIMESTAMP}"

    echo "Creating backup in ${BACKUP_DIR}..."

    # Create backup directory
    mkdir -p mongodb-backup

    # Backup the database
    if docker exec webgme-mongo mongodump --out=/dump --quiet 2>/dev/null; then
        if docker cp webgme-mongo:/dump "${BACKUP_DIR}" 2>/dev/null; then
            echo "Backup created: ${BACKUP_DIR}"

            # Keep only the last 5 backups
            cd mongodb-backup 2>/dev/null
            ls -t | grep backup_ | tail -n +6 | xargs -r rm -rf 2>/dev/null
            cd .. 2>/dev/null
        else
            echo "Backup failed - could not copy files."
        fi
    else
        echo "Backup skipped - MongoDB container not accessible."
    fi

    echo ""
    echo "Done!"
    echo ""
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT INT TERM

npm start
