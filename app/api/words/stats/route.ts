import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";

const bookManager = new BookManager();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json(
        { success: false, error: "word parameter is required" },
        { status: 400 },
      );
    }

    const stats = bookManager.getWordStatsAcrossAllBooks(word);

    if (!stats) {
      return NextResponse.json({
        success: true,
        found: false,
        word: word.trim(),
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      data: stats,
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
