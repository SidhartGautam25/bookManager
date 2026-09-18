"use client";

import { useState, useEffect, useMemo, use } from "react";
import {
  Music,
  ArrowLeft,
  Loader2,
  Trash2,
  Search,
  BookOpen,
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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import WordEditModal from "@/components/WordEditModal";
import { setCachedWord } from "@/lib/dictionary";

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

export default function SongDetailPage({
  params,
}: {
  params: Promise<{ songName: string }>;
}) {
  const { songName: encodedSongName } = use(params);
  const songName = decodeURIComponent(encodedSongName);

  const [words, setWords] = useState<Word[]>([]);
  const [lyrics, setLyrics] = useState<string>("");
  const [isEditingLyrics, setIsEditingLyrics] = useState<boolean>(false);
  const [lyricsDraft, setLyricsDraft] = useState<string>("");
  const [savingLyrics, setSavingLyrics] = useState<boolean>(false);
  const [showLyricsSection, setShowLyricsSection] = useState<boolean>(true);

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

    const res = await fetch("/api/songs/words", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songName,
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

  useEffect(() => {
    let isMounted = true;
    async function loadWords() {
      try {
        const res = await fetch(
          `/api/songs/words?songName=${encodeURIComponent(songName)}`,
        );
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && Array.isArray(data.data)) {
          setWords(data.data);
          if (typeof data.lyrics === "string") {
            setLyrics(data.lyrics);
            setLyricsDraft(data.lyrics);
          }
        } else {
          setMessage(data.error || "Failed to load song words");
          setMessageType("error");
        }
      } catch {
        if (isMounted) {
          setMessage("Error fetching song words");
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
  }, [songName]);

  const handleSaveLyrics = async () => {
    setSavingLyrics(true);
    try {
      const res = await fetch("/api/songs/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songName,
          lyrics: lyricsDraft,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLyrics(lyricsDraft);
        setIsEditingLyrics(false);
        setMessage("Lyrics saved successfully!");
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to save lyrics");
        setMessageType("error");
      }
    } catch {
      setMessage("Error saving lyrics");
      setMessageType("error");
    } finally {
      setSavingLyrics(false);
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

  const lyricsLines = useMemo(() => {
    if (!lyrics) return [];
    return lyrics.split(/\r?\n/);
  }, [lyrics]);

  const highlightedCount = useMemo(() => {
    if (!lyrics) return 0;
    const found = new Set<string>();
    const tokens = lyrics.match(/[a-zA-Z0-9'-]+/g) || [];
    tokens.forEach((t) => {
      const clean = t
        .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
        .toLowerCase();
      if (vocabWordMap.has(clean)) {
        found.add(vocabWordMap.get(clean)!.word.toLowerCase());
      }
    });
    return found.size;
  }, [lyrics, vocabWordMap]);

  const handleLyricWordClick = (targetWord: string) => {
    const cardId = `word-card-${targetWord.toLowerCase()}`;
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-purple-400", "scale-[1.01]");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-purple-400", "scale-[1.01]");
      }, 2000);
    }
  };

  const handleDeleteWord = async (wordToDelete: string) => {
    if (!confirm(`Remove "${wordToDelete}" from ${songName}?`)) return;

    setDeletingWord(wordToDelete);
    try {
      const res = await fetch(
        `/api/songs/words?songName=${encodeURIComponent(songName)}&word=${encodeURIComponent(wordToDelete)}`,
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
            href="/song-list"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Song Vault
          </Link>

          <Link
            href="/add-word"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition-colors"
          >
            + Add Words
          </Link>
        </div>

        {/* Song Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
              <Music size={28} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Song Vocabulary
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {songName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-gray-100 rounded-xl text-xs font-extrabold text-gray-700">
              {words.length} word{words.length === 1 ? "" : "s"} collected
            </span>
          </div>
        </div>

        {/* Song Lyrics Section with Highlighted Vocabulary Words */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-purple-100 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Music size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    Song Lyrics
                  </h2>
                  {lyrics && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      <Sparkles size={11} />
                      {highlightedCount} vocabulary word
                      {highlightedCount === 1 ? "" : "s"} highlighted
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {lyrics
                    ? "Vocabulary words from this song are highlighted in purple. Click any highlighted word to view its definition below!"
                    : "No lyrics saved for this track yet. Add lyrics to see vocabulary highlighted in context."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditingLyrics && lyrics && (
                <button
                  type="button"
                  onClick={() => {
                    setLyricsDraft(lyrics);
                    setIsEditingLyrics(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Edit3 size={13} />
                  Edit Lyrics
                </button>
              )}
              {!isEditingLyrics && !lyrics && (
                <button
                  type="button"
                  onClick={() => {
                    setLyricsDraft("");
                    setIsEditingLyrics(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 rounded-xl transition-colors shadow-xs"
                >
                  <FileText size={13} />+ Add Lyrics
                </button>
              )}
              {isEditingLyrics && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveLyrics}
                    disabled={savingLyrics}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 px-3.5 py-1.5 rounded-xl transition-colors shadow-xs"
                  >
                    {savingLyrics ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Save Lyrics
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingLyrics(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {lyrics && (
                <button
                  type="button"
                  onClick={() => setShowLyricsSection(!showLyricsSection)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  title={
                    showLyricsSection ? "Collapse lyrics" : "Expand lyrics"
                  }
                >
                  {showLyricsSection ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Section Body */}
          {showLyricsSection && (
            <>
              {isEditingLyrics ? (
                <div className="space-y-3">
                  <textarea
                    value={lyricsDraft}
                    onChange={(e) => setLyricsDraft(e.target.value)}
                    placeholder="Paste the lyrics for this song here..."
                    rows={8}
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm font-sans text-gray-800 transition-all resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingLyrics(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLyrics}
                      disabled={savingLyrics}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                    >
                      {savingLyrics && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      Save Lyrics
                    </button>
                  </div>
                </div>
              ) : lyrics ? (
                <div className="space-y-3">
                  {/* Interactive highlight reader */}
                  <div className="max-h-96 overflow-y-auto p-5 bg-gradient-to-b from-purple-50/20 via-gray-50/40 to-white rounded-xl border border-gray-200 space-y-1 select-none font-sans text-sm leading-relaxed">
                    {lyricsLines.map((line, lineIdx) => {
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
                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
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
                                    handleLyricWordClick(vocabMatch.word)
                                  }
                                  title={`Click to jump to definition of "${vocabMatch.word}"`}
                                  className="inline-block px-1.5 py-0.5 my-0.5 rounded-md text-sm font-bold bg-purple-600 text-white shadow-2xs scale-105 ring-2 ring-purple-300 ring-offset-1 hover:bg-purple-700 cursor-pointer transition-all duration-150"
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
                    No lyrics stored yet for &ldquo;{songName}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLyricsDraft("");
                      setIsEditingLyrics(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors"
                  >
                    <FileText size={13} />
                    Add Lyrics Now
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
                Only appears in this song.
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
              <Music size={36} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {searchQuery
                ? "No matching words found"
                : "No words recorded in this song yet"}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto text-xs">
              {searchQuery
                ? "Try searching for a different keyword or part of speech."
                : "Add words from this track using Smart Batch Dump or single word entry."}
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
            {filteredWords.map((item, index) => (
              <div
                key={item.word}
                id={`word-card-${item.word.toLowerCase()}`}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-2xs hover:shadow-xs transition-all duration-300 space-y-4 scroll-mt-24"
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
        )}
      </main>

      {/* Word Edit Modal with Persistent Cache Sync */}
      <WordEditModal
        isOpen={Boolean(editingWord)}
        onClose={() => setEditingWord(null)}
        wordData={editingWord}
        onSave={handleSaveEditedWord}
        contextTitle={`Edit Word in Song: ${songName}`}
      />
    </div>
  );
}
