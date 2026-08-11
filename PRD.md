# PRD.md - Product Requirements Document

## 1. Product Overview
The **Tripo3D Lightweight Mesh Generator** is a single-user web utility designed to convert 1–3 reference images of furniture/objects into a textured 3D model (`.obj`) via the Tripo3D API. It features an integrated 3D WebGL preview viewport and direct file download capabilities, running on a zero-infrastructure-cost serverless architecture.

## 2. Core Objectives
* Provide a clean interface for uploading 1–3 reference photos.
* Securely process generation requests via Tripo3D API without exposing credentials.
* Render an interactive 3D preview (`.obj` / `.glb`) directly in the browser.
* Allow instant downloading of the generated `.obj` model file.
* Maintain zero monthly hosting and database costs on Vercel.

## 3. User Persona & Scope
* **User:** Interior Designer / Individual 3D Modeler.
* **Scope:** Single-user application, stateless session lifecycle, manual image submission, on-demand generation.

## 4. Functional Specifications

### 4.1 Image Input & Validation
* **Drag-and-Drop Zone:** Accepts 1 to 3 images (`.jpg`, `.png`, `.webp`).
* **Validation Rules:** Maximum file size 10MB per image. Client-side aspect ratio and format validation.
* **Preview Thumbnails:** Displays uploaded thumbnails with an individual remove (`X`) button.

### 4.2 Generation Engine & Tripo3D API Integration
* **Trigger:** "Generate 3D Model" button enabled once at least 1 image is uploaded.
* **Serverless Processing Proxy:** Next.js API route (`/api/generate`) proxies requests to Tripo3D API.
* **Task Polling:** Client-side polling interval (every 2.5 seconds) checking task status (`queued`, `running`, `success`, `failed`).
* **Progress Feedback:** Visual progress bar with percentage and state labels (e.g., "Uploading...", "Drafting Mesh...", "Finalizing Geometry...").

### 4.3 Interactive 3D Web Preview
* **Viewport Component:** Embedded WebGL container rendering the generated 3D mesh.
* **Interaction Controls:**
  * 360-degree rotation (orbit control).
  * Zoom (scroll/pinch).
  * Auto-rotate toggle.
  * Reset View camera control.

### 4.4 Asset Export
* **Download Button:** Single-click download trigger for the final `.obj` file (and associated textures/materials if provided in payload).
* **Reset Workflow:** Option to clear current session and start a new model generation.

## 5. Non-Functional Specifications
* **Performance:** First Contentful Paint (FCP) < 1.2s; initial bundle size < 200KB (excluding 3D viewer library).
* **Security:** API Key strictly encapsulated inside serverless environment variables (`TRIPO_API_KEY`).
* **Cost:** 100% compliant with Vercel Free Tier limits. Zero database requirement.