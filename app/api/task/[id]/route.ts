import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/lib/tripo-client";

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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
