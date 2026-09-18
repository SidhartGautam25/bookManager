import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";
import { persistentDictionaryCache } from "@/lib/DictionaryCache";

const bookManager = new BookManager();

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

    let finalMeanings = meanings;
    if (!finalMeanings || finalMeanings.length === 0) {
      const existing = bookManager.getWordOccurrences(bookName, word);
      if (existing && existing.meanings) {
        finalMeanings = existing.meanings;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "At least one meaning is required for a new word",
          },
          { status: 400 },
        );
      }
    }

    // Add the word to the book
    bookManager.addWord(
      bookName,
      Number(pageNo),
      word,
      finalMeanings,
      variations,
    );

    return NextResponse.json({
      success: true,
      message: `Word "${word}" added successfully to ${bookName} on page ${pageNo}`,
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookName = searchParams.get("bookName");
    const pageNo = searchParams.get("pageNo");
    const word = searchParams.get("word");
    const searchType = searchParams.get("searchType");

    if (!bookName) {
      return NextResponse.json(
        { success: false, error: "bookName is required" },
        { status: 400 },
      );
    }

    if (word) {
      const occurrence = bookManager.getWordOccurrences(bookName, word);
      if (!occurrence) {
        // If not found in current book, check globally if requested
        if (searchType === "global") {
          const globalOccurrence = bookManager.getGlobalWordOccurrences(word);
          if (globalOccurrence) {
            return NextResponse.json({
              success: true,
              found: true,
              source: "other-book",
              ...globalOccurrence,
            });
          }
        }

        return NextResponse.json({
          success: true,
          found: false,
          word: word.trim(),
        });
      }

      return NextResponse.json({
        success: true,
        found: true,
        source: "current-book",
        ...occurrence,
      });
    }

    if (pageNo) {
      // Get words from a specific page
      const words = bookManager.getPageWords(bookName, Number(pageNo));
      return NextResponse.json({ success: true, words, page: Number(pageNo) });
    } else {
      // Get all words from the book
      const allWords = bookManager.getAllWordsFromBook(bookName);
      return NextResponse.json({ success: true, data: allWords });
    }
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
    const { bookName, pageNo, originalWord, updatedWord } = body;

    if (!bookName || pageNo === undefined || !originalWord || !updatedWord) {
      return NextResponse.json(
        {
          success: false,
          error: "bookName, pageNo, originalWord, and updatedWord are required",
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

    bookManager.updateWord(bookName, Number(pageNo), originalWord, updatedWord);

    // Sync updated word with persistent dictionary cache
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
      message: `Word "${newWordName}" updated successfully in ${bookName} on page ${pageNo}`,
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

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookName = searchParams.get("bookName");
    const pageNo = searchParams.get("pageNo");
    const word = searchParams.get("word");

    if (!bookName || pageNo === undefined || !word) {
      return NextResponse.json(
        { success: false, error: "bookName, pageNo, and word are required" },
        { status: 400 },
      );
    }

    const deleted = bookManager.deleteWord(bookName, Number(pageNo), word);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `Word "${word}" not found on page ${pageNo} of ${bookName}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Word "${word}" removed from ${bookName} page ${pageNo}`,
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
