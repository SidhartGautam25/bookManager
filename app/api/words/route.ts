import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";

const bookManager = new BookManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookName, pageNo, word, meaning } = body;

    // Validate required fields
    if (!bookName || pageNo === undefined || !word || !meaning) {
      return NextResponse.json(
        {
          success: false,
          error: "bookName, pageNo, word, and meaning are required",
        },
        { status: 400 },
      );
    }

    // Add the word to the book
    bookManager.addWord(bookName, Number(pageNo), word, meaning);

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

    if (!bookName) {
      return NextResponse.json(
        { success: false, error: "bookName is required" },
        { status: 400 },
      );
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
