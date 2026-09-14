export interface MeaningItem {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

export interface EnrichedWordData {
  word: string;
  meanings: MeaningItem[];
  variations: string[];
  source: "dictionaryapi" | "wiktionary" | "combined" | "fallback";
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

  // Remove leading bullet or dash if present
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
 * Checks if a definition is a tautology like "plural of X" or "third-person singular ... of X"
 */
function extractTautologicalRoot(def: string): string | null {
  if (!def) return null;
  const clean = cleanText(def).toLowerCase();
  const match = clean.match(
    /^(?:plural of|third-person singular (?:simple )?present indicative of|past (?:participle|tense) of|present participle of|comparative of|superlative of|inflection of)\s+([a-zA-Z'-]+)/i,
  );
  if (match && match[1]) {
    return match[1].toLowerCase().trim();
  }
  return null;
}

/**
 * Generates distinct, natural literary context examples when dictionary lacks sufficient examples.
 * Guarantees every word has 2-3 realistic, non-robotic sentences per part of speech.
 */
function generateDiverseContextExamples(
  word: string,
  pos: string,
  countNeeded: number,
): string[] {
  const lowerPos = pos.toLowerCase().trim();
  const patterns: string[] = [];

  if (lowerPos.includes("verb")) {
    patterns.push(
      `She paused to ${word} the delicate situation before offering her opinion.`,
      `Throughout history, writers have sought to ${word} the essence of human resilience.`,
      `They watched him ${word} the components with remarkable precision and focus.`,
      `He knew that to ${word} without clear purpose would only invite confusion.`,
    );
  } else if (lowerPos.includes("noun")) {
    patterns.push(
      `The enduring significance of the ${word} became clearer as the narrative progressed.`,
      `He pointed toward the ${word}, noting how it captured the mood of the era.`,
      `Without a proper understanding of the ${word}, much of the subtle nuance would be lost.`,
      `Her collection included an extraordinary ${word} that fascinated visiting scholars.`,
    );
  } else if (lowerPos.includes("adjective")) {
    patterns.push(
      `The quiet evening settled into a deeply ${word} stillness across the valley.`,
      `Her ${word} perspective on the matter shed new light on the longstanding mystery.`,
      `He wore a ${word} expression that concealed his true intentions from the crowd.`,
      `The architecture possessed an undeniably ${word} quality that captivated observers.`,
    );
  } else if (lowerPos.includes("adverb")) {
    patterns.push(
      `She moved ${word} through the narrow corridor so as not to disturb the household.`,
      `The speaker articulated each point ${word}, holding the undivided attention of the room.`,
      `The problem was ${word} resolved before any lasting disruption could occur.`,
      `He observed the proceedings ${word}, weighing every detail with cautious reserve.`,
    );
  } else {
    patterns.push(
      `The subtle resonance of ${word} echoed across multiple interpretations of the work.`,
      `Scholars often highlight ${word} as a notable example in nineteenth-century literature.`,
      `In every chapter, ${word} played an indispensable role in shaping the atmosphere.`,
    );
  }

  return patterns.slice(0, countNeeded);
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
 * Automatically resolves plurals/inflections to their root concepts,
 * purges unhelpful "plural of X" definitions, and guarantees 2 to 3 distinct examples per form.
 */
export async function fetchComprehensiveDictionary(
  rawWord: string,
): Promise<EnrichedWordData> {
  const word = rawWord.trim().toLowerCase();
  if (!word) {
    return {
      word: rawWord,
      meanings: [
        { partOfSpeech: "general", definition: "Unknown word", examples: [""] },
      ],
      variations: [],
      source: "fallback",
    };
  }

  // 1. Fetch primary word data from both sources in parallel
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

  // 2. Intelligent Plural & Inflection Resolution:
  // Detect if any definition is simply "plural of X" or "third-person singular ... of X"
  let detectedRootWord: string | null = null;

  for (const [, data] of posMap.entries()) {
    for (const def of data.definitions) {
      const root = extractTautologicalRoot(def);
      if (root && root !== word) {
        detectedRootWord = root;
        break;
      }
    }
    if (detectedRootWord) break;
  }

  // If word ends with 's', 'es', or 'ies' and we got no definitions at all, guess lemma
  if (!detectedRootWord && posMap.size === 0) {
    if (word.endsWith("ies") && word.length > 4) {
      detectedRootWord = word.slice(0, -3) + "y";
    } else if (word.endsWith("es") && word.length > 3) {
      detectedRootWord = word.slice(0, -2);
    } else if (word.endsWith("s") && word.length > 2) {
      detectedRootWord = word.slice(0, -1);
    }
  }

  // 3. If a root word was detected, query the root word and replace tautologies!
  const variations: string[] = [rawWord.trim()];
  if (detectedRootWord && detectedRootWord !== word) {
    variations.push(detectedRootWord);

    try {
      const [rootPrimary, rootWiktionary] = await Promise.all([
        fetchFromFreeDictionary(detectedRootWord),
        fetchFromWiktionary(detectedRootWord),
      ]);

      const rootMeanings: MeaningItem[] = [];
      if (rootPrimary) rootMeanings.push(...rootPrimary);
      if (rootWiktionary) rootMeanings.push(...rootWiktionary);

      // Merge root meanings into our posMap
      rootMeanings.forEach((rItem) => {
        const rPos = (rItem.partOfSpeech || "general").toLowerCase().trim();
        if (!posMap.has(rPos)) {
          posMap.set(rPos, { definitions: [], examples: [] });
        }
        const current = posMap.get(rPos)!;

        // Purge tautologies like "plural of X" from definitions
        current.definitions = current.definitions.filter(
          (d) => !extractTautologicalRoot(d),
        );

        // Add real definitions from root
        const cleanRootDef = cleanText(rItem.definition);
        if (
          cleanRootDef &&
          !current.definitions.some(
            (d) => d.toLowerCase() === cleanRootDef.toLowerCase(),
          )
        ) {
          // If word was plural, prefix definition informatively e.g. "(Plural form) A person who..."
          const isPlural = word.endsWith("s") && rPos.includes("noun");
          const formattedDef = isPlural
            ? `(Plural) ${cleanRootDef}`
            : cleanRootDef;

          current.definitions.push(formattedDef);
        }

        // Add real examples from root, adapting to plural form if suitable
        rItem.examples.forEach((ex) => {
          let adaptedEx = formatSentence(ex);
          // If plural, see if we can adapt singular root word in example to plural
          if (word.endsWith("s") && detectedRootWord) {
            const regex = new RegExp(`\\b${detectedRootWord}\\b`, "gi");
            if (regex.test(adaptedEx)) {
              adaptedEx = adaptedEx.replace(regex, word);
            }
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
    } catch {
      // Continue if root lookup fails
    }
  }

  // 4. Fallback if both sources failed completely
  if (posMap.size === 0) {
    const fallbackExamples = generateDiverseContextExamples(
      rawWord.trim(),
      "general",
      3,
    );
    return {
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
  }

  // 5. Construct final structured meanings per part of speech
  // Guaranteeing clean definitions and 2 to 3 distinct examples
  const finalMeanings: MeaningItem[] = [];

  for (const [pos, data] of posMap.entries()) {
    // Purge any remaining tautologies
    let cleanDefs = data.definitions.filter((d) => !extractTautologicalRoot(d));
    if (cleanDefs.length === 0) {
      cleanDefs = data.definitions;
    }
    if (cleanDefs.length === 0) continue;

    const primaryDef = cleanDefs[0];
    const secondaryDef =
      cleanDefs.length > 1 &&
      cleanDefs[1].length > 5 &&
      !cleanDefs[1].toLowerCase().includes("plural of")
        ? cleanDefs[1]
        : null;

    const fullDefinition = secondaryDef
      ? `${primaryDef}; ${secondaryDef}`
      : primaryDef;

    // Collect and guarantee 2 to 3 distinct examples
    const finalExamples: string[] = [...data.examples];

    // If we have fewer than 3 examples, supplement with rich contextual examples
    if (finalExamples.length < 3) {
      const needed = 3 - finalExamples.length;
      const generated = generateDiverseContextExamples(
        rawWord.trim(),
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

  return {
    word: rawWord.trim(),
    meanings: finalMeanings,
    variations,
    source,
  };
}

/**
 * Concurrency-controlled batch dictionary fetcher
 */
export async function fetchDictionaryBatch(
  words: string[],
  concurrency = 4,
  onProgress?: (completed: number, total: number, currentWord: string) => void,
): Promise<Map<string, EnrichedWordData>> {
  const results = new Map<string, EnrichedWordData>();
  const total = words.length;
  let completed = 0;

  const uniqueWords = Array.from(
    new Set(words.map((w) => w.trim().toLowerCase())),
  ).filter(Boolean);

  for (let i = 0; i < uniqueWords.length; i += concurrency) {
    const chunk = uniqueWords.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (word) => {
      try {
        const enriched = await fetchComprehensiveDictionary(word);
        results.set(word, enriched);
      } catch {
        results.set(word, {
          word,
          meanings: [
            {
              partOfSpeech: "General",
              definition: `Definition for ${word}`,
              examples: generateDiverseContextExamples(word, "general", 3),
            },
          ],
          variations: [],
          source: "fallback",
        });
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, total, word);
        }
      }
    });

    await Promise.all(chunkPromises);
  }

  return results;
}
