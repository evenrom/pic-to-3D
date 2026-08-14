import importlib.util
import os
import sys
import tempfile

import bpy


extension_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
module_path = os.path.join(extension_dir, "__init__.py")
spec = importlib.util.spec_from_file_location("pic_to_3d_revit_test", module_path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
module.register()


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

settings = bpy.context.scene.pic3d_revit
wood_material = bpy.data.materials.new(name="Test Wood")
alternate_material = bpy.data.materials.new(name="Alternate Wood")

bpy.ops.mesh.primitive_cube_add(location=(-1.5, 0.0, 0.0))
wood_left = bpy.context.active_object
wood_left.name = "Wood Left"
wood_left.data.materials.append(wood_material)

bpy.ops.mesh.primitive_cube_add(location=(1.5, 0.0, 0.0))
wood_right = bpy.context.active_object
wood_right.name = "Wood Right"
wood_right.data.materials.append(alternate_material)

wood_left.select_set(True)
wood_right.select_set(True)
bpy.context.view_layer.objects.active = wood_left
settings.merged_name = "Wood"
settings.merged_material = wood_material
settings.preserve_merge_sources = True

assert bpy.ops.pic3d.merge_selected_parts() == {"FINISHED"}
merged_wood = bpy.context.active_object
assert merged_wood.name == "Wood"
assert merged_wood["pic3d_merged_source_count"] == 2
assert merged_wood["pic3d_merged_material"] == wood_material.name
assert len(merged_wood.data.polygons) == 12
assert len(merged_wood.data.materials) == 1
assert merged_wood.data.materials[0] is wood_material
assert all(polygon.material_index == 0 for polygon in merged_wood.data.polygons)
assert wood_left.name in bpy.data.objects and wood_left.hide_get() and wood_left.hide_render
assert wood_right.name in bpy.data.objects and wood_right.hide_get() and wood_right.hide_render
merged_part_count = merged_wood["pic3d_merged_source_count"]

for scene_object in tuple(bpy.data.objects):
    bpy.data.objects.remove(scene_object, do_unlink=True)

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=7, radius=1.0)
source = bpy.context.active_object
source.name = "TestChair"
source.scale = (2.0, 1.5, 1.0)

settings.target_triangles = 20_000
settings.dimension_mode = "HEIGHT"
settings.known_dimension_m = 0.74
settings.hide_original = True

assert bpy.ops.pic3d.analyze_selected() == {"FINISHED"}
original_triangles = settings.last_original_triangles
assert original_triangles > 20_000

assert bpy.ops.pic3d.prepare_revit_copy() == {"FINISHED"}
prepared = bpy.context.active_object
assert prepared is not source
assert source.name in bpy.data.objects
assert source.hide_get()
assert prepared.name.startswith("TestChair_Revit_20k")
assert abs(prepared.dimensions.z - 0.74) < 1e-4
assert all(abs(component - 1.0) < 1e-6 for component in prepared.scale)

final_triangles = module.triangle_count(prepared.data)
assert 19_000 <= final_triangles <= 21_000, final_triangles
assert prepared["pic3d_obj_export_scale"] == 1.0
assert prepared["pic3d_obj_forward_axis"] == "X"
assert prepared["pic3d_obj_up_axis"] == "Z"
assert prepared["pic3d_revit_import_units"] == "Meters"

output_path = os.path.join(tempfile.gettempdir(), "pic-to-3d-revit-test.obj")
for candidate in (output_path, os.path.splitext(output_path)[0] + ".mtl"):
    if os.path.exists(candidate):
        os.remove(candidate)

assert bpy.ops.pic3d.export_revit_obj(filepath=output_path) == {"FINISHED"}
assert os.path.exists(output_path)
assert os.path.getsize(output_path) > 0

vertices = []
with open(output_path, "r", encoding="utf-8") as exported_obj:
    for line in exported_obj:
        if line.startswith("v "):
            vertices.append(tuple(float(value) for value in line.split()[1:4]))

assert vertices
exported_z_span = max(vertex[2] for vertex in vertices) - min(vertex[2] for vertex in vertices)
assert abs(exported_z_span - 0.74) < 1e-3, exported_z_span

print(
    "PIC3D_TEST_OK",
    {
        "original_triangles": original_triangles,
        "final_triangles": final_triangles,
        "height_m": prepared.dimensions.z,
        "exported_z_span": exported_z_span,
        "obj_bytes": os.path.getsize(output_path),
        "merged_parts": merged_part_count,
    },
)

module.unregister()
