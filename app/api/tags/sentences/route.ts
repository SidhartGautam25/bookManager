import { NextRequest, NextResponse } from "next/server";
import { tagManager } from "@/lib/TagManager";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tag = searchParams.get("tag") || undefined;

    const sentences = tagManager.getAllSentencesByTag(tag);
    return NextResponse.json({
      success: true,
      tag: tag || null,
      total: sentences.length,
      sentences,
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
