import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";

const bookManager = new BookManager();

// GET: List all books
export async function GET() {
  try {
    const books = bookManager.getAllBooks();
    return NextResponse.json({ success: true, version: 2, books });
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

// POST: Create a new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookName, action } = body;

    if (!bookName) {
      return NextResponse.json(
        { success: false, error: "bookName is required" },
        { status: 400 },
      );
    }

    if (action === "create" || !action) {
      bookManager.createBook(bookName.trim());
      return NextResponse.json({
        success: true,
        version: 2,
        message: `Book "${bookName}" created successfully in v2 format.`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error creating book",
      },
      { status: 500 },
    );
  }
}
