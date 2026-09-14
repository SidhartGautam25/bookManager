import { NextRequest, NextResponse } from "next/server";
import { BookManager, BatchWordEntry } from "@/lib/BookManager";

const bookManager = new BookManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookName, entries, skipDuplicates = true } = body;

    if (!bookName) {
      return NextResponse.json(
        { success: false, error: "bookName is required" },
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

    // Validate entries
    const validEntries: BatchWordEntry[] = [];
    for (const item of entries) {
      if (
        item &&
        typeof item.pageNo === "number" &&
        item.pageNo > 0 &&
        typeof item.word === "string" &&
        item.word.trim() &&
        Array.isArray(item.meanings) &&
        item.meanings.length > 0
      ) {
        validEntries.push({
          pageNo: item.pageNo,
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
            "No valid word entries found (each requires pageNo, word, and at least one meaning)",
        },
        { status: 400 },
      );
    }

    const summary = bookManager.addWordsBatch(
      bookName,
      validEntries,
      Boolean(skipDuplicates),
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
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in batch processing",
      },
      { status: 500 },
    );
  }
}
