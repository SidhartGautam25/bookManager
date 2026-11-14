import { NextRequest, NextResponse } from "next/server";
import { dictionaryManager } from "@/lib/DictionaryPartitionManager";

// POST: Add example to a specific word meaning
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, meaningIndex = 0, example } = body;

    if (!word || !example || typeof example !== "string" || !example.trim()) {
      return NextResponse.json(
        { success: false, error: "word and example are required" },
        { status: 400 },
      );
    }

    const updated = dictionaryManager.addExample(
      word.trim(),
      Number(meaningIndex),
      example.trim(),
    );

    return NextResponse.json({
      success: true,
      message: `Example added to "${word}" successfully.`,
      entry: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error adding example",
      },
      { status: 500 },
    );
  }
}

// DELETE: Remove example from a specific word meaning
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, meaningIndex = 0, exampleIndex } = body;

    if (!word || exampleIndex === undefined) {
      return NextResponse.json(
        { success: false, error: "word and exampleIndex are required" },
        { status: 400 },
      );
    }

    const entry = dictionaryManager.getWord(word.trim());
    if (!entry) {
      return NextResponse.json(
        { success: false, error: `Word "${word}" not found` },
        { status: 404 },
      );
    }

    const mIdx = Number(meaningIndex);
    const exIdx = Number(exampleIndex);

    if (!entry.meanings[mIdx] || !entry.meanings[mIdx].examples[exIdx]) {
      return NextResponse.json(
        { success: false, error: "Example not found" },
        { status: 404 },
      );
    }

    entry.meanings[mIdx].examples.splice(exIdx, 1);
    const updated = dictionaryManager.updateWord(word.trim(), {
      meanings: entry.meanings,
    });

    return NextResponse.json({
      success: true,
      message: `Example removed from "${word}" successfully.`,
      entry: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error removing example",
      },
      { status: 500 },
    );
  }
}
