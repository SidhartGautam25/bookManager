"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookPlus,
  PlusCircle,
  Book,
  Music,
  Film,
  Type,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Hash,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BatchImport from "@/components/BatchImport";
import { fetchComprehensiveDictionary, MeaningItem } from "@/lib/dictionary";

type ExistingWordData = {
  found: boolean;
  frequency: number;
  pages: number[];
  meanings: MeaningItem[];
  variations?: string[];
  source?: "current-book" | "other-book" | "song" | "movie" | "api";
  bookName?: string;
};

export default function AddWordPage() {
  const [mediaType, setMediaType] = useState<"book" | "song" | "movie">("book");
  const [entryMode, setEntryMode] = useState<"single" | "batch">("batch");
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [newItemName, setNewItemName] = useState<string>("");
  const [showNewItemInput, setShowNewItemInput] = useState<boolean>(false);
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
  const [, setDataSource] = useState<
    "current-book" | "other-book" | "song" | "movie" | "api" | null
  >(null);
  const searchTimerRef = useRef<number | null>(null);

  const mediaLabel =
    mediaType === "song" ? "Song" : mediaType === "movie" ? "Movie" : "Book";

  useEffect(() => {
    let isMounted = true;
    async function loadMediaItems() {
      try {
        let endpoint = "/api/books";
        if (mediaType === "song") endpoint = "/api/songs";
        else if (mediaType === "movie") endpoint = "/api/movies";

        const res = await fetch(endpoint);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success) {
          if (mediaType === "book") {
            setMediaItems(data.books || []);
          } else if (mediaType === "song") {
            const names = (data.songs || []).map(
              (s: { name: string }) => s.name,
            );
            setMediaItems(names);
          } else {
            const names = (data.movies || []).map(
              (m: { name: string }) => m.name,
            );
            setMediaItems(names);
          }
        }
      } catch {
        console.error(`Error fetching ${mediaType} items`);
      }
    }

    void loadMediaItems();
    return () => {
      isMounted = false;
    };
  }, [mediaType]);

  const handleMediaTypeChange = (newType: "book" | "song" | "movie") => {
    if (newType === mediaType) return;
    setMediaType(newType);
    setSelectedItem("");
    setWord("");
    setPageNo("");
    setMeanings([{ partOfSpeech: "", definition: "", examples: [""] }]);
    setVariations("");
    setExistingWordData(null);
    setDataSource(null);
    setMessage("");
    setShowNewItemInput(false);
  };

  const fetchDictionaryData = async (searchWord: string) => {
    const normalizedWord = searchWord.trim();
    if (!normalizedWord) return null;
    try {
      const enriched = await fetchComprehensiveDictionary(normalizedWord);
      return enriched.meanings.length > 0 ? enriched.meanings : null;
    } catch (error) {
      console.error("Error fetching dictionary data:", error);
      return null;
    }
  };

  const searchExistingWord = async (searchWord: string) => {
    if (!selectedItem || !searchWord.trim()) {
      return null;
    }

    try {
      let url = "";
      if (mediaType === "book") {
        url = `/api/words?bookName=${encodeURIComponent(selectedItem)}&word=${encodeURIComponent(searchWord.trim())}&searchType=global`;
      } else if (mediaType === "song") {
        url = `/api/songs/words?songName=${encodeURIComponent(selectedItem)}&word=${encodeURIComponent(searchWord.trim())}`;
      } else {
        url = `/api/movies/words?movieName=${encodeURIComponent(selectedItem)}&word=${encodeURIComponent(searchWord.trim())}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.found) {
        setExistingWordData({
          found: true,
          frequency: data.frequency || 1,
          pages: data.pages || [],
          meanings: data.meanings || [],
          variations: data.variations,
          source: data.source,
          bookName: data.bookName || selectedItem,
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

    if (!value.trim()) {
      setMeanings([{ partOfSpeech: "", definition: "", examples: [""] }]);
      setVariations("");
      setDataSource(null);
    }

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    if (selectedItem && value.trim()) {
      searchTimerRef.current = window.setTimeout(async () => {
        const localResult = await searchExistingWord(value);

        if (!localResult || !localResult.found) {
          const dictMeanings = await fetchDictionaryData(value);
          if (dictMeanings && dictMeanings.length > 0) {
            setMeanings(dictMeanings);
            setDataSource("api");
          }
        }
      }, 500);
    }
  };

  const handleMeaningChange = (
    index: number,
    field: keyof MeaningItem,
    value: string,
  ) => {
    const updatedMeanings = [...meanings];
    if (field === "partOfSpeech" || field === "definition") {
      updatedMeanings[index][field] = value;
    }
    setMeanings(updatedMeanings);
  };

  const handleExampleChange = (
    meaningIndex: number,
    exampleIndex: number,
    value: string,
  ) => {
    const updatedMeanings = [...meanings];
    updatedMeanings[meaningIndex].examples[exampleIndex] = value;
    setMeanings(updatedMeanings);
  };

  const addExampleField = (meaningIndex: number) => {
    const updatedMeanings = [...meanings];
    updatedMeanings[meaningIndex].examples.push("");
    setMeanings(updatedMeanings);
  };

  const removeExampleField = (meaningIndex: number, exampleIndex: number) => {
    const updatedMeanings = [...meanings];
    if (updatedMeanings[meaningIndex].examples.length > 1) {
      updatedMeanings[meaningIndex].examples.splice(exampleIndex, 1);
      setMeanings(updatedMeanings);
    }
  };

  const addMeaningField = () => {
    setMeanings([
      ...meanings,
      { partOfSpeech: "", definition: "", examples: [""] },
    ]);
  };

  const removeMeaningField = (index: number) => {
    if (meanings.length > 1) {
      const updatedMeanings = meanings.filter((_, i) => i !== index);
      setMeanings(updatedMeanings);
    }
  };

  const handleCreateNewItem = async () => {
    if (!newItemName.trim()) {
      setMessage(`Please enter a ${mediaLabel.toLowerCase()} name`);
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      let endpoint = "/api/books";
      let payload: Record<string, string> = {
        bookName: newItemName.trim(),
        action: "create",
      };

      if (mediaType === "song") {
        endpoint = "/api/songs";
        payload = { songName: newItemName.trim(), action: "create" };
      } else if (mediaType === "movie") {
        endpoint = "/api/movies";
        payload = { movieName: newItemName.trim(), action: "create" };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`${mediaLabel} "${newItemName}" created successfully!`);
        setMessageType("success");
        setSelectedItem(newItemName.trim());
        setShowNewItemInput(false);
        setMediaItems((prev) => [...prev, newItemName.trim()]);
        setNewItemName("");
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch {
      setMessage(`Error creating ${mediaLabel.toLowerCase()}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem) {
      setMessage(`Please select or create a ${mediaLabel.toLowerCase()}`);
      setMessageType("error");
      return;
    }

    const finalMeanings = meanings
      .map((m) => ({
        ...m,
        definition: m.definition.trim(),
        examples: m.examples.map((ex) => ex.trim()).filter(Boolean),
      }))
      .filter((m) => m.definition);

    if (!word.trim() || finalMeanings.length === 0) {
      setMessage("Word and at least one meaning are required");
      setMessageType("error");
      return;
    }

    if (mediaType === "book" && !pageNo.trim()) {
      setMessage("Page number is required for book entries");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      let endpoint = "/api/words";
      let payload: Record<string, unknown> = {
        bookName: selectedItem,
        word: word.trim(),
        pageNo: parseInt(pageNo, 10),
        meanings: finalMeanings,
        variations: variations
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };

      if (mediaType === "song") {
        endpoint = "/api/songs/words";
        payload = {
          songName: selectedItem,
          word: word.trim(),
          meanings: finalMeanings,
          variations: variations
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        };
      } else if (mediaType === "movie") {
        endpoint = "/api/movies/words";
        payload = {
          movieName: selectedItem,
          word: word.trim(),
          meanings: finalMeanings,
          variations: variations
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`Word "${word}" added successfully to ${selectedItem}!`);
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

      <main
        className={`${entryMode === "batch" ? "max-w-4xl" : "max-w-3xl"} mx-auto px-4 py-12 transition-all`}
      >
        <header className="mb-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-indigo-600" />
            <span>Vocabulary Ingestion</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Vocabulary Builder
          </h1>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            Expand your lexicon across Books, Songs, and Movies with fast batch
            processing or detailed single-word logging.
          </p>

          {/* Media Type Switcher: Books / Songs / Movies */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-white border border-gray-200 shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => handleMediaTypeChange("book")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  mediaType === "book"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Book size={15} />
                <span>Books</span>
              </button>
              <button
                type="button"
                onClick={() => handleMediaTypeChange("song")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  mediaType === "song"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Music size={15} />
                <span>Songs</span>
              </button>
              <button
                type="button"
                onClick={() => handleMediaTypeChange("movie")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  mediaType === "movie"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Film size={15} />
                <span>Movies</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher: Batch vs Single */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-gray-200/70 border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setEntryMode("batch")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  entryMode === "batch"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Sparkles size={15} />
                Smart Batch Dump (
                {mediaType === "book" ? "Multi-Page" : "Pageless"})
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("single")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  entryMode === "single"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <PlusCircle size={15} />
                Single Word Entry
              </button>
            </div>
          </div>
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

        {entryMode === "batch" ? (
          <BatchImport
            books={mediaItems}
            selectedBook={selectedItem}
            onSelectBook={(b) => setSelectedItem(b)}
            onBookCreated={(b) => {
              setMediaItems((prev) => [...prev, b]);
              setSelectedItem(b);
            }}
            mediaType={mediaType}
          />
        ) : (
          <div className="space-y-8">
            {/* Step 1: Media Item Management Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                    {mediaType === "song" ? (
                      <Music size={20} />
                    ) : mediaType === "movie" ? (
                      <Film size={20} />
                    ) : (
                      <Book size={20} />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Step 1: Choose Your {mediaLabel}
                  </h2>
                </div>

                {!showNewItemInput ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={selectedItem}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSelectedItem(next);
                        setShowNewItemInput(false);
                        setExistingWordData(null);
                        setMeanings([
                          { partOfSpeech: "", definition: "", examples: [""] },
                        ]);
                      }}
                      className="flex-1 block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-700"
                    >
                      <option value="">
                        -- Select an existing {mediaLabel.toLowerCase()} --
                      </option>
                      {mediaItems.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewItemInput(true)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <BookPlus size={18} />
                      New {mediaLabel}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 animate-in zoom-in-95 duration-200">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder={`Enter unique ${mediaLabel.toLowerCase()} name`}
                      className="flex-1 px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateNewItem}
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
                          setShowNewItemInput(false);
                          setNewItemName("");
                        }}
                        className="px-6 py-3 text-gray-500 font-medium hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {selectedItem && !showNewItemInput && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-full border border-indigo-100">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Active {mediaLabel}: {selectedItem}
                  </div>
                )}
              </div>
            </section>

            {/* Step 2: Form Details Card */}
            {selectedItem && (
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
                        <PlusCircle size={16} className="text-gray-400" />{" "}
                        Variations
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

                    {/* Page Number is ONLY required and shown for Books */}
                    {mediaType === "book" && (
                      <div className="space-y-2">
                        <label
                          htmlFor="pageNo"
                          className="flex items-center gap-2 text-sm font-bold text-gray-700"
                        >
                          <Hash size={16} className="text-gray-400" /> Page
                          Number
                        </label>
                        <input
                          id="pageNo"
                          type="number"
                          value={pageNo}
                          onChange={(e) => setPageNo(e.target.value)}
                          placeholder="e.g., 42"
                          min="1"
                          className="w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-black"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Existing Word Context Card */}
                  {existingWordData?.found && (
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                      <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                        <Sparkles size={20} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900 text-sm">
                          Word Exists in Your Library!
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {existingWordData.source === "current-book"
                            ? `Found in current ${mediaLabel.toLowerCase()} (Total occurrences: ${existingWordData.frequency}).`
                            : `Found in "${existingWordData.bookName}" (Total occurrences: ${existingWordData.frequency}). We populated the meanings for you!`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Meanings and Examples Builder */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <FileText size={16} className="text-gray-400" />{" "}
                        Meanings & Examples
                      </label>
                      <button
                        type="button"
                        onClick={addMeaningField}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={14} /> Add Meaning
                      </button>
                    </div>

                    <div className="space-y-4">
                      {meanings.map((meaning, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-5 bg-gray-50 rounded-2xl border border-gray-200/70 space-y-4 relative group"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                              Meaning #{mIdx + 1}
                            </span>
                            {meanings.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMeaningField(mIdx)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                title="Remove meaning"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-1 space-y-1.5">
                              <label className="text-xs font-bold text-gray-600">
                                Part of Speech
                              </label>
                              <input
                                type="text"
                                value={meaning.partOfSpeech}
                                onChange={(e) =>
                                  handleMeaningChange(
                                    mIdx,
                                    "partOfSpeech",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Noun"
                                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-medium text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1.5">
                              <label className="text-xs font-bold text-gray-600">
                                Definition
                              </label>
                              <textarea
                                value={meaning.definition}
                                onChange={(e) =>
                                  handleMeaningChange(
                                    mIdx,
                                    "definition",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter clear definition..."
                                rows={2}
                                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-medium text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                              />
                            </div>
                          </div>

                          {/* Examples */}
                          <div className="space-y-2 pt-2 border-t border-gray-200/60">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-500">
                                Example Sentences
                              </span>
                              <button
                                type="button"
                                onClick={() => addExampleField(mIdx)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                + Add Example
                              </button>
                            </div>
                            {meaning.examples.map((ex, exIdx) => (
                              <div
                                key={exIdx}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="text"
                                  value={ex}
                                  onChange={(e) =>
                                    handleExampleChange(
                                      mIdx,
                                      exIdx,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Example ${exIdx + 1}...`}
                                  className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {meaning.examples.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeExampleField(mIdx, exIdx)
                                    }
                                    className="text-gray-400 hover:text-red-500"
                                    title="Remove example"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={16} />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        `Add Word to ${mediaLabel}`
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
