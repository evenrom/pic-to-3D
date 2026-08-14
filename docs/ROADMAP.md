# pic to 3D — implementation roadmap

Last updated: 2026-08-14

## Product decisions

- Start locally before deploying.
- Keep two generation paths: **Quick single photo** and **Accurate multiview**.
- Generate and approve the complete model first. Segmentation is an optional paid follow-up task.
- Prefer Tripo retopology for repeatable automated mesh reduction; keep Blender for visual checks, corrections, sizing, and edge cases.
- Dimensions are optional. A later Blender helper will support zero, one, or three known dimensions without blocking manual adjustment.
- Target Autodesk Revit 2027. The final import/family workflow must be tested in Revit 2027 rather than inferred from generic CAD advice.

## Milestone 0 — safe local foundation

Status: complete

- Confirm `.env.local` is ignored and not tracked.
- Install and verify Node.js 24 LTS.
- Upgrade to Next.js 16 and React 19.
- Replace the obsolete lint setup and establish clean lint/build checks.

## Milestone 1 — Quick single photo

Status: complete; paid generation and recovery tested

- Upload one image to the Tripo v3 File API.
- Submit an image-to-model task using model `v3.1-20260211`.
- Poll every two seconds and show real progress.
- Retrieve the completed GLB immediately and cache it in browser memory.
- Preview, rotate, and download the GLB.
- Test with one real furniture image and record generation quality, duration, credits, and file size.

Acceptance criteria:

- The API key never reaches browser code or Git.
- A clear furniture photo produces a previewable and downloadable GLB.
- Errors are understandable and do not reveal credentials.
- The task ID remains in the URL so a completed result can be recovered after a refresh without buying a new generation.

## Milestone 2 — Accurate multiview

Status: next

- Add named image slots for front, left, back, and right.
- Require the front plus at least one additional view.
- Upload each image and call Tripo v3 multiview-to-model.
- Explain capture consistency: same object, lighting, distance, and orientation.
- Compare one single-photo result against multiview for proportion accuracy and cost.

## Milestone 3 — optional model processing

Status: segmentation implemented; paid result validation remains

Processing starts only after the base model succeeds and the user opts in.

- **Segmentation:** the app calls `/v3/mesh/segment` with the base task ID, v2 semantic segmentation, balanced granularity, and connectivity splitting. A confirmation warns about the current 40-credit charge before the request is sent. The original and segmented GLBs remain separately previewable and downloadable. A paid furniture test must still validate whether the resulting parts correspond usefully to material zones; segmentation is not guaranteed to understand every upholstery, wood, metal, or glass boundary.
- **Retopology:** offer a target face-count preset after visual approval. Compare Tripo retopology against Blender Decimate on representative furniture before making it the default.
- Keep the original GLB available so optional processing never destroys the preferred version.

## Milestone 4 — Blender preparation helper

Status: first version implemented and tested in Blender 5.2 LTS

- Create a Blender add-on or script with three dimension modes:
  - No dimensions: import unchanged and adjust manually.
  - One known dimension: uniform scale from width, depth, or height.
  - Width/depth/height known: detect inconsistent proportions and require an explicit choice before non-uniform scaling.
- Apply transforms, set sensible origin/ground position, inspect normals, and report triangle count.
- Preserve material slots created by generation or segmentation.
- Export a controlled intermediate format for the Revit test matrix.

Implemented baseline:

- Merge any selected segmented mesh parts into one named object with one chosen material while preserving and hiding the source parts by default.
- Preserve the original object and create a separate prepared copy.
- Calculate the Decimate ratio dynamically for a default target of 20,000 triangles.
- Support no known dimensions, one known dimension with uniform scaling, or all three dimensions.
- Apply scale transforms and export selected geometry as OBJ at scale 1.0, Forward `X`, and Up `Z`. Two furniture imports showed that `-X` reversed the intended front in Revit 2027.
- Standardize Revit 2027 OBJ import on explicit **Meters**, not Auto-Detect.

## Milestone 5 — Revit 2027 validation

Status: planned

- Build a small test matrix using simple, textured, segmented, and optimized furniture assets.
- Measure import reliability, material behavior, file size, viewport performance, render appearance, and family reuse.
- Choose the supported Blender export and Revit family workflow based on actual Revit 2027 results.
- Document exact units, axis orientation, material mapping, and face-count limits.

## Milestone 6 — deployment and operations

Status: deferred until local workflow is proven

- Deploy to Vercel with `TRIPO_API_KEY` stored as a server-side environment variable.
- Account for hosted request-body and function-duration limits; use direct/large-file upload tokens if needed.
- Add private access control before putting the tool on a public URL.
- Add minimal task persistence only if real usage shows that refresh recovery is necessary.
- Add credit estimates and processing confirmations before optional paid steps.

## Fundamental changes we should remain open to

- Use GLB, not OBJ, as the internal master format because it carries mesh, textures, and PBR materials in one file. Convert only at the Blender/Revit boundary.
- Add short-lived persistence if in-memory browser caching proves too fragile.
- Move long-running processing to a durable workflow if serverless time limits make polling/proxying unreliable.
- Replace Tripo processing stages individually if another provider produces materially better furniture topology, segmentation, or cost.
