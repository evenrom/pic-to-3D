import { NextRequest, NextResponse } from "next/server";
import { getTask, TripoError } from "@/lib/tripo-client";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: "Task ID is required" },
                { status: 400 }
            );
        }

        const taskResult = await getTask(id);

        return NextResponse.json(taskResult, { status: 200 });
    } catch (error: unknown) {
        console.error(`Error in /api/task/${params.id}:`, error);

        const status = error instanceof TripoError ? error.status : 500;
        const message = error instanceof Error ? error.message : "Internal Server Error";

        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}
