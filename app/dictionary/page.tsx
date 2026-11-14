"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
  BookA,
  Search,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Layers,
  ChevronRight,
  BookOpen,
  Tag,
  CornerDownRight,
} from "lucide-react";

interface DictionaryMeaning {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

interface DictionaryEntry {
  word: string;
  meanings: DictionaryMeaning[];
  variations?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface DictionaryStats {
  totalWords: number;
  letterCounts: Record<string, number>;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

export default function DictionaryPage() {
  const [activeLetter, setActiveLetter] = useState<string>("a");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [words, setWords] = useState<DictionaryEntry[]>([]);
  const [stats, setStats] = useState<DictionaryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Add Word Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newWord, setNewWord] = useState<string>("");
  const [newVariations, setNewVariations] = useState<string>("");
  const [newMeanings, setNewMeanings] = useState<DictionaryMeaning[]>([
    { partOfSpeech: "noun", definition: "", examples: [""] },
  ]);
  const [checkingWord, setCheckingWord] = useState<boolean>(false);
  const [wordExistsWarning, setWordExistsWarning] = useState<string | null>(
    null,
  );

  // Edit Word Modal State
  const [editingWord, setEditingWord] = useState<DictionaryEntry | null>(null);
  const [editMeanings, setEditMeanings] = useState<DictionaryMeaning[]>([]);
  const [editVariations, setEditVariations] = useState<string>("");

  // Quick Add Example Inline State
  const [inlineExampleWord, setInlineExampleWord] = useState<string | null>(
    null,
  );
  const [inlineExampleMeaningIdx, setInlineExampleMeaningIdx] = useState<
    number | null
  >(null);
  const [inlineExampleText, setInlineExampleText] = useState<string>("");

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Compute detected letter file dynamically for any input
  const getDetectedLetterFile = (w: string) => {
    const trimmed = (w || "").trim().toLowerCase();
    if (!trimmed) return "a.json";
    const firstChar = trimmed[0];
    if (firstChar >= "a" && firstChar <= "z") {
      return `${firstChar}.json`;
    }
    return "other.json";
  };

  // Fetch words based on active letter or search query
  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/dictionary?";
      if (searchQuery.trim()) {
        url += `q=${encodeURIComponent(searchQuery.trim())}&limit=100`;
      } else {
        url += `letter=${encodeURIComponent(activeLetter)}&limit=200`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setWords(data.entries || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        showNotification("error", data.error || "Failed to load dictionary");
      }
    } catch (err) {
      showNotification("error", "Error connecting to dictionary API");
    } finally {
      setLoading(false);
    }
  }, [activeLetter, searchQuery]);

  // Initial load & letter switch
  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Auto-check if new word exists as user types
  useEffect(() => {
    const trimmed = newWord.trim().toLowerCase();
    if (!trimmed) {
      setWordExistsWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingWord(true);
      try {
        const res = await fetch(
          `/api/dictionary?word=${encodeURIComponent(trimmed)}`,
        );
        const data = await res.json();
        if (data.success && data.found) {
          setWordExistsWarning(
            `Word "${trimmed}" already exists in dictionary/${getDetectedLetterFile(trimmed)}!`,
          );
        } else {
          setWordExistsWarning(null);
        }
      } catch {
        // ignore check errors
      } finally {
        setCheckingWord(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newWord]);

  // Handle Add Meaning block in Add Modal
  const handleAddMeaningBlock = () => {
    setNewMeanings((prev) => [
      ...prev,
      { partOfSpeech: "noun", definition: "", examples: [""] },
    ]);
  };

  // Handle Remove Meaning block in Add Modal
  const handleRemoveMeaningBlock = (index: number) => {
    if (newMeanings.length <= 1) return;
    setNewMeanings((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Add Example to specific meaning block in Add Modal
  const handleAddExampleInput = (meaningIdx: number) => {
    setNewMeanings((prev) =>
      prev.map((m, i) =>
        i === meaningIdx ? { ...m, examples: [...m.examples, ""] } : m,
      ),
    );
  };

  // Handle Add Word Form Submit
  const handleSaveNewWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = newWord.trim();
    if (!cleanWord) {
      showNotification("error", "Word cannot be empty");
      return;
    }

    const validMeanings = newMeanings
      .map((m) => ({
        partOfSpeech: m.partOfSpeech.trim() || "noun",
        definition: m.definition.trim(),
        examples: m.examples.map((ex) => ex.trim()).filter(Boolean),
      }))
      .filter((m) => m.definition.length > 0);

    if (validMeanings.length === 0) {
      showNotification(
        "error",
        "At least one meaning with a definition is required",
      );
      return;
    }

    const variationsList = newVariations
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    setActionLoading(true);
    try {
      const res = await fetch("/api/dictionary/word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: cleanWord,
          meanings: validMeanings,
          variations: variationsList,
          overwrite: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message);
        setIsAddModalOpen(false);
        setNewWord("");
        setNewVariations("");
        setNewMeanings([
          { partOfSpeech: "noun", definition: "", examples: [""] },
        ]);

        // Switch to the letter where the word was added
        const targetLetter = getDetectedLetterFile(cleanWord).replace(
          ".json",
          "",
        );
        if (targetLetter !== "other") {
          setActiveLetter(targetLetter);
        }
        fetchWords();
      } else {
        showNotification("error", data.error || "Failed to add word");
      }
    } catch {
      showNotification("error", "Network error adding word");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Word Modal
  const handleOpenEdit = (entry: DictionaryEntry) => {
    setEditingWord(entry);
    setEditMeanings(
      entry.meanings.map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definition: m.definition,
        examples: [...m.examples],
      })),
    );
    setEditVariations((entry.variations || []).join(", "));
  };

  // Submit Edit Word
  const handleSaveEditWord = async () => {
    if (!editingWord) return;

    const validMeanings = editMeanings
      .map((m) => ({
        partOfSpeech: m.partOfSpeech.trim() || "noun",
        definition: m.definition.trim(),
        examples: m.examples.map((ex) => ex.trim()).filter(Boolean),
      }))
      .filter((m) => m.definition.length > 0);

    if (validMeanings.length === 0) {
      showNotification(
        "error",
        "At least one meaning with a definition is required",
      );
      return;
    }

    const variationsList = editVariations
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    setActionLoading(true);
    try {
      const res = await fetch("/api/dictionary/word", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalWord: editingWord.word,
          meanings: validMeanings,
          variations: variationsList,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification(
          "success",
          `Word "${editingWord.word}" updated successfully!`,
        );
        setEditingWord(null);
        fetchWords();
      } else {
        showNotification("error", data.error || "Failed to update word");
      }
    } catch {
      showNotification("error", "Network error updating word");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete word from dictionary
  const handleDeleteWord = async (wordToDelete: string) => {
    if (
      !confirm(
        `Are you sure you want to remove "${wordToDelete}" from dictionary/${getDetectedLetterFile(wordToDelete)}?`,
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/dictionary/word?word=${encodeURIComponent(wordToDelete)}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message);
        fetchWords();
      } else {
        showNotification("error", data.error || "Failed to delete word");
      }
    } catch {
      showNotification("error", "Network error deleting word");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Add Example Inline
  const handleSaveInlineExample = async (
    wordName: string,
    meaningIndex: number,
  ) => {
    const text = inlineExampleText.trim();
    if (!text) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/dictionary/example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: wordName,
          meaningIndex,
          example: text,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification("success", `Example added to "${wordName}"!`);
        setInlineExampleWord(null);
        setInlineExampleMeaningIdx(null);
        setInlineExampleText("");
        fetchWords();
      } else {
        showNotification("error", data.error || "Failed to add example");
      }
    } catch {
      showNotification("error", "Network error adding example");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Delete Example
  const handleDeleteExample = async (
    wordName: string,
    meaningIndex: number,
    exampleIndex: number,
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/dictionary/example", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: wordName,
          meaningIndex,
          exampleIndex,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification("success", `Example removed from "${wordName}".`);
        fetchWords();
      } else {
        showNotification("error", data.error || "Failed to remove example");
      }
    } catch {
      showNotification("error", "Network error removing example");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform animate-in slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-70"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-sm shadow-indigo-100">
                  <BookA size={26} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Root Dictionary Manager
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Managing partitioned JSON files (
                    <code className="text-indigo-600 font-semibold">
                      a.json
                    </code>{" "}
                    to{" "}
                    <code className="text-indigo-600 font-semibold">
                      z.json
                    </code>
                    ) in <code className="text-gray-700">/dictionary/</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {stats && (
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-700">
                  <Sparkles size={14} />
                  <span>{stats.totalWords.toLocaleString()} Unique Words</span>
                </div>
              )}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors"
              >
                <Plus size={16} />
                <span>Add Word</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-5 relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search words across dictionary files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Alphabet Navigation Bar */}
        {!searchQuery && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {ALPHABET.map((letter) => {
                const count = stats?.letterCounts[letter] ?? 0;
                const isActive = activeLetter === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => setActiveLetter(letter)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="uppercase">{letter}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        isActive
                          ? "bg-indigo-500/60 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setActiveLetter("other")}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeLetter === "other"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span>#</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    activeLetter === "other"
                      ? "bg-indigo-500/60 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {stats?.letterCounts["other"] ?? 0}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Content Section: Words Listing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
            <span>
              {searchQuery ? (
                <>
                  Search results for &quot;
                  <span className="text-gray-900 font-bold">{searchQuery}</span>
                  &quot; ({words.length} matches)
                </>
              ) : (
                <>
                  Showing words in file:{" "}
                  <code className="text-indigo-600 font-bold">
                    dictionary/{activeLetter}.json
                  </code>{" "}
                  ({words.length} words)
                </>
              )}
            </span>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">
                Loading dictionary entries...
              </p>
            </div>
          ) : words.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <FileCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">
                No words found
              </h3>
              <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                {searchQuery
                  ? "No matching entries found in any dictionary file."
                  : `dictionary/${activeLetter}.json currently contains 0 words.`}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Plus size={14} />
                <span>Add First Word</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {words.map((item) => {
                const targetFile = getDetectedLetterFile(item.word);
                return (
                  <div
                    key={item.word}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-100 transition-all group"
                  >
                    {/* Word Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-50">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">
                          {item.word}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[11px] font-mono">
                          <FolderOpen size={11} />
                          {targetFile}
                        </span>
                        {item.variations && item.variations.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.variations.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-md text-[11px]"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit word meanings and variations"
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteWord(item.word)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete from dictionary"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Meanings & Examples */}
                    <div className="pt-3 space-y-4">
                      {item.meanings.map((meaning, mIdx) => (
                        <div
                          key={mIdx}
                          className="bg-gray-50/60 rounded-xl p-3.5 border border-gray-100/70"
                        >
                          {/* Meaning Definition */}
                          <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[11px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                              {meaning.partOfSpeech || "noun"}
                            </span>
                            <p className="text-sm text-gray-800 font-medium leading-relaxed">
                              {meaning.definition}
                            </p>
                          </div>

                          {/* Examples List */}
                          <div className="mt-2.5 pl-2 space-y-1.5">
                            {meaning.examples && meaning.examples.length > 0 ? (
                              meaning.examples.map((ex, exIdx) => (
                                <div
                                  key={exIdx}
                                  className="flex items-start justify-between gap-2 group/ex hover:bg-white/80 p-1 rounded-lg transition-colors"
                                >
                                  <div className="flex items-start gap-1.5 text-xs text-gray-600 italic">
                                    <CornerDownRight
                                      size={12}
                                      className="text-gray-400 shrink-0 mt-0.5"
                                    />
                                    <span>&ldquo;{ex}&rdquo;</span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleDeleteExample(
                                        item.word,
                                        mIdx,
                                        exIdx,
                                      )
                                    }
                                    className="opacity-0 group-hover/ex:opacity-100 text-gray-400 hover:text-red-500 p-0.5 rounded transition-opacity"
                                    title="Delete this example"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-[11px] text-gray-400 italic">
                                No examples recorded yet.
                              </p>
                            )}

                            {/* Inline Add Example */}
                            {inlineExampleWord === item.word &&
                            inlineExampleMeaningIdx === mIdx ? (
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Type a new sentence example..."
                                  value={inlineExampleText}
                                  onChange={(e) =>
                                    setInlineExampleText(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveInlineExample(item.word, mIdx);
                                    }
                                  }}
                                  autoFocus
                                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                                />
                                <button
                                  onClick={() =>
                                    handleSaveInlineExample(item.word, mIdx)
                                  }
                                  disabled={actionLoading}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setInlineExampleWord(null);
                                    setInlineExampleMeaningIdx(null);
                                    setInlineExampleText("");
                                  }}
                                  className="px-2 py-1.5 text-gray-500 hover:text-gray-700 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setInlineExampleWord(item.word);
                                  setInlineExampleMeaningIdx(mIdx);
                                  setInlineExampleText("");
                                }}
                                className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                <Plus size={11} />
                                <span>Add Example</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ================= ADD NEW WORD MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  <BookA size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Add Word to Dictionary
                  </h3>
                  <p className="text-xs text-gray-500">
                    Auto-routes into its corresponding alphabetical file
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveNewWord}
              className="flex-1 overflow-y-auto py-4 space-y-4"
            >
              {/* Word Input & Auto-detect Badge */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Word *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. serendipity"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                {/* Live Auto-detect Indicator */}
                {newWord.trim() && (
                  <div className="mt-2 flex items-center justify-between gap-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-800 font-medium">
                      <FolderOpen size={14} className="text-indigo-600" />
                      <span>
                        Target File:{" "}
                        <strong className="font-mono text-indigo-950 font-bold">
                          dictionary/{getDetectedLetterFile(newWord)}
                        </strong>
                      </span>
                    </div>
                    {checkingWord ? (
                      <Loader2
                        size={13}
                        className="animate-spin text-indigo-600"
                      />
                    ) : wordExistsWarning ? (
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        <AlertCircle size={13} />
                        Already exists!
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        New word
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Variations */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Variations / Inflections (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. serendipitous, serendipitously"
                  value={newVariations}
                  onChange={(e) => setNewVariations(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Meanings & Examples Sections */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Meanings &amp; Examples *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMeaningBlock}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus size={13} />
                    <span>Add Meaning</span>
                  </button>
                </div>

                {newMeanings.map((meaning, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-4 bg-gray-50 border border-gray-200/80 rounded-xl space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">
                        Meaning #{mIdx + 1}
                      </span>
                      {newMeanings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMeaningBlock(mIdx)}
                          className="text-gray-400 hover:text-red-500 text-xs font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Part of Speech
                        </label>
                        <select
                          value={meaning.partOfSpeech}
                          onChange={(e) =>
                            setNewMeanings((prev) =>
                              prev.map((m, i) =>
                                i === mIdx
                                  ? { ...m, partOfSpeech: e.target.value }
                                  : m,
                              ),
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="noun">Noun</option>
                          <option value="verb">Verb</option>
                          <option value="adjective">Adjective</option>
                          <option value="adverb">Adverb</option>
                          <option value="idiom">Idiom / Phrase</option>
                          <option value="interjection">Interjection</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Definition *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Definition of the word..."
                          value={meaning.definition}
                          onChange={(e) =>
                            setNewMeanings((prev) =>
                              prev.map((m, i) =>
                                i === mIdx
                                  ? { ...m, definition: e.target.value }
                                  : m,
                              ),
                            )
                          }
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    {/* Examples list */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          Examples
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddExampleInput(mIdx)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5"
                        >
                          <Plus size={11} />
                          <span>Add Example</span>
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {meaning.examples.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              placeholder={`Example ${exIdx + 1}...`}
                              value={ex}
                              onChange={(e) =>
                                setNewMeanings((prev) =>
                                  prev.map((m, i) =>
                                    i === mIdx
                                      ? {
                                          ...m,
                                          examples: m.examples.map(
                                            (itemEx, idx) =>
                                              idx === exIdx
                                                ? e.target.value
                                                : itemEx,
                                          ),
                                        }
                                      : m,
                                  ),
                                )
                              }
                              className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {meaning.examples.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setNewMeanings((prev) =>
                                    prev.map((m, i) =>
                                      i === mIdx
                                        ? {
                                            ...m,
                                            examples: m.examples.filter(
                                              (_, idx) => idx !== exIdx,
                                            ),
                                          }
                                        : m,
                                    ),
                                  )
                                }
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span>Save to Dictionary</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT WORD MODAL ================= */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Edit &ldquo;{editingWord.word}&rdquo;
                  </h3>
                  <p className="text-xs text-gray-500">
                    File:{" "}
                    <code className="text-indigo-600 font-semibold">
                      dictionary/{getDetectedLetterFile(editingWord.word)}
                    </code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingWord(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Variations
                </label>
                <input
                  type="text"
                  value={editVariations}
                  onChange={(e) => setEditVariations(e.target.value)}
                  placeholder="e.g. word, words, wording"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Meanings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Meanings &amp; Definitions
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditMeanings((prev) => [
                        ...prev,
                        {
                          partOfSpeech: "noun",
                          definition: "",
                          examples: [""],
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus size={13} />
                    <span>Add Meaning</span>
                  </button>
                </div>

                {editMeanings.map((meaning, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-4 bg-gray-50 border border-gray-200/80 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">
                        Meaning #{mIdx + 1}
                      </span>
                      {editMeanings.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditMeanings((prev) =>
                              prev.filter((_, i) => i !== mIdx),
                            )
                          }
                          className="text-gray-400 hover:text-red-500 text-xs font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Part of Speech
                        </label>
                        <select
                          value={meaning.partOfSpeech}
                          onChange={(e) =>
                            setEditMeanings((prev) =>
                              prev.map((m, i) =>
                                i === mIdx
                                  ? { ...m, partOfSpeech: e.target.value }
                                  : m,
                              ),
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="noun">Noun</option>
                          <option value="verb">Verb</option>
                          <option value="adjective">Adjective</option>
                          <option value="adverb">Adverb</option>
                          <option value="idiom">Idiom / Phrase</option>
                          <option value="interjection">Interjection</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Definition
                        </label>
                        <textarea
                          rows={2}
                          value={meaning.definition}
                          onChange={(e) =>
                            setEditMeanings((prev) =>
                              prev.map((m, i) =>
                                i === mIdx
                                  ? { ...m, definition: e.target.value }
                                  : m,
                              ),
                            )
                          }
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    {/* Examples list */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          Examples
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEditMeanings((prev) =>
                              prev.map((m, i) =>
                                i === mIdx
                                  ? { ...m, examples: [...m.examples, ""] }
                                  : m,
                              ),
                            )
                          }
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5"
                        >
                          <Plus size={11} />
                          <span>Add Example</span>
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {meaning.examples.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={ex}
                              onChange={(e) =>
                                setEditMeanings((prev) =>
                                  prev.map((m, i) =>
                                    i === mIdx
                                      ? {
                                          ...m,
                                          examples: m.examples.map(
                                            (itemEx, idx) =>
                                              idx === exIdx
                                                ? e.target.value
                                                : itemEx,
                                          ),
                                        }
                                      : m,
                                  ),
                                )
                              }
                              className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditMeanings((prev) =>
                                  prev.map((m, i) =>
                                    i === mIdx
                                      ? {
                                          ...m,
                                          examples: m.examples.filter(
                                            (_, idx) => idx !== exIdx,
                                          ),
                                        }
                                      : m,
                                  ),
                                )
                              }
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWord(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditWord}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
