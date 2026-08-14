# pic to 3D

A local-first Next.js tool that turns a furniture reference photo into a textured 3D model with the Tripo v3 API. The first milestone supports a single photo and downloads a `.glb` file for inspection and sizing in Blender.

## What works now

- Quick single-photo mode (`JPG`, `PNG`, or `WebP`, up to 20 MB)
- Server-only Tripo API key handling
- Tripo v3.1 image-to-model generation
- Live task progress
- Immediate browser caching of the completed GLB before Tripo's temporary URL expires
- Interactive 3D preview and GLB download
- Optional Tripo Segmentation v2 after generation, with a 40-credit confirmation and separate original/segmented downloads
- Next.js 16 / React 19 foundation
- Blender 5.2 LTS **Prepare for Revit** extension with segmented-part merging, one-material consolidation, automatic 20K decimation, dimension scaling, transform application, and OBJ export at scale 1.0

No Tripo credits are used when the page opens. A paid API task starts only when **Generate 3D model** is clicked.

## Run locally on Windows

Requirements: Node.js 24 LTS. Docker and VS Code are not required.

1. Open PowerShell in this project folder.
2. Install packages:

   ```powershell
   npm.cmd install
   ```

3. Keep the private key in `.env.local`:

   ```ini
   TRIPO_API_KEY=tsk_your_real_key
   ```

   Quotes are optional for a simple key. Do not use a `NEXT_PUBLIC_` prefix. `.env.local` is ignored by Git; `.env.example` contains only a safe placeholder.

4. Start the app:

   ```powershell
   npm.cmd run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Checks

```powershell
npm.cmd run lint
npm.cmd run build
```

Automated checks never submit a paid Tripo generation.

## Planned workflow

```text
Photo(s) -> Tripo base model -> optional segmentation -> optional retopology
         -> Blender scale/material check -> tested Revit 2027 import path

Segmentation is semantic part separation rather than guaranteed material recognition. It can split useful furniture parts such as cushions, legs, and frames, which can then be reviewed and assigned materials in Blender.
```

See [docs/ROADMAP.md](docs/ROADMAP.md) for milestones and architecture decisions.

## Blender to Revit helper

Install the extension ZIP from `blender_extension/dist`, then open the **pic to 3D** tab in Blender's 3D Viewport sidebar. The extension preserves the original mesh and creates a prepared copy.

See [blender_extension/README.md](blender_extension/README.md) for installation and usage. In Revit 2027, import the exported OBJ with **Import Units: Meters**.

## Security

- The Tripo key is read only inside server routes.
- Never paste the real key into source code, screenshots, issues, or commits.
- Before pushing, verify with `git status --short` and `git check-ignore -v .env.local`.
- If the key is ever committed or shared publicly, revoke it in Tripo and create a new one.
