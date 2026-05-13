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
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [topN, setTopN] = useState<number>(5);
  const [globalTopN, setGlobalTopN] = useState<number>(5);
  const [topWords, setTopWords] = useState<{ word: string; count: number }[]>([]);
  const [globalTopWords, setGlobalTopWords] = useState<{ word: string; count: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingTopWords, setLoadingTopWords] = useState<boolean>(false);
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
          const allWordsEntries: any[] = [];
          
          if (booksData.books.length > 0 && !selectedBook) {
            setSelectedBook(booksData.books[0]);
          }
          
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
                    (page: any) => {
                      totalWords += page.words.length;
                      allWordsEntries.push(...page.words);
                    },
                  );
                }
                stats.push({ name: book, totalWords, totalPages });
              }
            } catch {
              console.error(`Error fetching stats for book: ${book}`);
            }
          }

          // Calculate Global Top Words
          const wordCounts: Record<string, number> = {};
          const canonicalMap: Record<string, string> = {};

          allWordsEntries.forEach((item: any) => {
            const mainWord = item.word.toLowerCase().trim();
            const variations = (item.variations || []).map((v: string) => v.toLowerCase().trim());
            const allForms = [mainWord, ...variations];

            let canonical = allForms.find(f => canonicalMap[f]);
            if (!canonical) {
              canonical = mainWord;
            } else {
              canonical = canonicalMap[canonical];
            }
            allForms.forEach(f => {
              canonicalMap[f] = canonical!;
            });
          });

          allWordsEntries.forEach((item: any) => {
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
        const response = await fetch(`/api/words?bookName=${encodeURIComponent(selectedBook)}`);
        const data = await response.json();
        if (data.success) {
          const wordCounts: Record<string, number> = {};
          const canonicalMap: Record<string, string> = {};

          // First pass: build the canonical map for grouping variations
          data.data.forEach((page: any) => {
            page.words.forEach((item: any) => {
              const mainWord = item.word.toLowerCase().trim();
              const variations = (item.variations || []).map((v: string) => v.toLowerCase().trim());
              const allForms = [mainWord, ...variations];

              // Find if any form is already in the map
              let canonical = allForms.find(f => canonicalMap[f]);
              if (!canonical) {
                canonical = mainWord;
              } else {
                canonical = canonicalMap[canonical];
              }

              // Map all forms to this canonical form
              allForms.forEach(f => {
                canonicalMap[f] = canonical!;
              });
            });
          });

          // Second pass: count frequencies using the canonical map
          data.data.forEach((page: any) => {
            page.words.forEach((item: any) => {
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
    <div className="min-h-screen bg-[#030712] text-white selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-16">
        <header className="mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest mb-6">
            <Zap size={14} className="fill-current" /> System Insights
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              Analytics
            </span>
            <span className="text-indigo-500 block md:inline md:ml-4 font-serif italic text-4xl md:text-6xl opacity-80 underline decoration-indigo-500/30 underline-offset-8 font-light">
              Intelligence
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
            Deep dive into your vocabulary evolution. Track trends, identify core words, and visualize your linguistic journey.
          </p>
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
            <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
              <h2 className="text-[10px] uppercase tracking-[0.4em] font-black text-indigo-400/60 mb-8 px-1">
                Linguistic Metrics
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Books", value: stats.totalBooks, icon: <Book size={20} />, color: "from-blue-600 to-indigo-600" },
                  { label: "Total Words", value: stats.totalWords, icon: <Pencil size={20} />, color: "from-indigo-600 to-purple-600" },
                  { label: "Total Pages", value: stats.totalPages, icon: <FileText size={20} />, color: "from-amber-600 to-orange-600" },
                  { label: "Words Per Book", value: stats.averageWordsPerBook, icon: <Zap size={20} />, color: "from-emerald-600 to-cyan-600" },
                ].map((stat, i) => (
                  <div key={i} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition duration-500 blur-sm" />
                    <div className="relative bg-[#111827]/80 backdrop-blur-3xl p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden">
                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-full -mr-8 -mt-8 blur-2xl group-hover:opacity-[0.08] transition-opacity`} />
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-6 shadow-xl shadow-black/20 group-hover:scale-110 transition-transform duration-500`}>
                        {stat.icon}
                      </div>
                      <div className="text-4xl font-black text-white mb-1 group-hover:translate-x-1 transition-transform duration-500">{stat.value}</div>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Global Lexicon Section */}
            <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h2 className="text-[10px] uppercase tracking-[0.4em] font-black text-emerald-400/60 px-1">
                  Global Lexicon Ranking
                </h2>
                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Top N</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={globalTopN}
                    onChange={(e) => setGlobalTopN(parseInt(e.target.value) || 5)}
                    className="w-16 bg-transparent border-none outline-none text-white font-black text-center focus:ring-0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {globalTopWords.slice(0, globalTopN).map((item, idx) => (
                  <div key={item.word} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-[2.5rem] opacity-0 group-hover:opacity-20 transition duration-500 blur-md" />
                    <div className="relative bg-emerald-500/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-emerald-500/10 flex flex-col items-center text-center hover:bg-emerald-500/10 hover:-translate-y-2 transition-all duration-500">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-sm mb-6 shadow-lg shadow-emerald-500/20">
                        #{idx + 1}
                      </div>
                      <div className="text-2xl font-black capitalize mb-2 truncate w-full text-white group-hover:text-emerald-400 transition-colors">{item.word}</div>
                      <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">
                        Global Hits: {item.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Top Frequent Words Section */}
            <section className="animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
              <h2 className="text-[10px] uppercase tracking-[0.4em] font-black text-indigo-400/60 mb-8 px-1">
                Frequency Analysis
              </h2>
              <div className="bg-[#111827]/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-10 lg:p-14 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] -mr-64 -mt-64 rounded-full" />
                
                <div className="relative flex flex-col lg:flex-row gap-10 mb-16 items-center">
                  <div className="flex-1 space-y-3 w-full">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Target Corpus</label>
                    <select
                      value={selectedBook}
                      onChange={(e) => setSelectedBook(e.target.value)}
                      className="w-full px-8 py-5 rounded-3xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-indigo-500/50 transition-all outline-none font-bold text-white appearance-none cursor-pointer hover:bg-white/[0.08]"
                    >
                      {bookStats.map(book => (
                        <option key={book.name} value={book.name} className="bg-[#111827] text-white">{book.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full lg:w-48 space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Threshold (N)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={topN}
                      onChange={(e) => setTopN(parseInt(e.target.value) || 5)}
                      className="w-full px-8 py-5 rounded-3xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-indigo-500/50 transition-all outline-none font-bold text-white text-center hover:bg-white/[0.08]"
                    />
                  </div>
                </div>

                {loadingTopWords ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                    <p className="text-indigo-400/60 font-black text-[10px] uppercase tracking-widest">Scanning variations...</p>
                  </div>
                ) : topWords.length === 0 ? (
                  <div className="text-center py-24 rounded-3xl bg-white/[0.02] border border-white/5">
                    <p className="text-gray-500 font-bold">No vocabulary data indexed for this book.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {topWords.slice(0, topN).map((item, idx) => (
                      <div key={item.word} className="group relative">
                        <div className={`absolute -inset-0.5 bg-gradient-to-br ${
                          idx === 0 ? 'from-amber-500 to-orange-600' : 
                          idx === 1 ? 'from-slate-300 to-slate-500' :
                          idx === 2 ? 'from-orange-400 to-amber-700' :
                          'from-indigo-500 to-purple-600'
                        } rounded-[2.5rem] opacity-0 group-hover:opacity-20 transition duration-500 blur-md`} />
                        <div className="relative bg-white/[0.03] backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center hover:bg-white/[0.07] hover:-translate-y-2 transition-all duration-500">
                          <div className={`w-10 h-10 rounded-full ${
                            idx === 0 ? 'bg-amber-500 text-black' : 
                            idx === 1 ? 'bg-slate-300 text-black' :
                            idx === 2 ? 'bg-orange-400 text-black' :
                            'bg-white/10 text-white'
                          } flex items-center justify-center font-black text-sm mb-6 shadow-2xl`}>
                            {idx + 1}
                          </div>
                          <div className="text-2xl font-black capitalize mb-2 truncate w-full text-white">{item.word}</div>
                          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full">
                            Hits: {item.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Books Breakdown */}
            <section className="animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500 pb-20">
              <h2 className="text-[10px] uppercase tracking-[0.4em] font-black text-indigo-400/60 mb-8 px-1">
                Corpus Distribution
              </h2>
              {bookStats.length === 0 ? (
                <div className="bg-white/5 p-12 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                  <p className="text-gray-500 font-medium">No books detected in storage.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookStats.map((book) => (
                    <div key={book.name} className="group bg-white/[0.02] hover:bg-white/[0.05] p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all duration-500">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 mr-4">
                          <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors mb-1 truncate">{book.name}</h3>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Library Object</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Book size={18} />
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-gray-400">Vocabulary Size</span>
                            <span className="text-white">{book.totalWords} words</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min((book.totalWords / (stats.totalWords || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-4 rounded-2xl">
                            <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Density</div>
                            <div className="text-lg font-black text-white">{book.totalPages > 0 ? Math.round(book.totalWords / book.totalPages) : 0} <span className="text-[10px] text-gray-500 font-medium">w/p</span></div>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl">
                            <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Volume</div>
                            <div className="text-lg font-black text-white">{book.totalPages} <span className="text-[10px] text-gray-500 font-medium">pages</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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