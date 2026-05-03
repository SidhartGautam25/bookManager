import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";

const bookManager = new BookManager();

export async function GET(request: NextRequest) {
  try {
    const books = bookManager.getAllBooks();
    return NextResponse.json({ success: true, books });
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
    const { bookName, action } = body;

    if (!bookName) {
      return NextResponse.json(
        { success: false, error: "bookName is required" },
        { status: 400 },
      );
    }

    if (action === "create") {
      bookManager.createBook(bookName);
      return NextResponse.json({
        success: true,
        message: `Book "${bookName}" created successfully`,
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
