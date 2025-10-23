# WebGME Setup Scripts

This directory contains automated setup scripts and guides for running WebGME locally.

## Files

### Automated Scripts

- **[start-local.bat](start-local.bat)** - Windows quick start script
  - Automatically checks/starts MongoDB Docker container
  - Starts WebGME server
  - Usage: `setup\start-local.bat`

- **[start-local.sh](start-local.sh)** - Linux/macOS quick start script
  - Automatically checks/starts MongoDB Docker container
  - Starts WebGME server
  - Usage: `./setup/start-local.sh`

### Documentation

- **[SETUP.md](SETUP.md)** - Comprehensive setup guide
  - Prerequisites and installation instructions
  - Manual setup steps (if you prefer not to use automated scripts)
  - Troubleshooting common issues
  - Configuration options
  - Development workflow

## Quick Start

### First Time Setup

1. **Install dependencies** (from repository root):
   ```bash
   npm install
   ```
   This takes ~10-15 minutes and installs:
   - ~1110 Node.js packages
   - ~24 Bower components
   - Builds distribution files

2. **Ensure Docker Desktop is running** (if using Docker for MongoDB)

### Starting WebGME

**Windows:**
```bash
setup\start-local.bat
```

**Linux/macOS:**
```bash
chmod +x setup/start-local.sh  # First time only
./setup/start-local.sh
```

The script will:
1. Check if MongoDB container `webgme-mongo` exists
2. Create or start the MongoDB container with persistent storage
3. Start the WebGME server on port 8888
4. **Auto-backup when you stop the server (Ctrl+C)**

### Accessing WebGME

Open your browser and navigate to:
- **http://127.0.0.1:8888**

## What the Scripts Do

### MongoDB Container Management

Both scripts handle MongoDB setup automatically:

1. **Check if container exists**: Looks for a container named `webgme-mongo`
2. **Create if missing**: Runs `docker run --name webgme-mongo -d -p 27017:27017 -v webgme-data:/data/db mongo:4.4`
3. **Start if stopped**: Runs `docker start webgme-mongo`
4. **Skip if running**: Continues to server startup

### Server Startup

After ensuring MongoDB is running, the scripts execute:
```bash
npm start
```

This starts the WebGME server with the default configuration.

### Automatic Backup on Exit

When you stop the server (Ctrl+C), the scripts automatically:
1. Create a timestamped backup in `mongodb-backup/backup_YYYYMMDD_HHMMSS/`
2. Keep only the last 5 backups (older ones are auto-deleted)
3. Display backup location and status

**Note:** Backups are automatically excluded from git (already in `.gitignore`).

## Manual Setup

If you prefer to set up manually or the automated scripts don't work for your environment, see [SETUP.md](SETUP.md) for step-by-step instructions.

## Troubleshooting

### Script Doesn't Run

**Windows:**
- Ensure you're running from the repository root
- Check execution policy: `Get-ExecutionPolicy`
- If restricted, you may need to run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Linux/macOS:**
- Make the script executable: `chmod +x setup/start-local.sh`
- Check for line ending issues if cloned on Windows: `dos2unix setup/start-local.sh`

### Docker Issues

- Ensure Docker Desktop is running
- Check Docker version: `docker --version`
- Verify Docker is accessible: `docker ps`

### MongoDB Connection Fails

- Check if MongoDB container is running: `docker ps | grep mongo`
- Verify port 27017 is not in use: `netstat -an | findstr "27017"` (Windows) or `lsof -i :27017` (Unix)
- Check container logs: `docker logs webgme-mongo`

### Port 8888 Already in Use

- Another WebGME instance may be running
- Kill the process using port 8888 or change the port in `config/config.default.js`

For more troubleshooting, see [SETUP.md](SETUP.md).

## Stopping WebGME

1. Press `Ctrl+C` in the terminal running the server
2. Optionally stop MongoDB:
   ```bash
   docker stop webgme-mongo
   ```

## Daily Workflow

After initial setup, your daily routine is simple:

1. Run the start script: `setup\start-local.bat` or `./setup/start-local.sh`
2. Open browser to http://127.0.0.1:8888
3. Work on your project
4. Stop server with `Ctrl+C` when done

The MongoDB container will remain available and be automatically started by the script on subsequent runs.
