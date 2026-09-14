"use client";

import { useState, useEffect, use } from "react";
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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [deletingWord, setDeletingWord] = useState<string | null>(null);

  // Cross-media stats modal/drawer
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordStats, setWordStats] = useState<CrossMediaStat | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadWords() {
      try {
        const res = await fetch(
          `/api/movies/words?movieName=${encodeURIComponent(movieName)}`,
        );
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && Array.isArray(data.data)) {
          setWords(data.data);
        } else {
          setMessage(data.error || "Failed to load movie words");
          setMessageType("error");
        }
      } catch {
        if (isMounted) {
          setMessage("Error fetching movie words");
          setMessageType("error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadWords();
    return () => {
      isMounted = false;
    };
  }, [movieName]);

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

  const filteredWords = words.filter((w) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (w.word.toLowerCase().includes(q)) return true;
    return w.meanings.some(
      (m) =>
        m.definition.toLowerCase().includes(q) ||
        m.examples.some((ex) => ex.toLowerCase().includes(q)),
    );
  });

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

          <Link
            href="/add-word"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition-colors"
          >
            + Add Words
          </Link>
        </div>

        {/* Movie Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
              <Film size={28} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Movie Vocabulary
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {movieName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-gray-100 rounded-xl text-xs font-extrabold text-gray-700">
              {words.length} word{words.length === 1 ? "" : "s"} collected
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

        {/* Filter bar */}
        {words.length > 0 && (
          <div className="relative max-w-md">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, meanings, or examples..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
            />
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

        {/* Word Cards List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">
              Loading words...
            </p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 px-6 space-y-3">
            <div className="bg-indigo-50 p-4 rounded-full inline-flex text-indigo-600">
              <Film size={36} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {searchQuery
                ? "No matching words found"
                : "No words recorded in this movie yet"}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto text-xs">
              {searchQuery
                ? "Try searching for a different keyword or part of speech."
                : "Add words from this film using Smart Batch Dump or single word entry."}
            </p>
            <div className="pt-2">
              <Link
                href="/add-word"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                + Add Words
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredWords.map((item) => (
              <div
                key={item.word}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleWordClick(item.word)}
                        className="text-lg font-extrabold text-gray-900 capitalize hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                        title="Click to check library frequency"
                      >
                        {item.word}
                        <ExternalLink size={13} className="text-gray-400" />
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
        )}
      </main>
    </div>
  );
}
