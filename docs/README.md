# pic-to-3D

# Tripo3D Lightweight Mesh Generator

A lightweight, stateless web application designed to convert 1–3 reference images of furniture or interior objects into a 3D model (`.obj`) using the Tripo3D API. Features an interactive WebGL 3D preview viewport and instant file downloads with zero monthly hosting costs.

---

## Features

* **Image Upload:** Drag-and-drop 1 to 3 reference photos (`.jpg`, `.png`, `.webp`).
* **Secure API Proxy:** Next.js Serverless routes isolate and protect the Tripo3D API key from client-side exposure.
* **3D Web Preview:** Interactive WebGL viewport (orbit, zoom, reset camera) to inspect generated meshes directly in the browser.
* **Direct `.obj` Download:** One-click export for downstream 3D/BIM workflows.
* **Zero Infrastructure Cost:** Fully stateless, client-session based architecture optimized for Vercel's Free Tier.

---

## Tech Stack

* **Framework:** Next.js 14 (App Router, TypeScript)
* **Styling:** Tailwind CSS + Lucide React Icons
* **3D Viewer Engine:** `@google/model-viewer` / Three.js
* **API Integration:** Tripo3D REST API
* **Deployment:** Vercel

---

## Getting Started

### Prerequisites

* Node.js 18.x or later
* `npm`, `pnpm`, or `yarn`
* A Tripo3D API Key (`TRIPO_API_KEY`)

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/tripo3d-mesh-generator.git](https://github.com/your-username/tripo3d-mesh-generator.git)
   cd tripo3d-mesh-generator

1. Install dependencies:

Bash
npm install

2. Configure environment variables:
Create a .env.local file in the root directory:

Bash
TRIPO_API_KEY=your_tripo3d_api_key_here

3. Run the development server:

Bash
npm run dev

4. Open http://localhost:3000 in your browser.

# Project Structure
├── app/
│   ├── api/
│   │   ├── generate/          # Tripo3D task creation proxy route
│   │   └── task/[id]/         # Task polling proxy route
│   ├── layout.tsx             # Root layout & theme setup
│   ├── page.tsx               # Main single-page UI
│   └── globals.css            # Tailwind & custom glassmorphism styles
├── components/                # React UI & 3D WebGL viewport components
├── docs/                      # System specifications (PRD, Design, Brief)
└── public/                    # Static assets

# Deployment
Deploy directly to Vercel:
1.Push your repository to GitHub.
2.Import the project into your Vercel Dashboard.
3.Set TRIPO_API_KEY in Project Settings -> Environment Variables.
4.Click Deploy.