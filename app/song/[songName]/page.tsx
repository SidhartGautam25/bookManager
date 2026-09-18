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

export default function SongDetailPage({
  params,
}: {
  params: Promise<{ songName: string }>;
}) {
  const { songName: encodedSongName } = use(params);
  const songName = decodeURIComponent(encodedSongName);

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

  const loadSongData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [wordsRes, sentRes] = await Promise.all([
        fetch(`/api/songs/words?songName=${encodeURIComponent(songName)}`),
        fetch(
          `/api/sentences?mediaType=song&mediaName=${encodeURIComponent(songName)}`,
        ),
      ]);
      const wordsData = await wordsRes.json();
      const sentData = await sentRes.json();

      if (wordsData.success && Array.isArray(wordsData.data)) {
        setWords(wordsData.data);
        if (typeof wordsData.lyrics === "string") {
          setLyrics(wordsData.lyrics);
          setLyricsDraft(wordsData.lyrics);
        }
      }
      if (sentData.success && Array.isArray(sentData.data)) {
        setSentences(sentData.data);
      }
    } catch {
      setMessage("Error fetching song words and sentences");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadInitialSongData() {
      try {
        const [wordsRes, sentRes] = await Promise.all([
          fetch(`/api/songs/words?songName=${encodeURIComponent(songName)}`),
          fetch(
            `/api/sentences?mediaType=song&mediaName=${encodeURIComponent(songName)}`,
          ),
        ]);
        const wordsData = await wordsRes.json();
        const sentData = await sentRes.json();
        if (!isMounted) return;

        if (wordsData.success && Array.isArray(wordsData.data)) {
          setWords(wordsData.data);
          if (typeof wordsData.lyrics === "string") {
            setLyrics(wordsData.lyrics);
            setLyricsDraft(wordsData.lyrics);
          }
        }
        if (sentData.success && Array.isArray(sentData.data)) {
          setSentences(sentData.data);
        }
      } catch {
        if (isMounted) {
          setMessage("Error fetching song words and sentences");
          setMessageType("error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInitialSongData();
    return () => {
      isMounted = false;
    };
  }, [songName]);

  const handleDeleteSentence = async (sentenceToDelete: string) => {
    if (!confirm("Are you sure you want to delete this sentence?")) return;

    setDeletingSentence(sentenceToDelete);
    try {
      const res = await fetch(
        `/api/sentences?mediaType=song&mediaName=${encodeURIComponent(songName)}&sentence=${encodeURIComponent(sentenceToDelete)}`,
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
            href="/song-list"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Song Vault
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

        {/* Song Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
              <Music size={28} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Song Media
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {songName}
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
                Only appears in this song.
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
              <Music size={36} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              No words or sentences recorded in this song yet
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto text-xs">
              Add words or favorite lyric lines using the buttons above.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddSentenceOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-all"
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
                        <Music size={16} className="text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Words ({filteredWords.length})
                        </h4>
                      </div>
                    )}
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
                    : `No ${contentTypeFilter} recorded in this song.`}
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
        contextTitle={`Edit Word in Song: ${songName}`}
      />

      {/* Sentence Edit Modal */}
      {editingSentence && (
        <SentenceEditModal
          isOpen={true}
          sentence={editingSentence}
          mediaType="song"
          mediaName={songName}
          onClose={() => setEditingSentence(null)}
          onSaved={handleSaveEditedSentence}
        />
      )}

      {/* Add Sentence Modal */}
      <AddSentenceModal
        isOpen={isAddSentenceOpen}
        mediaType="song"
        mediaName={songName}
        onClose={() => setIsAddSentenceOpen(false)}
        onAdded={() => {
          setIsAddSentenceOpen(false);
          void loadSongData();
        }}
      />
    </div>
  );
}
