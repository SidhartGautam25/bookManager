import { NextRequest, NextResponse } from "next/server";
import { movieManager } from "@/lib/MediaManager";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const movieName = searchParams.get("movieName");
    const word = searchParams.get("word");

    if (!movieName) {
      return NextResponse.json(
        { success: false, error: "movieName is required" },
        { status: 400 },
      );
    }

    if (word) {
      const occurrence = movieManager.getWordOccurrences(movieName, word);
      if (!occurrence) {
        return NextResponse.json({
          success: true,
          found: false,
          word: word.trim(),
        });
      }
      return NextResponse.json({
        success: true,
        found: true,
        source: "movie",
        ...occurrence,
      });
    }

    const words = movieManager.getWords(movieName);
    return NextResponse.json({ success: true, data: words });
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
    const { movieName, word, meanings, variations } = body;

    if (!movieName || !word || !word.trim()) {
      return NextResponse.json(
        { success: false, error: "movieName and word are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(meanings) || meanings.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one meaning is required" },
        { status: 400 },
      );
    }

    movieManager.addWord(movieName, word.trim(), meanings, variations);

    return NextResponse.json({
      success: true,
      message: `Word "${word}" added to movie "${movieName}"`,
    });
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

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const movieName = searchParams.get("movieName");
    const word = searchParams.get("word");

    if (!movieName || !word) {
      return NextResponse.json(
        { success: false, error: "movieName and word are required" },
        { status: 400 },
      );
    }

    const deleted = movieManager.deleteWord(movieName, word);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `Word "${word}" not found in movie "${movieName}"`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Word "${word}" removed from movie "${movieName}"`,
    });
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
