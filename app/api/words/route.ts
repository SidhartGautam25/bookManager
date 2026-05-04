import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";

const bookManager = new BookManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookName, pageNo, word, meaning, examples } = body;

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

    let finalMeaning = meaning;
    if (!finalMeaning) {
      const existing = bookManager.getWordOccurrences(bookName, word);
      if (existing) {
        finalMeaning = existing.meaning;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Meaning is required for a new word",
          },
          { status: 400 },
        );
      }
    }

    const finalExamples = Array.isArray(examples)
      ? examples.map((item) => String(item).trim()).filter(Boolean)
      : [];

    // Add the word to the book
    bookManager.addWord(
      bookName,
      Number(pageNo),
      word,
      finalMeaning,
      finalExamples,
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

    if (!bookName) {
      return NextResponse.json(
        { success: false, error: "bookName is required" },
        { status: 400 },
      );
    }

    if (word) {
      const occurrence = bookManager.getWordOccurrences(bookName, word);
      if (!occurrence) {
        return NextResponse.json({
          success: true,
          found: false,
          word: word.trim(),
        });
      }

      return NextResponse.json({ success: true, found: true, ...occurrence });
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
