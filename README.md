# Photo Restoration Demo

A minimal, modern demo application for restoring damaged photos using the Sogni Client SDK. Upload a damaged photo and automatically restore it with AI-powered restoration.

## Features

- **Frontend Authentication**: Login/signup using Sogni SDK with session persistence
- **Wallet Integration**: Real-time balance display, payment method switching (Spark/Sogni)
- **Photo Restoration**: Uses Flux Kontext model for high-quality restoration
- **Before/After Comparison**: Side-by-side view of original and restored images
- **Mobile Optimized**: Beautiful responsive design that works on all devices
- **One-Click Workflow**: Upload → Restore → Download

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **SDK**: `@sogni-ai/sogni-client` v4.0.0-alpha.27+
- **Backend**: Express.js

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend

Create `server/.env`:

```
SOGNI_USERNAME=your_username
SOGNI_PASSWORD=your_password
SOGNI_ENV=production
PORT=3001
CLIENT_ORIGIN=https://restoration-local.sogni.ai
```

### 3. Setup Local HTTPS (One-time setup)

Run the automated setup script:

```bash
./scripts/setup-local.sh
```

This script will:
- Add `restoration-local.sogni.ai` to your `/etc/hosts` file
- Create SSL certificates (shared with other Sogni projects)
- Install nginx configuration
- Reload nginx

**Browser Certificate Warning:** Your browser will show a security warning about the self-signed certificate. Click **"Advanced"** → **"Proceed"** to continue. This is normal for local development.

*Optional: To trust the certificate system-wide:*
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  /opt/homebrew/etc/nginx/ssl/sogni-local.crt
# Restart your browser after running this
```

### 4. Run Development Servers

```bash
# Terminal 1 - Backend
npm run server:dev

# Terminal 2 - Frontend
npm run dev
```

### 5. Access the Application

Visit **https://restoration-local.sogni.ai** (not localhost!)

The nginx reverse proxy routes:
- `https://restoration-local.sogni.ai` → Frontend (Vite on port 5173)
- `https://restoration-local.sogni.ai/api/*` → Backend (Express on port 3001)

## Project Structure

```
sogni-image-demo/
├── src/
│   ├── components/
│   │   ├── auth/          # Authentication components
│   │   ├── UploadZone.tsx
│   │   ├── ImagePreview.tsx
│   │   └── OutOfCreditsPopup.tsx
│   ├── services/          # Business logic
│   ├── hooks/             # React hooks
│   ├── utils/             # Utilities
│   └── styles/            # Mobile responsive CSS
├── server/                # Express backend
└── public/
```

## Usage

1. Sign in or create an account
2. Upload a damaged photo (drag & drop or click to browse)
3. Click "Restore Photo"
4. Wait for restoration to complete
5. Download the restored image

## Restoration Model

Uses **Flux Kontext** (`flux1-dev-kontext_fp8_scaled`) with:
- Restoration-focused prompts
- 24 steps, 5.5 guidance
- `contextImages` array (Kontext-specific)

## License

MIT

