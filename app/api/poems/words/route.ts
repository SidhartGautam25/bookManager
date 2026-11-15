import { NextRequest, NextResponse } from "next/server";
import { poemManager } from "@/lib/MediaManager";
import { persistentDictionaryCache } from "@/lib/DictionaryCache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const poemName = searchParams.get("poemName");
    const word = searchParams.get("word");

    if (!poemName) {
      return NextResponse.json(
        { success: false, error: "poemName is required" },
        { status: 400 },
      );
    }

    if (word) {
      const occurrence = poemManager.getWordOccurrences(poemName, word);
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
        source: "poem",
        ...occurrence,
      });
    }

    const words = poemManager.getWords(poemName);
    const lyrics = poemManager.getLyrics(poemName);
    return NextResponse.json({ success: true, data: words, lyrics });
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
    const { poemName, word, meanings, variations } = body;

    if (!poemName || !word || !word.trim()) {
      return NextResponse.json(
        { success: false, error: "poemName and word are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(meanings) || meanings.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one meaning is required" },
        { status: 400 },
      );
    }

    poemManager.addWord(poemName, word.trim(), meanings, variations);

    return NextResponse.json({
      success: true,
      message: `Word "${word}" added to poem "${poemName}"`,
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
    const poemName = searchParams.get("poemName");
    const word = searchParams.get("word");

    if (!poemName || !word) {
      return NextResponse.json(
        { success: false, error: "poemName and word are required" },
        { status: 400 },
      );
    }

    const deleted = poemManager.deleteWord(poemName, word);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `Word "${word}" not found in poem "${poemName}"`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Word "${word}" removed from poem "${poemName}"`,
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { poemName, originalWord, updatedWord } = body;

    if (!poemName || !originalWord || !updatedWord) {
      return NextResponse.json(
        {
          success: false,
          error: "poemName, originalWord, and updatedWord are required",
        },
        { status: 400 },
      );
    }

    const newWordName = (updatedWord.word || originalWord).trim();
    if (!newWordName) {
      return NextResponse.json(
        { success: false, error: "Word cannot be empty" },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(updatedWord.meanings) ||
      updatedWord.meanings.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "At least one meaning is required" },
        { status: 400 },
      );
    }

    poemManager.updateWord(poemName, originalWord, updatedWord);

    // Sync with persistent dictionary cache
    try {
      persistentDictionaryCache.set(newWordName, {
        word: newWordName,
        meanings: updatedWord.meanings,
        variations: updatedWord.variations || [],
        source: "cache",
      });
      if (originalWord.toLowerCase().trim() !== newWordName.toLowerCase()) {
        persistentDictionaryCache.set(originalWord, {
          word: newWordName,
          meanings: updatedWord.meanings,
          variations: updatedWord.variations || [],
          source: "cache",
        });
      }
    } catch (cacheErr) {
      console.error("Error updating persistent dictionary cache:", cacheErr);
    }

    return NextResponse.json({
      success: true,
      message: `Word "${newWordName}" updated in poem "${poemName}"`,
      word: {
        word: newWordName,
        meanings: updatedWord.meanings,
        variations: updatedWord.variations || [],
      },
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
