![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=white)
![HTML](https://img.shields.io/badge/HTML-E34F26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green.svg)

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
- [Local Setup](#local-setup)
- [Firebase Setup](#firebase-setup)
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


The current `firebase.json` deploys Firestore rules only. Storage deployment is intentionally not included in the default deploy path because the no-cost launch does not depend on Firebase Storage.


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

## License

This project is licensed under the MIT License - see below for details.

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


## Acknowledgments

Gabay Keeper is inspired by the richness of Somali oral literature and the need for careful digital preservation. It is intended as a small but serious step toward making cultural memory easier to protect, search, and share.
