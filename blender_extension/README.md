# Prepare for Revit — Blender 5.2 LTS extension

This extension turns a selected generated mesh into a lightweight, correctly scaled OBJ for Autodesk Revit 2027.

## Default workflow

- Preserve the original mesh.
- Create a separate prepared copy.
- Calculate `target triangles / current triangles` automatically.
- Reduce the copy to approximately 20,000 triangles.
- Optionally set no dimensions, one known dimension with uniform scaling, or all three dimensions.
- Apply object scale.
- Export selected geometry as OBJ with scale `1.0`.
- Import the OBJ in Revit with **Import Units: Meters**.

## Install

1. In Blender 5.2, open **Edit → Preferences → Extensions**.
2. Open the Extensions menu and choose **Install from Disk**.
3. Select `pic_to_3d_revit-0.2.1.zip` from the `dist` folder.
4. Enable **pic to 3D - Prepare for Revit** if Blender does not enable it automatically.
5. In the 3D Viewport, press `N` and open the **pic to 3D** tab.

## Use

### Combine segmented parts by material

1. In **Object Mode**, select two or more related segmented mesh objects, such as every wooden frame part. Use `Shift` while clicking to add objects to the selection.
2. Make the part whose material you want to reuse the active object, or choose a material explicitly in **One Material**.
3. Enter a result name such as `Wood`, `Cushions`, or `Metal`.
4. Keep **Preserve Source Parts** enabled for a safe, reversible workflow.
5. Click **Merge Selected into One Part**.

The extension creates one Blender object with one material slot. Preserved source parts are hidden in the viewport and render. Replacing several image-textured Tripo materials with one material can change their appearance because their textures and UV layouts may differ; a reusable procedural or correctly mapped Blender material gives the most consistent result.

### Prepare and export for Revit

1. Select the generated mesh.
2. Click **Analyze Selected**.
3. Keep **Target Triangles** at `20000`.
4. Choose the available dimension information:
   - **None:** keep the current size and adjust manually.
   - **Width**, **Depth**, or **Height:** enter one real measurement; scaling stays uniform.
   - **Width, Depth, Height:** enter all three; this can distort the model if the generated proportions differ.
5. Click **Prepare Revit Copy**.
6. Inspect the new object named `_Revit_20k`. The original is preserved and hidden by default.
7. Click **Export Selected OBJ** and choose a destination. The Revit-tested preset uses scale `1.0`, Forward `X`, and Up `Z`.
8. In Revit 2027, use **Import CAD**, select the OBJ, and choose **Import Units: Meters**.

The extension does not call Tripo and does not spend API credits.
