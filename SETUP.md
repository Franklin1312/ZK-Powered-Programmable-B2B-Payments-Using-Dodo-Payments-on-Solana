# Colosseum - Setup & Troubleshooting Guide

## Quick Start

### 1. Start the Backend
```bash
cd backend
npm install  # (if not already installed)
node src/index.js
```

Expected output:
```
Starting backend server...
✓ All required environment variables set
✓ Routes loaded successfully
✓ Backend listening on 0.0.0.0:3001
✓ Health check: GET /health
```

### 2. Start the Frontend
In a separate terminal:
```bash
cd frontend
npm install  # (if not already installed)
npm run dev
```

Expected output:
```
VITE v7.3.2 ready in 237 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://0.0.0.0:5173/
```

### 3. Make Ports Public (GitHub Codespaces)
1. Open the Ports panel: `Ctrl+Shift+P` → "Ports: Focus on Ports View"
2. For both port 5173 (frontend) and 3001 (backend):
   - Right-click → "Change Visibility" → "Public"

### 4. Access the App
- Frontend URL: `https://<codespace-name>-5173.app.github.dev`
- Backend API: `https://<codespace-name>-3001.app.github.dev/api`

## Troubleshooting

### Issue: "502 Bad Gateway"
**Cause**: Port is not set to Public in Codespaces

**Solution**:
1. Open Ports panel
2. Find port 5173
3. Right-click → "Change Visibility" → "Public"
4. Refresh the page

### Issue: Backend fails to start
**Diagnosis**: Run the diagnostic test
```bash
cd backend
node test-server.js
```

This will check:
- Environment variables (SOLANA_RPC, PROGRAM_ID)
- Required dependencies
- Required files (IDL, ZK files)
- Network binding

### Issue: API calls fail (404 errors)
**Cause**: Backend is not running or not accessible

**Solutions**:
1. Ensure backend is running on port 3001
2. Verify port 3001 is set to Public in Codespaces
3. Check that API URL is correct
4. In browser console (F12), check the actual URL being called

### Issue: Frontend won't load after "npm run dev"
**Solution**: Check for build errors
1. Look at the terminal where you ran `npm run dev`
2. Share any error messages shown there

### Issue: Process exits with code 130
**Cause**: Usually SIGINT (Ctrl+C) or system interrupt

**Solution**:
1. Make sure you're not pressing Ctrl+C accidentally
2. Try the diagnostic test: `node backend/test-server.js`
3. Check for port conflicts: `lsof -i :3001` or `lsof -i :5173`

## Local Testing (without Codespaces)
Both servers work on localhost:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

The frontend will automatically detect localhost and use the correct API URL.

## Environment Variables
Backend requires these in `.env`:
- `PORT` (default: 3001)
- `SOLANA_RPC` (Solana RPC endpoint)
- `PROGRAM_ID` (Anchor program ID)
- `PAYER_PRIVATE_KEY` (Payer keypair)
- `RECIPIENT_PRIVATE_KEY` (Recipient keypair)
- `USDC_MINT` (USDC token mint address)

All are pre-configured in `.env` files.

## Files Modified for Codespaces Support
1. `/backend/src/index.js` - Added 0.0.0.0 binding and diagnostics
2. `/frontend/vite.config.js` - Added 0.0.0.0 binding
3. `/frontend/src/utils/api.js` - Dynamic API URL detection
4. `/backend/src/services/zk.js` - Fixed JSON file loading
5. `/backend/src/services/solana.js` - Fixed program initialization
6. `/frontend/public/index.html` - Fixed script source path

## Quick Health Check
```bash
# Check backend health
curl http://localhost:3001/health

# Check frontend (should return HTML page)
curl http://localhost:5173
```

## Still Having Issues?
1. Run the diagnostic: `node backend/test-server.js`
2. Check browser console: Press F12 in the frontend
3. Check terminal output where you started the servers
4. Share any error messages or log output
