# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a demo application showcasing AI-powered photo restoration using the Sogni Client SDK. The app uses a dual-authentication architecture with a React frontend and Express backend, proxied through nginx for local HTTPS development.

## Development Commands

### Setup
```bash
npm install                    # Install frontend dependencies
npm run server:install         # Install backend dependencies (runs automatically via prepare hook)
./scripts/setup-local.sh       # One-time HTTPS setup for local development
```

### Development
```bash
npm run dev                    # Start frontend dev server (Vite on port 5173)
npm run server:dev             # Start backend dev server (Express on port 3001)
```

Both servers must run simultaneously. Access via `https://restoration-local.sogni.ai` (not localhost).

### Build & Deploy
```bash
npm run build                  # Build frontend (TypeScript check + Vite build)
npm run preview                # Preview production build
npm run server:start           # Start backend in production mode
```

### Linting
```bash
npm run lint                   # ESLint on all TypeScript files
```

## Architecture

### Dual-Client Authentication Pattern

This app uses a unique **dual-client** architecture where BOTH the frontend and backend maintain separate Sogni SDK clients:

1. **Frontend Client** (`src/services/sogniAuth.ts`):
   - Handles user authentication via LoginModal
   - Manages session state and wallet balances
   - Uses `authType: 'cookies'` for persistent sessions
   - **CRITICAL**: SDK has typo - check `isAuthenicated` (missing 't'), not `isAuthenticated`

2. **Backend Client** (`server/services/sogni.js`):
   - Stateless server-side SDK instance
   - Configured via `server/.env` with username/password
   - Handles restoration jobs on behalf of users
   - Independent of frontend authentication

### Why Dual Clients?

The backend client serves as a **restoration service proxy** that can execute jobs even if the frontend loses connection. This architecture enables:
- Resilient job execution
- Server-side job monitoring
- Fallback when frontend WebSocket drops

### Local HTTPS Setup

The app REQUIRES HTTPS for Sogni SDK authentication to work properly:

- **Domain**: `restoration-local.sogni.ai` (mapped in `/etc/hosts`)
- **Nginx**: Reverse proxy handling SSL/TLS termination
- **Certificate**: Self-signed cert at `/opt/homebrew/etc/nginx/ssl/`
- **Routing**:
  - `/` → Vite dev server (port 5173)
  - `/api/*` → Express backend (port 3001)

Setup script (`scripts/setup-local.sh`) automates:
- Adding hosts entry
- Generating SSL certificates
- Configuring nginx
- Reloading nginx

### Restoration Service - Photobooth Pattern

The restoration service (`src/services/restorationService.ts`) uses a **photobooth pattern** for concurrent job execution:

**Key Pattern Elements**:
1. **Pre-allocated Array**: Create placeholder array `new Array(numberOfMedia).fill(null)` before jobs start
2. **Job-to-Index Mapping**: Map SDK job IDs to array indices via `jobMap.set(job.id, index)`
3. **Individual Job Events**: Listen to `jobCompleted` events, NOT just project completion
4. **Immediate UI Updates**: Notify UI with `jobIndex` on each completion so correct placeholder updates

**Critical Code References**:
- Line 170: Pre-allocate `resultUrls` array
- Line 176: Create `jobMap` for ID→index mapping
- Line 182-187: Map existing jobs
- Line 201-208: Map dynamically created jobs via `jobStarted`
- Line 362-433: `jobCompleted` handler with immediate per-job notification
- Line 271-327: Global job event handler with jobIndex tracking

**Why This Pattern?**:
- Enables concurrent job execution (4 images restored in parallel)
- Shows individual progress for each restoration
- Maintains correct ordering in UI
- Avoids race conditions

### Image Restoration Model

Uses **Qwen Image Edit 2511 Lightning** (`qwen_image_edit_2511_fp8_lightning`):
- Input via `contextImages` array (model-specific parameter)
- Fast Lightning variant (5 steps, guidance 1.0)
- Custom prompts focused on photo restoration
- No NSFW filter (model doesn't support it)
- Generates 4 variations by default (user selects favorite)

### State Management

**No Global State Library** - Uses React Context + Custom Hooks:

- `services/sogniAuth.ts`: Central auth state manager with SogniAuthManager class
- `context/ToastContext.tsx`: Toast notifications
- `hooks/useRestoration.ts`: Restoration state and job management
- `hooks/useWallet.ts`: Wallet balance tracking via SDK's `useEntity` hook
- `hooks/useImageUpload.ts`: Image upload and validation

### Tab Synchronization

`services/tabSync.ts` prevents session conflicts when multiple tabs are open:
- Uses `localStorage` events to detect new authenticated tabs
- Shows warning when session transferred to newer tab
- User must refresh old tabs to resume

### Project History & Favorites

**Local-First Architecture**:
- `utils/localProjectsDB.ts`: IndexedDB wrapper for storing restoration history
- `hooks/useLocalProjects.ts`: Manages local project state
- `hooks/useFavorites.ts`: Favorites management (stored separately)
- `hooks/useProjectHistory.ts`: Combines local + remote history from Sogni API

Jobs are saved locally immediately, then synced with remote when available.

## Key Files by Feature

### Authentication
- `src/components/auth/LoginModal/` - Multi-step signup and login forms
- `src/services/sogniAuth.ts` - Frontend auth manager
- `server/routes/auth.js` - Backend auth routes and session checking

### Restoration
- `src/hooks/useRestoration.ts` - Main restoration hook with photobooth pattern
- `src/services/restorationService.ts` - Core restoration logic with Qwen model
- `src/components/ImagePreview.tsx` - Before/after comparison UI
- `src/components/ResultsGridWithSliders.tsx` - Multi-result grid with individual sliders

### Wallet & Credits
- `src/hooks/useWallet.ts` - Balance tracking
- `src/hooks/useCredits.ts` - Cost estimation
- `src/services/creditsService.ts` - Credit calculations and formatting
- `src/components/OutOfCreditsPopup.tsx` - Low balance warning

### Project Management
- `src/components/RecentProjects.tsx` - Gallery view of past restorations
- `src/components/FavoritesView.tsx` - Favorited images
- `src/components/projectHistory/` - Job history components

## Important Notes

### SDK Typos & Quirks
- Authentication check: Use `isAuthenicated` (missing 't'), NOT `isAuthenticated`
- Progress events: Can send values as 0-1 OR 0-100 (normalize in code)
- WebSocket connection: Check `socket?.connected` (property, not method)

### Event Handling Pattern
When listening to SDK project events, ALWAYS:
1. Listen to GLOBAL `sogniClient.projects.on('job', handler)` events
2. Filter by `event.projectId` to only process your project
3. Map job IDs to indices via `jobMap`
4. Pass `jobIndex` in progress callbacks for correct UI updates
5. Clean up listeners on promise resolution

### Environment Variables
Backend requires `server/.env`:
```
SOGNI_USERNAME=your_username
SOGNI_PASSWORD=your_password
SOGNI_ENV=production
PORT=3001
CLIENT_ORIGIN=https://restoration-local.sogni.ai
```

### Common Gotchas
- **HTTPS Required**: Authentication will fail without proper HTTPS setup
- **Dual Servers**: Frontend AND backend must both run during development
- **Nginx Dependency**: Local development requires nginx to be running
- **Job Mapping**: Always use `jobMap` to maintain correct job→index relationship
- **Progress Normalization**: SDK can send progress as 0-1 or 0-100, always normalize
