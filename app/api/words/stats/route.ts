import { NextRequest, NextResponse } from "next/server";
import { BookManager, WordMeaning } from "@/lib/BookManager";
import { songManager, movieManager, poemManager } from "@/lib/MediaManager";

const bookManager = new BookManager();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json(
        { success: false, error: "word parameter is required" },
        { status: 400 },
      );
    }

    const cleanWord = word.trim();
    const bookStats = bookManager.getWordStatsAcrossAllBooks(cleanWord);
    const songStats = songManager.getWordStatsAcrossAll(cleanWord);
    const movieStats = movieManager.getWordStatsAcrossAll(cleanWord);
    const poemStats = poemManager.getWordStatsAcrossAll(cleanWord);

    const totalBooksFreq = bookStats?.totalFrequency || 0;
    const totalSongsFreq = songStats.reduce((sum, s) => sum + s.frequency, 0);
    const totalMoviesFreq = movieStats.reduce((sum, m) => sum + m.frequency, 0);
    const totalPoemsFreq = poemStats.reduce((sum, p) => sum + p.frequency, 0);
    const totalFrequency =
      totalBooksFreq + totalSongsFreq + totalMoviesFreq + totalPoemsFreq;

    if (totalFrequency === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        word: cleanWord,
      });
    }

    // Combine meanings from whichever source found it first
    let combinedMeanings: WordMeaning[] = bookStats?.meanings || [];
    if (
      combinedMeanings.length === 0 &&
      songStats.length > 0 &&
      songStats[0].meanings
    ) {
      combinedMeanings = songStats[0].meanings;
    }
    if (
      combinedMeanings.length === 0 &&
      movieStats.length > 0 &&
      movieStats[0].meanings
    ) {
      combinedMeanings = movieStats[0].meanings;
    }
    if (
      combinedMeanings.length === 0 &&
      poemStats.length > 0 &&
      poemStats[0].meanings
    ) {
      combinedMeanings = poemStats[0].meanings;
    }

    return NextResponse.json({
      success: true,
      found: true,
      data: {
        word: cleanWord,
        meanings: combinedMeanings,
        totalFrequency,
        books: bookStats?.books || [],
        songs: songStats,
        movies: movieStats,
        poems: poemStats,
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
