# WebGME Local Setup Guide

This guide will help you set up and run WebGME locally on your machine.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (>= 14, LTS recommended)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

3. **Docker Desktop** (for MongoDB)
   - Download from: https://www.docker.com/products/docker-desktop
   - Alternative: Install MongoDB directly from https://www.mongodb.com/try/download/community

4. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## Quick Start (Automated)

### Windows
```bash
# First time only: Install dependencies
npm install

# Start WebGME (checks MongoDB and starts server)
start-local.bat
```

### Linux/macOS
```bash
# First time only: Install dependencies
npm install

# Make script executable (first time only)
chmod +x start-local.sh

# Start WebGME (checks MongoDB and starts server)
./start-local.sh
```

The automated script will:
1. Check if MongoDB container is running
2. Start/create MongoDB container if needed
3. Start the WebGME server

Access WebGME at: **http://127.0.0.1:8888**

## Manual Setup (Step-by-Step)

### Step 1: Start MongoDB

#### Option A: Using Docker (Recommended)
```bash
# Start MongoDB container
docker run --name webgme-mongo -d -p 27017:27017 mongo:4.4

# Verify it's running
docker ps
```

To stop MongoDB later:
```bash
docker stop webgme-mongo
```

To start it again:
```bash
docker start webgme-mongo
```

To remove the container:
```bash
docker stop webgme-mongo
docker rm webgme-mongo
```

#### Option B: Using Local MongoDB Installation
If you installed MongoDB directly:

**Windows:**
```bash
# Start MongoDB service
net start MongoDB
```

**Linux/macOS:**
```bash
# Start MongoDB daemon
sudo systemctl start mongod
# or
mongod --dbpath /path/to/data/directory
```

### Step 2: Install Dependencies

Run this only once (or when dependencies change):

```bash
npm install
```

This will:
- Install Node.js packages (~1110 packages)
- Install Bower components (~24 packages)
- Generate distribution build files
- Take approximately 10-15 minutes on first run

### Step 3: Start WebGME Server

```bash
npm start
```

The server will start and display:
```
Server is listening ...
Valid addresses of gme web server:
  http://127.0.0.1:8888
```

### Step 4: Access WebGME

Open your browser and navigate to:
- **http://127.0.0.1:8888**

You should see the WebGME interface with a login/project selection dialog.

## Troubleshooting

### MongoDB Connection Issues

**Error: "Failed to connect to MongoDB"**

Solutions:
1. Verify MongoDB is running:
   ```bash
   # Docker
   docker ps | grep mongo

   # Local MongoDB
   # Windows: Check Services for "MongoDB"
   # Linux: sudo systemctl status mongod
   ```

2. Check if port 27017 is available:
   ```bash
   # Windows
   netstat -an | findstr "27017"

   # Linux/macOS
   lsof -i :27017
   ```

3. Ensure Docker Desktop is running (if using Docker)

### Port 8888 Already in Use

**Error: "Port 8888 is already in use"**

Solutions:
1. Stop the process using port 8888
2. Or change the port in `config/config.default.js`:
   ```javascript
   config.server.port = 9999; // Use different port
   ```

### Dependencies Installation Fails

**Error during `npm install`**

Solutions:
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

2. Delete `node_modules` and reinstall:
   ```bash
   # Windows
   rmdir /s /q node_modules

   # Linux/macOS
   rm -rf node_modules

   # Reinstall
   npm install
   ```

3. Check Node.js version is >= 14:
   ```bash
   node --version
   ```

### Bower Components Not Installing

**Error: "Failed to install bower components"**

Solution:
```bash
# Manually install bower components
npm run bower
```

## Stopping WebGME

1. Press `Ctrl+C` in the terminal where the server is running
2. Stop MongoDB (if you want):
   ```bash
   # Docker
   docker stop webgme-mongo

   # Windows service
   net stop MongoDB

   # Linux/macOS
   sudo systemctl stop mongod
   ```

## Configuration

### Using Custom Configuration

Create a custom config file:

1. Copy the default config:
   ```bash
   # Windows
   copy config\config.default.js config\config.mine.js

   # Linux/macOS
   cp config/config.default.js config/config.mine.js
   ```

2. Edit `config/config.mine.js` with your settings

3. Start server with custom config:
   ```bash
   # Windows
   set NODE_ENV=mine & npm start

   # Linux/macOS
   NODE_ENV=mine npm start
   ```

### Common Configuration Options

Edit `config/config.default.js` or your custom config:

```javascript
// Change server port
config.server.port = 8888;

// Enable authentication
config.authentication.enable = true;

// Change MongoDB connection
config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme';

// Enable add-ons
config.addOns.enable = true;
```

See [config/README.md](config/README.md) for full configuration reference.

## Development Workflow

### Running Tests

```bash
# Server-side tests (Mocha)
npm test

# Browser tests (Karma)
npm run test_browser

# With coverage report
npm run test_cover
```

### Building Distribution Files

```bash
npm run build
```

### Compiling TypeScript Definitions

```bash
npm run compile
```

### Debug Mode

Enable detailed logging:

**Windows:**
```bash
set DEBUG=gme:* & npm start
```

**Linux/macOS:**
```bash
DEBUG=gme:* npm start
```

Specific debug filters:
- `DEBUG=gme:*storage*` - Storage operations
- `DEBUG=gme:*plugin*` - Plugin execution
- `DEBUG=gme:*server*` - Server operations

## Daily Development Routine

1. **Start MongoDB** (if not running):
   ```bash
   docker start webgme-mongo
   # or use the automated script
   ```

2. **Start WebGME**:
   ```bash
   npm start
   # or use start-local.bat / start-local.sh
   ```

3. **Open browser**: http://127.0.0.1:8888

4. **Stop server**: `Ctrl+C` when done

## Additional Resources

- **WebGME Documentation**: https://webgme.readthedocs.io/
- **WebGME Engine**: https://github.com/webgme/webgme-engine
- **WebGME CLI**: https://github.com/webgme/webgme-cli
- **Configuration Guide**: [config/README.md](config/README.md)
- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Architecture Overview**: [CLAUDE.md](CLAUDE.md)

## Getting Help

- Check existing issues: https://github.com/webgme/webgme/issues
- WebGME Wiki: https://github.com/webgme/webgme/wiki
- WebGME Forum: https://groups.google.com/forum/#!forum/webgme

## Next Steps

After successful setup:

1. **Create a project**: Use the WebGME UI to create your first project
2. **Explore examples**: Check the tutorial projects
3. **Read documentation**: https://webgme.readthedocs.io/
4. **Try webgme-cli**: For creating plugins, visualizers, etc.
   ```bash
   npm install -g webgme-cli
   webgme --help
   ```
