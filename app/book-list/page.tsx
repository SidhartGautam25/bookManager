"use client";

import { useState, useEffect } from "react";
import { Book, Layout, Hash, BookOpen, Loader2, ChevronRight, Info } from "lucide-react";
import Navbar from "@/components/Navbar";

interface WordMeaning {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

interface Word {
  word: string;
  meanings: WordMeaning[];
}

interface PageData {
  page: number;
  words: Word[];
}

export default function BookListPage() {
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [bookData, setBookData] = useState<PageData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch("/api/books");
        const data = await response.json();
        if (data.success) {
          setBooks(data.books);
        }
      } catch {
        console.error("Error fetching books");
        setMessage("Error fetching books");
        setMessageType("error");
      }
    };
    void fetchBooks();
  }, []);

  const handleSelectBook = async (bookName: string) => {
    setSelectedBook(bookName);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/words?bookName=${encodeURIComponent(bookName)}`,
      );
      const data = await response.json();
      if (data.success) {
        setBookData(data.data || []);
        setMessage("");
      } else {
        setMessage(data.error);
        setMessageType("error");
        setBookData([]);
      }
    } catch {
      setMessage("Error fetching book data");
      setMessageType("error");
      setBookData([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    let totalWords = 0;
    let totalPages = 0;
    bookData.forEach((page) => {
      totalWords += page.words.length;
      totalPages++;
    });
    return { totalWords, totalPages };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Library Vault</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Review your collection of words and meanings.</p>
        </div>

        {/* Global Notifications */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${messageType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
            }`}>
            <Info size={20} />
            <span className="font-medium text-sm">{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar: Book Selector */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4 px-1">
                <Book className="text-indigo-600" size={18} />
                <h2 className="font-bold text-gray-800 tracking-tight text-sm uppercase">Your Books</h2>
              </div>

              {books.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No books found yet.</p>
                </div>
              ) : (
                <nav className="flex flex-col gap-1">
                  {books.map((book) => (
                    <button
                      key={book}
                      onClick={() => void handleSelectBook(book)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all duration-200 group ${selectedBook === book
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                    >
                      <span className="truncate">{book}</span>
                      <ChevronRight size={14} className={selectedBook === book ? "opacity-100" : "opacity-0 group-hover:opacity-40"} />
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="lg:col-span-9">
            {selectedBook ? (
              <div className="space-y-6">
                {/* Book Header & Stats Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedBook}</h2>
                    <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                      <BookOpen size={14} />
                      <span>Reading Log</span>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                      <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider leading-none">Words</span>
                      <span className="text-lg font-black text-indigo-700">{stats.totalWords}</span>
                    </div>
                    <div className="flex-1 md:flex-none px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="block text-[10px] uppercase font-bold text-amber-400 tracking-wider leading-none">Pages</span>
                      <span className="text-lg font-black text-amber-700">{stats.totalPages}</span>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                    <p className="text-gray-500 font-medium">Fetching vocabulary data...</p>
                  </div>
                ) : bookData.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400">Empty library. Add some words to see them here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                    {bookData.map((pageData) => (
                      <div key={pageData.page} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                            PAGE {pageData.page}
                          </span>
                          <div className="h-[1px] flex-1 bg-gray-200"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pageData.words.map((item, index) => (
                            <div
                              key={index}
                              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 group"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                  <Layout size={14} />
                                </div>
                                <h4 className="font-bold text-lg text-gray-800 capitalize tracking-tight">
                                  {item.word}
                                </h4>
                              </div>
                              <div className="space-y-3 border-l-2 border-gray-100 pl-4">
                                {item.meanings?.map((m, mIdx) => (
                                  <div key={mIdx} className="py-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {m.partOfSpeech && (
                                        <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md tracking-wider">
                                          {m.partOfSpeech}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed italic">
                                      {m.definition}
                                    </p>
                                    {m.examples && m.examples.length > 0 && (
                                      <ul className="mt-2 space-y-1">
                                        {m.examples.map((ex, exIdx) => (
                                          <li key={exIdx} className="text-[11px] text-gray-400 flex gap-2">
                                            <span className="text-indigo-300">•</span>
                                            <span>{ex}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 text-center px-6">
                <div className="bg-gray-50 p-6 rounded-full mb-4">
                  <BookOpen size={48} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No Book Selected</h3>
                <p className="text-gray-500 max-w-xs mt-2">
                  Select a book from the sidebar to view your saved vocabulary and definitions.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}