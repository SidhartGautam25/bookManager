"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookPlus,
  PlusCircle,
  Book,
  Type,
  FileText,
  Hash,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";

type ExistingWordData = {
  found: boolean;
  meaning: string;
  frequency: number;
  pages: number[];
  examples: string[];
  partOfSpeech?: string;
  variations?: string[];
  source?: "current-book" | "other-book" | "api";
  bookName?: string;
};

export default function AddWordPage() {
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [newBookName, setNewBookName] = useState<string>("");
  const [showNewBookInput, setShowNewBookInput] = useState<boolean>(false);
  const [word, setWord] = useState<string>("");
  const [meaning, setMeaning] = useState<string>("");
  const [pageNo, setPageNo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [existingWordData, setExistingWordData] =
    useState<ExistingWordData | null>(null);
  const [examples, setExamples] = useState<string[]>([""]);
  const [partOfSpeech, setPartOfSpeech] = useState<string>("");
  const [variations, setVariations] = useState<string>("");
  const [dataSource, setDataSource] = useState<
    "current-book" | "other-book" | "api" | null
  >(null);
  const searchTimerRef = useRef<number | null>(null);

  // Fetch existing books on component mount
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

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, "");
  };

  const fetchDictionaryData = async (searchWord: string) => {
    const normalizedWord = searchWord.trim();
    if (!normalizedWord) return null;

    let allExamples: string[] = [];
    let firstDefinition = "";
    let firstPartOfSpeech = "";

    try {
      // 1. Try Primary Community API
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const firstEntry = data[0];
          firstDefinition =
            firstEntry.meanings?.[0]?.definitions?.[0]?.definition || "";
          firstPartOfSpeech = firstEntry.meanings?.[0]?.partOfSpeech || "";

          firstEntry.meanings?.forEach((m: any) => {
            m.definitions?.forEach((d: any) => {
              if (d.example) {
                allExamples.push(d.example);
              }
            });
          });
        }
      }

      // 2. Fallback/Supplement with Official Wiktionary API if examples are missing
      if (allExamples.length === 0) {
        const wikiResponse = await fetch(
          `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(normalizedWord)}`,
        );
        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();
          const enData = wikiData.en;
          if (Array.isArray(enData)) {
            enData.forEach((posGroup: any) => {
              if (!firstPartOfSpeech)
                firstPartOfSpeech = posGroup.partOfSpeech || "";

              posGroup.definitions?.forEach((def: any) => {
                if (!firstDefinition) firstDefinition = stripHtml(def.definition);

                if (Array.isArray(def.examples)) {
                  def.examples.forEach((ex: any) => {
                    const exText = typeof ex === "string" ? ex : ex.example;
                    if (exText && exText.length > 5) {
                      allExamples.push(stripHtml(exText));
                    }
                  });
                }
              });
            });
          }
        }
      }

      if (firstDefinition) {
        return {
          definition: firstDefinition,
          partOfSpeech: firstPartOfSpeech,
          examples: [...new Set(allExamples)],
        };
      }
    } catch (error) {
      console.error("Error fetching from dictionary APIs:", error);
    }
    return null;
  };

  const searchExistingWord = async (searchWord: string) => {
    if (!selectedBook || !searchWord.trim()) {
      return null;
    }

    try {
      const response = await fetch(
        `/api/words?bookName=${encodeURIComponent(selectedBook)}&word=${encodeURIComponent(searchWord.trim())}&searchType=global`,
      );
      const data = await response.json();

      if (data.success && data.found) {
        setExistingWordData({
          found: true,
          meaning: data.meaning,
          frequency: data.frequency,
          pages: data.pages,
          examples: data.examples ?? [],
          partOfSpeech: data.partOfSpeech,
          variations: data.variations,
          source: data.source,
          bookName: data.bookName,
        });
        setMeaning(data.meaning);
        setPartOfSpeech(data.partOfSpeech || "");
        setVariations((data.variations || []).join(", "));
        setDataSource(data.source);
        return { found: true, meaning: data.meaning, source: data.source };
      } else {
        setExistingWordData({
          found: false,
          meaning: "",
          frequency: 0,
          pages: [],
          examples: [],
        });
        setDataSource(null);
        return { found: false };
      }
    } catch {
      setExistingWordData(null);
      setDataSource(null);
      return null;
    }
  };

  const handleWordChange = (value: string) => {
    setWord(value);
    setExistingWordData(null);
    
    // Clear fields if input is cleared
    if (!value.trim()) {
      setMeaning("");
      setExamples([""]);
      setPartOfSpeech("");
      setVariations("");
      setDataSource(null);
    }

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    if (selectedBook && value.trim()) {
      searchTimerRef.current = window.setTimeout(async () => {
        // 1. Try local/global search first
        const localResult = await searchExistingWord(value);

        // 2. If not found in any book, fetch from Dictionary API
        if (!localResult || !localResult.found) {
          const dictData = await fetchDictionaryData(value);
          if (dictData) {
            setMeaning(dictData.definition);
            setPartOfSpeech(dictData.partOfSpeech);
            setDataSource("api");
            if (dictData.examples && dictData.examples.length > 0) {
              setExamples(dictData.examples);
            } else {
              setExamples([""]);
            }
          }
        }
      }, 450);
    }
  };

  const handleExampleChange = (index: number, value: string) => {
    setExamples((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const addExampleField = () => {
    setExamples((current) => [...current, ""]);
  };

  const removeExampleField = (index: number) => {
    setExamples((current) => current.filter((_, i) => i !== index));
  };

  const handleCreateNewBook = async () => {
    if (!newBookName.trim()) {
      setMessage("Book name cannot be empty");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookName: newBookName, action: "create" }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`Book "${newBookName}" created successfully!`);
        setMessageType("success");
        setSelectedBook(newBookName);
        setExistingWordData(null);
        setMeaning("");
        setExamples([""]);
        setNewBookName("");
        setShowNewBookInput(false);

        const refreshResponse = await fetch("/api/books");
        const result = await refreshResponse.json();
        if (result.success) setBooks(result.books);
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch {
      setMessage("Error creating book");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBook) {
      setMessage("Please select or create a book");
      setMessageType("error");
      return;
    }

    const finalMeaning = meaning.trim() || existingWordData?.meaning || "";
    const finalExamples = examples
      .map((example) => example.trim())
      .filter(Boolean);

    if (!word.trim() || !finalMeaning || !pageNo.trim()) {
      setMessage("All fields are required");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
            bookName: selectedBook,
            word: word.trim(),
            meaning: finalMeaning,
            pageNo: parseInt(pageNo),
            examples: finalExamples,
            partOfSpeech,
            variations: variations
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          }),
        });

      const data = await response.json();
      if (data.success) {
        setMessage(`Word "${word}" added successfully!`);
        setMessageType("success");
        setWord("");
        setMeaning("");
        setPageNo("");
        setExamples([""]);
        setExistingWordData(null);
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch {
      setMessage("Error adding word");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Vocabulary Builder
          </h1>
          <p className="mt-2 text-gray-600">
            Expand your lexicon, one page at a time.
          </p>
        </header>

        {/* Global Notifications */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium text-sm">{message}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Step 1: Book Management Card */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <Book size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Step 1: Choose Your Canvas
                </h2>
              </div>

              {!showNewBookInput ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedBook}
                    onChange={(e) => {
                      const nextBook = e.target.value;
                      setSelectedBook(nextBook);
                      setShowNewBookInput(false);
                      setExistingWordData(null);
                      setMeaning("");
                      setExamples([""]);
                    }}
                    className="flex-1 block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-700"
                  >
                    <option value="">-- Select an existing book --</option>
                    {books.map((book) => (
                      <option key={book} value={book}>
                        {book}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewBookInput(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <BookPlus size={18} />
                    New Book
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 animate-in zoom-in-95 duration-200">
                  <input
                    type="text"
                    value={newBookName}
                    onChange={(e) => setNewBookName(e.target.value)}
                    placeholder="Enter unique book name"
                    className="flex-1 px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateNewBook}
                      disabled={loading}
                      className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        "Create"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewBookInput(false);
                        setNewBookName("");
                      }}
                      className="px-6 py-3 text-gray-500 font-medium hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {selectedBook && !showNewBookInput && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-full border border-indigo-100">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Active: {selectedBook}
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Form Details Card */}
          {selectedBook && (
            <form
              onSubmit={handleAddWord}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-6 duration-500"
            >
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                    <PlusCircle size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Step 2: Add Word Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="word"
                      className="flex items-center gap-2 text-sm font-bold text-gray-700"
                    >
                      <Type size={16} className="text-gray-400" /> Word
                    </label>
                    <input
                      id="word"
                      type="text"
                      value={word}
                      onChange={(e) => handleWordChange(e.target.value)}
                      placeholder="e.g., Ephemeral"
                      className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="variations"
                      className="flex items-center gap-2 text-sm font-bold text-gray-700"
                    >
                      <PlusCircle size={16} className="text-gray-400" /> Variations
                    </label>
                    <input
                      id="variations"
                      type="text"
                      value={variations}
                      onChange={(e) => setVariations(e.target.value)}
                      placeholder="e.g., ran, runs, running"
                      className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="pageNo"
                      className="flex items-center gap-2 text-sm font-bold text-gray-700"
                    >
                      <Hash size={16} className="text-gray-400" /> Page Number
                    </label>
                    <input
                      id="pageNo"
                      type="number"
                      value={pageNo}
                      onChange={(e) => setPageNo(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                      min="1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="partOfSpeech"
                      className="flex items-center gap-2 text-sm font-bold text-gray-700"
                    >
                      <Type size={16} className="text-gray-400" /> Part of Speech
                    </label>
                    <input
                      id="partOfSpeech"
                      type="text"
                      value={partOfSpeech}
                      onChange={(e) => setPartOfSpeech(e.target.value)}
                      placeholder="e.g., Verb, Adjective"
                      className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="meaning"
                      className="flex items-center gap-2 text-sm font-bold text-gray-700"
                    >
                      <FileText size={16} className="text-gray-400" /> Meaning
                    </label>
                    {dataSource && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md ${
                          dataSource === "current-book"
                            ? "bg-green-100 text-green-700"
                            : dataSource === "other-book"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        Source:{" "}
                        {dataSource === "current-book"
                          ? "Current Book"
                          : dataSource === "other-book"
                            ? `Book: ${existingWordData?.bookName}`
                            : "Dictionary API"}
                      </span>
                    )}
                  </div>
                  {existingWordData?.found && (
                    <div className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <p>
                        This word already exists in{" "}
                        <span className="font-semibold">
                          {existingWordData.bookName}
                        </span>
                        .
                      </p>
                      <p className="mt-1 text-gray-600">
                        Frequency: {existingWordData.frequency} time
                        {existingWordData.frequency > 1 ? "s" : ""} across pages{" "}
                        {existingWordData.pages.join(", ")}.
                      </p>
                    </div>
                  )}
                  <textarea
                    id="meaning"
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    placeholder={
                      existingWordData?.found
                        ? "Meaning auto-filled from library"
                        : "Describe the definition or context..."
                    }
                    className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-h-[120px] resize-none text-black"
                    rows={4}
                    required={!existingWordData?.found}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <span className="text-gray-400">•</span> Examples
                    </label>
                    <button
                      type="button"
                      onClick={addExampleField}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      Add example
                    </button>
                  </div>

                  {examples.map((example, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_auto] gap-3 items-start"
                    >
                      <input
                        type="text"
                        value={example}
                        onChange={(e) =>
                          handleExampleChange(index, e.target.value)
                        }
                        placeholder={`Example ${index + 1}`}
                        className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                      />
                      {examples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExampleField(index)}
                          className="px-4 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  <p className="text-sm text-gray-500">
                    Add one or more example sentences for this word. Examples
                    are optional, so you can leave them blank.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-500">
                    Saving to{" "}
                    <span className="font-bold text-gray-900">
                      {selectedBook}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transform transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <PlusCircle size={20} />
                        Add Word to Library
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
