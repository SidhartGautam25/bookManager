import { NextRequest, NextResponse } from "next/server";
import { BookManager } from "@/lib/BookManager";
import { songManager, movieManager } from "@/lib/MediaManager";
import { tagManager } from "@/lib/TagManager";

const bookManager = new BookManager();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mediaType = searchParams.get("mediaType") || "book";
    const mediaName = searchParams.get("mediaName");
    const pageNo = searchParams.get("pageNo");

    if (!mediaName) {
      return NextResponse.json(
        { success: false, error: "mediaName is required" },
        { status: 400 },
      );
    }

    if (mediaType === "book") {
      if (pageNo !== null && pageNo !== undefined && pageNo !== "") {
        const sentences = bookManager.getPageSentences(
          mediaName,
          Number(pageNo),
        );
        return NextResponse.json({
          success: true,
          data: sentences,
          page: Number(pageNo),
        });
      } else {
        const allPages = bookManager.getAllSentencesFromBook(mediaName);
        return NextResponse.json({ success: true, data: allPages });
      }
    } else if (mediaType === "song") {
      const sentences = songManager.getSentences(mediaName);
      return NextResponse.json({ success: true, data: sentences });
    } else if (mediaType === "movie") {
      const sentences = movieManager.getSentences(mediaName);
      return NextResponse.json({ success: true, data: sentences });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid mediaType. Must be 'book', 'song', or 'movie'",
        },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mediaType = "book",
      mediaName,
      pageNo,
      sentence,
      meaning,
      tag,
    } = body;

    if (!mediaName || typeof mediaName !== "string" || !mediaName.trim()) {
      return NextResponse.json(
        { success: false, error: "mediaName is required" },
        { status: 400 },
      );
    }

    if (!sentence || typeof sentence !== "string" || !sentence.trim()) {
      return NextResponse.json(
        { success: false, error: "Sentence text is required" },
        { status: 400 },
      );
    }

    // Validate tag if provided: must only be a created tag
    let validatedTag = "";
    if (tag && typeof tag === "string" && tag.trim()) {
      const cleanTag = tag.trim();
      if (!tagManager.tagExists(cleanTag)) {
        return NextResponse.json(
          {
            success: false,
            error: `Tag "${cleanTag}" is not a recognized tag. You can only choose from created tags.`,
          },
          { status: 400 },
        );
      }
      const existingTag = tagManager.findTagByName(cleanTag);
      validatedTag = existingTag ? existingTag.name : cleanTag;
    }

    if (mediaType === "book") {
      if (pageNo === undefined || pageNo === null || pageNo === "") {
        return NextResponse.json(
          { success: false, error: "pageNo is required for books" },
          { status: 400 },
        );
      }

      bookManager.addSentence(
        mediaName.trim(),
        Number(pageNo),
        sentence.trim(),
        meaning,
        validatedTag,
      );

      return NextResponse.json({
        success: true,
        message: `Sentence added to book "${mediaName}" on page ${pageNo}`,
      });
    } else if (mediaType === "song") {
      songManager.addSentence(
        mediaName.trim(),
        sentence.trim(),
        meaning,
        validatedTag,
      );
      return NextResponse.json({
        success: true,
        message: `Sentence added to song "${mediaName}"`,
      });
    } else if (mediaType === "movie") {
      movieManager.addSentence(
        mediaName.trim(),
        sentence.trim(),
        meaning,
        validatedTag,
      );
      return NextResponse.json({
        success: true,
        message: `Sentence added to movie "${mediaName}"`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid mediaType" },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to add sentence",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mediaType = "book",
      mediaName,
      pageNo,
      originalSentence,
      updatedSentence,
      meaning,
      tag,
    } = body;

    if (!mediaName || !originalSentence) {
      return NextResponse.json(
        {
          success: false,
          error: "mediaName and originalSentence are required",
        },
        { status: 400 },
      );
    }

    // Validate tag if provided
    let validatedTag = "";
    if (tag && typeof tag === "string" && tag.trim()) {
      const cleanTag = tag.trim();
      if (!tagManager.tagExists(cleanTag)) {
        return NextResponse.json(
          {
            success: false,
            error: `Tag "${cleanTag}" is not a recognized tag. You can only choose from created tags.`,
          },
          { status: 400 },
        );
      }
      const existingTag = tagManager.findTagByName(cleanTag);
      validatedTag = existingTag ? existingTag.name : cleanTag;
    }

    const updates = {
      sentence: updatedSentence
        ? updatedSentence.trim()
        : originalSentence.trim(),
      meaning: meaning !== undefined ? meaning.trim() : undefined,
      tag: validatedTag,
    };

    if (mediaType === "book") {
      if (pageNo === undefined || pageNo === null || pageNo === "") {
        return NextResponse.json(
          { success: false, error: "pageNo is required for books" },
          { status: 400 },
        );
      }

      bookManager.updateSentence(
        mediaName.trim(),
        Number(pageNo),
        originalSentence.trim(),
        updates,
      );

      return NextResponse.json({
        success: true,
        message: `Sentence updated successfully in book "${mediaName}"`,
      });
    } else if (mediaType === "song") {
      songManager.updateSentence(
        mediaName.trim(),
        originalSentence.trim(),
        updates,
      );
      return NextResponse.json({
        success: true,
        message: `Sentence updated successfully in song "${mediaName}"`,
      });
    } else if (mediaType === "movie") {
      movieManager.updateSentence(
        mediaName.trim(),
        originalSentence.trim(),
        updates,
      );
      return NextResponse.json({
        success: true,
        message: `Sentence updated successfully in movie "${mediaName}"`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid mediaType" },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update sentence",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mediaType = searchParams.get("mediaType") || "book";
    const mediaName = searchParams.get("mediaName");
    const pageNo = searchParams.get("pageNo");
    const sentence = searchParams.get("sentence");

    if (!mediaName || !sentence) {
      return NextResponse.json(
        { success: false, error: "mediaName and sentence are required" },
        { status: 400 },
      );
    }

    let deleted = false;
    if (mediaType === "book") {
      if (!pageNo) {
        return NextResponse.json(
          { success: false, error: "pageNo is required for books" },
          { status: 400 },
        );
      }
      deleted = bookManager.deleteSentence(mediaName, Number(pageNo), sentence);
    } else if (mediaType === "song") {
      deleted = songManager.deleteSentence(mediaName, sentence);
    } else if (mediaType === "movie") {
      deleted = movieManager.deleteSentence(mediaName, sentence);
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Sentence not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sentence removed successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete sentence",
      },
      { status: 500 },
    );
  }
}
