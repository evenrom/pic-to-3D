# Implementation_Brief.md - System Architecture & Technical Specs

## 1. Selected Tech Stack Specification (Option B)
* **Framework:** Next.js 14 (App Router, React 18, TypeScript).
* **Styling:** Tailwind CSS + Lucide React (Icons) + `clsx` / `tailwind-merge`.
* **3D Viewer Engine:** `@google/model-viewer` (or Three.js WebGL canvas wrapper).
* **Hosting & Deployment:** Vercel (Serverless Functions, Zero-Cost Tier).
* **Database:** None (Stateless session execution).

## 2. Directory & File Structure
├── app/
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.ts         # Tripo3D Task Creation Proxy Route
│   │   └── task/[id]/
│   │       └── route.ts         # Tripo3D Polling Proxy Route
│   ├── layout.tsx               # Root Layout & Theme Configuration
│   ├── page.tsx                 # Main Single-Page Interface
│   └── globals.css              # Tailwind Base & Glassmorphism Utilities
├── components/
│   ├── DropZone.tsx             # Image Upload Drag & Drop Component
│   ├── ImagePreviewGroup.tsx    # Uploaded Thumbnail Grid
│   ├── ThreeViewer.tsx          # 3D WebGL Canvas Component
│   ├── ProgressBar.tsx          # Generation Progress & Status Display
│   └── Header.tsx               # Top Bar & Status Badge
├── lib/
│   └── tripo-client.ts          # Tripo3D API Helper Functions
├── public/
│   └── favicon.ico
├── .env.local                   # Local Environment Variables
├── next.config.mjs              # Next.js Configuration
├── package.json                 # Project Dependencies
└── tsconfig.json                # TypeScript Configuration


## 3. API Integration Specifications

### 3.1 Task Creation (`POST /api/generate`)
* **Client Request Payload:** `FormData` containing 1 to 3 image files.
* **Serverless Proxy Behavior:**
  1. Receives images, converts to Base64 or uploads temporarily to Tripo storage endpoint.
  2. Initiates `image_to_model` task via Tripo3D REST API (`https://api.tripo3d.ai/v2/openapi/task`).
  3. Header: `Authorization: Bearer ${process.env.TRIPO_API_KEY}`.
* **Server Response:** `{ taskId: string, status: "queued" | "running" }`.

### 3.2 Task Polling (`GET /api/task/[id]`)
* **Client Behavior:** Polls route every 2,500ms.
* **Serverless Proxy Behavior:**
  1. Queries `https://api.tripo3d.ai/v2/openapi/task/${taskId}`.
  2. Returns normalized status, progress percentage, and output URLs (`obj` / `glb`).
* **Final Success Response:** `{ status: "success", progress: 100, modelUrl: string, outputFormat: "obj" }`.

## 4. Environment Variables
* `TRIPO_API_KEY`: Strictly server-side variable set in Vercel Dashboard / `.env.local`.

## 5. Hard Boundaries & Constraints
* **No Database Migrations:** Do not configure Turso or Prisma. App must remain stateless.
* **No Direct Client API Calls:** Client browser must NEVER call `api.tripo3d.ai` directly to prevent API key leak.
* **Single Deployment Command:** Deployable directly to Vercel via GitHub repository sync.