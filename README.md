# ClydeTools Pro Starter

A full-stack starter for a privacy-focused document utility website.

## Features

- React + Vite + Tailwind frontend
- Express backend
- IP-based rate limiting with `express-rate-limit`
- Upload PDF, JPG, PNG, and WEBP files
- Convert images to PDF pages
- Merge PDFs and images into one final PDF
- Temporary processing folders
- Auto-cleanup for old temp jobs
- No database required

## Project structure

```txt
clydetools-pro/
  frontend/
  backend/
```

## Run backend

```bash
cd backend
npm install
cp .env
npm run dev
```

Backend runs on:

```txt
http://localhost:5000
```

## Run frontend

Open another terminal:

```bash
cd frontend
npm install
cp .env
npm run dev
```

Frontend runs on:

```txt
http://localhost:5173
```

## Backend environment variables

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
MAX_FILES=10
MAX_FILE_MB=10
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=30
```

Rate limit is by IP address. If deployed behind Render, Railway, or another proxy, `app.set("trust proxy", 1)` is enabled.

## API

```txt
POST /api/pdf/combine
```

FormData field:

```txt
files
```

Supported file types:

- PDF
- JPG/JPEG
- PNG
- WEBP

## Security notes

Security baseline:
- HTTPS required in production
- IP-based rate limiting
- Local file upload only; remote URL import disabled
- MIME/type validation for PDF and images
- File size and file count limits
- Randomized temporary filenames
- No user-controlled file paths
- Temporary files deleted after processing
- Safe generic error messages
- Helmet security headers
- Dependency scanning with npm audit