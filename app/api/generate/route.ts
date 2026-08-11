import { NextRequest, NextResponse } from "next/server";
import { createTask, TripoError } from "@/lib/tripo-client";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll("file") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: "No files uploaded. Please upload 1 to 3 images." },
                { status: 400 }
            );
        }

        if (files.length > 3) {
            return NextResponse.json(
                { error: "Maximum of 3 files allowed." },
                { status: 400 }
            );
        }

        const images: { data: string; type: string }[] = [];
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

        for (const file of files) {
            if (file.size > MAX_SIZE) {
                return NextResponse.json(
                    { error: `File ${file.name} exceeds the 10MB limit.` },
                    { status: 400 }
                );
            }

            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json(
                    { error: `File type ${file.type} is not allowed. Only JPG, PNG, and WEBP are supported.` },
                    { status: 400 }
                );
            }

            // Extract type from MIME, e.g., 'image/jpeg' -> 'jpeg' -> 'jpg'
            let type = file.type.split("/")[1];
            if (type === "jpeg") {
                type = "jpg";
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = buffer.toString("base64");

            images.push({ data, type });
        }

        const result = await createTask(images);

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error("Error in /api/generate:", error);

        const status = error instanceof TripoError ? error.status : 500;
        const message = error instanceof Error ? error.message : "Internal Server Error";

        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}
