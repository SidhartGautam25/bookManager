"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Feather,
  ChevronRight,
  Info,
  PlusCircle,
  Search,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface PoemItem {
  name: string;
  totalWords: number;
}

export default function PoemListPage() {
  const [poems, setPoems] = useState<PoemItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchPoems = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/poems");
        const data = await response.json();
        if (data.success && Array.isArray(data.poems)) {
          setPoems(data.poems);
        }
      } catch {
        console.error("Error fetching poems");
        setMessage("Error fetching poems");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };
    void fetchPoems();
  }, []);

  const filteredPoems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return poems;
    return poems.filter((p) => p.name.toLowerCase().includes(q));
  }, [poems, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Feather size={13} />
              <span>Poetic Vocabulary</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Poem Vault
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              Browse stanzas, verses, and rich literary terms collected across your favorite poems.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/add-word"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <PlusCircle size={16} />
              Add Poem Words
            </Link>
          </div>
        </div>

        {/* Search filter bar */}
        {poems.length > 0 && (
          <div className="relative max-w-md">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter poems..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-violet-500 outline-none shadow-2xs"
            />
          </div>
        )}

        {/* Global Notifications */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <Info size={20} />
            <span className="font-medium text-sm">{message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">
              Loading poems...
            </p>
          </div>
        ) : poems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 px-6 space-y-3">
            <div className="bg-violet-50 p-5 rounded-full inline-flex text-violet-600">
              <Feather size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              Your Poem Vault is Empty
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">
              Capture poignant words, metaphors, and evocative imagery from your favorite poems and sonnets.
            </p>
            <div className="pt-2">
              <Link
                href="/add-word"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 shadow-sm"
              >
                <Sparkles size={15} />
                Import First Poem Words
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPoems.map((poem) => (
              <Link
                key={poem.name}
                href={`/poem/${encodeURIComponent(poem.name)}`}
                className="group flex flex-col justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-violet-100 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                    <Feather size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 truncate">
                      {poem.name}
                    </h3>
                    <span className="text-xs font-semibold text-gray-400">
                      {poem.totalWords} word{poem.totalWords === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <span className="text-xs font-bold text-violet-600 group-hover:text-violet-800">
                    View Verses & Vocabulary
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                    <ChevronRight
                      size={16}
                      className="text-violet-600 group-hover:translate-x-0.5 transition-transform"
                    />
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
