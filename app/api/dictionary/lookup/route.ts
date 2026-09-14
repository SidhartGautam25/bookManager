import { NextRequest, NextResponse } from "next/server";
import { persistentDictionaryCache } from "@/lib/DictionaryCache";
import {
  fetchComprehensiveDictionary,
  EnrichedWordData,
} from "@/lib/dictionary";

export async function GET() {
  try {
    const stats = persistentDictionaryCache.getStats();
    return NextResponse.json({ success: true, stats });
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
    const { words, forceRefreshWords = [] } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { success: false, error: "words must be a non-empty array" },
        { status: 400 },
      );
    }

    const forceSet = new Set(
      (Array.isArray(forceRefreshWords) ? forceRefreshWords : []).map((w) =>
        String(w).trim().toLowerCase(),
      ),
    );

    persistentDictionaryCache.ensureInitialized();

    const results: Record<string, EnrichedWordData> = {};
    const wordsToFetch: string[] = [];
    let cachedCount = 0;

    // 1. Separate cached words from uncached words
    for (const rawWord of words) {
      const cleanWord = String(rawWord).trim();
      if (!cleanWord) continue;
      const norm = cleanWord.toLowerCase();

      if (!forceSet.has(norm) && persistentDictionaryCache.has(norm)) {
        const cached = persistentDictionaryCache.get(norm)!;
        results[norm] = cached;
        cachedCount++;
      } else {
        wordsToFetch.push(cleanWord);
      }
    }

    // 2. Fetch uncached words via comprehensive dictionary lookup with concurrency
    const concurrency = 4;
    const newlyFetched: Record<string, EnrichedWordData> = {};

    for (let i = 0; i < wordsToFetch.length; i += concurrency) {
      const chunk = wordsToFetch.slice(i, i + concurrency);
      const chunkPromises = chunk.map(async (word) => {
        const norm = word.toLowerCase().trim();
        try {
          const enriched = await fetchComprehensiveDictionary(word, true);
          results[norm] = enriched;
          newlyFetched[norm] = enriched;
        } catch {
          const fallback: EnrichedWordData = {
            word,
            meanings: [
              {
                partOfSpeech: "General",
                definition: `Definition for ${word}`,
                examples: [`Observed in context: ${word}.`],
              },
            ],
            variations: [],
            source: "fallback",
          };
          results[norm] = fallback;
          newlyFetched[norm] = fallback;
        }
      });

      await Promise.all(chunkPromises);
    }

    // 3. Persist all newly fetched words to disk in a single batch write
    if (Object.keys(newlyFetched).length > 0) {
      persistentDictionaryCache.setBatch(newlyFetched);
    }

    const stats = persistentDictionaryCache.getStats();

    return NextResponse.json({
      success: true,
      data: results,
      cachedCount,
      fetchedCount: wordsToFetch.length,
      totalDiskWords: stats.totalWords,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal lookup error",
      },
      { status: 500 },
    );
  }
}
