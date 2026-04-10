#!/bin/bash
# Git Commit & Push Script for Colosseum

cd /workspaces/Colosseum

# Stage all changes
git add -A

# Commit with comprehensive message
git commit -m "feat: Complete frontend and backend setup with Codespaces support

Changes in this session:
- Frontend: Fixed HTML script path, added Vite config for 0.0.0.0 binding
- Frontend: Implemented dynamic API URL detection for Codespaces
- Frontend: All React components (App, pages, components) working
- Backend: Fixed dotenv path resolution, added 0.0.0.0 binding
- Backend: Fixed ZK service to properly load JSON files (fs.readFileSync)
- Backend: Fixed Anchor Program initialization with PROGRAM_ID parameter
- Backend: Added comprehensive error handling and diagnostics
- Backend: Created test server diagnostic tool
- Setup: Created comprehensive SETUP.md with troubleshooting guide
- Git: Updated .gitignore with proper patterns for all project artifacts

Fixes:
- Resolved 502 Bad Gateway errors in Codespaces
- Fixed environment variable loading
- Fixed port binding for container networking
- Fixed JSON file loading in ZK service
- Fixed Anchor Program instantiation"

# Push to GitHub (main branch)
git push origin main

echo "✓ All changes committed and pushed to GitHub!"
