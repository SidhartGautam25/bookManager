"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  BookPlus,
  Book,
  Music,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  ArrowRight,
  Check,
  HelpCircle,
  RefreshCw,
  Pencil,
  Database,
} from "lucide-react";
import {
  fetchDictionaryBatch,
  fetchComprehensiveDictionary,
  getCachedWord,
  MeaningItem,
  EnrichedWordData,
} from "@/lib/dictionary";

interface ParsedEntry {
  pageNo: number;
  word: string;
  customNote?: string;
}

interface ReviewWordItem {
  id: string;
  pageNo: number;
  word: string;
  meanings: MeaningItem[];
  variations: string[];
  source: string;
  included: boolean;
  isEditing?: boolean;
  hasManualEdits?: boolean;
}

interface BatchImportProps {
  books: string[];
  selectedBook: string;
  onSelectBook: (book: string) => void;
  onBookCreated: (newBook: string) => void;
  mediaType?: "book" | "song" | "movie";
}

export default function BatchImport({
  books,
  selectedBook,
  onSelectBook,
  onBookCreated,
  mediaType = "book",
}: BatchImportProps) {
  const [showNewBookInput, setShowNewBookInput] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [notesText, setNotesText] = useState("");
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  // Dynamic media labels
  const mediaLabel =
    mediaType === "song" ? "Song" : mediaType === "movie" ? "Movie" : "Book";
  const mediaPath =
    mediaType === "song" ? "song" : mediaType === "movie" ? "movie" : "book";

  // Enrichment state
  const [isEnriching, setIsEnriching] = useState(false);
  const [refreshingWordId, setRefreshingWordId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    word: string;
    cachedCount: number;
  }>({
    current: 0,
    total: 0,
    word: "",
    cachedCount: 0,
  });

  // Review table state
  const [reviewItems, setReviewItems] = useState<ReviewWordItem[]>([]);
  const [hasEnriched, setHasEnriched] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Expanded page groups for book mode
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>(
    {},
  );

  // Persistent disk cache statistics
  const [cacheStats, setCacheStats] = useState<{
    totalWords: number;
    isPersistent: boolean;
  } | null>(null);

  const refreshCacheStats = () => {
    fetch("/api/dictionary/lookup")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          setCacheStats({
            totalWords: data.stats.totalWords,
            isPersistent: data.stats.isPersistent,
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    let ignore = false;
    fetch("/api/dictionary/lookup")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && data.stats) {
          setCacheStats({
            totalWords: data.stats.totalWords,
            isPersistent: data.stats.isPersistent,
          });
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  // Helper to extract words from comma/semicolon separated text
  function extractWordsFromText(
    text: string,
    pageNo: number,
    target: ParsedEntry[],
  ) {
    const tokens = text.split(/[,;]/);
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);
      const dashMatch = trimmed.match(/^([^-]+)\s*-\s*(.+)$/);

      if (parenMatch) {
        const wordOnly = parenMatch[1].trim();
        const note = parenMatch[2].trim();
        if (wordOnly) target.push({ pageNo, word: wordOnly, customNote: note });
      } else if (dashMatch) {
        const wordOnly = dashMatch[1].trim();
        const note = dashMatch[2].trim();
        if (wordOnly) target.push({ pageNo, word: wordOnly, customNote: note });
      } else {
        const cleanWord = trimmed.replace(/[^a-zA-Z\s'-]/g, "").trim();
        if (cleanWord) target.push({ pageNo, word: cleanWord });
      }
    }
  }

  // Parse raw text into entries
  const parsedEntries = useMemo(() => {
    if (!notesText.trim()) return [];

    const lines = notesText.split("\n");
    const entries: ParsedEntry[] = [];

    // For Songs and Movies: purely word-based without page numbers!
    if (mediaType !== "book") {
      for (const rawLine of lines) {
        const line = rawLine.trim().replace(/^[-*•\d+.)]\s*/, "");
        if (!line) continue;
        extractWordsFromText(line, 1, entries);
      }
      return entries;
    }

    // For Books: parse Page headers
    let currentPage: number | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const pageHeaderMatch = line.match(
        /^(?:page|pg|p\.?)\s*(\d+)[:\s-]*(.*)$/i,
      );
      const numberColonMatch = line.match(/^(\d+)[:\s-]+(.*)$/);

      if (pageHeaderMatch) {
        currentPage = parseInt(pageHeaderMatch[1], 10);
        const rest = pageHeaderMatch[2].trim();
        if (rest) {
          extractWordsFromText(rest, currentPage, entries);
        }
        continue;
      } else if (numberColonMatch && !line.includes(" ")) {
        currentPage = parseInt(numberColonMatch[1], 10);
        const rest = numberColonMatch[2].trim();
        if (rest) {
          extractWordsFromText(rest, currentPage, entries);
        }
        continue;
      }

      if (currentPage !== null) {
        const cleanLine = line.replace(/^[-*•]\s*/, "");
        extractWordsFromText(cleanLine, currentPage, entries);
      }
    }

    return entries;
  }, [notesText, mediaType]);

  // Count unique items / pages
  const stats = useMemo(() => {
    if (mediaType !== "book") {
      return {
        totalWords: parsedEntries.length,
        totalPages: 0,
      };
    }
    const pageSet = new Set<number>();
    parsedEntries.forEach((e) => pageSet.add(e.pageNo));
    return {
      totalWords: parsedEntries.length,
      totalPages: pageSet.size,
    };
  }, [parsedEntries, mediaType]);

  // Load sample notes
  const handleLoadSample = () => {
    if (mediaType === "song") {
      setNotesText(
        "scaramouche, fandango, gallimaufry, serendipity, ephemeral, bohemian, rhapsody",
      );
    } else if (mediaType === "movie") {
      setNotesText(
        "labyrinth, subconscious, anomalous, paradox, petrichor, inception, totemic",
      );
    } else {
      setNotesText(
        `Page 12: ephemeral, taciturn, juxtapose
Page 13: obsequious, serendipity
Page 14: lugubrious, anomalous, petrichor
Page 15: quixotic, recalcitrant`,
      );
    }
    setStatusMessage(null);
  };

  // Create new media item handler
  const handleCreateNewItem = async () => {
    if (!newBookName.trim()) return;
    try {
      let endpoint = "/api/books";
      let bodyData: Record<string, string> = {
        bookName: newBookName.trim(),
        action: "create",
      };

      if (mediaType === "song") {
        endpoint = "/api/songs";
        bodyData = { songName: newBookName.trim(), action: "create" };
      } else if (mediaType === "movie") {
        endpoint = "/api/movies";
        bodyData = { movieName: newBookName.trim(), action: "create" };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (data.success) {
        onBookCreated(newBookName.trim());
        setShowNewBookInput(false);
        setNewBookName("");
        setStatusMessage({
          type: "success",
          text: `${mediaLabel} "${newBookName}" created!`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || `Failed to create ${mediaLabel.toLowerCase()}`,
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: `Error creating ${mediaLabel.toLowerCase()}`,
      });
    }
  };

  // Start Batch Dictionary Enrichment with SMART CACHING & INCREMENTAL FETCHING
  const handleStartEnrichment = async () => {
    if (parsedEntries.length === 0) {
      setStatusMessage({
        type: "error",
        text: "No valid word entries found in notes",
      });
      return;
    }

    setIsEnriching(true);
    setStatusMessage(null);

    // Map of currently reviewed items to preserve manual edits and avoid re-fetching
    const currentReviewMap = new Map<string, ReviewWordItem>();
    reviewItems.forEach((item) => {
      currentReviewMap.set(item.word.toLowerCase(), item);
    });

    // Identify which words are completely new and need network lookup
    const wordsToFetch: string[] = [];
    let initialCached = 0;

    parsedEntries.forEach((entry) => {
      const norm = entry.word.toLowerCase();
      // If word is already in review items or in dictionary cache, count as cached
      if (currentReviewMap.has(norm) || getCachedWord(norm)) {
        initialCached++;
      } else {
        wordsToFetch.push(entry.word);
      }
    });

    setProgress({
      current: initialCached,
      total: parsedEntries.length,
      word: wordsToFetch.length > 0 ? wordsToFetch[0] : "All cached",
      cachedCount: initialCached,
    });

    try {
      // Only query network for genuinely new / uncached words
      let newDictionaryMap = new Map<string, EnrichedWordData>();
      if (wordsToFetch.length > 0) {
        newDictionaryMap = await fetchDictionaryBatch(
          wordsToFetch,
          4,
          (completed, total, word, isCached) => {
            setProgress((prev) => ({
              current: prev.cachedCount + completed,
              total: parsedEntries.length,
              word,
              cachedCount: isCached ? prev.cachedCount + 1 : prev.cachedCount,
            }));
          },
        );
      }

      // Build updated review items, preserving manual edits for existing words
      const updatedItems: ReviewWordItem[] = parsedEntries.map((entry, idx) => {
        const norm = entry.word.toLowerCase();

        // 1. If word was already in review table, preserve it (including user manual edits)
        if (currentReviewMap.has(norm)) {
          const existing = currentReviewMap.get(norm)!;
          return {
            ...existing,
            pageNo: entry.pageNo,
            id: `${entry.pageNo}-${entry.word}-${idx}`,
          };
        }

        // 2. Otherwise get from new fetch or dictionary cache
        const enriched: EnrichedWordData | undefined =
          newDictionaryMap.get(norm) || getCachedWord(norm);

        let meanings: MeaningItem[] = enriched?.meanings
          ? [...enriched.meanings]
          : [];
        if (entry.customNote) {
          meanings = [
            {
              partOfSpeech: "Context Note",
              definition: entry.customNote,
              examples: [
                mediaType === "book"
                  ? `Observed in context on page ${entry.pageNo}.`
                  : `Observed in context in ${selectedBook || mediaLabel}.`,
              ],
            },
            ...meanings,
          ];
        }

        return {
          id: `${entry.pageNo}-${entry.word}-${idx}`,
          pageNo: entry.pageNo,
          word: entry.word,
          meanings,
          variations: enriched?.variations || [],
          source: enriched?.source || "lookup",
          included: true,
        };
      });

      setReviewItems(updatedItems);
      setHasEnriched(true);

      // Expand all pages for book mode
      if (mediaType === "book") {
        const exp: Record<number, boolean> = {};
        updatedItems.forEach((item) => {
          exp[item.pageNo] = true;
        });
        setExpandedPages(exp);
      }

      const cachedHitCount = parsedEntries.length - wordsToFetch.length;
      if (wordsToFetch.length === 0) {
        setStatusMessage({
          type: "success",
          text: `⚡ Loaded all ${parsedEntries.length} words instantly from persistent disk cache!`,
        });
      } else if (cachedHitCount > 0) {
        setStatusMessage({
          type: "success",
          text: `⚡ Loaded ${cachedHitCount} words from persistent cache, enriched ${wordsToFetch.length} new words and saved to disk!`,
        });
      } else {
        setStatusMessage({
          type: "success",
          text: `Enriched ${wordsToFetch.length} words and saved to persistent disk cache!`,
        });
      }
    } catch (err) {
      console.error("Enrichment error:", err);
      setStatusMessage({
        type: "error",
        text: "Error fetching definitions. Please check your connection.",
      });
    } finally {
      setIsEnriching(false);
      refreshCacheStats();
    }
  };

  // Re-fetch / refresh an individual word from the network
  const handleRefreshSingleWord = async (itemId: string, word: string) => {
    setRefreshingWordId(itemId);
    try {
      const freshData = await fetchComprehensiveDictionary(word, true);
      setReviewItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            meanings: freshData.meanings,
            variations: freshData.variations,
            source: freshData.source,
            hasManualEdits: false,
          };
        }),
      );
    } catch (err) {
      console.error("Failed to refresh word:", err);
    } finally {
      setRefreshingWordId(null);
    }
  };

  // Toggle edit mode for a word
  const toggleEditItem = (id: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isEditing: !item.isEditing } : item,
      ),
    );
  };

  // Update a definition inline
  const updateDefinition = (
    itemId: string,
    meaningIdx: number,
    newDef: string,
  ) => {
    setReviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newMeanings = [...item.meanings];
        newMeanings[meaningIdx] = {
          ...newMeanings[meaningIdx],
          definition: newDef,
        };
        return { ...item, meanings: newMeanings, hasManualEdits: true };
      }),
    );
  };

  // Update an example inline
  const updateExample = (
    itemId: string,
    meaningIdx: number,
    exIdx: number,
    newEx: string,
  ) => {
    setReviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newMeanings = [...item.meanings];
        const newExamples = [...newMeanings[meaningIdx].examples];
        newExamples[exIdx] = newEx;
        newMeanings[meaningIdx] = {
          ...newMeanings[meaningIdx],
          examples: newExamples,
        };
        return { ...item, meanings: newMeanings, hasManualEdits: true };
      }),
    );
  };

  // Group review items by page (for book mode)
  const reviewPages = useMemo(() => {
    if (mediaType !== "book") return [];
    const groups = new Map<number, ReviewWordItem[]>();
    reviewItems.forEach((item) => {
      if (!groups.has(item.pageNo)) {
        groups.set(item.pageNo, []);
      }
      groups.get(item.pageNo)!.push(item);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [reviewItems, mediaType]);

  const totalIncludedWords = reviewItems.filter((i) => i.included).length;

  // Toggle inclusion of single word
  const toggleIncludeItem = (id: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, included: !item.included } : item,
      ),
    );
  };

  // Delete word from review list
  const deleteReviewItem = (id: string) => {
    setReviewItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Save all included words
  const handleSaveToLibrary = async () => {
    if (!selectedBook) {
      setStatusMessage({
        type: "error",
        text: `Please select or create a ${mediaLabel.toLowerCase()} first`,
      });
      return;
    }

    const included = reviewItems.filter((i) => i.included);
    if (included.length === 0) {
      setStatusMessage({ type: "error", text: "No words selected to save" });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      let endpoint = "/api/words/batch";
      let payload: Record<string, unknown> = {
        bookName: selectedBook,
        entries: included.map((item) => ({
          pageNo: item.pageNo,
          word: item.word,
          meanings: item.meanings,
          variations: item.variations,
        })),
        skipDuplicates: true,
      };

      if (mediaType === "song") {
        endpoint = "/api/songs/batch";
        payload = {
          songName: selectedBook,
          entries: included.map((item) => ({
            word: item.word,
            meanings: item.meanings,
            variations: item.variations,
          })),
          skipDuplicates: true,
        };
      } else if (mediaType === "movie") {
        endpoint = "/api/movies/batch";
        payload = {
          movieName: selectedBook,
          entries: included.map((item) => ({
            word: item.word,
            meanings: item.meanings,
            variations: item.variations,
          })),
          skipDuplicates: true,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Success! Added ${data.data.added} words (${data.data.skipped} skipped) to "${selectedBook}".`,
        });
        setNotesText("");
        setReviewItems([]);
        setHasEnriched(false);
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to save words",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error while saving batch words",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render individual review word card
  const renderWordCard = (item: ReviewWordItem) => (
    <div
      key={item.id}
      className={`pt-4 first:pt-0 flex flex-col md:flex-row items-start justify-between gap-4 transition-opacity ${
        item.included ? "opacity-100" : "opacity-40"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={item.included}
          onChange={() => toggleIncludeItem(item.id)}
          className="mt-1.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          title="Toggle inclusion"
        />

        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-gray-900 capitalize">
              {item.word}
            </span>
            {item.meanings.map((m, idx) => (
              <span
                key={idx}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {m.partOfSpeech || "general"}
              </span>
            ))}
            {item.hasManualEdits && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                Edited
              </span>
            )}
          </div>

          {/* Meanings & Examples */}
          <div className="space-y-3 text-xs">
            {item.meanings.map((m, mIdx) => (
              <div
                key={mIdx}
                className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                    {m.partOfSpeech}:
                  </span>
                  {item.isEditing ? (
                    <textarea
                      value={m.definition}
                      onChange={(e) =>
                        updateDefinition(item.id, mIdx, e.target.value)
                      }
                      className="flex-1 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500"
                      rows={2}
                    />
                  ) : (
                    <p className="text-gray-800 font-medium leading-relaxed">
                      {m.definition}
                    </p>
                  )}
                </div>

                {m.examples && m.examples.length > 0 && (
                  <div className="space-y-1.5 mt-2 pl-3 border-l-2 border-indigo-200">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Examples ({m.examples.length}):
                    </div>
                    {m.examples.map((ex, exIdx) => (
                      <div key={exIdx}>
                        {item.isEditing ? (
                          <input
                            type="text"
                            value={ex}
                            onChange={(e) =>
                              updateExample(
                                item.id,
                                mIdx,
                                exIdx,
                                e.target.value,
                              )
                            }
                            className="w-full p-1.5 mb-1 bg-white rounded border border-gray-200 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="text-gray-600 italic text-xs leading-relaxed">
                            &ldquo;{ex}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 self-end md:self-start">
        {/* Inline edit toggle button */}
        <button
          type="button"
          onClick={() => toggleEditItem(item.id)}
          className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
            item.isEditing
              ? "bg-indigo-600 text-white"
              : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
          }`}
          title={item.isEditing ? "Done editing" : "Edit word & examples"}
        >
          <Pencil size={15} />
        </button>

        {/* Individual word re-lookup / refresh button */}
        <button
          type="button"
          onClick={() => handleRefreshSingleWord(item.id, item.word)}
          disabled={refreshingWordId === item.id}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Re-lookup from dictionary"
        >
          <RefreshCw
            size={15}
            className={
              refreshingWordId === item.id ? "animate-spin text-indigo-600" : ""
            }
          />
        </button>

        {/* Delete word button */}
        <button
          type="button"
          onClick={() => deleteReviewItem(item.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove word"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={18} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="flex-shrink-0" />
            )}
            <span className="font-semibold text-sm">{statusMessage.text}</span>
          </div>
          {statusMessage.type === "success" && selectedBook && (
            <Link
              href={`/${mediaPath}/${encodeURIComponent(selectedBook)}`}
              className="inline-flex items-center gap-1 text-xs font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs hover:shadow-xs transition-all whitespace-nowrap"
            >
              Open {mediaLabel}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Step 1: Media Item Selector Card */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              {mediaType === "song" ? (
                <Music size={18} />
              ) : mediaType === "movie" ? (
                <Film size={18} />
              ) : (
                <Book size={18} />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Step 1: Select Target {mediaLabel}
              </h2>
              <p className="text-xs text-gray-500">
                Choose the {mediaLabel.toLowerCase()} you are currently
                enjoying.
              </p>
            </div>
          </div>
          {selectedBook && !showNewBookInput && (
            <span className="hidden sm:inline-flex text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Active: {selectedBook}
            </span>
          )}
        </div>

        {!showNewBookInput ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedBook}
              onChange={(e) => onSelectBook(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">
                -- Choose an existing {mediaLabel.toLowerCase()} --
              </option>
              {books.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewBookInput(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <BookPlus size={16} />
              New {mediaLabel}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newBookName}
              onChange={(e) => setNewBookName(e.target.value)}
              placeholder={`Enter unique ${mediaLabel.toLowerCase()} title...`}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateNewItem}
                className="px-5 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewBookInput(false);
                  setNewBookName("");
                }}
                className="px-4 py-3 text-gray-500 text-xs font-medium hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Scratchpad Textarea Card */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Step 2: Paste Your Word Scratchpad
                </h2>
                {cacheStats && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
                    title="Persistent disk cache active at .cache/dictionary_cache.json"
                  >
                    <Database size={11} />
                    {cacheStats.totalWords} words cached
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {mediaType === "book"
                  ? "Organized by page numbers. Cached definitions are preserved!"
                  : `Paste words for this ${mediaLabel.toLowerCase()} directly (comma-separated or one per line). No page numbers needed!`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFormatHelp(!showFormatHelp)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <HelpCircle size={14} />
              {showFormatHelp ? "Hide Formats" : "Supported Formats"}
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
            >
              Load Sample Words
            </button>
          </div>
        </div>

        {/* Format Help Drawer */}
        {showFormatHelp && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2 animate-in fade-in duration-200">
            <p className="font-bold text-gray-800">Supported formats:</p>
            {mediaType === "book" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                <div className="bg-white p-2.5 rounded-lg border border-gray-100 font-mono text-[11px]">
                  Page 12: ephemeral, taciturn
                  <br />
                  Page 13: serendipity, juxtapose
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-100 font-mono text-[11px]">
                  p. 24: obsequious (subservient)
                  <br />
                  p. 25: petrichor - smell of rain
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                <div className="bg-white p-2.5 rounded-lg border border-gray-100 font-mono text-[11px]">
                  scaramouche, fandango, gallimaufry
                  <br />
                  serendipity, ephemeral
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-100 font-mono text-[11px]">
                  obsequious (subservient)
                  <br />
                  petrichor - pleasant rain aroma
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder={
              mediaType === "book"
                ? "Page 12: word1, word2, word3&#10;Page 13: word4, word5&#10;Page 14: word6 (context note)..."
                : "word_1, word_2, word_3&#10;word_4, word_5&#10;word_6 (context note)..."
            }
            rows={8}
            className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-gray-800 transition-all resize-y"
          />
        </div>

        {/* Live Parse Counter & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-700">
              <Layers size={14} className="text-gray-500" />
              <span>
                {stats.totalWords} word{stats.totalWords === 1 ? "" : "s"}{" "}
                detected
                {mediaType === "book" && (
                  <>
                    {" "}
                    across {stats.totalPages} page
                    {stats.totalPages === 1 ? "" : "s"}
                  </>
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartEnrichment}
            disabled={isEnriching || parsedEntries.length === 0}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white disabled:text-gray-400 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            {isEnriching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>
                  Enriching ({progress.current}/{progress.total})...
                </span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Enrich with Dictionary ({stats.totalWords})</span>
              </>
            )}
          </button>
        </div>

        {/* Live Progress Bar during enrichment */}
        {isEnriching && (
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
            <div className="flex justify-between text-xs font-bold text-indigo-900">
              <span>
                Processing words ({progress.current} of {progress.total})
              </span>
              <span className="font-mono text-indigo-600 truncate max-w-xs">
                {progress.word}
              </span>
            </div>
            <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Step 3: Review Table & 1-Click Commit */}
      {hasEnriched && reviewItems.length > 0 && (
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Step 3: Review & Verify ({totalIncludedWords} Words)
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Every word includes definitions and 2-3 usage examples. You can
                edit inline or re-lookup any term.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={isSaving || totalIncludedWords === 0 || !selectedBook}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving to {mediaLabel}...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>
                      Save {totalIncludedWords} Words to {mediaLabel}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grouped by Page Cards for Books, OR Clean Flat List for Songs & Movies */}
          {mediaType === "book" ? (
            <div className="space-y-4">
              {reviewPages.map(([pageNo, items]) => {
                const isExpanded = expandedPages[pageNo] !== false;
                const pageIncludedCount = items.filter(
                  (i) => i.included,
                ).length;

                return (
                  <div
                    key={pageNo}
                    className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Page Header Bar */}
                    <div
                      onClick={() =>
                        setExpandedPages((prev) => ({
                          ...prev,
                          [pageNo]: !isExpanded,
                        }))
                      }
                      className="p-4 bg-gray-50 hover:bg-gray-100/70 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm text-gray-900">
                          Page {pageNo}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          ({pageIncludedCount} of {items.length} words selected)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>

                    {/* Words on this Page */}
                    {isExpanded && (
                      <div className="p-4 divide-y divide-gray-100 space-y-4">
                        {items.map(renderWordCard)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat Word List for Songs and Movies */
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-2xs p-6 divide-y divide-gray-100 space-y-4">
              {reviewItems.map(renderWordCard)}
            </div>
          )}

          {/* Bottom Save Action */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Saving to {mediaLabel.toLowerCase()}:{" "}
              <strong className="text-gray-800">{selectedBook}</strong>
            </span>
            <button
              type="button"
              onClick={handleSaveToLibrary}
              disabled={isSaving || totalIncludedWords === 0 || !selectedBook}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>
                    Save {totalIncludedWords} Words to {mediaLabel}
                  </span>
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
