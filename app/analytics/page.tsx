"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Book,
  FileText,
  Zap,
  Pencil,
  Info,
  Loader2,
  TrendingUp,
  Search,
  ChevronRight,
  Sparkles,
  Trophy,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import Navbar from "@/components/Navbar";

interface BookStats {
  name: string;
  totalWords: number;
  totalPages: number;
}

interface WordFrequencyItem {
  word: string;
  count: number;
}

interface RawWordItem {
  word: string;
  variations?: string[];
}

interface RawPageItem {
  page: number;
  words: RawWordItem[];
}

export default function AnalyticsPage() {
  const [bookStats, setBookStats] = useState<BookStats[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [topN, setTopN] = useState<number>(5);
  const [globalTopN, setGlobalTopN] = useState<number>(5);
  const [topWords, setTopWords] = useState<WordFrequencyItem[]>([]);
  const [globalTopWords, setGlobalTopWords] = useState<WordFrequencyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingTopWords, setLoadingTopWords] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  // Filtering and sorting for Corpus Distribution
  const [bookSearchQuery, setBookSearchQuery] = useState<string>("");
  const [bookSortBy, setBookSortBy] = useState<
    "words" | "pages" | "density" | "name"
  >("words");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const booksResponse = await fetch("/api/books");
        const booksData = await booksResponse.json();

        if (booksData.success && Array.isArray(booksData.books)) {
          const stats: BookStats[] = [];
          const allWordsEntries: RawWordItem[] = [];

          if (booksData.books.length > 0) {
            setSelectedBook((prev) => prev || booksData.books[0]);
          }

          for (const book of booksData.books) {
            try {
              const wordsResponse = await fetch(
                `/api/words?bookName=${encodeURIComponent(book)}`,
              );
              const wordsData = await wordsResponse.json();

              if (wordsData.success && Array.isArray(wordsData.data)) {
                let totalWords = 0;
                const totalPages = wordsData.data.length;

                wordsData.data.forEach((page: RawPageItem) => {
                  if (Array.isArray(page.words)) {
                    totalWords += page.words.length;
                    allWordsEntries.push(...page.words);
                  }
                });
                stats.push({ name: book, totalWords, totalPages });
              }
            } catch {
              console.error(`Error fetching stats for book: ${book}`);
            }
          }

          // Calculate Global Top Words
          const wordCounts: Record<string, number> = {};
          const canonicalMap: Record<string, string> = {};

          allWordsEntries.forEach((item) => {
            const mainWord = item.word.toLowerCase().trim();
            const variations = (item.variations || []).map((v) =>
              v.toLowerCase().trim(),
            );
            const allForms = [mainWord, ...variations];

            let canonical = allForms.find((f) => canonicalMap[f]);
            if (!canonical) {
              canonical = mainWord;
            } else {
              canonical = canonicalMap[canonical];
            }
            allForms.forEach((f) => {
              canonicalMap[f] = canonical!;
            });
          });

          allWordsEntries.forEach((item) => {
            const mainWord = item.word.toLowerCase().trim();
            const canonical = canonicalMap[mainWord] || mainWord;
            wordCounts[canonical] = (wordCounts[canonical] || 0) + 1;
          });

          const sortedGlobal = Object.entries(wordCounts)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count);

          setGlobalTopWords(sortedGlobal);
          setBookStats(stats.sort((a, b) => b.totalWords - a.totalWords));
        } else {
          setMessage("Error fetching books");
          setMessageType("error");
        }
      } catch {
        setMessage("Error loading analytics");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, []);

  useEffect(() => {
    const fetchTopWords = async () => {
      if (!selectedBook) return;
      setLoadingTopWords(true);
      try {
        const response = await fetch(
          `/api/words?bookName=${encodeURIComponent(selectedBook)}`,
        );
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const wordCounts: Record<string, number> = {};
          const canonicalMap: Record<string, string> = {};

          // First pass: build the canonical map for grouping variations
          data.data.forEach((page: RawPageItem) => {
            page.words?.forEach((item: RawWordItem) => {
              const mainWord = item.word.toLowerCase().trim();
              const variations = (item.variations || []).map((v) =>
                v.toLowerCase().trim(),
              );
              const allForms = [mainWord, ...variations];

              let canonical = allForms.find((f) => canonicalMap[f]);
              if (!canonical) {
                canonical = mainWord;
              } else {
                canonical = canonicalMap[canonical];
              }

              allForms.forEach((f) => {
                canonicalMap[f] = canonical!;
              });
            });
          });

          // Second pass: count frequencies using canonical map
          data.data.forEach((page: RawPageItem) => {
            page.words?.forEach((item: RawWordItem) => {
              const mainWord = item.word.toLowerCase().trim();
              const canonical = canonicalMap[mainWord] || mainWord;
              wordCounts[canonical] = (wordCounts[canonical] || 0) + 1;
            });
          });

          const sortedWords = Object.entries(wordCounts)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count);

          setTopWords(sortedWords);
        }
      } catch (err) {
        console.error("Error fetching top words:", err);
      } finally {
        setLoadingTopWords(false);
      }
    };

    void fetchTopWords();
  }, [selectedBook]);

  // Calculate Overall Statistics
  const overallStats = useMemo(() => {
    const totalBooks = bookStats.length;
    let totalWords = 0;
    let totalPages = 0;

    bookStats.forEach((stat) => {
      totalWords += stat.totalWords;
      totalPages += stat.totalPages;
    });

    const averageWordsPerBook =
      totalBooks > 0 ? Math.round(totalWords / totalBooks) : 0;
    return { totalBooks, totalWords, totalPages, averageWordsPerBook };
  }, [bookStats]);

  // Filter and sort books for Corpus Distribution
  const filteredAndSortedBooks = useMemo(() => {
    let result = [...bookStats];

    if (bookSearchQuery.trim()) {
      const q = bookSearchQuery.toLowerCase().trim();
      result = result.filter((b) => b.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (bookSortBy === "words") return b.totalWords - a.totalWords;
      if (bookSortBy === "pages") return b.totalPages - a.totalPages;
      if (bookSortBy === "density") {
        const densityA = a.totalPages > 0 ? a.totalWords / a.totalPages : 0;
        const densityB = b.totalPages > 0 ? b.totalWords / b.totalPages : 0;
        return densityB - densityA;
      }
      if (bookSortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [bookStats, bookSearchQuery, bookSortBy]);

  const maxGlobalCount =
    globalTopWords.length > 0 ? globalTopWords[0].count : 1;
  const maxWordsInAnyBook = useMemo(() => {
    if (bookStats.length === 0) return 1;
    return Math.max(...bookStats.map((b) => b.totalWords), 1);
  }, [bookStats]);

  const currentBookStat = useMemo(() => {
    return bookStats.find((b) => b.name === selectedBook);
  }, [bookStats, selectedBook]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
        {/* Header Section */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Zap size={14} className="text-indigo-600" />
            <span>Vocabulary Intelligence</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
                Analytics & Insights
              </h1>
              <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-2xl">
                Analyze vocabulary patterns across your books, identify frequent
                terminology, and explore reading metrics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/add-word"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Pencil size={14} />
                Add Word
              </Link>
              <Link
                href="/book-list"
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Book size={14} />
                View Books
              </Link>
            </div>
          </div>
        </header>

        {/* Global Notifications */}
        {message && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <Info size={18} />
            <span className="font-semibold text-sm">{message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 shadow-2xs">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
            <p className="text-gray-500 font-bold text-base">
              Indexing library analytics...
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* 1. Overall Statistics Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Linguistic Summary
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  {
                    label: "Total Books",
                    value: overallStats.totalBooks,
                    desc: "Volumes in collection",
                    icon: <Book size={22} className="text-blue-600" />,
                    bg: "bg-blue-50 border-blue-100",
                  },
                  {
                    label: "Total Words",
                    value: overallStats.totalWords,
                    desc: "Indexed across pages",
                    icon: <Pencil size={22} className="text-indigo-600" />,
                    bg: "bg-indigo-50 border-indigo-100",
                  },
                  {
                    label: "Total Pages",
                    value: overallStats.totalPages,
                    desc: "Exact citation entries",
                    icon: <FileText size={22} className="text-amber-600" />,
                    bg: "bg-amber-50 border-amber-100",
                  },
                  {
                    label: "Words Per Book",
                    value: overallStats.averageWordsPerBook,
                    desc: "Average vocabulary density",
                    icon: <TrendingUp size={22} className="text-emerald-600" />,
                    bg: "bg-emerald-50 border-emerald-100",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs hover:shadow-md hover:border-indigo-100 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl border ${stat.bg}`}>
                        {stat.icon}
                      </div>
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-sm font-bold text-gray-800 mt-1">
                      {stat.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {stat.desc}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Global Lexicon Ranking */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-gray-100 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={18} className="text-amber-500" />
                    <h2 className="text-lg font-bold text-gray-900">
                      Global Lexicon Ranking
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Most recurrent vocabulary words across all books in your
                    library.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-200/80 self-start sm:self-auto">
                  <span className="text-xs font-bold text-gray-500 pl-2">
                    Display:
                  </span>
                  {[5, 10, 15].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGlobalTopN(n)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        globalTopN === n
                          ? "bg-white text-indigo-600 shadow-2xs font-black"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Top {n}
                    </button>
                  ))}
                  <div className="h-4 w-px bg-gray-200" />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={globalTopN}
                    onChange={(e) =>
                      setGlobalTopN(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-12 bg-white px-2 py-1 rounded-lg text-xs font-bold text-gray-800 text-center border border-gray-200 outline-none"
                    title="Custom Top N"
                  />
                </div>
              </div>

              {globalTopWords.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No vocabulary words cataloged yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {globalTopWords.slice(0, globalTopN).map((item, idx) => {
                    const pct = Math.round((item.count / maxGlobalCount) * 100);
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;

                    return (
                      <div
                        key={item.word}
                        className={`relative p-5 rounded-2xl border transition-all duration-200 ${
                          isTop1
                            ? "bg-amber-50/40 border-amber-200 shadow-2xs"
                            : isTop2
                              ? "bg-slate-50 border-slate-200 shadow-2xs"
                              : isTop3
                                ? "bg-orange-50/40 border-orange-200 shadow-2xs"
                                : "bg-gray-50/60 border-gray-100 hover:bg-white hover:border-indigo-100 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                                isTop1
                                  ? "bg-amber-500 text-white"
                                  : isTop2
                                    ? "bg-slate-400 text-white"
                                    : isTop3
                                      ? "bg-orange-400 text-white"
                                      : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-base text-gray-900 capitalize truncate min-w-0">
                              {item.word}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/80 flex-shrink-0">
                            {item.count} hits
                          </span>
                        </div>

                        {/* Frequency bar */}
                        <div className="w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTop1
                                ? "bg-amber-500"
                                : isTop2
                                  ? "bg-slate-500"
                                  : isTop3
                                    ? "bg-orange-500"
                                    : "bg-indigo-600"
                            }`}
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Frequency Analysis (Book Specific) */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-gray-100 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-indigo-600" />
                    <h2 className="text-lg font-bold text-gray-900">
                      Corpus Frequency Analysis
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Analyze top recurring words within a specific volume.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative min-w-[220px]">
                    <select
                      value={selectedBook}
                      onChange={(e) => setSelectedBook(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-bold text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {bookStats.map((book) => (
                        <option key={book.name} value={book.name}>
                          {book.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
                    <span className="font-bold text-gray-500 whitespace-nowrap">
                      Threshold (N):
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={topN}
                      onChange={(e) =>
                        setTopN(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-12 bg-white px-2 py-1 rounded-lg text-xs font-bold text-gray-800 text-center border border-gray-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Active Book Quick Header */}
              {currentBookStat && (
                <div className="mb-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-600 text-white flex-shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-indigo-950 truncate max-w-md">
                        {currentBookStat.name}
                      </h3>
                      <p className="text-xs text-indigo-700">
                        Total {currentBookStat.totalWords} words across{" "}
                        {currentBookStat.totalPages} pages
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/book/${encodeURIComponent(currentBookStat.name)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs hover:shadow-xs transition-all"
                  >
                    Open Book
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )}

              {loadingTopWords ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2
                    className="animate-spin text-indigo-600 mb-3"
                    size={32}
                  />
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                    Analyzing book lexicon...
                  </p>
                </div>
              ) : topWords.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                  <p className="text-gray-500 font-medium text-sm">
                    No vocabulary data indexed for this book.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {topWords.slice(0, topN).map((item, idx) => (
                    <div
                      key={item.word}
                      className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:border-indigo-200 hover:bg-white transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                          {item.count} time{item.count > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 capitalize truncate mb-1">
                        {item.word}
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">
                        {currentBookStat && currentBookStat.totalWords > 0
                          ? `${Math.round((item.count / currentBookStat.totalWords) * 100)}% of volume`
                          : "Frequent entry"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4. Corpus Distribution (With Overflow Bug Fixed & Structured Cards) */}
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Corpus Breakdown
                  </h2>
                  <p className="text-xl font-extrabold text-gray-900">
                    Library Volumes ({filteredAndSortedBooks.length} of{" "}
                    {bookStats.length})
                  </p>
                </div>

                {/* Search & Sort Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px]">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      placeholder="Filter books..."
                      className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 shadow-2xs">
                    <ArrowUpDown size={14} className="text-gray-400" />
                    <span>Sort:</span>
                    <select
                      value={bookSortBy}
                      onChange={(e) =>
                        setBookSortBy(
                          e.target.value as
                            | "words"
                            | "pages"
                            | "density"
                            | "name",
                        )
                      }
                      className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer"
                    >
                      <option value="words">Most Words</option>
                      <option value="pages">Most Pages</option>
                      <option value="density">Density</option>
                      <option value="name">Title</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredAndSortedBooks.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                  <p className="text-gray-500 font-medium text-sm">
                    {bookSearchQuery.trim()
                      ? `No books match "${bookSearchQuery}".`
                      : "No books detected in storage."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedBooks.map((book) => {
                    const relativePct = Math.min(
                      Math.round((book.totalWords / maxWordsInAnyBook) * 100),
                      100,
                    );
                    const density =
                      book.totalPages > 0
                        ? Math.round(book.totalWords / book.totalPages)
                        : 0;

                    return (
                      <Link
                        key={book.name}
                        href={`/book/${encodeURIComponent(book.name)}`}
                        className="group flex flex-col justify-between bg-white p-6 sm:p-7 rounded-2xl border border-gray-200/90 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 min-w-0 overflow-hidden"
                      >
                        <div>
                          {/* Card Header Row with min-w-0 to prevent title overflow */}
                          <div className="flex items-start justify-between gap-3 mb-5 min-w-0">
                            <div className="min-w-0 flex-1">
                              <h3
                                className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 break-words line-clamp-2"
                                title={book.name}
                              >
                                {book.name}
                              </h3>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Library Volume
                              </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                              <Book size={18} />
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-gray-500">
                                Vocabulary Size
                              </span>
                              <span className="text-gray-900 font-extrabold">
                                {book.totalWords} words
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-500 group-hover:bg-indigo-500"
                                style={{
                                  width: `${Math.max(relativePct, 3)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Metrics Boxes */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                Density
                              </div>
                              <div className="text-base font-black text-gray-900">
                                {density}{" "}
                                <span className="text-[10px] text-gray-400 font-medium">
                                  words/page
                                </span>
                              </div>
                            </div>

                            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                Volume
                              </div>
                              <div className="text-base font-black text-gray-900">
                                {book.totalPages}{" "}
                                <span className="text-[10px] text-gray-400 font-medium">
                                  pages
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer Link */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                          <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
                            Explore Vocabulary
                          </span>
                          <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                            <ChevronRight
                              size={14}
                              className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
