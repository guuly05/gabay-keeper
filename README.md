# Gabay Keeper

Gabay Keeper is a web-based digital archive for preserving, organizing, and revisiting Somali oral poetry. The project focuses on Gabay and related poetic forms, giving users a private workspace where they can record poem text, authorship metadata, genre, xaraf, tags, source links, footnotes, and shareable visual archive cards.

The application was created as a cultural preservation tool. Somali poetry has historically lived through oral transmission, handwritten notes, recordings, community memory, and scattered online sources. Gabay Keeper brings those fragments into one structured archive so poems can be cataloged with context rather than stored as loose text.

## Table of Contents

- [Purpose](#purpose)
- [Core Features](#core-features)
- [Methodology](#methodology)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Security Model](#security-model)
- [Firebase Storage Notice](#firebase-storage-notice)
- [Local Setup](#local-setup)
- [Firebase Setup](#firebase-setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Quality Checks](#quality-checks)
- [Roadmap](#roadmap)
- [License](#license)

## Purpose

The goal of Gabay Keeper is to provide a respectful and practical digital home for Somali poetic heritage.

Somali poetry is not only literary expression. It can preserve genealogy, social critique, humor, law, memory, conflict, praise, grief, and political history. Many poems are shared orally or stored informally, which makes them vulnerable to being lost, misattributed, or separated from their cultural setting.

Gabay Keeper was built to help with that problem by offering:

- A structured archive for original Somali poem text.
- Metadata fields for poet, genre, xaraf, source, and tags.
- Personal ownership so each user controls their own archive.
- Footnotes for interpretation, explanation, and research notes.
- OCR support for extracting text from scanned documents and images.
- Search and filtering tools for browsing a growing collection.
- Visual card export for sharing preserved poems outside the app.

## Core Features

### Authentication

Users can create an account and sign in with Firebase Authentication using email and password.

### Poem Archiving

Users can preserve poems with:

- Title
- Original Somali text
- Author or poet name
- Genre
- Xaraf
- Source URL
- Tags
- Creation timestamp
- Owner ID

### Search and Filtering

The archive can be searched by title, author, xaraf, genre, and tags. Users can also filter by Somali alphabet letter and poetic genre.

### OCR Document Scan

The app includes OCR support through Tesseract.js and PDF text extraction through PDF.js. This helps convert scanned documents, images, and PDFs into editable poem text.

### Footnotes

Users can add footnotes to poems. Footnotes are useful for translation notes, historical context, difficult vocabulary, alternate versions, and source commentary.

### Shareable Poem Cards

The app can generate visual poem cards using `html-to-image`, allowing users to export selected poem content as an image.

### Dark Mode

The interface includes a dark mode toggle for comfortable reading and archival work.

## Methodology

Gabay Keeper was designed around three principles: preservation, structure, and ownership.

### Preservation

The app treats each poem as a record worth protecting. Instead of saving only plain text, the archive captures context such as genre, xaraf, source, author, and user-created notes. This supports future review, research, and verification.

### Structure

Somali poetry has internal systems of form, sound, and classification. The app reflects this by including genre choices such as Gabay, Geeraar, Jiifto, and Buraanbur, plus xaraf filtering based on the Somali alphabet. This makes the archive easier to browse and more culturally specific than a generic notes app.

### Ownership

Every poem document is tied to the authenticated user who created it. Firestore security rules restrict poem reads and writes to the owner, with a separate admin role for privileged moderation. This keeps personal archives private by default.

## Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn-style UI components
- Lucide React icons
- Motion for animation

### Firebase

- Firebase Authentication for user accounts
- Cloud Firestore for poem and footnote records
- Firebase Security Rules for ownership enforcement

### Document Processing

- Tesseract.js for OCR
- PDF.js for PDF text extraction

### Export

- html-to-image for generating shareable poem cards

### AI Integration

The repository includes client helpers that call `/api/openrouter`, but the browser app does not expose an OpenRouter API key. In production, AI requests should be handled by a backend endpoint that stores `OPENROUTER_API_KEY` server-side.

## Architecture

Gabay Keeper is a client-side React application backed by Firebase services.

```text
Browser
  |
  |-- React + Vite UI
  |-- Firebase Auth client
  |-- Firestore client
  |-- OCR/PDF processing in browser
  |
Firebase
  |
  |-- Authentication
  |-- Firestore: poems
  |-- Firestore: poems/{poemId}/footnotes
```

The core archive flow is:

1. User signs in.
2. App listens for poems owned by the current user.
3. User enters poem text and metadata.
4. App writes the poem to Firestore.
5. Firestore rules verify authentication, ownership, allowed fields, and field sizes.
6. The archive updates in real time.

## Security Model

The security model is based on Firebase Authentication and Firestore Security Rules.

### Firestore Ownership

Each poem must include an `ownerId` field matching the authenticated user's UID. The rules prevent users from creating poems for another account.

### Private Reads

Poem reads are restricted to:

- The owner of the poem
- Admin users with a custom `admin` claim

### Controlled Writes

Poem creation validates:

- Required fields
- Allowed field names
- Title length
- Poem text length
- Tag limits
- Source, author, genre, xaraf, and audio URL sizes
- Server timestamp usage
- Correct owner ID

### Footnotes

Footnotes are stored under each poem and inherit ownership from the parent poem. Only the poem owner can add footnotes, and footnote text is size-limited.

### Secrets

The following files and key types must not be committed:

- `.env`
- Firebase service account JSON files
- Admin SDK credentials
- Private API keys
- `firebase-applet-config.json`

The repository includes `.env.example` and `firebase-applet-config.example.json` as safe templates.

## Firebase Storage Notice

Firebase Storage is not required for the core app.

This project originally included optional voice memo uploads, but Firebase now requires the pay-as-you-go Blaze plan to provision new Cloud Storage for Firebase buckets. Because of that, the live app currently keeps the archive focused on Firestore text records and does not expose Firebase Storage upload controls.

The included `storage.rules` file is a future-ready template if you later enable Firebase Storage. It restricts audio files to the authenticated owner path:

```text
audioMemos/{userId}/{fileName}
```

### No-cost alternatives for audio

If you want voice memo support without Firebase Storage, consider:

- Store only external audio links in Firestore, such as YouTube, Internet Archive, SoundCloud, or a public institutional archive.
- Use GitHub Releases for a small curated demo dataset, then save release asset URLs in Firestore.
- Use Supabase Storage if its free tier fits your needs.
- Use Cloudinary for small media demos, subject to its current free-tier limits.
- Keep audio out of the first public version and add it later when the archive has a clearer hosting plan.

For the current GitHub launch, the safest option is to ship without uploads and describe audio as planned future work.

## Local Setup

### Prerequisites

- Node.js 20 or newer recommended
- npm
- A Firebase project
- Firebase Authentication enabled with Email/Password
- A Firestore database

### Install Dependencies

```bash
npm install
```

## Firebase Setup

1. Create a Firebase project in the Firebase Console.
2. Enable Authentication.
3. Enable Email/Password sign-in.
4. Create a Firestore database.
5. Copy `firebase-applet-config.example.json` to `firebase-applet-config.json`.
6. Fill in your Firebase web app configuration.
7. Deploy Firestore rules:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project your-project-id
```

The current `firebase.json` deploys Firestore rules only. Storage deployment is intentionally not included in the default deploy path because the no-cost launch does not depend on Firebase Storage.

## Environment Variables

Create a local `.env` file if you plan to add backend AI features:

```env
OPENROUTER_API_KEY=your_server_side_openrouter_key
APP_URL=http://localhost:3000
```

Do not use `VITE_OPENROUTER_API_KEY`. Vite exposes `VITE_` variables to the browser bundle.

The current frontend expects any future AI feature to be served through:

```text
/api/openrouter
```

That endpoint is not part of this Vite-only frontend and should be implemented in a backend or serverless environment.

## Running the App

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Deployment

### Build

```bash
npm run build
```

The production build is generated in `dist/`.

### Hosting Options

This app can be hosted on:

- Firebase Hosting
- Vercel
- Netlify
- GitHub Pages with a Vite static build
- Any static hosting provider

If using GitHub Pages, configure the repository to publish the built `dist` output through a GitHub Actions workflow or another static deployment process.

### Before Publishing to GitHub

Run:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

Confirm:

- `.env` is not committed.
- `firebase-applet-config.json` is not committed.
- Service account files are not committed.
- Firestore rules are deployed.
- The OpenRouter key has been rotated if it was ever exposed locally.
- Firebase Storage is not advertised as available unless you have enabled and secured it.

## Project Structure

```text
.
├── components/                  # Reusable UI components
├── lib/                         # Shared helper modules
├── scripts/                     # Administrative scripts
├── src/
│   ├── App.tsx                  # Main application UI and archive workflow
│   ├── main.tsx                 # React entry point
│   └── lib/
│       ├── firebase.ts          # Firebase app, auth, and Firestore setup
│       └── gemini.ts            # Future AI proxy client helpers
├── firebase-applet-config.example.json
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules                # Optional future Storage rules
├── package.json
└── README.md
```

## Quality Checks

### Type Check

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

### Dependency Audit

```bash
npm audit --omit=dev
```

Some audit fixes may require breaking dependency changes. Review those carefully before running `npm audit fix --force`.

## Roadmap

Potential future improvements:

- Backend OpenRouter proxy for translation, extraction, and analysis.
- Public/private poem visibility controls.
- Import/export as JSON or CSV.
- Role-based admin dashboard.
- Version history for edited poems.
- Better OCR cleanup for Somali text.
- Optional external audio URL field.
- Optional media storage integration outside Firebase Storage.
- Automated Firestore rules tests.
- GitHub Actions workflow for build and type-check validation.

## License

No license has been selected yet. Before publishing publicly, choose a license that matches your intent:

- MIT for broad open-source reuse
- Apache-2.0 for permissive reuse with patent language
- GPL-3.0 if derivative works must remain open source
- All rights reserved if you do not want reuse without permission

## Acknowledgments

Gabay Keeper is inspired by the richness of Somali oral literature and the need for careful digital preservation. It is intended as a small but serious step toward making cultural memory easier to protect, search, and share.
