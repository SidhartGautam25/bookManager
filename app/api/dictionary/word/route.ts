import { NextRequest, NextResponse } from "next/server";
import { dictionaryManager } from "@/lib/DictionaryPartitionManager";

// POST: Add new word to its respective letter file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, meanings, variations, overwrite = false } = body;

    if (!word || typeof word !== "string" || !word.trim()) {
      return NextResponse.json(
        { success: false, error: "Word is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(meanings) || meanings.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one meaning is required" },
        { status: 400 },
      );
    }

    const cleanWord = word.trim();
    const letterKey = dictionaryManager.getLetterKey(cleanWord);

    const result = dictionaryManager.addWord(
      {
        word: cleanWord,
        meanings,
        variations: Array.isArray(variations) ? variations : [],
      },
      Boolean(overwrite),
    );

    if (!result.added && result.reason === "already_exists") {
      return NextResponse.json({
        success: true,
        added: false,
        letterFile: `${letterKey}.json`,
        message: `Word "${cleanWord}" already exists in dictionary/${letterKey}.json and was not overwritten.`,
        entry: result.entry,
      });
    }

    return NextResponse.json({
      success: true,
      added: true,
      letterFile: `${letterKey}.json`,
      message: `Word "${cleanWord}" added to dictionary/${letterKey}.json successfully.`,
      entry: result.entry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error adding word",
      },
      { status: 500 },
    );
  }
}

// PUT: Edit existing word's meanings, definitions, variations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalWord, word, meanings, variations } = body;

    if (!originalWord || typeof originalWord !== "string" || !originalWord.trim()) {
      return NextResponse.json(
        { success: false, error: "originalWord is required to identify the entry" },
        { status: 400 },
      );
    }

    const updatedEntry = dictionaryManager.updateWord(originalWord.trim(), {
      word: word ? word.trim() : undefined,
      meanings,
      variations,
    });

    const letterKey = dictionaryManager.getLetterKey(updatedEntry.word);

    return NextResponse.json({
      success: true,
      letterFile: `${letterKey}.json`,
      message: `Word "${updatedEntry.word}" updated successfully.`,
      entry: updatedEntry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error updating word",
      },
      { status: 500 },
    );
  }
}

// DELETE: Remove word from dictionary
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const word = searchParams.get("word");

    if (!word || !word.trim()) {
      return NextResponse.json(
        { success: false, error: "word parameter is required" },
        { status: 400 },
      );
    }

    const cleanWord = word.trim();
    const deleted = dictionaryManager.deleteWord(cleanWord);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Word "${cleanWord}" not found in dictionary` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Word "${cleanWord}" removed from dictionary successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error deleting word",
      },
      { status: 500 },
    );
  }
}
