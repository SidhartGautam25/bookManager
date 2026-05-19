"use client";

import { useState, useEffect } from "react";
import { Book, ChevronRight, Info, Library } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function BookListPage() {
  const [books, setBooks] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };
    void fetchBooks();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Library Vault</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Browse and select a book to view its vocabulary collection.</p>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading books...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 text-center px-6">
            <div className="bg-gray-50 p-6 rounded-full inline-flex mb-4">
              <Library size={48} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Your Library is Empty</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">
              Start adding words to populate your library with books.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <Link
                key={book}
                href={`/book/${encodeURIComponent(book)}`}
                className="group flex flex-col justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Book size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 line-clamp-2">{book}</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-800">
                    View Vocabulary
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <ChevronRight size={16} className="text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}