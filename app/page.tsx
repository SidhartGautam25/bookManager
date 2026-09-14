"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  PlusCircle,
  Search,
  ArrowRight,
  Sparkles,
  BookMarked,
  FileText,
  ChevronRight,
  TrendingUp,
  Bookmark,
  Music,
  Film,
  Compass,
} from "lucide-react";
import Navbar from "@/components/Navbar";

interface MediaSummary {
  name: string;
  totalWords: number;
  totalPages?: number;
  type: "book" | "song" | "movie";
}

interface QuickSearchWordResult {
  word: string;
  totalFrequency: number;
  booksCount: number;
  songsCount: number;
  moviesCount: number;
}

export default function Home() {
  const router = useRouter();
  const [bookSummaries, setBookSummaries] = useState<MediaSummary[]>([]);
  const [songSummaries, setSongSummaries] = useState<MediaSummary[]>([]);
  const [movieSummaries, setMovieSummaries] = useState<MediaSummary[]>([]);
  const [activeVaultTab, setActiveVaultTab] = useState<
    "books" | "songs" | "movies"
  >("books");

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResult, setSearchResult] =
    useState<QuickSearchWordResult | null>(null);
  const [isSearchingWord, setIsSearchingWord] = useState<boolean>(false);
  const [searchedWordAttempted, setSearchedWordAttempted] =
    useState<boolean>(false);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [booksRes, songsRes, moviesRes] = await Promise.all([
          fetch("/api/books"),
          fetch("/api/songs"),
          fetch("/api/movies"),
        ]);

        const [booksData, songsData, moviesData] = await Promise.all([
          booksRes.json(),
          songsRes.json(),
          moviesRes.json(),
        ]);

        // Process Books
        if (booksData.success && Array.isArray(booksData.books)) {
          const summaries: MediaSummary[] = await Promise.all(
            booksData.books.map(async (bookName: string) => {
              try {
                const wordsRes = await fetch(
                  `/api/words?bookName=${encodeURIComponent(bookName)}`,
                );
                const wordsData = await wordsRes.json();
                if (wordsData.success && Array.isArray(wordsData.data)) {
                  let totalWords = 0;
                  const totalPages = wordsData.data.length;
                  wordsData.data.forEach((p: { words?: unknown[] }) => {
                    totalWords += p.words ? p.words.length : 0;
                  });
                  return {
                    name: bookName,
                    totalWords,
                    totalPages,
                    type: "book" as const,
                  };
                }
              } catch (e) {
                console.error(`Error loading words for ${bookName}:`, e);
              }
              return {
                name: bookName,
                totalWords: 0,
                totalPages: 0,
                type: "book" as const,
              };
            }),
          );
          setBookSummaries(summaries);
        }

        // Process Songs
        if (songsData.success && Array.isArray(songsData.songs)) {
          setSongSummaries(
            songsData.songs.map((s: { name: string; totalWords: number }) => ({
              name: s.name,
              totalWords: s.totalWords,
              type: "song" as const,
            })),
          );
        }

        // Process Movies
        if (moviesData.success && Array.isArray(moviesData.movies)) {
          setMovieSummaries(
            moviesData.movies.map(
              (m: { name: string; totalWords: number }) => ({
                name: m.name,
                totalWords: m.totalWords,
                type: "movie" as const,
              }),
            ),
          );
        }
      } catch (err) {
        console.error("Error loading library data:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchAllData();
  }, []);

  // Quick cross-media word lookup handler
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingWord(true);
      try {
        const res = await fetch(
          `/api/words/stats?word=${encodeURIComponent(trimmed)}`,
        );
        const data = await res.json();
        setSearchedWordAttempted(true);
        if (data.success && data.found && data.data) {
          setSearchResult({
            word: data.data.word,
            totalFrequency: data.data.totalFrequency,
            booksCount: data.data.books?.length || 0,
            songsCount: data.data.songs?.length || 0,
            moviesCount: data.data.movies?.length || 0,
          });
        } else {
          setSearchResult(null);
        }
      } catch (err) {
        console.error("Quick search error:", err);
        setSearchResult(null);
      } finally {
        setIsSearchingWord(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalBooks = bookSummaries.length;
    const totalSongs = songSummaries.length;
    const totalMovies = movieSummaries.length;

    let bookWords = 0;
    let totalPages = 0;
    bookSummaries.forEach((b) => {
      bookWords += b.totalWords;
      totalPages += b.totalPages || 0;
    });

    const songWords = songSummaries.reduce((sum, s) => sum + s.totalWords, 0);
    const movieWords = movieSummaries.reduce((sum, m) => sum + m.totalWords, 0);
    const totalWords = bookWords + songWords + movieWords;

    return { totalBooks, totalSongs, totalMovies, totalPages, totalWords };
  }, [bookSummaries, songSummaries, movieSummaries]);

  // Filter items for active tab
  const activeCollection = useMemo(() => {
    let source = bookSummaries;
    if (activeVaultTab === "songs") source = songSummaries;
    else if (activeVaultTab === "movies") source = movieSummaries;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return source;
    return source.filter((item) => item.name.toLowerCase().includes(q));
  }, [
    activeVaultTab,
    bookSummaries,
    songSummaries,
    movieSummaries,
    searchQuery,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white rounded-3xl p-8 sm:p-12 lg:p-16 border border-gray-100 shadow-sm">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-gradient-to-br from-indigo-100/50 to-purple-100/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-24 w-80 h-80 bg-gradient-to-tr from-blue-50/70 to-indigo-50/50 rounded-full blur-2xl pointer-events-none" />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles size={14} className="text-indigo-600" />
              <span>Personal Multimedia Lexicon</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.15] mb-6">
              Organize and master words across{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
                Books, Songs & Movies.
              </span>
            </h1>

            <p className="text-gray-600 text-lg sm:text-xl font-normal leading-relaxed mb-8 max-w-2xl">
              Catalog vocabulary while reading, listening, or watching. Enjoy
              pageless fast dumps for music & cinema, page citations for books,
              and unified dictionary enrichment.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 mb-10">
              <Link
                href="/add-word"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 transition-all transform active:scale-98"
              >
                <PlusCircle size={18} />
                <span>Add New Word</span>
              </Link>

              <Link
                href="/book-list"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-bold rounded-xl transition-all"
              >
                <BookOpen size={17} className="text-gray-600" />
                <span>Books</span>
              </Link>

              <Link
                href="/song-list"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-bold rounded-xl transition-all"
              >
                <Music size={17} className="text-indigo-600" />
                <span>Songs</span>
              </Link>

              <Link
                href="/movie-list"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-bold rounded-xl transition-all"
              >
                <Film size={17} className="text-purple-600" />
                <span>Movies</span>
              </Link>
            </div>

            {/* Quick Word & Media Search */}
            <div className="pt-6 border-t border-gray-100">
              <label
                htmlFor="library-search"
                className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2"
              >
                Instant Lexicon & Media Search
              </label>
              <div className="relative max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Search size={18} />
                </div>
                <input
                  id="library-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (!val.trim()) {
                      setSearchResult(null);
                      setSearchedWordAttempted(false);
                    }
                  }}
                  placeholder="Search for a word, book, song, or movie..."
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white text-gray-900 placeholder-gray-400 rounded-2xl border border-gray-200/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium"
                />
              </div>

              {/* Instant Search Feedback */}
              {searchQuery.trim() && (
                <div className="mt-3 max-w-xl">
                  {isSearchingWord ? (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 font-medium flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600" />
                      Searching dictionary & cross-media archives...
                    </div>
                  ) : searchResult ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-900 text-base capitalize">
                            {searchResult.word}
                          </span>
                          <span className="bg-emerald-200/60 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {searchResult.totalFrequency} occurrence
                            {searchResult.totalFrequency > 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Found in {searchResult.booksCount} book
                          {searchResult.booksCount === 1 ? "" : "s"},{" "}
                          {searchResult.songsCount} song
                          {searchResult.songsCount === 1 ? "" : "s"}, and{" "}
                          {searchResult.moviesCount} movie
                          {searchResult.moviesCount === 1 ? "" : "s"}.
                        </p>
                      </div>
                      <Link
                        href="/analytics"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs hover:shadow-xs transition-all"
                      >
                        Inspect
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  ) : searchedWordAttempted ? (
                    <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          Word &quot;{searchQuery.trim()}&quot; is not yet in
                          your library.
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Capture it now into Books, Songs, or Movies with
                          automated definitions.
                        </p>
                      </div>
                      <button
                        onClick={() => router.push("/add-word")}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                      >
                        <PlusCircle size={14} />
                        Add Word
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Dynamic Metric Cards */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
                Library Metrics
              </h2>
              <p className="text-xl font-extrabold text-gray-900">
                Overview at a Glance
              </p>
            </div>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Full Analytics
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                label: "Books Vault",
                value: loading ? "—" : stats.totalBooks,
                desc: `${stats.totalPages} pages cataloged`,
                icon: <BookOpen size={22} />,
                bg: "bg-indigo-50 text-indigo-600",
                href: "/book-list",
              },
              {
                label: "Songs Vault",
                value: loading ? "—" : stats.totalSongs,
                desc: "Tracks and lyrical logs",
                icon: <Music size={22} />,
                bg: "bg-emerald-50 text-emerald-600",
                href: "/song-list",
              },
              {
                label: "Movies Vault",
                value: loading ? "—" : stats.totalMovies,
                desc: "Cinema & screen dialogue",
                icon: <Film size={22} />,
                bg: "bg-purple-50 text-purple-600",
                href: "/movie-list",
              },
              {
                label: "Total Lexicon",
                value: loading ? "—" : stats.totalWords,
                desc: "Enriched vocabulary items",
                icon: <Bookmark size={22} />,
                bg: "bg-amber-50 text-amber-600",
                href: "/analytics",
              },
            ].map((stat, idx) => (
              <Link
                key={idx}
                href={stat.href}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs hover:shadow-md hover:border-indigo-100 transition-all duration-200 group block"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bg}`}>{stat.icon}</div>
                  <ChevronRight
                    size={14}
                    className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-gray-800 mt-1">
                  {stat.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{stat.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Media Collections Tabbed Showcase */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
                Explore Collections
              </h2>
              <p className="text-xl font-extrabold text-gray-900">
                Your Vocabulary Archives
              </p>
            </div>

            {/* Media Selector Tabs */}
            <div className="inline-flex p-1 rounded-2xl bg-white border border-gray-200 shadow-2xs gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveVaultTab("books")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeVaultTab === "books"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <BookOpen size={14} />
                <span>Books ({bookSummaries.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVaultTab("songs")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeVaultTab === "songs"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Music size={14} />
                <span>Songs ({songSummaries.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVaultTab("movies")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeVaultTab === "movies"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Film size={14} />
                <span>Movies ({movieSummaries.length})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs animate-pulse space-y-4"
                >
                  <div className="h-10 w-10 bg-gray-100 rounded-xl" />
                  <div className="h-5 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-50 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeCollection.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 px-6 space-y-3">
              <div className="bg-indigo-50 p-4 rounded-full inline-flex text-indigo-600">
                {activeVaultTab === "songs" ? (
                  <Music size={36} />
                ) : activeVaultTab === "movies" ? (
                  <Film size={36} />
                ) : (
                  <BookOpen size={36} />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                No {activeVaultTab} logged yet
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto text-xs">
                Start adding words from your favorite {activeVaultTab} with
                smart batch dump.
              </p>
              <div className="pt-2">
                <Link
                  href="/add-word"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  <PlusCircle size={15} />
                  Add to {activeVaultTab.slice(0, -1)}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCollection.slice(0, 6).map((item) => {
                const itemHref =
                  item.type === "song"
                    ? `/song/${encodeURIComponent(item.name)}`
                    : item.type === "movie"
                      ? `/movie/${encodeURIComponent(item.name)}`
                      : `/book/${encodeURIComponent(item.name)}`;

                return (
                  <Link
                    key={item.name}
                    href={itemHref}
                    className="group flex flex-col justify-between bg-white p-6 rounded-2xl shadow-2xs border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                          {item.type === "song" ? (
                            <Music size={22} />
                          ) : item.type === "movie" ? (
                            <Film size={22} />
                          ) : (
                            <BookMarked size={22} />
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-full border border-indigo-100/50">
                          {item.totalWords} word
                          {item.totalWords === 1 ? "" : "s"}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1">
                        {item.name}
                      </h3>
                      {item.totalPages !== undefined && (
                        <p className="text-xs text-gray-500 font-medium">
                          {item.totalPages} page
                          {item.totalPages === 1 ? "" : "s"} indexed
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                      <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">
                        Open Vocabulary
                      </span>
                      <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
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

        {/* Feature Highlights Grid */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-2xs">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-2">
              Capabilities
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Designed for Depth Across Books, Songs & Cinema
            </h3>
            <p className="text-gray-500 text-sm sm:text-base mt-2">
              Capture vocabulary from your favorite reads, albums, and
              screenplays in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FileText size={24} className="text-indigo-600" />,
                title: "Pageless Batch Dump",
                description:
                  "Paste words directly for songs and movies without needing page numbers or extra hierarchy.",
              },
              {
                icon: <Sparkles size={24} className="text-emerald-600" />,
                title: "Smart Dictionary Fetch",
                description:
                  "Auto-populate substantive definitions and 2-3 contextual examples directly while importing.",
              },
              {
                icon: <TrendingUp size={24} className="text-purple-600" />,
                title: "Cross-Media Frequency",
                description:
                  "Detect recurring terminology across Books, Songs, and Movies with unified occurrence stats.",
              },
              {
                icon: <Compass size={24} className="text-amber-600" />,
                title: "Linguistic Intelligence",
                description:
                  "Access high-level analytics on vocabulary size, media density, and prominent vocabulary themes.",
              },
            ].map((feat, idx) => (
              <div key={idx} className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-2xs">
                  {feat.icon}
                </div>
                <h4 className="text-base font-bold text-gray-900">
                  {feat.title}
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Action Banner */}
        <section className="bg-gradient-to-r from-gray-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ready to catalog your vocabulary?
            </h3>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl">
              Add words to an existing volume, song, or film in seconds using
              Smart Batch Dump.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/add-word"
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-900/30"
            >
              Add Word
            </Link>
            <Link
              href="/song-list"
              className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-colors"
            >
              Song Vault
            </Link>
            <Link
              href="/movie-list"
              className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-colors"
            >
              Movie Vault
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1 rounded-md text-white">
              <BookMarked size={16} />
            </div>
            <span className="font-bold text-gray-800">
              Book<span className="text-indigo-600">Word</span>
            </span>
            <span>— Word Storage & Lexicon System</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/book-list"
              className="hover:text-indigo-600 transition-colors"
            >
              Books
            </Link>
            <Link
              href="/song-list"
              className="hover:text-indigo-600 transition-colors"
            >
              Songs
            </Link>
            <Link
              href="/movie-list"
              className="hover:text-indigo-600 transition-colors"
            >
              Movies
            </Link>
            <Link
              href="/add-word"
              className="hover:text-indigo-600 transition-colors"
            >
              Add Word
            </Link>
            <Link
              href="/analytics"
              className="hover:text-indigo-600 transition-colors"
            >
              Analytics
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
