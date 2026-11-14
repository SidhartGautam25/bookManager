import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";
import { dictionaryManager } from "@/lib/DictionaryPartitionManager";

const bookManager = new BookManager();

// POST: Add a single word to a book page in V2 format
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookName, pageNo, word, variations, meanings } = body;

    // Validate required fields
    if (!bookName || pageNo === undefined || !word) {
      return NextResponse.json(
        {
          success: false,
          error: "bookName, pageNo, and word are required",
        },
        { status: 400 },
      );
    }

    const cleanWord = word.trim();
    let finalMeanings = meanings;

    // If no meanings provided in request, check if already in root dictionary
    if (!finalMeanings || finalMeanings.length === 0) {
      const existingInDict = dictionaryManager.getWord(cleanWord);
      if (existingInDict && existingInDict.meanings.length > 0) {
        finalMeanings = existingInDict.meanings;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Word "${cleanWord}" is not in dictionary yet. At least one meaning is required to add it.`,
          },
          { status: 400 },
        );
      }
    }

    // Add using V2 decoupled storage:
    // 1. Stores only { word, pageNo } in books/<bookName>/page_<pageNo>.json
    // 2. If not in dictionary/{letter}.json, adds word + meanings + examples.
    // 3. If already in dictionary, leaves dictionary untouched.
    const result = bookManager.addWordV2(
      bookName.trim(),
      Number(pageNo),
      cleanWord,
      finalMeanings,
      variations,
    );

    const letterKey = dictionaryManager.getLetterKey(cleanWord);

    return NextResponse.json({
      success: true,
      version: 2,
      word: cleanWord,
      bookName,
      pageNo: Number(pageNo),
      dictionarySynced: result.dictionaryAdded,
      letterFile: `${letterKey}.json`,
      message: result.dictionaryAdded
        ? `Word "${cleanWord}" added to page ${pageNo} and new definitions saved to dictionary/${letterKey}.json`
        : `Word "${cleanWord}" added to page ${pageNo} (existing dictionary definition in ${letterKey}.json preserved unchanged)`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error in v2 add word",
      },
      { status: 500 },
    );
  }
}
