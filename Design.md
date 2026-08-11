# Design.md - Visual Design & UI Specifications

## 1. Design System & Visual Identity
* **Theme:** Modern Dark Mode / High-Tech Glassmorphism.
* **Backdrop:** Deep Slate/Navy background (`#0F172A`) with subtle radial gradients.
* **Panels:** Translucent dark cards with background blur (`backdrop-blur-md`), faint border highlighting (`border-white/10`).

## 2. Color Palette
* **Background Primary:** `#0F172A` (Slate 900)
* **Surface Containers:** `rgba(30, 41, 59, 0.7)` (Slate 800 with 70% opacity)
* **Primary Accent:** `#6366F1` (Indigo 500 - Buttons & Active States)
* **Accent Hover:** `#4F46E5` (Indigo 600)
* **Text Primary:** `#F8FAFC` (Slate 50)
* **Text Muted:** `#94A3B8` (Slate 400)
* **Status Success:** `#10B981` (Emerald 500)
* **Status Error:** `#EF4444` (Red 500)

## 3. Typography
* **Font Family:** `Inter`, system-ui, sans-serif.
* **Hierarchy:**
  * **H1 Title:** 24px / Bold / Slate 50
  * **Section Headers:** 16px / Semi-Bold / Slate 200
  * **Body Text:** 14px / Regular / Slate 300
  * **Labels & Metadata:** 12px / Medium / Slate 400

## 4. Layout Architecture & Component Structure
┌─────────────────────────────────────────────────────────────────────────┐
│  Header: App Logo & Title                         [API Status: Active]  │
├───────────────────────────────────┬─────────────────────────────────────┤
│ Left Column: Control Panel        │  Right Column: 3D Viewport Canvas   │
│                                   │                                     │
│ ┌───────────────────────────────┐ │ ┌─────────────────────────────────┐ │
│ │ Drag & Drop Upload Zone       │ │ │                                 │ │
│ │ (1 to 3 Images)               │ │ │                                 │ │
│ └───────────────────────────────┘ │ │     Interactive 3D Preview      │ │
│ ┌───────────────────────────────┐ │ │             ( / 3js)            │ │
│ │ Thumbnail Previews (1)(2)(3)  │ │ │                                 │ │
│ └───────────────────────────────┘ │ │                                 │ │
│ ┌───────────────────────────────┐ │ └─────────────────────────────────┘ │
│ │ [ Generate 3D Model ] Button  │ │ ┌─────────────────────────────────┐ │
│ │ (Progress Bar / Status Label) │ │ │ [ Download OBJ ] [ Reset View ] │ │
│ └───────────────────────────────┘ │ └─────────────────────────────────┘ │
└───────────────────────────────────┴─────────────────────────────────────┘


## 5. Component Interaction Details
* **Drop Zone:** Highlights with primary accent border (`#6366F1`) on drag-over.
* **Generate Button:** Shows pulsating loader during active API processing.
* **Canvas Viewport:** Includes subtle grid floor and soft ambient lighting for realistic depth perception.