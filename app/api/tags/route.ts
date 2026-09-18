import { NextRequest, NextResponse } from "next/server";
import { tagManager } from "@/lib/TagManager";

export async function GET() {
  try {
    const tagStats = tagManager.getTagStats();
    return NextResponse.json({
      success: true,
      tags: tagStats.map((item) => ({
        ...item.tag,
        sentenceCount: item.sentenceCount,
      })),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 },
      );
    }

    const created = tagManager.createTag(name, color, description);
    return NextResponse.json({
      success: true,
      message: `Tag "${created.name}" created successfully`,
      tag: created,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create tag",
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { idOrName, name, color, description } = body;

    if (!idOrName) {
      return NextResponse.json(
        { success: false, error: "idOrName is required" },
        { status: 400 },
      );
    }

    const updated = tagManager.updateTag(idOrName, {
      name,
      color,
      description,
    });
    return NextResponse.json({
      success: true,
      message: `Tag updated successfully`,
      tag: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update tag",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name") || searchParams.get("id");

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tag name or ID is required" },
        { status: 400 },
      );
    }

    const deleted = tagManager.deleteTag(name);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Tag "${name}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tag "${name}" deleted successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete tag",
      },
      { status: 500 },
    );
  }
}
