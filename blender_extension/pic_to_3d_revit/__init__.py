import bpy
from bpy.props import (
    BoolProperty,
    EnumProperty,
    FloatProperty,
    IntProperty,
    PointerProperty,
    StringProperty,
)
from bpy.types import Operator, Panel, PropertyGroup
from bpy_extras.io_utils import ExportHelper


TARGET_DEFAULT = 20_000


def triangle_count(mesh):
    return sum(max(0, len(polygon.vertices) - 2) for polygon in mesh.polygons)


def activate_only(context, obj):
    for selected in tuple(context.selected_objects):
        selected.select_set(False)
    obj.hide_set(False)
    obj.select_set(True)
    context.view_layer.objects.active = obj


def dimension_scale_factors(obj, settings):
    dimensions = tuple(obj.dimensions)
    epsilon = 1e-9

    if settings.dimension_mode == "NONE":
        return (1.0, 1.0, 1.0)

    if settings.dimension_mode == "ALL":
        requested = (settings.width_m, settings.depth_m, settings.height_m)
        if any(value <= 0 for value in requested):
            raise ValueError("Width, depth, and height must all be greater than zero.")
        if any(value <= epsilon for value in dimensions):
            raise ValueError("The selected object has a zero dimension and cannot be scaled.")
        return tuple(requested[index] / dimensions[index] for index in range(3))

    axis = {"WIDTH": 0, "DEPTH": 1, "HEIGHT": 2}[settings.dimension_mode]
    current = dimensions[axis]
    if current <= epsilon:
        raise ValueError("The selected object has a zero dimension and cannot be scaled.")
    factor = settings.known_dimension_m / current
    return (factor, factor, factor)


class PIC3D_PG_revit_settings(PropertyGroup):
    merged_name: StringProperty(
        name="Merged Name",
        description="Name for the object created from the selected segmented parts",
        default="Wood",
    )
    merged_material: PointerProperty(
        name="One Material",
        description="Material for the merged object; leave empty to use the active object's active material",
        type=bpy.types.Material,
    )
    preserve_merge_sources: BoolProperty(
        name="Preserve Source Parts",
        description="Hide the selected source parts instead of deleting them after the merged object is created",
        default=True,
    )
    target_triangles: IntProperty(
        name="Target Triangles",
        description="Desired maximum triangle count for the prepared copy",
        default=TARGET_DEFAULT,
        min=500,
        max=2_000_000,
    )
    dimension_mode: EnumProperty(
        name="Known Dimensions",
        description="Use no dimensions, one dimension with uniform scaling, or all three dimensions",
        items=(
            ("NONE", "None", "Keep the current dimensions"),
            ("WIDTH", "Width", "Scale uniformly from a known X dimension"),
            ("DEPTH", "Depth", "Scale uniformly from a known Y dimension"),
            ("HEIGHT", "Height", "Scale uniformly from a known Z dimension"),
            ("ALL", "Width, Depth, Height", "Set all dimensions independently; this can distort proportions"),
        ),
        default="NONE",
    )
    known_dimension_m: FloatProperty(
        name="Dimension",
        description="Known real-world dimension in meters",
        default=1.0,
        min=0.001,
        soft_max=20.0,
        unit="LENGTH",
    )
    width_m: FloatProperty(name="Width", default=1.0, min=0.001, soft_max=20.0, unit="LENGTH")
    depth_m: FloatProperty(name="Depth", default=1.0, min=0.001, soft_max=20.0, unit="LENGTH")
    height_m: FloatProperty(name="Height", default=1.0, min=0.001, soft_max=20.0, unit="LENGTH")
    hide_original: BoolProperty(
        name="Hide Original",
        description="Hide the original object after creating the prepared copy",
        default=True,
    )
    last_original_triangles: IntProperty(name="Original Triangles", default=0, options={"HIDDEN"})
    last_final_triangles: IntProperty(name="Final Triangles", default=0, options={"HIDDEN"})
    last_ratio: FloatProperty(name="Calculated Ratio", default=1.0, options={"HIDDEN"})


class PIC3D_OT_merge_selected_parts(Operator):
    bl_idname = "pic3d.merge_selected_parts"
    bl_label = "Merge Selected into One Part"
    bl_description = "Create one object from the selected mesh parts and assign one material"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return (
            context.mode == "OBJECT"
            and len([obj for obj in context.selected_objects if obj.type == "MESH"]) >= 2
        )

    def execute(self, context):
        settings = context.scene.pic3d_revit
        sources = [obj for obj in context.selected_objects if obj.type == "MESH"]
        active_source = context.active_object if context.active_object in sources else sources[0]

        if any(source.library is not None for source in sources):
            self.report({"ERROR"}, "Linked library objects must be made local before merging.")
            return {"CANCELLED"}

        merged_name = settings.merged_name.strip()
        if not merged_name:
            self.report({"ERROR"}, "Enter a name for the merged object, such as Wood or Cushions.")
            return {"CANCELLED"}

        target_material = settings.merged_material or active_source.active_material
        if target_material is None:
            target_material = bpy.data.materials.new(name=f"{merged_name} Material")

        copies = []
        active_copy = None
        for source in sources:
            duplicate = source.copy()
            duplicate.data = source.data.copy()
            for collection in source.users_collection:
                collection.objects.link(duplicate)
            copies.append(duplicate)
            if source is active_source:
                active_copy = duplicate

        active_copy = active_copy or copies[0]
        for selected in tuple(context.selected_objects):
            selected.select_set(False)
        for duplicate in copies:
            duplicate.hide_set(False)
            duplicate.select_set(True)
        context.view_layer.objects.active = active_copy

        result = bpy.ops.object.join()
        if "FINISHED" not in result:
            for duplicate in copies:
                if duplicate.name in bpy.data.objects:
                    bpy.data.objects.remove(duplicate, do_unlink=True)
            self.report({"ERROR"}, "Blender could not join the selected parts.")
            return {"CANCELLED"}

        merged = context.active_object
        merged.name = merged_name
        merged.data.name = f"{merged_name} Mesh"
        merged.data.materials.clear()
        merged.data.materials.append(target_material)
        for polygon in merged.data.polygons:
            polygon.material_index = 0
        merged["pic3d_merged_source_count"] = len(sources)
        merged["pic3d_merged_material"] = target_material.name

        for source in sources:
            if settings.preserve_merge_sources:
                source.hide_set(True)
                source.hide_render = True
                source.select_set(False)
            else:
                bpy.data.objects.remove(source, do_unlink=True)

        activate_only(context, merged)
        settings.merged_material = target_material
        self.report(
            {"INFO"},
            f"Merged {len(sources)} parts into {merged.name} with material {target_material.name}",
        )
        return {"FINISHED"}


class PIC3D_OT_analyze_selected(Operator):
    bl_idname = "pic3d.analyze_selected"
    bl_label = "Analyze Selected"
    bl_description = "Count triangles and calculate the ratio needed for the selected mesh"
    bl_options = {"REGISTER"}

    @classmethod
    def poll(cls, context):
        return context.active_object is not None and context.active_object.type == "MESH"

    def execute(self, context):
        settings = context.scene.pic3d_revit
        triangles = triangle_count(context.active_object.data)
        settings.last_original_triangles = triangles
        settings.last_final_triangles = 0
        settings.last_ratio = min(1.0, settings.target_triangles / max(1, triangles))
        self.report({"INFO"}, f"{triangles:,} triangles; calculated ratio {settings.last_ratio:.6f}")
        return {"FINISHED"}


class PIC3D_OT_prepare_revit_copy(Operator):
    bl_idname = "pic3d.prepare_revit_copy"
    bl_label = "Prepare Revit Copy"
    bl_description = "Duplicate the selected mesh, scale it, apply transforms, and reduce it to the target triangle count"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return (
            context.mode == "OBJECT"
            and context.active_object is not None
            and context.active_object.type == "MESH"
        )

    def execute(self, context):
        settings = context.scene.pic3d_revit
        source = context.active_object

        if source.library is not None:
            self.report({"ERROR"}, "Linked library objects must be made local before preparation.")
            return {"CANCELLED"}

        prepared = source.copy()
        prepared.data = source.data.copy()
        prepared.name = f"{source.name}_Revit_{settings.target_triangles // 1000}k"
        for collection in source.users_collection:
            collection.objects.link(prepared)
        activate_only(context, prepared)

        try:
            factors = dimension_scale_factors(prepared, settings)
        except ValueError as error:
            bpy.data.objects.remove(prepared, do_unlink=True)
            activate_only(context, source)
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}

        prepared.scale = tuple(prepared.scale[index] * factors[index] for index in range(3))
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

        original_triangles = triangle_count(prepared.data)
        ratio = min(1.0, settings.target_triangles / max(1, original_triangles))

        if ratio < 1.0:
            modifier = prepared.modifiers.new(name="Revit 20K Decimate", type="DECIMATE")
            modifier.decimate_type = "COLLAPSE"
            modifier.ratio = ratio
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)

        final_triangles = triangle_count(prepared.data)
        prepared["pic3d_original_triangles"] = original_triangles
        prepared["pic3d_target_triangles"] = settings.target_triangles
        prepared["pic3d_final_triangles"] = final_triangles
        prepared["pic3d_obj_export_scale"] = 1.0
        prepared["pic3d_obj_forward_axis"] = "X"
        prepared["pic3d_obj_up_axis"] = "Z"
        prepared["pic3d_revit_import_units"] = "Meters"

        settings.last_original_triangles = original_triangles
        settings.last_final_triangles = final_triangles
        settings.last_ratio = ratio

        if settings.hide_original:
            source.hide_set(True)

        context.scene.unit_settings.system = "METRIC"
        context.scene.unit_settings.length_unit = "METERS"
        context.scene.unit_settings.scale_length = 1.0

        self.report(
            {"INFO"},
            f"Prepared {prepared.name}: {original_triangles:,} -> {final_triangles:,} triangles",
        )
        return {"FINISHED"}


class PIC3D_OT_export_revit_obj(Operator, ExportHelper):
    bl_idname = "pic3d.export_revit_obj"
    bl_label = "Export Selected OBJ"
    bl_description = "Export the selected prepared mesh as OBJ at scale 1.0 for Revit import in meters"

    filename_ext = ".obj"
    filter_glob: bpy.props.StringProperty(default="*.obj", options={"HIDDEN"})

    @classmethod
    def poll(cls, context):
        return any(obj.type == "MESH" for obj in context.selected_objects)

    def invoke(self, context, event):
        if context.active_object is not None:
            self.filepath = f"{context.active_object.name}.obj"
        return super().invoke(context, event)

    def execute(self, context):
        result = bpy.ops.wm.obj_export(
            filepath=self.filepath,
            check_existing=True,
            export_selected_objects=True,
            forward_axis="X",
            up_axis="Z",
            global_scale=1.0,
            apply_modifiers=True,
            apply_transform=True,
            export_uv=True,
            export_normals=True,
            export_materials=True,
            path_mode="AUTO",
            export_triangulated_mesh=False,
        )
        if "FINISHED" not in result:
            self.report({"ERROR"}, "Blender did not complete the OBJ export.")
            return {"CANCELLED"}
        self.report(
            {"INFO"},
            "OBJ exported at scale 1.0, Forward X, Up Z. In Revit, choose Import Units: Meters.",
        )
        return {"FINISHED"}


class PIC3D_PT_prepare_for_revit(Panel):
    bl_label = "Prepare for Revit"
    bl_idname = "PIC3D_PT_prepare_for_revit"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "pic to 3D"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.pic3d_revit

        active = context.active_object
        if active is None or active.type != "MESH":
            layout.label(text="Select one mesh object", icon="INFO")
            return

        selected_meshes = [obj for obj in context.selected_objects if obj.type == "MESH"]
        merge_box = layout.box()
        merge_box.label(text="Organize segmented parts", icon="GROUP")
        merge_box.label(text=f"Selected mesh parts: {len(selected_meshes)}")
        merge_box.prop(settings, "merged_name")
        merge_box.prop(settings, "merged_material")
        if settings.merged_material is None:
            merge_box.label(text="Blank uses active object's material", icon="INFO")
        merge_box.prop(settings, "preserve_merge_sources")
        merge_box.operator("pic3d.merge_selected_parts", icon="AUTOMERGE_ON")
        if len(selected_meshes) < 2:
            merge_box.label(text="Select at least 2 mesh parts", icon="INFO")

        layout.separator()

        object_box = layout.box()
        object_box.label(text=active.name, icon="MESH_DATA")
        object_box.operator("pic3d.analyze_selected", icon="VIEWZOOM")
        if settings.last_original_triangles:
            object_box.label(text=f"Triangles: {settings.last_original_triangles:,}")
            object_box.label(text=f"Calculated ratio: {settings.last_ratio:.6f}")

        mesh_box = layout.box()
        mesh_box.label(text="Mesh", icon="MOD_DECIM")
        mesh_box.prop(settings, "target_triangles")

        size_box = layout.box()
        size_box.label(text="Real dimensions (meters)", icon="DRIVER_DISTANCE")
        size_box.prop(settings, "dimension_mode")
        if settings.dimension_mode in {"WIDTH", "DEPTH", "HEIGHT"}:
            size_box.prop(settings, "known_dimension_m")
            size_box.label(text="Uniform scaling preserves proportions", icon="CHECKMARK")
        elif settings.dimension_mode == "ALL":
            size_box.prop(settings, "width_m")
            size_box.prop(settings, "depth_m")
            size_box.prop(settings, "height_m")
            size_box.label(text="May distort model proportions", icon="ERROR")

        layout.prop(settings, "hide_original")
        layout.operator("pic3d.prepare_revit_copy", icon="DUPLICATE")

        if settings.last_final_triangles:
            result_box = layout.box()
            result_box.label(text=f"Prepared triangles: {settings.last_final_triangles:,}", icon="CHECKMARK")

        layout.separator()
        layout.operator("pic3d.export_revit_obj", icon="EXPORT")
        layout.label(text="OBJ scale: 1.0", icon="INFO")
        layout.label(text="Forward: X   Up: Z")
        layout.label(text="Revit Import Units: Meters")


CLASSES = (
    PIC3D_PG_revit_settings,
    PIC3D_OT_merge_selected_parts,
    PIC3D_OT_analyze_selected,
    PIC3D_OT_prepare_revit_copy,
    PIC3D_OT_export_revit_obj,
    PIC3D_PT_prepare_for_revit,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.pic3d_revit = PointerProperty(type=PIC3D_PG_revit_settings)


def unregister():
    del bpy.types.Scene.pic3d_revit
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
