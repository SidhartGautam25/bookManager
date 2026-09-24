"use client";

import { useState, useEffect, useMemo, use } from "react";
import {
  Film,
  ArrowLeft,
  Loader2,
  Trash2,
  Search,
  BookOpen,
  Music,
  Sparkles,
  Info,
  ExternalLink,
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
}

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ movieName: string }>;
}) {
  const { movieName: encodedMovieName } = use(params);
  const movieName = decodeURIComponent(encodedMovieName);

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

    const res = await fetch("/api/movies/words", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieName,
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

  const loadMovieData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [wordsRes, sentRes] = await Promise.all([
        fetch(`/api/movies/words?movieName=${encodeURIComponent(movieName)}`),
        fetch(
          `/api/sentences?mediaType=movie&mediaName=${encodeURIComponent(movieName)}`,
        ),
      ]);
      const wordsData = await wordsRes.json();
      const sentData = await sentRes.json();

      if (wordsData.success && Array.isArray(wordsData.data)) {
        setWords(wordsData.data);
      }
      if (sentData.success && Array.isArray(sentData.data)) {
        setSentences(sentData.data);
      }
    } catch {
      setMessage("Error fetching movie words and sentences");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadInitialMovieData() {
      try {
        const [wordsRes, sentRes] = await Promise.all([
          fetch(`/api/movies/words?movieName=${encodeURIComponent(movieName)}`),
          fetch(
            `/api/sentences?mediaType=movie&mediaName=${encodeURIComponent(movieName)}`,
          ),
        ]);
        const wordsData = await wordsRes.json();
        const sentData = await sentRes.json();
        if (!isMounted) return;

        if (wordsData.success && Array.isArray(wordsData.data)) {
          setWords(wordsData.data);
        }
        if (sentData.success && Array.isArray(sentData.data)) {
          setSentences(sentData.data);
        }
      } catch {
        if (isMounted) {
          setMessage("Error fetching movie words and sentences");
          setMessageType("error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInitialMovieData();
    return () => {
      isMounted = false;
    };
  }, [movieName]);

  const handleDeleteSentence = async (sentenceToDelete: string) => {
    if (!confirm("Are you sure you want to delete this sentence?")) return;

    setDeletingSentence(sentenceToDelete);
    try {
      const res = await fetch(
        `/api/sentences?mediaType=movie&mediaName=${encodeURIComponent(movieName)}&sentence=${encodeURIComponent(sentenceToDelete)}`,
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

  const handleDeleteWord = async (wordToDelete: string) => {
    if (!confirm(`Remove "${wordToDelete}" from ${movieName}?`)) return;

    setDeletingWord(wordToDelete);
    try {
      const res = await fetch(
        `/api/movies/words?movieName=${encodeURIComponent(movieName)}&word=${encodeURIComponent(wordToDelete)}`,
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
            href="/movie-list"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Movie Vault
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddSentenceOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-100 transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add Sentence
            </button>
            <Link
              href="/add-word"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition-colors"
            >
              + Add Words
            </Link>
          </div>
        </div>

        {/* Movie Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
              <Film size={28} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Movie Media
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {movieName}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-extrabold text-indigo-700">
              {words.length} word{words.length === 1 ? "" : "s"}
            </span>
            <span className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-extrabold text-emerald-700">
              {sentences.length} sentence{sentences.length === 1 ? "" : "s"}
            </span>
          </div>
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
            <Info size={18} />
            <span className="font-semibold text-xs">{message}</span>
          </div>
        )}

        {/* Filter bar & Type Switcher */}
        {(words.length > 0 || sentences.length > 0) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words, sentences, tags, meanings..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
              />
            </div>

            <div className="inline-flex p-1 rounded-xl bg-gray-100 border border-gray-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setContentTypeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  contentTypeFilter === "all"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({words.length + sentences.length})
              </button>
              <button
                type="button"
                onClick={() => setContentTypeFilter("words")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  contentTypeFilter === "words"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Words ({words.length})
              </button>
              <button
                type="button"
                onClick={() => setContentTypeFilter("sentences")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  contentTypeFilter === "sentences"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sentences ({sentences.length})
              </button>
            </div>
          </div>
        )}

        {/* Cross-Media Stats Card (if a word is selected) */}
        {selectedWord && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <h4 className="font-extrabold text-sm text-indigo-950 capitalize">
                  Cross-Library Occurrences for &ldquo;{selectedWord}&rdquo;
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>

            {loadingStats ? (
              <div className="flex items-center gap-2 text-xs text-indigo-600">
                <Loader2 size={14} className="animate-spin" />
                <span>Checking library stats...</span>
              </div>
            ) : wordStats ? (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-gray-700">
                  Total frequency:{" "}
                  <span className="text-indigo-600 font-extrabold">
                    {wordStats.totalFrequency} time
                    {wordStats.totalFrequency === 1 ? "" : "s"}
                  </span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {wordStats.books && wordStats.books.length > 0 && (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                        <BookOpen size={13} />
                        <span>Books ({wordStats.books.length})</span>
                      </div>
                      <ul className="text-gray-600 text-[11px] list-disc list-inside">
                        {wordStats.books.map((b) => (
                          <li key={b.bookName} className="truncate">
                            {b.bookName} ({b.frequency}x)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wordStats.songs && wordStats.songs.length > 0 && (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                        <Music size={13} />
                        <span>Songs ({wordStats.songs.length})</span>
                      </div>
                      <ul className="text-gray-600 text-[11px] list-disc list-inside">
                        {wordStats.songs.map((s) => (
                          <li key={s.name} className="truncate">
                            {s.name} ({s.frequency}x)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wordStats.movies && wordStats.movies.length > 0 && (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                        <Film size={13} />
                        <span>Movies ({wordStats.movies.length})</span>
                      </div>
                      <ul className="text-gray-600 text-[11px] list-disc list-inside">
                        {wordStats.movies.map((m) => (
                          <li key={m.name} className="truncate">
                            {m.name} ({m.frequency}x)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Only appears in this movie.
              </p>
            )}
          </div>
        )}

        {/* Content Cards List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">
              Loading words and sentences...
            </p>
          </div>
        ) : words.length === 0 && sentences.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 px-6 space-y-3">
            <div className="bg-indigo-50 p-4 rounded-full inline-flex text-indigo-600">
              <Film size={36} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              No words or sentences recorded in this movie yet
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto text-xs">
              Add words or favorite dialogue lines using the buttons above.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddSentenceOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} /> Add Sentence
              </button>
              <Link
                href="/add-word"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                + Add Words
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Words Section */}
            {(contentTypeFilter === "all" || contentTypeFilter === "words") &&
              filteredWords.length > 0 && (
                <div className="space-y-4">
                  {contentTypeFilter === "all" &&
                    filteredSentences.length > 0 && (
                      <div className="flex items-center gap-2 px-1 pt-2">
                        <Film size={16} className="text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Words ({filteredWords.length})
                        </h4>
                      </div>
                    )}
                  <div className="grid grid-cols-1 gap-4">
                    {filteredWords.map((item, index) => (
                      <div
                        key={item.word}
                        className="bg-white rounded-2xl p-6 border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md shadow-2xs">
                                #{index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleWordClick(item.word)}
                                className="text-lg font-extrabold text-gray-900 capitalize hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                                title="Click to check library frequency"
                              >
                                {item.word}
                                <ExternalLink
                                  size={13}
                                  className="text-gray-400"
                                />
                              </button>
                              {item.meanings.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                                >
                                  {m.partOfSpeech || "general"}
                                </span>
                              ))}
                            </div>

                            {item.variations && item.variations.length > 0 && (
                              <p className="text-[11px] text-gray-400 font-medium">
                                Variations: {item.variations.join(", ")}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingWord(item)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title="Edit word & sync persistent cache"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWord(item.word)}
                              disabled={deletingWord === item.word}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Remove word"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

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
                                <p className="text-gray-800 font-medium leading-relaxed">
                                  {m.definition}
                                </p>
                              </div>

                              {m.examples && m.examples.length > 0 && (
                                <div className="space-y-1 mt-2 pl-3 border-l-2 border-indigo-200">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Examples:
                                  </div>
                                  {m.examples.map((ex, exIdx) => (
                                    <p
                                      key={exIdx}
                                      className="text-gray-600 italic text-xs leading-relaxed"
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
                        Sentences ({filteredSentences.length})
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
                              <span>Sentence</span>
                            </span>
                            {sent.tag && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold border bg-indigo-50 text-indigo-700 border-indigo-200">
                                <TagIcon
                                  size={12}
                                  className="text-indigo-600"
                                />
                                <span>{sent.tag}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingSentence(sent)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
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
                          <p className="text-gray-900 text-lg sm:text-xl font-medium leading-relaxed italic">
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
                                Meaning & Context
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
                    : `No ${contentTypeFilter} recorded in this movie.`}
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
        contextTitle={`Edit Word in Movie: ${movieName}`}
      />

      {/* Sentence Edit Modal */}
      {editingSentence && (
        <SentenceEditModal
          isOpen={true}
          sentence={editingSentence}
          mediaType="movie"
          mediaName={movieName}
          onClose={() => setEditingSentence(null)}
          onSaved={handleSaveEditedSentence}
        />
      )}

      {/* Add Sentence Modal */}
      <AddSentenceModal
        isOpen={isAddSentenceOpen}
        mediaType="movie"
        mediaName={movieName}
        onClose={() => setIsAddSentenceOpen(false)}
        onAdded={() => {
          setIsAddSentenceOpen(false);
          void loadMovieData();
        }}
      />
    </div>
  );
}
