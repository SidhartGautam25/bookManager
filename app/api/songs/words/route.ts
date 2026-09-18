import { NextRequest, NextResponse } from "next/server";
import { songManager } from "@/lib/MediaManager";
import { persistentDictionaryCache } from "@/lib/DictionaryCache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songName = searchParams.get("songName");
    const word = searchParams.get("word");

    if (!songName) {
      return NextResponse.json(
        { success: false, error: "songName is required" },
        { status: 400 },
      );
    }

    if (word) {
      const occurrence = songManager.getWordOccurrences(songName, word);
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
        source: "song",
        ...occurrence,
      });
    }

    const words = songManager.getWords(songName);
    const lyrics = songManager.getLyrics(songName);
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
    const { songName, word, meanings, variations } = body;

    if (!songName || !word || !word.trim()) {
      return NextResponse.json(
        { success: false, error: "songName and word are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(meanings) || meanings.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one meaning is required" },
        { status: 400 },
      );
    }

    songManager.addWord(songName, word.trim(), meanings, variations);

    return NextResponse.json({
      success: true,
      message: `Word "${word}" added to song "${songName}"`,
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
    const songName = searchParams.get("songName");
    const word = searchParams.get("word");

    if (!songName || !word) {
      return NextResponse.json(
        { success: false, error: "songName and word are required" },
        { status: 400 },
      );
    }

    const deleted = songManager.deleteWord(songName, word);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `Word "${word}" not found in song "${songName}"`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Word "${word}" removed from song "${songName}"`,
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
    const { songName, originalWord, updatedWord } = body;

    if (!songName || !originalWord || !updatedWord) {
      return NextResponse.json(
        {
          success: false,
          error: "songName, originalWord, and updatedWord are required",
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

    songManager.updateWord(songName, originalWord, updatedWord);

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
      message: `Word "${newWordName}" updated in song "${songName}"`,
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
