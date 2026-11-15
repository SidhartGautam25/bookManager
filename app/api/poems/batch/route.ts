import { NextRequest, NextResponse } from "next/server";
import { poemManager, MediaBatchEntry } from "@/lib/MediaManager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const poemName = body.poemName || body.songName;
    const { entries, skipDuplicates = true } = body;
    const lyrics = body.lyrics !== undefined ? body.lyrics : body.verses;

    if (!poemName || !poemName.trim()) {
      return NextResponse.json(
        { success: false, error: "poemName is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "entries array is required and cannot be empty",
        },
        { status: 400 },
      );
    }

    const validEntries: MediaBatchEntry[] = [];
    for (const item of entries) {
      if (
        item &&
        typeof item.word === "string" &&
        item.word.trim() &&
        Array.isArray(item.meanings) &&
        item.meanings.length > 0
      ) {
        validEntries.push({
          word: item.word.trim(),
          meanings: item.meanings,
          variations: Array.isArray(item.variations) ? item.variations : [],
        });
      }
    }

    if (validEntries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No valid word entries found (each requires word and at least one meaning)",
        },
        { status: 400 },
      );
    }

    const summary = poemManager.addWordsBatch(
      poemName.trim(),
      validEntries,
      Boolean(skipDuplicates),
      typeof lyrics === "string" ? lyrics : undefined,
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${summary.totalProcessed} words (${summary.added} added, ${summary.skipped} skipped)`,
      data: summary,
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
