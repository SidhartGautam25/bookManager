"use client";

import { useState, useEffect } from "react";
import { Book, FileText, Zap, Pencil, BarChart2, Info, Loader2, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";

interface BookStats {
  name: string;
  totalWords: number;
  totalPages: number;
}

export default function AnalyticsPage() {
  const [bookStats, setBookStats] = useState<BookStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const booksResponse = await fetch("/api/books");
        const booksData = await booksResponse.json();

        if (booksData.success) {
          const stats: BookStats[] = [];
          for (const book of booksData.books) {
            try {
              const wordsResponse = await fetch(
                `/api/words?bookName=${encodeURIComponent(book)}`,
              );
              const wordsData = await wordsResponse.json();

              if (wordsData.success) {
                let totalWords = 0;
                let totalPages = 0;

                if (wordsData.data && Array.isArray(wordsData.data)) {
                  totalPages = wordsData.data.length;
                  wordsData.data.forEach(
                    (page: {
                      words: Array<{ word: string; meaning: string }>;
                    }) => {
                      totalWords += page.words.length;
                    },
                  );
                }
                stats.push({ name: book, totalWords, totalPages });
              }
            } catch {
              console.error(`Error fetching stats for book: ${book}`);
            }
          }
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

  const calculateOverallStats = () => {
    const totalBooks = bookStats.length;
    let totalWords = 0;
    let totalPages = 0;
    let averageWordsPerBook = 0;

    bookStats.forEach((stat) => {
      totalWords += stat.totalWords;
      totalPages += stat.totalPages;
    });

    if (totalBooks > 0) {
      averageWordsPerBook = Math.round(totalWords / totalBooks);
    }

    return { totalBooks, totalWords, totalPages, averageWordsPerBook };
  };

  const stats = calculateOverallStats();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Analytics Dashboard</h1>
            <p className="text-gray-500 mt-2 font-medium">Insights into your vocabulary growth and progress.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <TrendingUp size={18} />
            Keep it up!
          </div>
        </header>

        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${messageType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
            }`}>
            <Info size={20} />
            <span className="font-semibold text-sm">{message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="text-gray-500 font-bold animate-pulse text-lg">Analyzing your data...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Overall Statistics Grid */}
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 mb-6 flex items-center gap-2">
                <BarChart2 size={14} /> Overall Performance
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Books", value: stats.totalBooks, icon: <Book size={20} />, color: "bg-blue-500" },
                  { label: "Total Words", value: stats.totalWords, icon: <Pencil size={20} />, color: "bg-indigo-500" },
                  { label: "Total Pages", value: stats.totalPages, icon: <FileText size={20} />, color: "bg-amber-500" },
                  { label: "Avg Words/Book", value: stats.averageWordsPerBook, icon: <Zap size={20} />, color: "bg-emerald-500" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className={`${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-${stat.color.split('-')[1]}-100`}>
                      {stat.icon}
                    </div>
                    <div className="text-3xl font-black text-gray-900">{stat.value}</div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Books Breakdown */}
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 mb-6 flex items-center gap-2">
                <Library size={14} /> Books Breakdown
              </h2>
              {bookStats.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 font-medium">No data available. Add words to see the breakdown!</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-black text-gray-500 uppercase tracking-widest">
                          <th className="px-8 py-5">Book Name</th>
                          <th className="px-8 py-5">Total Words</th>
                          <th className="px-8 py-5 text-center">Total Pages</th>
                          <th className="px-8 py-5 text-right">Avg Words/Page</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bookStats.map((book) => (
                          <tr key={book.name} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="px-8 py-5">
                              <span className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{book.name}</span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <span className="font-mono font-bold text-gray-600 w-8">{book.totalWords}</span>
                                <div className="flex-1 min-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${Math.min((book.totalWords / (stats.totalWords || 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center font-bold text-gray-500">
                              {book.totalPages}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg font-black text-sm group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                                {book.totalPages > 0 ? Math.round(book.totalWords / book.totalPages) : 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

// Added extra Lucide import for the section headers
import { Library } from "lucide-react";