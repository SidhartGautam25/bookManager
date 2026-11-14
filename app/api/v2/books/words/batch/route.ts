import { NextRequest, NextResponse } from "next/server";
import { BookManager, BatchWordEntry } from "@/lib/BookManager";
import { dictionaryManager } from "@/lib/DictionaryPartitionManager";

const bookManager = new BookManager();

// POST: Batch add words across pages using v2 decoupled storage
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

    // Validate entries: if meanings omitted but word in dictionary, hydrate from dictionary
    const validEntries: BatchWordEntry[] = [];
    for (const item of entries) {
      if (
        item &&
        typeof item.pageNo === "number" &&
        item.pageNo > 0 &&
        typeof item.word === "string" &&
        item.word.trim()
      ) {
        const cleanWord = item.word.trim();
        let itemMeanings = Array.isArray(item.meanings) ? item.meanings : [];
        if (itemMeanings.length === 0 && dictionaryManager.hasWord(cleanWord)) {
          const dictWord = dictionaryManager.getWord(cleanWord);
          if (dictWord && dictWord.meanings) {
            itemMeanings = dictWord.meanings;
          }
        }

        if (itemMeanings.length > 0) {
          validEntries.push({
            pageNo: item.pageNo,
            word: cleanWord,
            meanings: itemMeanings,
            variations: Array.isArray(item.variations) ? item.variations : [],
          });
        }
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

    // Execute V2 batch insertion:
    // Only stores { word, pageNo } in book pages, syncs new words to dictionary/{letter}.json
    const summary = bookManager.addWordsBatchV2(
      bookName.trim(),
      validEntries,
      Boolean(skipDuplicates),
    );

    return NextResponse.json({
      success: true,
      version: 2,
      message: `Successfully processed ${summary.totalProcessed} words in v2 format (${summary.added} added to book, ${summary.dictionaryWordsAdded} newly indexed into dictionary, ${summary.skipped} skipped)`,
      data: summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in v2 batch processing",
      },
      { status: 500 },
    );
  }
}
