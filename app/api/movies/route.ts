import { NextRequest, NextResponse } from "next/server";
import { movieManager } from "@/lib/MediaManager";

export async function GET() {
  try {
    const movies = movieManager.getAllMedia();
    return NextResponse.json({ success: true, movies });
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
    const { movieName, action = "create" } = body;

    if (!movieName || !movieName.trim()) {
      return NextResponse.json(
        { success: false, error: "movieName is required" },
        { status: 400 },
      );
    }

    if (action === "create") {
      movieManager.createMedia(movieName.trim());
      return NextResponse.json({
        success: true,
        message: `Movie "${movieName.trim()}" created successfully`,
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
