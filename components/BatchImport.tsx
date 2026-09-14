"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookPlus,
  Book,
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
} from "lucide-react";
import {
  fetchDictionaryBatch,
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
}

interface BatchImportProps {
  books: string[];
  selectedBook: string;
  onSelectBook: (book: string) => void;
  onBookCreated: (newBook: string) => void;
}

export default function BatchImport({
  books,
  selectedBook,
  onSelectBook,
  onBookCreated,
}: BatchImportProps) {
  const [showNewBookInput, setShowNewBookInput] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [notesText, setNotesText] = useState("");
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  // Enrichment state
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    word: string;
  }>({
    current: 0,
    total: 0,
    word: "",
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

  // Expanded page groups
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>(
    {},
  );

  // Parse raw text into { pageNo, word } entries
  const parsedEntries = useMemo(() => {
    if (!notesText.trim()) return [];

    const lines = notesText.split("\n");
    const entries: ParsedEntry[] = [];
    let currentPage: number | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Check if line specifies a page:
      // Examples: "Page 12: words", "Page 12", "p.12: words", "p12:", "12: words"
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
        // e.g. "12: word1, word2"
        currentPage = parseInt(numberColonMatch[1], 10);
        const rest = numberColonMatch[2].trim();
        if (rest) {
          extractWordsFromText(rest, currentPage, entries);
        }
        continue;
      }

      // If we are under an active page number, treat this line as word entries
      if (currentPage !== null) {
        // Handle bullet points or plain lines: "- word: meaning", "* word", "word, word2"
        const cleanLine = line.replace(/^[-*•]\s*/, "");
        extractWordsFromText(cleanLine, currentPage, entries);
      }
    }

    return entries;
  }, [notesText]);

  // Helper to extract words from comma/semicolon separated text
  function extractWordsFromText(
    text: string,
    pageNo: number,
    target: ParsedEntry[],
  ) {
    // Split by comma or semicolon
    const tokens = text.split(/[,;]/);
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      // Check if word has a custom note, e.g. "taciturn (silent)" or "ephemeral - short lived"
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
        // Regular word
        const cleanWord = trimmed.replace(/[^a-zA-Z\s'-]/g, "").trim();
        if (cleanWord) target.push({ pageNo, word: cleanWord });
      }
    }
  }

  // Count unique pages and words
  const stats = useMemo(() => {
    const pageSet = new Set<number>();
    parsedEntries.forEach((e) => pageSet.add(e.pageNo));
    return {
      totalWords: parsedEntries.length,
      totalPages: pageSet.size,
    };
  }, [parsedEntries]);

  // Load sample notes
  const handleLoadSample = () => {
    setNotesText(
      `Page 12: ephemeral, taciturn, juxtapose
Page 13: obsequious, serendipity
Page 14: lugubrious, anomalous, petrichor
Page 15: quixotic, recalcitrant`,
    );
    setStatusMessage(null);
    setHasEnriched(false);
  };

  // Create new book handler
  const handleCreateNewBook = async () => {
    if (!newBookName.trim()) return;
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookName: newBookName.trim(),
          action: "create",
        }),
      });
      const data = await res.json();
      if (data.success) {
        onBookCreated(newBookName.trim());
        setShowNewBookInput(false);
        setNewBookName("");
        setStatusMessage({
          type: "success",
          text: `Book "${newBookName}" created!`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to create book",
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Error creating book" });
    }
  };

  // Start Batch Dictionary Enrichment
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
    setProgress({ current: 0, total: parsedEntries.length, word: "" });

    try {
      const wordsList = parsedEntries.map((e) => e.word);
      const dictionaryMap = await fetchDictionaryBatch(
        wordsList,
        4,
        (current, total, word) => {
          setProgress({ current, total, word });
        },
      );

      // Build review items
      const items: ReviewWordItem[] = parsedEntries.map((entry, idx) => {
        const enriched: EnrichedWordData | undefined = dictionaryMap.get(
          entry.word.toLowerCase(),
        );

        let meanings: MeaningItem[] = enriched?.meanings || [];
        if (entry.customNote) {
          // If user gave a custom note, make it the first definition
          meanings = [
            {
              partOfSpeech: "Context Note",
              definition: entry.customNote,
              examples: [`Observed in context on page ${entry.pageNo}.`],
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
          source: enriched?.source || "custom",
          included: true,
        };
      });

      setReviewItems(items);
      setHasEnriched(true);

      // Expand all pages by default
      const exp: Record<number, boolean> = {};
      items.forEach((item) => {
        exp[item.pageNo] = true;
      });
      setExpandedPages(exp);
    } catch (err) {
      console.error("Enrichment error:", err);
      setStatusMessage({
        type: "error",
        text: "Error fetching definitions. Please check your connection.",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  // Group review items by page
  const reviewPages = useMemo(() => {
    const groups = new Map<number, ReviewWordItem[]>();
    reviewItems.forEach((item) => {
      if (!groups.has(item.pageNo)) {
        groups.set(item.pageNo, []);
      }
      groups.get(item.pageNo)!.push(item);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [reviewItems]);

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

  // Save all included words to book
  const handleSaveToLibrary = async () => {
    if (!selectedBook) {
      setStatusMessage({
        type: "error",
        text: "Please select or create a book first",
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
      const payload = {
        bookName: selectedBook,
        entries: included.map((item) => ({
          pageNo: item.pageNo,
          word: item.word,
          meanings: item.meanings,
          variations: item.variations,
        })),
        skipDuplicates: true,
      };

      const res = await fetch("/api/words/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Success! Added ${data.data.added} words (${data.data.skipped} skipped) across ${data.data.pagesAffected.length} pages in "${selectedBook}".`,
        });
        // Clear notes and reset review after successful commit
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
              href={`/book/${encodeURIComponent(selectedBook)}`}
              className="inline-flex items-center gap-1 text-xs font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs hover:shadow-xs transition-all whitespace-nowrap"
            >
              Open Book
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Step 1: Canvas / Book Selector Card */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Book size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Step 1: Select Target Book
              </h2>
              <p className="text-xs text-gray-500">
                Choose the volume you are currently reading.
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
              <option value="">-- Choose an existing book --</option>
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
              New Book
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newBookName}
              onChange={(e) => setNewBookName(e.target.value)}
              placeholder="Enter unique book title..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateNewBook}
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
              <h2 className="text-base font-bold text-gray-900">
                Step 2: Paste Your Reading Scratchpad
              </h2>
              <p className="text-xs text-gray-500">
                Paste your rough notes directly from your phone, kindle, or
                notebook.
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
              Load Sample Notes
            </button>
          </div>
        </div>

        {/* Format Help Drawer */}
        {showFormatHelp && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2 animate-in fade-in duration-200">
            <p className="font-bold text-gray-800">
              You can paste notes in any of these formats:
            </p>
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
          </div>
        )}

        <div className="relative">
          <textarea
            value={notesText}
            onChange={(e) => {
              setNotesText(e.target.value);
              setHasEnriched(false);
            }}
            placeholder="Page 12: word1, word2, word3&#10;Page 13: word4, word5&#10;Page 14: word6 (context note)..."
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
                detected across {stats.totalPages} page
                {stats.totalPages === 1 ? "" : "s"}
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
                <span>Enriching with Dictionary...</span>
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
                Looking up definitions & examples ({progress.current} of{" "}
                {progress.total})
              </span>
              <span className="font-mono text-indigo-600">{progress.word}</span>
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
                Every word has been enriched with parts of speech, definitions,
                and usage examples.
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
                    <span>Saving to Library...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save {totalIncludedWords} Words to Library</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grouped by Page Cards */}
          <div className="space-y-4">
            {reviewPages.map(([pageNo, items]) => {
              const isExpanded = expandedPages[pageNo] !== false;
              const pageIncludedCount = items.filter((i) => i.included).length;

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
                      {items.map((item) => (
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

                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-extrabold text-gray-900 capitalize">
                                  {item.word}
                                </span>
                                {/* Parts of speech badges */}
                                {item.meanings.map((m, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                                  >
                                    {m.partOfSpeech || "general"}
                                  </span>
                                ))}
                              </div>

                              {/* Meanings & Examples */}
                              <div className="space-y-2 text-xs">
                                {item.meanings.map((m, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                                        {m.partOfSpeech}:
                                      </span>
                                      <p className="text-gray-800 font-medium">
                                        {m.definition}
                                      </p>
                                    </div>
                                    {m.examples && m.examples.length > 0 && (
                                      <div className="space-y-1.5 mt-2 pl-3 border-l-2 border-indigo-200">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                          Examples ({m.examples.length}):
                                        </div>
                                        {m.examples.map((ex, exIdx) => (
                                          <div
                                            key={exIdx}
                                            className="text-gray-600 italic text-xs leading-relaxed"
                                          >
                                            &ldquo;{ex}&rdquo;
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-start">
                            <button
                              type="button"
                              onClick={() => deleteReviewItem(item.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove word"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Save Action */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Saving to volume:{" "}
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
                  <span>Save {totalIncludedWords} Words to Library</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
