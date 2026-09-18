import { NextRequest, NextResponse } from "next/server";
import { songManager } from "@/lib/MediaManager";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songName = searchParams.get("songName");

    if (!songName) {
      return NextResponse.json(
        { success: false, error: "songName is required" },
        { status: 400 },
      );
    }

    const lyrics = songManager.getLyrics(songName);
    return NextResponse.json({ success: true, songName, lyrics });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error fetching lyrics",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songName, lyrics } = body;

    if (!songName || !songName.trim()) {
      return NextResponse.json(
        { success: false, error: "songName is required" },
        { status: 400 },
      );
    }

    songManager.setLyrics(
      songName.trim(),
      typeof lyrics === "string" ? lyrics : "",
    );
    return NextResponse.json({
      success: true,
      songName: songName.trim(),
      lyrics: typeof lyrics === "string" ? lyrics : "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error saving lyrics",
      },
      { status: 500 },
    );
  }
}
