"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  Pencil,
  Info,
  Loader2,
  Search,
  ChevronRight,
  Sparkles,
  Trophy,
  BookOpen,
  Music,
  Film,
  Layers,
} from "lucide-react";
import Navbar from "@/components/Navbar";

interface MediaItemStats {
  name: string;
  totalWords: number;
  totalPages: number;
  type: "book" | "song" | "movie";
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
  const [mediaStats, setMediaStats] = useState<MediaItemStats[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
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
  const [mediaTypeFilter, setMediaTypeFilter] = useState<
    "all" | "book" | "song" | "movie"
  >("all");
  const [mediaSearchQuery, setMediaSearchQuery] = useState<string>("");
  const [mediaSortBy, setMediaSortBy] = useState<"words" | "pages" | "name">(
    "words",
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        const [booksResponse, songsResponse, moviesResponse] =
          await Promise.all([
            fetch("/api/books"),
            fetch("/api/songs"),
            fetch("/api/movies"),
          ]);

        const [booksData, songsData, moviesData] = await Promise.all([
          booksResponse.json(),
          songsResponse.json(),
          moviesResponse.json(),
        ]);

        if (!isMounted) return;

        const stats: MediaItemStats[] = [];
        const allWordsEntries: RawWordItem[] = [];

        // 1. Process Books
        if (booksData.success && Array.isArray(booksData.books)) {
          for (const book of booksData.books) {
            try {
              const wordsRes = await fetch(
                `/api/words?bookName=${encodeURIComponent(book)}`,
              );
              const wordsData = await wordsRes.json();

              if (wordsData.success && Array.isArray(wordsData.data)) {
                let totalWords = 0;
                const totalPages = wordsData.data.length;

                wordsData.data.forEach((page: RawPageItem) => {
                  if (Array.isArray(page.words)) {
                    totalWords += page.words.length;
                    allWordsEntries.push(...page.words);
                  }
                });
                stats.push({
                  name: book,
                  totalWords,
                  totalPages,
                  type: "book",
                });
              }
            } catch {
              console.error(`Error fetching stats for book: ${book}`);
            }
          }
        }

        // 2. Process Songs
        if (songsData.success && Array.isArray(songsData.songs)) {
          for (const song of songsData.songs) {
            try {
              const wordsRes = await fetch(
                `/api/songs/words?songName=${encodeURIComponent(song.name)}`,
              );
              const wordsData = await wordsRes.json();

              if (wordsData.success && Array.isArray(wordsData.data)) {
                const wordsList: RawWordItem[] = wordsData.data;
                allWordsEntries.push(...wordsList);
                stats.push({
                  name: song.name,
                  totalWords: wordsList.length,
                  totalPages: 0,
                  type: "song",
                });
              }
            } catch {
              console.error(`Error fetching stats for song: ${song.name}`);
            }
          }
        }

        // 3. Process Movies
        if (moviesData.success && Array.isArray(moviesData.movies)) {
          for (const movie of moviesData.movies) {
            try {
              const wordsRes = await fetch(
                `/api/movies/words?movieName=${encodeURIComponent(movie.name)}`,
              );
              const wordsData = await wordsRes.json();

              if (wordsData.success && Array.isArray(wordsData.data)) {
                const wordsList: RawWordItem[] = wordsData.data;
                allWordsEntries.push(...wordsList);
                stats.push({
                  name: movie.name,
                  totalWords: wordsList.length,
                  totalPages: 0,
                  type: "movie",
                });
              }
            } catch {
              console.error(`Error fetching stats for movie: ${movie.name}`);
            }
          }
        }

        if (stats.length > 0) {
          setSelectedItem((prev) => prev || stats[0].name);
        }

        // Calculate Global Top Words across all collections
        const wordCounts: Record<string, number> = {};
        const canonicalMap: Record<string, string> = {};

        allWordsEntries.forEach((item) => {
          const mainWord = item.word.toLowerCase().trim();
          const variations = (item.variations || []).map((v) =>
            v.toLowerCase().trim(),
          );
          const allForms = [mainWord, ...variations];

          let canonical = allForms.find((f) => canonicalMap[f]);
          if (!canonical) canonical = mainWord;
          else canonical = canonicalMap[canonical];

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
        setMediaStats(stats.sort((a, b) => b.totalWords - a.totalWords));
      } catch {
        if (isMounted) {
          setMessage("Error loading analytics");
          setMessageType("error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch words for selected individual item
  useEffect(() => {
    if (!selectedItem) return;
    let isMounted = true;

    async function loadSelectedItemWords() {
      setLoadingTopWords(true);
      const target = mediaStats.find((m) => m.name === selectedItem);
      const itemType = target?.type || "book";

      try {
        let endpoint = `/api/words?bookName=${encodeURIComponent(selectedItem)}`;
        if (itemType === "song") {
          endpoint = `/api/songs/words?songName=${encodeURIComponent(selectedItem)}`;
        } else if (itemType === "movie") {
          endpoint = `/api/movies/words?movieName=${encodeURIComponent(selectedItem)}`;
        }

        const response = await fetch(endpoint);
        const data = await response.json();

        if (!isMounted) return;

        if (data.success && Array.isArray(data.data)) {
          const wordCounts: Record<string, number> = {};
          const canonicalMap: Record<string, string> = {};

          let wordsList: RawWordItem[] = [];
          if (itemType === "book") {
            data.data.forEach((p: RawPageItem) => {
              if (Array.isArray(p.words)) wordsList.push(...p.words);
            });
          } else {
            wordsList = data.data;
          }

          wordsList.forEach((item) => {
            const mainWord = item.word.toLowerCase().trim();
            const variations = (item.variations || []).map((v) =>
              v.toLowerCase().trim(),
            );
            const allForms = [mainWord, ...variations];

            let canonical = allForms.find((f) => canonicalMap[f]);
            if (!canonical) canonical = mainWord;
            else canonical = canonicalMap[canonical];

            allForms.forEach((f) => {
              canonicalMap[f] = canonical!;
            });
          });

          wordsList.forEach((item) => {
            const mainWord = item.word.toLowerCase().trim();
            const canonical = canonicalMap[mainWord] || mainWord;
            wordCounts[canonical] = (wordCounts[canonical] || 0) + 1;
          });

          const sortedWords = Object.entries(wordCounts)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count);

          setTopWords(sortedWords);
        }
      } catch (err) {
        console.error("Error fetching top words for item:", err);
      } finally {
        if (isMounted) setLoadingTopWords(false);
      }
    }

    void loadSelectedItemWords();
    return () => {
      isMounted = false;
    };
  }, [selectedItem, mediaStats]);

  // Overall statistics
  const overallStats = useMemo(() => {
    let totalBooks = 0;
    let totalSongs = 0;
    let totalMovies = 0;
    let totalWords = 0;
    let totalPages = 0;

    mediaStats.forEach((stat) => {
      totalWords += stat.totalWords;
      totalPages += stat.totalPages;
      if (stat.type === "book") totalBooks++;
      else if (stat.type === "song") totalSongs++;
      else if (stat.type === "movie") totalMovies++;
    });

    return { totalBooks, totalSongs, totalMovies, totalWords, totalPages };
  }, [mediaStats]);

  // Filter and sort items for Corpus Distribution
  const filteredAndSortedMedia = useMemo(() => {
    let result = [...mediaStats];

    if (mediaTypeFilter !== "all") {
      result = result.filter((m) => m.type === mediaTypeFilter);
    }

    if (mediaSearchQuery.trim()) {
      const q = mediaSearchQuery.toLowerCase().trim();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (mediaSortBy === "words") return b.totalWords - a.totalWords;
      if (mediaSortBy === "pages") return b.totalPages - a.totalPages;
      if (mediaSortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [mediaStats, mediaTypeFilter, mediaSearchQuery, mediaSortBy]);

  const maxGlobalCount =
    globalTopWords.length > 0 ? globalTopWords[0].count : 1;
  const maxWordsInAnyItem = useMemo(() => {
    if (mediaStats.length === 0) return 1;
    return Math.max(...mediaStats.map((b) => b.totalWords), 1);
  }, [mediaStats]);

  const currentItemStat = useMemo(() => {
    return mediaStats.find((b) => b.name === selectedItem);
  }, [mediaStats, selectedItem]);

  const maxItemWordCount = topWords.length > 0 ? topWords[0].count : 1;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
        {/* Header Section */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Zap size={14} className="text-indigo-600" />
            <span>Multimedia Vocabulary Intelligence</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
                Analytics & Insights
              </h1>
              <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-2xl">
                Analyze vocabulary patterns across Books, Songs, and Movies,
                identify frequent terminology, and explore linguistic trends.
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
                href="/song-list"
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Music size={14} className="text-indigo-600" />
                Songs
              </Link>
              <Link
                href="/movie-list"
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Film size={14} className="text-purple-600" />
                Movies
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
              Indexing multimedia library analytics...
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
                    label: "Books",
                    value: overallStats.totalBooks,
                    desc: `${overallStats.totalPages} pages cataloged`,
                    icon: <BookOpen size={22} className="text-blue-600" />,
                    bg: "bg-blue-50 border-blue-100",
                    href: "/book-list",
                  },
                  {
                    label: "Songs",
                    value: overallStats.totalSongs,
                    desc: "Music & lyric archives",
                    icon: <Music size={22} className="text-emerald-600" />,
                    bg: "bg-emerald-50 border-emerald-100",
                    href: "/song-list",
                  },
                  {
                    label: "Movies",
                    value: overallStats.totalMovies,
                    desc: "Cinema & screen dialogue",
                    icon: <Film size={22} className="text-purple-600" />,
                    bg: "bg-purple-50 border-purple-100",
                    href: "/movie-list",
                  },
                  {
                    label: "Total Vocabulary",
                    value: overallStats.totalWords,
                    desc: "Across all collections",
                    icon: <Sparkles size={22} className="text-amber-600" />,
                    bg: "bg-amber-50 border-amber-100",
                    href: "#leaderboard",
                  },
                ].map((card, idx) => (
                  <Link
                    key={idx}
                    href={card.href}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs hover:shadow-md transition-all group block"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl border ${card.bg}`}>
                        {card.icon}
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight">
                      {card.value}
                    </div>
                    <div className="text-sm font-bold text-gray-800 mt-1">
                      {card.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {card.desc}
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* 2. Global Leaderboard Section */}
            <section
              id="leaderboard"
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                    <Trophy size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Global Vocabulary Leaderboard
                    </h3>
                    <p className="text-xs text-gray-500">
                      Most recurring terminology unified across Books, Songs,
                      and Movies.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">
                    Show top:
                  </span>
                  {[5, 10, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGlobalTopN(n)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        globalTopN === n
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {globalTopWords.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No vocabulary recorded in library yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {globalTopWords.slice(0, globalTopN).map((item, idx) => {
                    const pct = Math.round((item.count / maxGlobalCount) * 100);
                    return (
                      <div
                        key={item.word}
                        className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              idx === 0
                                ? "bg-amber-100 text-amber-800"
                                : idx === 1
                                  ? "bg-gray-200 text-gray-800"
                                  : idx === 2
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-white text-gray-500"
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span className="font-extrabold text-sm text-gray-900 capitalize truncate">
                            {item.word}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 flex-1 max-w-xs">
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-indigo-700 whitespace-nowrap min-w-[50px] text-right">
                            {item.count} time{item.count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Corpus Distribution Table with Filter Tabs and Sorting */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Corpus Distribution & Density
                  </h3>
                  <p className="text-xs text-gray-500">
                    Compare vocabulary density across your library items.
                  </p>
                </div>

                {/* Filter, Sort, and Search Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Media Type Filter */}
                  <div className="inline-flex p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs">
                    {(["all", "book", "song", "movie"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setMediaTypeFilter(t)}
                        className={`px-3 py-1.5 rounded-lg font-extrabold capitalize transition-all cursor-pointer ${
                          mediaTypeFilter === t
                            ? "bg-white text-indigo-700 shadow-2xs"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {t === "all" ? "All" : t + "s"}
                      </button>
                    ))}
                  </div>

                  {/* Sort Selector */}
                  <select
                    value={mediaSortBy}
                    onChange={(e) =>
                      setMediaSortBy(
                        e.target.value as "words" | "pages" | "name",
                      )
                    }
                    className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="words">Sort: Words (Highest)</option>
                    <option value="pages">Sort: Pages (Highest)</option>
                    <option value="name">Sort: Title (A-Z)</option>
                  </select>

                  {/* Search box */}
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={14}
                    />
                    <input
                      type="text"
                      value={mediaSearchQuery}
                      onChange={(e) => setMediaSearchQuery(e.target.value)}
                      placeholder="Filter title..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Distribution Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider">
                      <th className="pb-3">Title & Media</th>
                      <th className="pb-3 text-right">Words</th>
                      <th className="pb-3 text-right">Pages</th>
                      <th className="pb-3 text-right">Relative Volume</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredAndSortedMedia.map((item) => {
                      const pct = Math.round(
                        (item.totalWords / maxWordsInAnyItem) * 100,
                      );
                      const itemLink =
                        item.type === "song"
                          ? `/song/${encodeURIComponent(item.name)}`
                          : item.type === "movie"
                            ? `/movie/${encodeURIComponent(item.name)}`
                            : `/book/${encodeURIComponent(item.name)}`;

                      return (
                        <tr
                          key={item.name}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
                                {item.type === "song" ? (
                                  <Music
                                    size={14}
                                    className="text-indigo-600"
                                  />
                                ) : item.type === "movie" ? (
                                  <Film size={14} className="text-purple-600" />
                                ) : (
                                  <BookOpen
                                    size={14}
                                    className="text-blue-600"
                                  />
                                )}
                              </span>
                              <div>
                                <span className="font-bold text-gray-900 block capitalize">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase font-extrabold">
                                  {item.type}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 text-right font-extrabold text-gray-900">
                            {item.totalWords}
                          </td>

                          <td className="py-3.5 text-right text-gray-500 font-semibold">
                            {item.totalPages > 0
                              ? item.totalPages
                              : "Single Page"}
                          </td>

                          <td className="py-3.5 text-right pl-6">
                            <div className="inline-flex items-center gap-2 w-32">
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 text-right pl-4">
                            <Link
                              href={itemLink}
                              className="text-indigo-600 hover:text-indigo-800 font-extrabold inline-flex items-center gap-1"
                            >
                              Open
                              <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Individual Collection Deep Dive */}
            {mediaStats.length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                      <Layers size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Collection Deep Dive
                      </h3>
                      <p className="text-xs text-gray-500">
                        Analyze word frequencies within a specific book, song,
                        or movie.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      {mediaStats.map((item) => (
                        <option key={item.name} value={item.name}>
                          [{item.type.toUpperCase()}] {item.name} (
                          {item.totalWords} words)
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      {[5, 10, 20].map((n) => (
                        <button
                          key={n}
                          onClick={() => setTopN(n)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            topN === n
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {loadingTopWords ? (
                  <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Loader2
                      size={16}
                      className="animate-spin text-indigo-600"
                    />
                    <span>Loading word frequencies...</span>
                  </div>
                ) : topWords.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No words recorded in {currentItemStat?.name || "this item"}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topWords.slice(0, topN).map((item, idx) => {
                      const pct = Math.round(
                        (item.count / maxItemWordCount) * 100,
                      );
                      return (
                        <div
                          key={item.word}
                          className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
                              #{idx + 1}
                            </span>
                            <span className="font-extrabold text-sm text-gray-900 capitalize truncate">
                              {item.word}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 flex-1 max-w-xs">
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-indigo-700 whitespace-nowrap min-w-[50px] text-right">
                              {item.count} time{item.count === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
