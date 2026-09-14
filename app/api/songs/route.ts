import { NextRequest, NextResponse } from "next/server";
import { songManager } from "@/lib/MediaManager";

export async function GET() {
  try {
    const songs = songManager.getAllMedia();
    return NextResponse.json({ success: true, songs });
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
    const { songName, action = "create" } = body;

    if (!songName || !songName.trim()) {
      return NextResponse.json(
        { success: false, error: "songName is required" },
        { status: 400 },
      );
    }

    if (action === "create") {
      songManager.createMedia(songName.trim());
      return NextResponse.json({
        success: true,
        message: `Song "${songName.trim()}" created successfully`,
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
