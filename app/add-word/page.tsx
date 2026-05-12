"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookPlus,
  PlusCircle,
  Book,
  Type,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Hash,
} from "lucide-react";
import Navbar from "@/components/Navbar";

type MeaningItem = {
  partOfSpeech: string;
  definition: string;
  examples: string[];
};

type ExistingWordData = {
  found: boolean;
  frequency: number;
  pages: number[];
  meanings: MeaningItem[];
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

  const [pageNo, setPageNo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [existingWordData, setExistingWordData] =
    useState<ExistingWordData | null>(null);
  const [meanings, setMeanings] = useState<MeaningItem[]>([
    { partOfSpeech: "", definition: "", examples: [""] },
  ]);
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

    let collectedMeanings: MeaningItem[] = [];

    try {
      // 1. Try Primary Community API
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((entry: any) => {
            entry.meanings?.forEach((m: any) => {
              m.definitions?.forEach((d: any) => {
                if (d.definition) {
                  // Capture all possible example formats
                  let definitionExamples: string[] = [];
                  if (d.example) definitionExamples.push(d.example);
                  if (Array.isArray(d.examples)) {
                    definitionExamples = [...definitionExamples, ...d.examples];
                  }
                  
                  collectedMeanings.push({
                    partOfSpeech: m.partOfSpeech || "",
                    definition: d.definition,
                    examples: definitionExamples.length > 0 ? [...new Set(definitionExamples)] : [""],
                  });
                }
              });
            });
          });
        }
      }

      // 2. Fallback/Supplement with Official Wiktionary API if needed
      if (collectedMeanings.length === 0) {
        const wikiResponse = await fetch(
          `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(normalizedWord)}`,
        );
        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();
          const enData = wikiData.en;
          if (Array.isArray(enData)) {
            enData.forEach((posGroup: any) => {
              posGroup.definitions?.forEach((def: any) => {
                const examples: string[] = [];
                if (Array.isArray(def.examples)) {
                  def.examples.forEach((ex: any) => {
                    const exText = typeof ex === "string" ? ex : ex.example;
                    if (exText && exText.length > 2) {
                      examples.push(stripHtml(exText));
                    }
                  });
                }

                if (def.definition) {
                  collectedMeanings.push({
                    partOfSpeech: posGroup.partOfSpeech || "",
                    definition: stripHtml(def.definition),
                    examples: examples.length > 0 ? examples : [""],
                  });
                }
              });
            });
          }
        }
      }

      return collectedMeanings.length > 0 ? collectedMeanings : null;
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
          frequency: data.frequency,
          pages: data.pages,
          meanings: data.meanings || [],
          variations: data.variations,
          source: data.source,
          bookName: data.bookName,
        });
        setMeanings(data.meanings || []);
        setVariations((data.variations || []).join(", "));
        setDataSource(data.source);
        return { found: true, source: data.source };
      } else {
        setExistingWordData({
          found: false,
          frequency: 0,
          pages: [],
          meanings: [],
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
      setMeanings([{ partOfSpeech: "", definition: "", examples: [""] }]);
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
          const dictMeanings = await fetchDictionaryData(value);
          if (dictMeanings) {
            setMeanings(dictMeanings);
            setDataSource("api");
          }
        }
      }, 450);
    }
  };

  const handleMeaningChange = (
    index: number,
    field: keyof MeaningItem,
    value: string,
  ) => {
    setMeanings((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleExampleChange = (
    meaningIndex: number,
    exampleIndex: number,
    value: string,
  ) => {
    setMeanings((current) => {
      const next = [...current];
      const nextExamples = [...next[meaningIndex].examples];
      nextExamples[exampleIndex] = value;
      next[meaningIndex] = { ...next[meaningIndex], examples: nextExamples };
      return next;
    });
  };

  const addMeaningGroup = () => {
    setMeanings((current) => [
      ...current,
      { partOfSpeech: "", definition: "", examples: [""] },
    ]);
  };

  const removeMeaningGroup = (index: number) => {
    setMeanings((current) => current.filter((_, i) => i !== index));
  };

  const addExampleToGroup = (meaningIndex: number) => {
    setMeanings((current) => {
      const next = [...current];
      next[meaningIndex] = {
        ...next[meaningIndex],
        examples: [...next[meaningIndex].examples, ""],
      };
      return next;
    });
  };

  const removeExampleFromGroup = (meaningIndex: number, exampleIndex: number) => {
    setMeanings((current) => {
      const next = [...current];
      const nextExamples = next[meaningIndex].examples.filter(
        (_, i) => i !== exampleIndex,
      );
      next[meaningIndex] = { ...next[meaningIndex], examples: nextExamples };
      return next;
    });
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
        setMeanings([{ partOfSpeech: "", definition: "", examples: [""] }]);
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

    const finalMeanings = meanings
      .map((m) => ({
        ...m,
        definition: m.definition.trim(),
        examples: m.examples.map((e) => e.trim()).filter(Boolean),
      }))
      .filter((m) => m.definition);

    if (!word.trim() || finalMeanings.length === 0 || !pageNo.trim()) {
      setMessage("Word, at least one meaning, and page number are required");
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
          pageNo: parseInt(pageNo),
          meanings: finalMeanings,
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
        setMeanings([{ partOfSpeech: "", definition: "", examples: [""] }]);
        setPageNo("");
        setVariations("");
        setExistingWordData(null);
        setDataSource(null);
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
                      setMeanings([{ partOfSpeech: "", definition: "", examples: [""] }]);
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
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <FileText size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">
                        Meaning & Usage Sections
                      </h3>
                    </div>
                    {dataSource && (
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
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
                    <div className="mb-6 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <p className="flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        This word already exists in your library.
                      </p>
                      <p className="mt-1 text-gray-600 pl-6">
                        Frequency: {existingWordData.frequency} time
                        {existingWordData.frequency > 1 ? "s" : ""} across pages{" "}
                        {existingWordData.pages.join(", ")}.
                      </p>
                    </div>
                  )}

                  <div className="space-y-8">
                    {meanings.map((m, mIndex) => (
                      <div
                        key={mIndex}
                        className="p-6 rounded-2xl bg-gray-50 border border-gray-200 relative group animate-in fade-in slide-in-from-top-4 duration-300"
                      >
                        {meanings.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMeaningGroup(mIndex)}
                            className="absolute -top-3 -right-3 p-2 bg-white text-red-500 rounded-full border border-red-100 shadow-sm hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                                Part of Speech
                              </label>
                              <input
                                type="text"
                                value={m.partOfSpeech}
                                onChange={(e) =>
                                  handleMeaningChange(
                                    mIndex,
                                    "partOfSpeech",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Noun"
                                className="w-full px-4 py-2.5 rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm text-black"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                                Definition
                              </label>
                              <textarea
                                value={m.definition}
                                onChange={(e) =>
                                  handleMeaningChange(
                                    mIndex,
                                    "definition",
                                    e.target.value,
                                  )
                                }
                                placeholder="Describe the meaning..."
                                className="w-full px-4 py-2.5 rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm min-h-[100px] text-black"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                                Examples
                              </label>
                              <button
                                type="button"
                                onClick={() => addExampleToGroup(mIndex)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                              >
                                <Plus size={14} /> Add Example
                              </button>
                            </div>
                            <div className="space-y-3">
                              {m.examples.map((ex, exIndex) => (
                                <div
                                  key={exIndex}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="text"
                                    value={ex}
                                    onChange={(e) =>
                                      handleExampleChange(
                                        mIndex,
                                        exIndex,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={`Usage example ${exIndex + 1}`}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm text-black"
                                  />
                                  {m.examples.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeExampleFromGroup(mIndex, exIndex)
                                      }
                                      className="p-2.5 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addMeaningGroup}
                      className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Plus
                        size={20}
                        className="group-hover:scale-110 transition-transform"
                      />
                      Add Another Meaning / Part of Speech
                    </button>
                  </div>
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
