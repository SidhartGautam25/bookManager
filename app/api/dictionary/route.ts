import { NextRequest, NextResponse } from "next/server";
import { dictionaryManager } from "@/lib/DictionaryPartitionManager";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statsOnly = searchParams.get("stats") === "true";
    const letter = searchParams.get("letter");
    const query = searchParams.get("q");
    const word = searchParams.get("word");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 1. Stats query
    if (statsOnly) {
      const stats = dictionaryManager.getStats();
      return NextResponse.json({ success: true, stats });
    }

    // 2. Single word lookup
    if (word) {
      const entry = dictionaryManager.getWord(word);
      return NextResponse.json({
        success: true,
        found: Boolean(entry),
        entry,
      });
    }

    // 3. Search or Letter Listing
    const searchResult = dictionaryManager.searchWords(query || "", {
      letter: letter || undefined,
      limit,
      offset,
    });

    const stats = dictionaryManager.getStats();

    return NextResponse.json({
      success: true,
      total: searchResult.total,
      entries: searchResult.entries,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error in dictionary API",
      },
      { status: 500 },
    );
  }
}
