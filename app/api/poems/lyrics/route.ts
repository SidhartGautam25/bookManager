import { NextRequest, NextResponse } from "next/server";
import { poemManager } from "@/lib/MediaManager";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const poemName =
      searchParams.get("poemName") || searchParams.get("songName");

    if (!poemName) {
      return NextResponse.json(
        { success: false, error: "poemName is required" },
        { status: 400 },
      );
    }

    const lyrics = poemManager.getLyrics(poemName);
    return NextResponse.json({
      success: true,
      poemName,
      songName: poemName,
      lyrics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error fetching verses",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const poemName = body.poemName || body.songName;
    const lyrics = body.lyrics !== undefined ? body.lyrics : body.verses;

    if (!poemName || !poemName.trim()) {
      return NextResponse.json(
        { success: false, error: "poemName is required" },
        { status: 400 },
      );
    }

    poemManager.setLyrics(
      poemName.trim(),
      typeof lyrics === "string" ? lyrics : "",
    );
    return NextResponse.json({
      success: true,
      poemName: poemName.trim(),
      songName: poemName.trim(),
      lyrics: typeof lyrics === "string" ? lyrics : "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error saving verses",
      },
      { status: 500 },
    );
  }
}
