"use client";

import { useState, useEffect, useMemo, use } from "react";
import {
  Feather,
  ArrowLeft,
  Loader2,
  Trash2,
  Search,
  BookOpen,
  Music,
  Film,
  Sparkles,
  Info,
  ExternalLink,
  Edit3,
  Save,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Quote,
  Tag as TagIcon,
  Plus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import WordEditModal from "@/components/WordEditModal";
import SentenceEditModal from "@/components/SentenceEditModal";
import AddSentenceModal from "@/components/AddSentenceModal";
import { setCachedWord } from "@/lib/dictionary";
import { SentenceEntry } from "@/lib/BookManager";

interface WordMeaning {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

interface Word {
  word: string;
  variations?: string[];
  meanings: WordMeaning[];
}

interface CrossMediaStat {
  word: string;
  totalFrequency: number;
  books: { bookName: string; frequency: number }[];
  songs: { name: string; frequency: number }[];
  movies: { name: string; frequency: number }[];
  poems?: { name: string; frequency: number }[];
}

export default function PoemDetailPage({
  params,
}: {
  params: Promise<{ poemName: string }>;
}) {
  const { poemName: encodedPoemName } = use(params);
  const poemName = decodeURIComponent(encodedPoemName);

  const [words, setWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<SentenceEntry[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<
    "all" | "words" | "sentences"
  >("all");
  const [isAddSentenceOpen, setIsAddSentenceOpen] = useState<boolean>(false);
  const [editingSentence, setEditingSentence] = useState<SentenceEntry | null>(
    null,
  );
  const [deletingSentence, setDeletingSentence] = useState<string | null>(null);

  const [verses, setVerses] = useState<string>("");
  const [isEditingVerses, setIsEditingVerses] = useState<boolean>(false);
  const [versesDraft, setVersesDraft] = useState<string>("");
  const [savingVerses, setSavingVerses] = useState<boolean>(false);
  const [showVersesSection, setShowVersesSection] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [deletingWord, setDeletingWord] = useState<string | null>(null);
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  // Cross-media stats modal/drawer
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordStats, setWordStats] = useState<CrossMediaStat | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const handleSaveEditedWord = async (updatedWord: Word) => {
    if (!editingWord) return;

    const res = await fetch("/api/poems/words", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poemName,
        originalWord: editingWord.word,
        updatedWord,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to update word");
    }

    // Update client dictionary cache
    setCachedWord(updatedWord.word, {
      word: updatedWord.word,
      meanings: updatedWord.meanings,
      variations: updatedWord.variations || [],
      source: "cache",
    });

    // Update local words state
    setWords((prev) =>
      prev.map((w) =>
        w.word.toLowerCase() === editingWord.word.toLowerCase()
          ? updatedWord
          : w,
      ),
    );

    setMessage(
      `Word "${updatedWord.word}" updated & persistent cache synchronized!`,
    );
    setMessageType("success");
  };

  const loadPoemData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [wordsRes, sentRes] = await Promise.all([
        fetch(`/api/poems/words?poemName=${encodeURIComponent(poemName)}`),
        fetch(
          `/api/sentences?mediaType=poem&mediaName=${encodeURIComponent(poemName)}`,
        ),
      ]);
      const wordsData = await wordsRes.json();
      const sentData = await sentRes.json();

      if (wordsData.success && Array.isArray(wordsData.data)) {
        setWords(wordsData.data);
        if (typeof wordsData.lyrics === "string") {
          setVerses(wordsData.lyrics);
          setVersesDraft(wordsData.lyrics);
        }
      }
      if (sentData.success && Array.isArray(sentData.data)) {
        setSentences(sentData.data);
      }
    } catch {
      setMessage("Error fetching poem words and sentences");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadInitialPoemData() {
      try {
        const [wordsRes, sentRes] = await Promise.all([
          fetch(`/api/poems/words?poemName=${encodeURIComponent(poemName)}`),
          fetch(
            `/api/sentences?mediaType=poem&mediaName=${encodeURIComponent(poemName)}`,
          ),
        ]);
        const wordsData = await wordsRes.json();
        const sentData = await sentRes.json();
        if (!isMounted) return;

        if (wordsData.success && Array.isArray(wordsData.data)) {
          setWords(wordsData.data);
          if (typeof wordsData.lyrics === "string") {
            setVerses(wordsData.lyrics);
            setVersesDraft(wordsData.lyrics);
          }
        }
        if (sentData.success && Array.isArray(sentData.data)) {
          setSentences(sentData.data);
        }
      } catch {
        if (isMounted) {
          setMessage("Error fetching poem words and sentences");
          setMessageType("error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInitialPoemData();
    return () => {
      isMounted = false;
    };
  }, [poemName]);

  const handleDeleteSentence = async (sentenceToDelete: string) => {
    if (!confirm("Are you sure you want to delete this sentence?")) return;

    setDeletingSentence(sentenceToDelete);
    try {
      const res = await fetch(
        `/api/sentences?mediaType=poem&mediaName=${encodeURIComponent(poemName)}&sentence=${encodeURIComponent(sentenceToDelete)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        setSentences((prev) =>
          prev.filter(
            (s) =>
              s.sentence.trim().toLowerCase() !==
              sentenceToDelete.trim().toLowerCase(),
          ),
        );
        setMessage("Sentence removed successfully");
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to delete sentence");
        setMessageType("error");
      }
    } catch {
      setMessage("Error deleting sentence");
      setMessageType("error");
    } finally {
      setDeletingSentence(null);
    }
  };

  const handleSaveEditedSentence = (updatedSentence: SentenceEntry) => {
    if (!editingSentence) return;

    setSentences((prev) =>
      prev.map((s) =>
        s.sentence.trim().toLowerCase() ===
        editingSentence.sentence.trim().toLowerCase()
          ? updatedSentence
          : s,
      ),
    );
    setMessage("Sentence updated successfully!");
    setMessageType("success");
    setEditingSentence(null);
  };

  const handleSaveVerses = async () => {
    setSavingVerses(true);
    try {
      const res = await fetch("/api/poems/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poemName,
          lyrics: versesDraft,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVerses(versesDraft);
        setIsEditingVerses(false);
        setMessage("Verses saved successfully!");
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to save verses");
        setMessageType("error");
      }
    } catch {
      setMessage("Error saving verses");
      setMessageType("error");
    } finally {
      setSavingVerses(false);
    }
  };

  const vocabWordMap = useMemo(() => {
    const map = new Map<string, Word>();
    words.forEach((w) => {
      const norm = w.word.toLowerCase().trim();
      if (norm) map.set(norm, w);
      if (Array.isArray(w.variations)) {
        w.variations.forEach((v) => {
          const vNorm = v.toLowerCase().trim();
          if (vNorm) map.set(vNorm, w);
        });
      }
    });
    return map;
  }, [words]);

  const verseLines = useMemo(() => {
    if (!verses) return [];
    return verses.split(/\r?\n/);
  }, [verses]);

  const highlightedCount = useMemo(() => {
    if (!verses) return 0;
    const found = new Set<string>();
    const tokens = verses.match(/[a-zA-Z0-9'-]+/g) || [];
    tokens.forEach((t) => {
      const clean = t
        .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
        .toLowerCase();
      if (vocabWordMap.has(clean)) {
        found.add(vocabWordMap.get(clean)!.word.toLowerCase());
      }
    });
    return found.size;
  }, [verses, vocabWordMap]);

  const handleVerseWordClick = (targetWord: string) => {
    const cardId = `word-card-${targetWord.toLowerCase()}`;
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-violet-400", "scale-[1.01]");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-violet-400", "scale-[1.01]");
      }, 2000);
    }
  };

  const handleDeleteWord = async (wordToDelete: string) => {
    if (!confirm(`Remove "${wordToDelete}" from ${poemName}?`)) return;

    setDeletingWord(wordToDelete);
    try {
      const res = await fetch(
        `/api/poems/words?poemName=${encodeURIComponent(poemName)}&word=${encodeURIComponent(wordToDelete)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        setWords((prev) =>
          prev.filter(
            (w) => w.word.toLowerCase() !== wordToDelete.toLowerCase(),
          ),
        );
        setMessage(`Word "${wordToDelete}" removed`);
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to delete word");
        setMessageType("error");
      }
    } catch {
      setMessage("Error deleting word");
      setMessageType("error");
    } finally {
      setDeletingWord(null);
    }
  };

  const handleWordClick = async (word: string) => {
    if (selectedWord === word) {
      setSelectedWord(null);
      setWordStats(null);
      return;
    }

    setSelectedWord(word);
    setLoadingStats(true);
    try {
      const res = await fetch(
        `/api/words/stats?word=${encodeURIComponent(word)}`,
      );
      const data = await res.json();
      if (data.success && data.found && data.data) {
        setWordStats(data.data);
      } else {
        setWordStats(null);
      }
    } catch {
      setWordStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const filteredWords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return words.filter((w) => {
      if (!q) return true;
      if (w.word.toLowerCase().includes(q)) return true;
      return w.meanings.some(
        (m) =>
          m.definition.toLowerCase().includes(q) ||
          m.examples.some((ex) => ex.toLowerCase().includes(q)),
      );
    });
  }, [words, searchQuery]);

  const filteredSentences = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sentences.filter((s) => {
      if (!q) return true;
      return (
        s.sentence.toLowerCase().includes(q) ||
        (s.meaning && s.meaning.toLowerCase().includes(q)) ||
        (s.tag && s.tag.toLowerCase().includes(q))
      );
    });
  }, [sentences, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/poem-list"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-violet-600 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Poem Vault
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddSentenceOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-100 transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add Line / Stanza
            </button>
            <Link
              href="/add-word"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-100 transition-colors"
            >
              + Add Words
            </Link>
          </div>
        </div>

        {/* Poem Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-violet-600 text-white rounded-2xl shadow-sm">
              <Feather size={28} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-violet-600 uppercase tracking-wider">
                Poem Media
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {poemName}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1.5 bg-violet-50 border border-violet-100 rounded-xl text-xs font-extrabold text-violet-700">
              {words.length} word{words.length === 1 ? "" : "s"}
            </span>
            <span className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-extrabold text-emerald-700">
              {sentences.length} sentence{sentences.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Poem Verses Section with Highlighted Vocabulary Words */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-violet-100 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <Feather size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    Poem Verses / Stanzas
                  </h2>
                  {verses && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                      <Sparkles size={11} />
                      {highlightedCount} vocabulary word
                      {highlightedCount === 1 ? "" : "s"} highlighted
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {verses
                    ? "Vocabulary words from this poem are highlighted in violet. Click any highlighted word to view its definition below!"
                    : "No verses saved for this poem yet. Add verses to see vocabulary highlighted in context."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditingVerses && verses && (
                <button
                  type="button"
                  onClick={() => {
                    setVersesDraft(verses);
                    setIsEditingVerses(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 size={13} />
                  Edit Verses
                </button>
              )}
              {!isEditingVerses && !verses && (
                <button
                  type="button"
                  onClick={() => {
                    setVersesDraft("");
                    setIsEditingVerses(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <FileText size={13} />+ Add Verses
                </button>
              )}
              {isEditingVerses && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveVerses}
                    disabled={savingVerses}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    {savingVerses ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Save Verses
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingVerses(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {verses && (
                <button
                  type="button"
                  onClick={() => setShowVersesSection(!showVersesSection)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
                  title={
                    showVersesSection ? "Collapse verses" : "Expand verses"
                  }
                >
                  {showVersesSection ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Section Body */}
          {showVersesSection && (
            <>
              {isEditingVerses ? (
                <div className="space-y-3">
                  <textarea
                    value={versesDraft}
                    onChange={(e) => setVersesDraft(e.target.value)}
                    placeholder="Paste the verses or stanzas for this poem here..."
                    rows={8}
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm font-sans text-gray-800 transition-all resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingVerses(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveVerses}
                      disabled={savingVerses}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      {savingVerses && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      Save Verses
                    </button>
                  </div>
                </div>
              ) : verses ? (
                <div className="space-y-3">
                  {/* Interactive highlight reader */}
                  <div className="max-h-96 overflow-y-auto p-5 bg-gradient-to-b from-violet-50/20 via-gray-50/40 to-white rounded-xl border border-gray-200 space-y-1 select-none font-serif text-sm sm:text-base leading-relaxed">
                    {verseLines.map((line, lineIdx) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) {
                        return <div key={lineIdx} className="h-3" />;
                      }
                      if (
                        trimmedLine.startsWith("[") &&
                        trimmedLine.endsWith("]")
                      ) {
                        return (
                          <div key={lineIdx} className="pt-2 pb-1">
                            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded">
                              {trimmedLine}
                            </span>
                          </div>
                        );
                      }

                      const tokens = line.match(
                        /[a-zA-Z0-9'-]+|[^a-zA-Z0-9'-]+/g,
                      ) || [line];

                      return (
                        <div
                          key={lineIdx}
                          className="flex flex-wrap items-center"
                        >
                          {tokens.map((token, tokenIdx) => {
                            const isWord = /[a-zA-Z0-9]/.test(token);
                            const cleanWord = token.replace(
                              /^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g,
                              "",
                            );

                            if (!isWord || !cleanWord) {
                              return (
                                <span
                                  key={tokenIdx}
                                  className="text-gray-500 whitespace-pre"
                                >
                                  {token}
                                </span>
                              );
                            }

                            const norm = cleanWord.toLowerCase();
                            const vocabMatch = vocabWordMap.get(norm);

                            if (vocabMatch) {
                              return (
                                <button
                                  key={tokenIdx}
                                  type="button"
                                  onClick={() =>
                                    handleVerseWordClick(vocabMatch.word)
                                  }
                                  title={`Click to jump to definition of "${vocabMatch.word}"`}
                                  className="inline-block px-1.5 py-0.5 my-0.5 rounded-md text-sm font-sans font-bold bg-violet-600 text-white shadow-2xs scale-105 ring-2 ring-violet-300 ring-offset-1 hover:bg-violet-700 cursor-pointer transition-all duration-150"
                                >
                                  {token}
                                </button>
                              );
                            }

                            return (
                              <span
                                key={tokenIdx}
                                className="text-gray-800 whitespace-pre px-0.5"
                              >
                                {token}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50/60 rounded-xl border border-dashed border-gray-200 text-center space-y-2">
                  <p className="text-xs text-gray-500">
                    No verses stored yet for &ldquo;{poemName}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setVersesDraft("");
                      setIsEditingVerses(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg border border-violet-200 transition-colors cursor-pointer"
                  >
                    <FileText size={13} />
                    Add Verses Now
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Global Notifications */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <Info size={20} />
            <span className="font-medium text-sm">{message}</span>
          </div>
        )}

        {/* Search, Filter Tabs & Word Stats Side Panel */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words, definitions, tags..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-violet-500 outline-none shadow-2xs"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex p-1 bg-gray-200/70 rounded-xl text-xs font-bold text-gray-600">
              <button
                type="button"
                onClick={() => setContentTypeFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  contentTypeFilter === "all"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "hover:text-gray-900"
                }`}
              >
                All ({words.length + sentences.length})
              </button>
              <button
                type="button"
                onClick={() => setContentTypeFilter("words")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  contentTypeFilter === "words"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "hover:text-gray-900"
                }`}
              >
                Words ({words.length})
              </button>
              <button
                type="button"
                onClick={() => setContentTypeFilter("sentences")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  contentTypeFilter === "sentences"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "hover:text-gray-900"
                }`}
              >
                Sentences ({sentences.length})
              </button>
            </div>
          </div>
        </div>

        {/* Cross-Media Word Occurrence Modal/Card */}
        {selectedWord && (
          <div className="bg-white p-6 rounded-2xl border-2 border-violet-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="text-violet-600" size={18} />
                <h3 className="font-extrabold text-gray-900 text-base">
                  Cross-Media Occurrences for &ldquo;{selectedWord}&rdquo;
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedWord(null);
                  setWordStats(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {loadingStats ? (
              <div className="py-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
                <Loader2 size={16} className="animate-spin text-violet-600" />
                Searching across Books, Songs, Movies, and Poems...
              </div>
            ) : wordStats ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-violet-700">
                    {wordStats.totalFrequency} time
                    {wordStats.totalFrequency === 1 ? "" : "s"}
                  </span>
                  <span className="text-xs text-gray-500">
                    total occurrences across your entire library
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Books */}
                  {wordStats.books && wordStats.books.length > 0 && (
                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                        <BookOpen size={14} />
                        <span>Books ({wordStats.books.length})</span>
                      </div>
                      <div className="space-y-1">
                        {wordStats.books.map((b) => (
                          <div
                            key={b.bookName}
                            className="flex justify-between text-gray-700"
                          >
                            <span className="truncate">{b.bookName}</span>
                            <span className="font-bold text-indigo-600">
                              {b.frequency}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Songs */}
                  {wordStats.songs && wordStats.songs.length > 0 && (
                    <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-purple-700">
                        <Music size={14} />
                        <span>Songs ({wordStats.songs.length})</span>
                      </div>
                      <div className="space-y-1">
                        {wordStats.songs.map((s) => (
                          <div
                            key={s.name}
                            className="flex justify-between text-gray-700"
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="font-bold text-purple-600">
                              {s.frequency}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Movies */}
                  {wordStats.movies && wordStats.movies.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700">
                        <Film size={14} />
                        <span>Movies ({wordStats.movies.length})</span>
                      </div>
                      <div className="space-y-1">
                        {wordStats.movies.map((m) => (
                          <div
                            key={m.name}
                            className="flex justify-between text-gray-700"
                          >
                            <span className="truncate">{m.name}</span>
                            <span className="font-bold text-rose-600">
                              {m.frequency}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Poems */}
                  {wordStats.poems && wordStats.poems.length > 0 && (
                    <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-violet-700">
                        <Feather size={14} />
                        <span>Poems ({wordStats.poems.length})</span>
                      </div>
                      <div className="space-y-1">
                        {wordStats.poems.map((p) => (
                          <div
                            key={p.name}
                            className="flex justify-between text-gray-700"
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="font-bold text-violet-600">
                              {p.frequency}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                No occurrence records found elsewhere for this word.
              </p>
            )}
          </div>
        )}

        {/* Content Section: Words and Sentences */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Loader2 className="animate-spin text-violet-600 mb-3" size={32} />
            <p className="text-gray-500 font-medium text-sm">
              Loading poem vocabulary...
            </p>
          </div>
        ) : words.length === 0 && sentences.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 px-6 space-y-3">
            <div className="bg-violet-50 p-5 rounded-full inline-flex text-violet-600">
              <Feather size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              No Vocabulary Added Yet
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">
              Add words or poignant lines from &ldquo;{poemName}&rdquo; to begin building your poetic glossary.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/add-word"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 shadow-sm"
              >
                <Plus size={15} />
                Add First Words
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Words Section */}
            {(contentTypeFilter === "all" || contentTypeFilter === "words") &&
              filteredWords.length > 0 && (
                <div className="space-y-4">
                  {contentTypeFilter === "all" &&
                    filteredSentences.length > 0 && (
                      <div className="flex items-center gap-2 px-1">
                        <Feather size={16} className="text-violet-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Words ({filteredWords.length})
                        </h4>
                      </div>
                    )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredWords.map((item, idx) => (
                      <div
                        id={`word-card-${item.word.toLowerCase()}`}
                        key={`word-${idx}`}
                        className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-black text-gray-900">
                                {item.word}
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleWordClick(item.word)}
                                title="Check occurrences across all Books, Songs, Movies, and Poems"
                                className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <ExternalLink size={14} />
                              </button>
                            </div>
                            {item.variations && item.variations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.variations.map((v) => (
                                  <span
                                    key={v}
                                    className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingWord(item)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit word and sync dictionary"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWord(item.word)}
                              disabled={deletingWord === item.word}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete word"
                            >
                              {deletingWord === item.word ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Meanings */}
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                          {item.meanings.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="space-y-1.5 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100"
                            >
                              {m.partOfSpeech && (
                                <span className="inline-block px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 rounded text-[10px] font-extrabold uppercase tracking-wider">
                                  {m.partOfSpeech}
                                </span>
                              )}
                              <p className="text-gray-800 text-sm font-medium leading-relaxed">
                                {m.definition}
                              </p>
                              {m.examples && m.examples.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  {m.examples.map((ex, exIdx) => (
                                    <p
                                      key={exIdx}
                                      className="text-xs text-gray-500 italic pl-3 border-l-2 border-violet-200"
                                    >
                                      &ldquo;{ex}&rdquo;
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 2. Sentences Section */}
            {(contentTypeFilter === "all" ||
              contentTypeFilter === "sentences") &&
              filteredSentences.length > 0 && (
                <div className="space-y-4">
                  {contentTypeFilter === "all" && filteredWords.length > 0 && (
                    <div className="flex items-center gap-2 px-1 pt-4 border-t border-gray-200">
                      <Quote size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                        Poetic Lines & Sentences ({filteredSentences.length})
                      </h4>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-5">
                    {filteredSentences.map((sent, sIdx) => (
                      <div
                        key={`sent-${sIdx}`}
                        className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg shadow-2xs">
                              #{sIdx + 1}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 tracking-wider">
                              <Quote size={11} />
                              <span>Line / Stanza</span>
                            </span>
                            {sent.tag && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold border bg-violet-50 text-violet-700 border-violet-200">
                                <TagIcon
                                  size={12}
                                  className="text-violet-600"
                                />
                                <span>{sent.tag}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingSentence(sent)}
                              className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors cursor-pointer"
                              title="Edit sentence"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSentence(sent.sentence)
                              }
                              disabled={deletingSentence === sent.sentence}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Remove sentence"
                            >
                              {deletingSentence === sent.sentence ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="relative pl-6 border-l-4 border-emerald-200">
                          <Quote
                            size={18}
                            className="absolute -left-2.5 top-0 text-emerald-400 fill-emerald-100"
                          />
                          <p className="text-gray-900 text-lg sm:text-xl font-medium leading-relaxed italic font-serif">
                            &ldquo;{sent.sentence}&rdquo;
                          </p>
                        </div>

                        {sent.meaning && (
                          <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 flex items-start gap-2.5">
                            <Info
                              size={16}
                              className="text-emerald-500 mt-0.5 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                                Meaning & Poetic Context
                              </span>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {sent.meaning}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Empty state for search/filter */}
            {((contentTypeFilter === "words" && filteredWords.length === 0) ||
              (contentTypeFilter === "sentences" &&
                filteredSentences.length === 0) ||
              (contentTypeFilter === "all" &&
                filteredWords.length === 0 &&
                filteredSentences.length === 0)) && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 px-6 space-y-2">
                <p className="text-gray-500 font-medium text-sm">
                  {searchQuery
                    ? `No matching ${contentTypeFilter === "all" ? "items" : contentTypeFilter} found.`
                    : `No ${contentTypeFilter} recorded in this poem.`}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Word Edit Modal with Persistent Cache Sync */}
      <WordEditModal
        isOpen={Boolean(editingWord)}
        onClose={() => setEditingWord(null)}
        wordData={editingWord}
        onSave={handleSaveEditedWord}
        contextTitle={`Edit Word in Poem: ${poemName}`}
      />

      {/* Sentence Edit Modal */}
      {editingSentence && (
        <SentenceEditModal
          isOpen={true}
          sentence={editingSentence}
          mediaType="poem"
          mediaName={poemName}
          onClose={() => setEditingSentence(null)}
          onSaved={handleSaveEditedSentence}
        />
      )}

      {/* Add Sentence Modal */}
      <AddSentenceModal
        isOpen={isAddSentenceOpen}
        mediaType="poem"
        mediaName={poemName}
        onClose={() => setIsAddSentenceOpen(false)}
        onAdded={() => {
          setIsAddSentenceOpen(false);
          void loadPoemData();
        }}
      />
    </div>
  );
}
