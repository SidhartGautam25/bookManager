"use client";

import { useState, useEffect, useMemo, use } from "react";
import {
  Layout,
  Hash,
  BookOpen,
  Loader2,
  ArrowLeft,
  Info,
  Menu,
  X,
  Pencil,
  Trash2,
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

interface PageData {
  page: number;
  words: Word[];
}

interface BookStat {
  bookName: string;
  frequency: number;
  pages: number[];
}

interface WordStats {
  word: string;
  totalFrequency: number;
  books: BookStat[];
}

export default function BookDetailsPage({
  params,
}: {
  params: Promise<{ bookName: string }>;
}) {
  const { bookName: encodedBookName } = use(params);
  const selectedBook = decodeURIComponent(encodedBookName);

  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [bookData, setBookData] = useState<PageData[]>([]);
  const [sentencesData, setSentencesData] = useState<
    { page: number; sentences: SentenceEntry[] }[]
  >([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<
    "all" | "words" | "sentences"
  >("all");
  const [isAddSentenceOpen, setIsAddSentenceOpen] = useState<boolean>(false);
  const [editingSentence, setEditingSentence] = useState<SentenceEntry | null>(
    null,
  );
  const [deletingSentence, setDeletingSentence] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordStats, setWordStats] = useState<WordStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [deletingWord, setDeletingWord] = useState<string | null>(null);

  const handleEditWord = (wordItem: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWord(wordItem);
  };

  const handleSaveEditedWord = async (updatedWord: Word) => {
    if (!editingWord || selectedPage === null) return;

    const res = await fetch("/api/words", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookName: selectedBook,
        pageNo: selectedPage,
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

    // Update local state in bookData
    setBookData((prev) =>
      prev.map((p) => {
        if (p.page !== selectedPage) return p;
        return {
          ...p,
          words: p.words.map((w) =>
            w.word.toLowerCase() === editingWord.word.toLowerCase()
              ? updatedWord
              : w,
          ),
        };
      }),
    );

    setMessage(
      `Word "${updatedWord.word}" updated successfully & cache synchronized!`,
    );
    setMessageType("success");
  };

  const handleDeleteWord = async (
    wordToDelete: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (selectedPage === null) return;
    if (
      !confirm(
        `Remove "${wordToDelete}" from page ${selectedPage} of ${selectedBook}?`,
      )
    )
      return;

    setDeletingWord(wordToDelete);
    try {
      const res = await fetch(
        `/api/words?bookName=${encodeURIComponent(selectedBook)}&pageNo=${selectedPage}&word=${encodeURIComponent(wordToDelete)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        setBookData((prev) =>
          prev.map((p) => {
            if (p.page !== selectedPage) return p;
            return {
              ...p,
              words: p.words.filter(
                (w) => w.word.toLowerCase() !== wordToDelete.toLowerCase(),
              ),
            };
          }),
        );
        setMessage(`Word "${wordToDelete}" removed successfully`);
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
      const response = await fetch(
        `/api/words/stats?word=${encodeURIComponent(word)}`,
      );
      const data = await response.json();
      if (data.success && data.found) {
        setWordStats(data.data);
      } else {
        setWordStats(null);
      }
    } catch (error) {
      console.error("Error fetching word stats", error);
      setWordStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBookData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [wordsRes, sentRes] = await Promise.all([
        fetch(`/api/words?bookName=${encodeURIComponent(selectedBook)}`),
        fetch(
          `/api/sentences?mediaType=book&mediaName=${encodeURIComponent(selectedBook)}`,
        ),
      ]);
      const wordsData = await wordsRes.json();
      const sentData = await sentRes.json();

      if (wordsData.success) {
        const sortedWords: PageData[] = wordsData.data || [];
        setBookData(sortedWords);
        const sortedSentences: { page: number; sentences: SentenceEntry[] }[] =
          sentData.success && Array.isArray(sentData.data) ? sentData.data : [];
        setSentencesData(sortedSentences);

        const pageSet = new Set<number>();
        sortedWords.forEach((p) => pageSet.add(p.page));
        sortedSentences.forEach((p) => pageSet.add(p.page));
        const allPages = Array.from(pageSet).sort((a, b) => a - b);

        if (allPages.length > 0) {
          setSelectedPage((prev) =>
            prev && pageSet.has(prev) ? prev : allPages[0],
          );
        } else {
          setSelectedPage(null);
        }
        setMessage("");
      } else {
        setMessage(wordsData.error || "Failed to load book data");
        setMessageType("error");
        setBookData([]);
        setSentencesData([]);
        setSelectedPage(null);
      }
    } catch {
      setMessage("Error fetching book data");
      setMessageType("error");
      setBookData([]);
      setSentencesData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadInitialBookData() {
      try {
        const [wordsRes, sentRes] = await Promise.all([
          fetch(`/api/words?bookName=${encodeURIComponent(selectedBook)}`),
          fetch(
            `/api/sentences?mediaType=book&mediaName=${encodeURIComponent(selectedBook)}`,
          ),
        ]);
        const wordsData = await wordsRes.json();
        const sentData = await sentRes.json();
        if (!isMounted) return;

        if (wordsData.success) {
          const sortedWords: PageData[] = wordsData.data || [];
          setBookData(sortedWords);
          const sortedSentences: {
            page: number;
            sentences: SentenceEntry[];
          }[] =
            sentData.success && Array.isArray(sentData.data)
              ? sentData.data
              : [];
          setSentencesData(sortedSentences);

          const pageSet = new Set<number>();
          sortedWords.forEach((p) => pageSet.add(p.page));
          sortedSentences.forEach((p) => pageSet.add(p.page));
          const unionPages = Array.from(pageSet).sort((a, b) => a - b);

          if (unionPages.length > 0) {
            setSelectedPage((prev) =>
              prev && pageSet.has(prev) ? prev : unionPages[0],
            );
          } else {
            setSelectedPage(null);
          }
        } else {
          setMessage(wordsData.error || "Failed to load book data");
          setMessageType("error");
          setBookData([]);
          setSentencesData([]);
          setSelectedPage(null);
        }
      } catch {
        if (isMounted) {
          setMessage("Error fetching book data");
          setMessageType("error");
          setBookData([]);
          setSentencesData([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInitialBookData();
    return () => {
      isMounted = false;
    };
  }, [selectedBook]);

  const handleDeleteSentence = async (sentenceToDelete: string) => {
    if (!selectedPage) return;
    if (!confirm("Are you sure you want to delete this sentence?")) return;

    setDeletingSentence(sentenceToDelete);
    try {
      const res = await fetch(
        `/api/sentences?mediaType=book&mediaName=${encodeURIComponent(selectedBook)}&pageNo=${selectedPage}&sentence=${encodeURIComponent(sentenceToDelete)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        setSentencesData((prev) =>
          prev.map((p) => {
            if (p.page !== selectedPage) return p;
            return {
              ...p,
              sentences: p.sentences.filter(
                (s) =>
                  s.sentence.trim().toLowerCase() !==
                  sentenceToDelete.trim().toLowerCase(),
              ),
            };
          }),
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
    if (!editingSentence || selectedPage === null) return;

    setSentencesData((prev) =>
      prev.map((p) => {
        if (p.page !== selectedPage) return p;
        return {
          ...p,
          sentences: p.sentences.map((s) =>
            s.sentence.trim().toLowerCase() ===
            editingSentence.sentence.trim().toLowerCase()
              ? updatedSentence
              : s,
          ),
        };
      }),
    );
    setMessage("Sentence updated successfully!");
    setMessageType("success");
    setEditingSentence(null);
  };

  const allPagesList = useMemo(() => {
    const pageSet = new Set<number>();
    bookData.forEach((p) => pageSet.add(p.page));
    sentencesData.forEach((p) => pageSet.add(p.page));
    return Array.from(pageSet).sort((a, b) => a - b);
  }, [bookData, sentencesData]);

  const totalWords = useMemo(
    () => bookData.reduce((sum, p) => sum + p.words.length, 0),
    [bookData],
  );

  const totalSentences = useMemo(
    () => sentencesData.reduce((sum, p) => sum + p.sentences.length, 0),
    [sentencesData],
  );

  const currentPageWords = useMemo(
    () => bookData.find((p) => p.page === selectedPage)?.words || [],
    [bookData, selectedPage],
  );

  const currentPageSentences = useMemo(
    () => sentencesData.find((p) => p.page === selectedPage)?.sentences || [],
    [sentencesData, selectedPage],
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/book-list"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Library
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Book Details
          </h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            Review vocabulary from the selected book.
          </p>
        </div>

        {/* Global Notifications */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <Info size={20} />
            <span className="font-medium text-sm">{message}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Collapsible Sidebar: Page Selector */}
          {!loading && allPagesList.length > 0 && (
            <aside
              className={`transition-all duration-300 flex-shrink-0 ${
                isSidebarOpen ? "w-full lg:w-72 lg:block" : "hidden"
              }`}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-8">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <Hash className="text-indigo-600" size={18} />
                    <h2 className="font-bold text-gray-800 tracking-tight text-sm uppercase">
                      Pages
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg lg:hidden"
                  >
                    <X size={16} />
                  </button>
                </div>

                <nav className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {allPagesList.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPage(p)}
                      className={`flex items-center justify-center p-3 rounded-xl text-center text-sm font-bold transition-all duration-200 cursor-pointer ${
                        selectedPage === p
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-100"
                      }`}
                    >
                      <span>{p}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <section className="flex-1 min-w-0 space-y-6 w-full">
            {/* Book Header & Stats Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div className="flex items-center gap-4">
                {!isSidebarOpen && !loading && allPagesList.length > 0 && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2.5 bg-white text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-200 shadow-sm"
                    title="Open Sidebar"
                  >
                    <Menu size={20} />
                  </button>
                )}
                {isSidebarOpen && !loading && allPagesList.length > 0 && (
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2.5 bg-white text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-200 shadow-sm hidden lg:block"
                    title="Close Sidebar"
                  >
                    <Menu size={20} />
                  </button>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 line-clamp-1">
                    {selectedBook}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                    <BookOpen size={14} />
                    <span>Reading Log</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="flex-1 sm:flex-none px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                  <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider leading-none">
                    Total Words
                  </span>
                  <span className="text-lg font-black text-indigo-700">
                    {totalWords}
                  </span>
                </div>
                <div className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="block text-[10px] uppercase font-bold text-emerald-500 tracking-wider leading-none">
                    Total Sentences
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {totalSentences}
                  </span>
                </div>
                <div className="flex-1 sm:flex-none px-4 py-2 bg-violet-50 rounded-xl border border-violet-100">
                  <span className="block text-[10px] uppercase font-bold text-violet-400 tracking-wider leading-none">
                    Total Pages
                  </span>
                  <span className="text-lg font-black text-violet-700">
                    {allPagesList.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSentenceOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Sentence</span>
                </button>
              </div>
            </div>

            {/* Filter Toggle: All / Words / Sentences */}
            {!loading && selectedPage !== null && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-800">
                    Page {selectedPage}
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">
                    ({currentPageWords.length} words,{" "}
                    {currentPageSentences.length} sentences)
                  </span>
                </div>

                <div className="inline-flex p-1 rounded-xl bg-gray-100 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setContentTypeFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      contentTypeFilter === "all"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    All ({currentPageWords.length + currentPageSentences.length}
                    )
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
                    Words ({currentPageWords.length})
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
                    Sentences ({currentPageSentences.length})
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <Loader2
                  className="animate-spin text-indigo-600 mb-4"
                  size={32}
                />
                <p className="text-gray-500 font-medium">
                  Fetching vocabulary and sentences data...
                </p>
              </div>
            ) : allPagesList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400">
                  Empty book. Add some words or sentences to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Words List */}
                {(contentTypeFilter === "all" ||
                  contentTypeFilter === "words") &&
                  currentPageWords.length > 0 && (
                    <div className="space-y-4">
                      {contentTypeFilter === "all" &&
                        currentPageSentences.length > 0 && (
                          <div className="flex items-center gap-2 px-1 pt-2">
                            <Layout size={16} className="text-indigo-600" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                              Words ({currentPageWords.length})
                            </h4>
                          </div>
                        )}
                      <div className="grid grid-cols-1 gap-6">
                        {currentPageWords.map((item, index) => (
                          <div
                            key={`word-${index}`}
                            onClick={() => handleWordClick(item.word)}
                            className={`bg-white p-8 rounded-3xl border shadow-sm transition-all duration-300 group cursor-pointer ${
                              selectedWord === item.word
                                ? "border-indigo-400 ring-4 ring-indigo-50 shadow-lg"
                                : "border-gray-100 hover:shadow-xl hover:border-indigo-100"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg shadow-2xs">
                                  #{index + 1}
                                </span>
                                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                  <Layout size={20} />
                                </div>
                                <h4 className="font-black text-2xl text-gray-900 capitalize tracking-tight">
                                  {item.word}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => handleEditWord(item, e)}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                  title="Edit word & update dictionary cache"
                                >
                                  <Pencil size={17} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDeleteWord(item.word, e)
                                  }
                                  disabled={deletingWord === item.word}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Remove word"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-6 border-l-4 border-indigo-50 pl-6 ml-2">
                              {item.meanings?.map((m, mIdx) => (
                                <div key={mIdx} className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    {m.partOfSpeech && (
                                      <span className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg tracking-widest border border-indigo-100">
                                        {m.partOfSpeech}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-900 text-lg font-medium leading-relaxed">
                                    {m.definition}
                                  </p>
                                  {m.examples && m.examples.length > 0 && (
                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 space-y-3">
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        Usage Examples
                                      </p>
                                      <ul className="space-y-3">
                                        {m.examples.map((ex, exIdx) => (
                                          <li
                                            key={exIdx}
                                            className="text-gray-700 text-base flex gap-3 leading-relaxed"
                                          >
                                            <span className="text-indigo-400 font-bold mt-0.5">
                                              “
                                            </span>
                                            <span className="italic">{ex}</span>
                                            <span className="text-indigo-400 font-bold mt-0.5">
                                              ”
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
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

                {/* 2. Sentences List */}
                {(contentTypeFilter === "all" ||
                  contentTypeFilter === "sentences") &&
                  currentPageSentences.length > 0 && (
                    <div className="space-y-4">
                      {contentTypeFilter === "all" &&
                        currentPageWords.length > 0 && (
                          <div className="flex items-center gap-2 px-1 pt-4 border-t border-gray-200">
                            <Quote size={16} className="text-indigo-600" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                              Sentences ({currentPageSentences.length})
                            </h4>
                          </div>
                        )}
                      <div className="grid grid-cols-1 gap-5">
                        {currentPageSentences.map((sent, sIdx) => (
                          <div
                            key={`sentence-${sIdx}`}
                            className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg shadow-2xs">
                                  #{sIdx + 1}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 tracking-wider">
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
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
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
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Remove sentence"
                                >
                                  {deletingSentence === sent.sentence ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="relative pl-6 border-l-4 border-indigo-200">
                              <Quote
                                size={18}
                                className="absolute -left-2.5 top-0 text-indigo-400 fill-indigo-100"
                              />
                              <p className="text-gray-900 text-lg sm:text-xl font-medium leading-relaxed italic">
                                &ldquo;{sent.sentence}&rdquo;
                              </p>
                            </div>

                            {sent.meaning && (
                              <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 flex items-start gap-2.5">
                                <Info
                                  size={16}
                                  className="text-indigo-500 mt-0.5 flex-shrink-0"
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

                {/* Empty filter message */}
                {((contentTypeFilter === "words" &&
                  currentPageWords.length === 0) ||
                  (contentTypeFilter === "sentences" &&
                    currentPageSentences.length === 0)) && (
                  <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">
                      No {contentTypeFilter} on page {selectedPage}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right Sidebar: Word Stats */}
          {selectedWord && (
            <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800 tracking-tight text-sm uppercase">
                    Word Statistics
                  </h2>
                  <button
                    onClick={() => setSelectedWord(null)}
                    className="p-1 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h3 className="text-2xl font-black text-indigo-600 capitalize">
                    {selectedWord}
                  </h3>
                  {wordStats && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                      <span>Total occurrences:</span>
                      <span className="text-sm">
                        {wordStats.totalFrequency}
                      </span>
                    </div>
                  )}
                </div>

                {loadingStats ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2
                      className="animate-spin text-indigo-600 mb-3"
                      size={24}
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                      Loading stats...
                    </span>
                  </div>
                ) : wordStats ? (
                  <div className="space-y-6">
                    {/* Current Book Stats */}
                    {(() => {
                      const currentBookStats = wordStats.books.find(
                        (b) => b.bookName === selectedBook,
                      );
                      if (!currentBookStats) return null;
                      return (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            In Current Book
                          </h4>
                          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 border border-indigo-100 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-semibold text-gray-700">
                                Frequency
                              </span>
                              <span className="text-lg font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-50 shadow-sm">
                                {currentBookStats.frequency}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-500 block mb-2">
                                Appears on pages:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {currentBookStats.pages.map((page) => (
                                  <button
                                    key={page}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPage(page);
                                    }}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm border transition-colors ${selectedPage === page ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"}`}
                                  >
                                    {page}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Other Books Stats */}
                    {(() => {
                      const otherBooksStats = wordStats.books.filter(
                        (b) => b.bookName !== selectedBook,
                      );
                      if (otherBooksStats.length === 0) {
                        return (
                          <div className="space-y-2 mt-6 pt-6 border-t border-gray-100">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Other Books
                            </h4>
                            <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                              Not found in any other books.
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3 mt-6 pt-6 border-t border-gray-100">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                            <span>Other Books</span>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {otherBooksStats.length}
                            </span>
                          </h4>
                          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                            {otherBooksStats.map((bookStat) => (
                              <div
                                key={bookStat.bookName}
                                className="bg-white rounded-xl p-3.5 border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all"
                              >
                                <div className="flex justify-between items-start gap-3 mb-2.5">
                                  <span className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">
                                    {bookStat.bookName}
                                  </span>
                                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                    {bookStat.frequency}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {bookStat.pages.map((page) => (
                                    <span
                                      key={page}
                                      className="px-1.5 py-0.5 bg-gray-50 text-[10px] font-bold text-gray-500 border border-gray-200 rounded"
                                    >
                                      pg {page}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No statistics available.
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Word Edit Modal with Persistent Cache Sync */}
      <WordEditModal
        isOpen={Boolean(editingWord)}
        onClose={() => setEditingWord(null)}
        wordData={editingWord}
        onSave={handleSaveEditedWord}
        contextTitle={`Edit Word in ${selectedBook} (Page ${selectedPage})`}
      />

      {/* Sentence Edit Modal */}
      {editingSentence && (
        <SentenceEditModal
          isOpen={true}
          sentence={editingSentence}
          mediaType="book"
          mediaName={selectedBook}
          pageNo={selectedPage || 1}
          onClose={() => setEditingSentence(null)}
          onSaved={handleSaveEditedSentence}
        />
      )}

      {/* Add Sentence Modal */}
      <AddSentenceModal
        isOpen={isAddSentenceOpen}
        mediaType="book"
        mediaName={selectedBook}
        pageNo={selectedPage || 1}
        onClose={() => setIsAddSentenceOpen(false)}
        onAdded={() => {
          setIsAddSentenceOpen(false);
          void fetchBookData();
        }}
      />
    </div>
  );
}
