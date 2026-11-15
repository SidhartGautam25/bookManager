import { NextRequest, NextResponse } from "next/server";
import { poemManager } from "@/lib/MediaManager";

export async function GET() {
  try {
    const poems = poemManager.getAllMedia();
    return NextResponse.json({ success: true, poems });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { poemName, action = "create" } = body;

    if (!poemName || !poemName.trim()) {
      return NextResponse.json(
        { success: false, error: "poemName is required" },
        { status: 400 },
      );
    }

    if (action === "create") {
      poemManager.createMedia(poemName.trim());
      return NextResponse.json({
        success: true,
        message: `Poem "${poemName.trim()}" created successfully`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
