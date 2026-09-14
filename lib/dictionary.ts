import {
  detectInflectionFromDefinition,
  formatInflectedDefinition,
  generateInflectionExamples,
  InflectionDetection,
} from "@/lib/inflections";

export interface MeaningItem {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

export interface EnrichedWordData {
  word: string;
  meanings: MeaningItem[];
  variations: string[];
  source: "dictionaryapi" | "wiktionary" | "combined" | "cache" | "fallback";
}

// Global in-memory dictionary cache to prevent redundant API calls
const dictionaryCache = new Map<string, EnrichedWordData>();

export function getCachedWord(word: string): EnrichedWordData | undefined {
  return dictionaryCache.get(word.trim().toLowerCase());
}

export function setCachedWord(word: string, data: EnrichedWordData): void {
  dictionaryCache.set(word.trim().toLowerCase(), data);
}

export function clearDictionaryCache(): void {
  dictionaryCache.clear();
}

export function getDictionaryCacheSize(): number {
  return dictionaryCache.size;
}

/**
 * Strips HTML tags, CSS rules, and Wiktionary formatting artifacts
 */
function cleanText(text: string): string {
  if (!text) return "";
  let clean = text
    .replace(/<[^>]*>?/gm, "")
    .replace(/\.mw-parser-output[^{]*\{[^}]*\}/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  clean = clean.replace(/^[-*•]\s*/, "");
  return clean;
}

/**
 * Formats an example sentence nicely with proper capitalization and punctuation
 */
function formatSentence(sentence: string): string {
  const cleaned = cleanText(sentence);
  if (!cleaned) return "";
  let formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?"]$/.test(formatted)) {
    formatted += ".";
  }
  return formatted;
}

/**
 * Fetch definitions from Free Dictionary API (api.dictionaryapi.dev)
 */
async function fetchFromFreeDictionary(
  word: string,
): Promise<MeaningItem[] | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const collected: MeaningItem[] = [];

    data.forEach(
      (entry: {
        meanings?: {
          partOfSpeech?: string;
          definitions?: {
            definition?: string;
            example?: string;
            examples?: string[];
          }[];
        }[];
      }) => {
        entry.meanings?.forEach((m) => {
          const pos = m.partOfSpeech || "general";

          m.definitions?.forEach((def) => {
            if (!def.definition) return;

            const exList: string[] = [];
            if (def.example && def.example.trim()) {
              exList.push(formatSentence(def.example));
            }
            if (Array.isArray(def.examples)) {
              def.examples.forEach((ex) => {
                if (typeof ex === "string" && ex.trim()) {
                  exList.push(formatSentence(ex));
                }
              });
            }

            collected.push({
              partOfSpeech: pos,
              definition: cleanText(def.definition),
              examples: exList.filter(Boolean),
            });
          });
        });
      },
    );

    return collected.length > 0 ? collected : null;
  } catch {
    return null;
  }
}

/**
 * Fetch definitions and citations from Wiktionary API (en.wiktionary.org)
 */
async function fetchFromWiktionary(
  word: string,
): Promise<MeaningItem[] | null> {
  try {
    const res = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
    );
    if (!res.ok) return null;

    const data = await res.json();
    const enEntries = data?.en;
    if (!Array.isArray(enEntries) || enEntries.length === 0) return null;

    const collected: MeaningItem[] = [];

    enEntries.forEach(
      (group: {
        partOfSpeech?: string;
        definitions?: {
          definition?: string;
          examples?: (string | { example?: string })[];
        }[];
      }) => {
        const pos = group.partOfSpeech || "general";

        group.definitions?.forEach((def) => {
          if (!def.definition) return;
          const cleanDef = cleanText(def.definition);
          if (!cleanDef || cleanDef.length < 3) return;

          const exList: string[] = [];
          if (Array.isArray(def.examples)) {
            def.examples.forEach((ex) => {
              const raw = typeof ex === "string" ? ex : ex?.example;
              if (raw && typeof raw === "string") {
                const cleanedEx = formatSentence(raw);
                if (cleanedEx.length > 10) {
                  exList.push(cleanedEx);
                }
              }
            });
          }

          collected.push({
            partOfSpeech: pos,
            definition: cleanDef,
            examples: exList.filter(Boolean),
          });
        });
      },
    );

    return collected.length > 0 ? collected : null;
  } catch {
    return null;
  }
}

/**
 * Master multi-source dictionary lookup:
 * - Checks cache first to avoid duplicate network requests.
 * - Detection of tenses / plurals ONLY happens AFTER examining the actual dictionary response.
 * - If a definition states "simple past of X", "present participle of X", etc., researches the root.
 * - Guarantees 2 to 3 distinct usage examples per part of speech.
 */
export async function fetchComprehensiveDictionary(
  rawWord: string,
  forceRefresh = false,
): Promise<EnrichedWordData> {
  const word = rawWord.trim().toLowerCase();
  if (!word) {
    return {
      word: rawWord,
      meanings: [
        { partOfSpeech: "General", definition: "Unknown word", examples: [""] },
      ],
      variations: [],
      source: "fallback",
    };
  }

  // 1. Check in-memory cache first (unless forceRefresh is requested)
  if (!forceRefresh) {
    const cached = dictionaryCache.get(word);
    if (cached) {
      return { ...cached, source: "cache" };
    }
  }

  // 2. Fetch primary word data from dictionary APIs in parallel
  const [primaryResult, wiktionaryResult] = await Promise.all([
    fetchFromFreeDictionary(word),
    fetchFromWiktionary(word),
  ]);

  // Group all discovered meanings by normalized part of speech
  const posMap = new Map<
    string,
    { definitions: string[]; examples: string[] }
  >();

  const registerItem = (item: MeaningItem) => {
    const posKey = (item.partOfSpeech || "general").toLowerCase().trim();
    if (!posMap.has(posKey)) {
      posMap.set(posKey, { definitions: [], examples: [] });
    }
    const current = posMap.get(posKey)!;

    const cleanDef = cleanText(item.definition);
    if (
      cleanDef &&
      !current.definitions.some(
        (d) => d.toLowerCase() === cleanDef.toLowerCase(),
      )
    ) {
      current.definitions.push(cleanDef);
    }

    item.examples.forEach((ex) => {
      const cleanEx = formatSentence(ex);
      if (
        cleanEx &&
        cleanEx.length > 10 &&
        !current.examples.some((e) => e.toLowerCase() === cleanEx.toLowerCase())
      ) {
        current.examples.push(cleanEx);
      }
    });
  };

  if (primaryResult) primaryResult.forEach(registerItem);
  if (wiktionaryResult) wiktionaryResult.forEach(registerItem);

  // 3. Modular Tense & Inflection Detection ONLY AFTER DICTIONARY RESPONSES:
  // We inspect the actual definitions returned by the APIs.
  // ONLY if an actual definition matches an inflection pattern do we research the root.
  let detectedInflection: InflectionDetection | null = null;

  for (const [, data] of posMap.entries()) {
    for (const def of data.definitions) {
      const detection = detectInflectionFromDefinition(def);
      if (
        detection.isInflected &&
        detection.rootWord &&
        detection.rootWord !== word
      ) {
        detectedInflection = detection;
        break;
      }
    }
    if (detectedInflection) break;
  }

  // 4. If an inflection was found in the response, research the root lemma and replace tautologies!
  const variations: string[] = [rawWord.trim()];

  if (
    detectedInflection &&
    detectedInflection.rootWord &&
    detectedInflection.rootWord !== word
  ) {
    const rootWord = detectedInflection.rootWord;
    variations.push(rootWord);

    try {
      // Check cache for root word first
      let rootMeanings: MeaningItem[] = [];
      const cachedRoot = dictionaryCache.get(rootWord);

      if (cachedRoot && cachedRoot.meanings.length > 0) {
        rootMeanings = cachedRoot.meanings;
      } else {
        const [rootPrimary, rootWiktionary] = await Promise.all([
          fetchFromFreeDictionary(rootWord),
          fetchFromWiktionary(rootWord),
        ]);
        if (rootPrimary) rootMeanings.push(...rootPrimary);
        if (rootWiktionary) rootMeanings.push(...rootWiktionary);
      }

      if (rootMeanings.length > 0) {
        rootMeanings.forEach((rItem) => {
          const rPos = (rItem.partOfSpeech || "general").toLowerCase().trim();
          if (!posMap.has(rPos)) {
            posMap.set(rPos, { definitions: [], examples: [] });
          }
          const current = posMap.get(rPos)!;

          // Purge tautological definitions like "simple past and past participle of X"
          current.definitions = current.definitions.filter(
            (d) => !detectInflectionFromDefinition(d).isInflected,
          );

          // Add informative, formatted root definition
          const cleanRootDef = cleanText(rItem.definition);
          if (
            cleanRootDef &&
            !detectInflectionFromDefinition(cleanRootDef).isInflected &&
            !current.definitions.some(
              (d) => d.toLowerCase() === cleanRootDef.toLowerCase(),
            )
          ) {
            const formattedDef = formatInflectedDefinition(
              cleanRootDef,
              detectedInflection?.type || null,
              detectedInflection?.label || null,
            );
            current.definitions.push(formattedDef);
          }

          // Adapt and bring in root examples
          rItem.examples.forEach((ex) => {
            let adaptedEx = formatSentence(ex);
            const regex = new RegExp(`\\b${rootWord}\\b`, "gi");
            if (regex.test(adaptedEx)) {
              adaptedEx = adaptedEx.replace(regex, word);
            }
            if (
              adaptedEx &&
              adaptedEx.length > 10 &&
              !current.examples.some(
                (e) => e.toLowerCase() === adaptedEx.toLowerCase(),
              )
            ) {
              current.examples.push(adaptedEx);
            }
          });
        });
      }
    } catch {
      // Continue if root research fails
    }
  }

  // 5. Fallback if both sources failed completely
  if (posMap.size === 0) {
    const fallbackExamples = generateInflectionExamples(
      rawWord.trim(),
      detectedInflection?.type || null,
      "general",
      3,
    );
    const fallbackResult: EnrichedWordData = {
      word: rawWord.trim(),
      meanings: [
        {
          partOfSpeech: "General",
          definition: `Meaning and context of ${rawWord.trim()}`,
          examples: fallbackExamples,
        },
      ],
      variations,
      source: "fallback",
    };
    dictionaryCache.set(word, fallbackResult);
    return fallbackResult;
  }

  // 6. Construct final structured meanings per part of speech
  // Guaranteeing clean definitions and 2 to 3 distinct examples
  const finalMeanings: MeaningItem[] = [];

  for (const [pos, data] of posMap.entries()) {
    let cleanDefs = data.definitions.filter(
      (d) => !detectInflectionFromDefinition(d).isInflected,
    );
    if (cleanDefs.length === 0) {
      cleanDefs = data.definitions;
    }
    if (cleanDefs.length === 0) continue;

    const primaryDef = cleanDefs[0];
    const secondaryDef =
      cleanDefs.length > 1 &&
      cleanDefs[1].length > 5 &&
      !detectInflectionFromDefinition(cleanDefs[1]).isInflected
        ? cleanDefs[1]
        : null;

    const fullDefinition = secondaryDef
      ? `${primaryDef}; ${secondaryDef}`
      : primaryDef;

    // Collect and guarantee 2 to 3 distinct examples
    const finalExamples: string[] = [...data.examples];

    if (finalExamples.length < 3) {
      const needed = 3 - finalExamples.length;
      const generated = generateInflectionExamples(
        rawWord.trim(),
        detectedInflection?.type || null,
        pos,
        needed,
      );
      generated.forEach((genEx) => {
        if (
          !finalExamples.some((e) => e.toLowerCase() === genEx.toLowerCase())
        ) {
          finalExamples.push(genEx);
        }
      });
    }

    finalMeanings.push({
      partOfSpeech: pos.charAt(0).toUpperCase() + pos.slice(1),
      definition: fullDefinition,
      examples: finalExamples.slice(0, 3),
    });
  }

  const source =
    primaryResult && wiktionaryResult
      ? "combined"
      : primaryResult
        ? "dictionaryapi"
        : "wiktionary";

  const result: EnrichedWordData = {
    word: rawWord.trim(),
    meanings: finalMeanings,
    variations,
    source,
  };

  // Cache the result for future batch operations
  dictionaryCache.set(word, result);

  return result;
}

/**
 * Concurrency-controlled batch dictionary fetcher with smart caching:
 * - Checks cache for each word first.
 * - Only performs network requests for uncached or updated words.
 */
export async function fetchDictionaryBatch(
  words: string[],
  concurrency = 4,
  onProgress?: (
    completed: number,
    total: number,
    currentWord: string,
    isCached: boolean,
  ) => void,
  forceRefreshWords: Set<string> = new Set(),
): Promise<Map<string, EnrichedWordData>> {
  const results = new Map<string, EnrichedWordData>();
  const total = words.length;
  let completed = 0;

  const uniqueWords = Array.from(
    new Set(words.map((w) => w.trim().toLowerCase())),
  ).filter(Boolean);

  // Separate cached words from uncached words
  const wordsToFetch: string[] = [];

  for (const word of uniqueWords) {
    if (!forceRefreshWords.has(word) && dictionaryCache.has(word)) {
      const cached = dictionaryCache.get(word)!;
      results.set(word, { ...cached, source: "cache" });
      completed++;
      if (onProgress) {
        onProgress(completed, total, word, true);
      }
    } else {
      wordsToFetch.push(word);
    }
  }

  // Fetch only uncached/refreshed words with concurrency control
  for (let i = 0; i < wordsToFetch.length; i += concurrency) {
    const chunk = wordsToFetch.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (word) => {
      try {
        const enriched = await fetchComprehensiveDictionary(
          word,
          forceRefreshWords.has(word),
        );
        results.set(word, enriched);
      } catch {
        results.set(word, {
          word,
          meanings: [
            {
              partOfSpeech: "General",
              definition: `Definition for ${word}`,
              examples: generateInflectionExamples(word, null, "general", 3),
            },
          ],
          variations: [],
          source: "fallback",
        });
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, total, word, false);
        }
      }
    });

    await Promise.all(chunkPromises);
  }

  return results;
}
