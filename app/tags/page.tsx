"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Tag as TagIcon,
  Plus,
  Search,
  BookOpen,
  Music,
  Film,
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
  Quote,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Save,
  Layers,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { TagItem, TaggedSentenceResult } from "@/lib/TagManager";
import SentenceEditModal from "@/components/SentenceEditModal";
import { SentenceEntry } from "@/lib/BookManager";

const TAG_COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string; badge: string; pill: string }
> = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    badge: "bg-indigo-600",
    pill: "bg-indigo-100/70 text-indigo-800",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-600",
    pill: "bg-emerald-100/70 text-emerald-800",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-600",
    pill: "bg-amber-100/70 text-amber-800",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badge: "bg-rose-600",
    pill: "bg-rose-100/70 text-rose-800",
  },
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    badge: "bg-violet-600",
    pill: "bg-violet-100/70 text-violet-800",
  },
  cyan: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    badge: "bg-cyan-600",
    pill: "bg-cyan-100/70 text-cyan-800",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-600",
    pill: "bg-blue-100/70 text-blue-800",
  },
};

export default function TagsPage() {
  const [tags, setTags] = useState<(TagItem & { sentenceCount: number })[]>([]);
  const [sentences, setSentences] = useState<TaggedSentenceResult[]>([]);
  const [selectedTagName, setSelectedTagName] = useState<string | null>(null); // null = all tags
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  // Tag Creation & Edit Modal state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagNameInput, setTagNameInput] = useState("");
  const [tagColorInput, setTagColorInput] = useState("indigo");
  const [tagDescInput, setTagDescInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [tagError, setTagError] = useState("");

  // Sentence Edit Modal state
  const [editingSentence, setEditingSentence] = useState<{
    entry: SentenceEntry;
    mediaType: "book" | "song" | "movie";
    mediaName: string;
    pageNo?: number;
  } | null>(null);
  const [deletingSentenceText, setDeletingSentenceText] = useState<
    string | null
  >(null);

  // Load tags and sentences
  const loadData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [tagsRes, sentRes] = await Promise.all([
        fetch("/api/tags"),
        fetch("/api/tags/sentences"),
      ]);

      const tagsData = await tagsRes.json();
      const sentData = await sentRes.json();

      if (tagsData.success && Array.isArray(tagsData.tags)) {
        setTags(tagsData.tags);
      }
      if (sentData.success && Array.isArray(sentData.sentences)) {
        setSentences(sentData.sentences);
      }
    } catch {
      setMessage("Failed to load tags and sentences");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [tagsRes, sentRes] = await Promise.all([
          fetch("/api/tags"),
          fetch("/api/tags/sentences"),
        ]);
        const tagsData = await tagsRes.json();
        const sentData = await sentRes.json();
        if (!isMounted) return;
        if (tagsData.success && Array.isArray(tagsData.tags)) {
          setTags(tagsData.tags);
        }
        if (sentData.success && Array.isArray(sentData.sentences)) {
          setSentences(sentData.sentences);
        }
      } catch {
        if (isMounted) {
          setMessage("Failed to load tags and sentences");
          setMessageType("error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered sentences
  const filteredSentences = useMemo(() => {
    return sentences.filter((s) => {
      const matchesTag =
        selectedTagName === null ||
        (s.tag && s.tag.toLowerCase() === selectedTagName.toLowerCase());

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.sentence.toLowerCase().includes(q) ||
        (s.meaning && s.meaning.toLowerCase().includes(q)) ||
        s.mediaName.toLowerCase().includes(q) ||
        (s.tag && s.tag.toLowerCase().includes(q));

      return matchesTag && matchesSearch;
    });
  }, [sentences, selectedTagName, searchQuery]);

  const openCreateTagModal = () => {
    setEditingTag(null);
    setTagNameInput("");
    setTagColorInput("indigo");
    setTagDescInput("");
    setTagError("");
    setIsTagModalOpen(true);
  };

  const openEditTagModal = (t: TagItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTag(t);
    setTagNameInput(t.name);
    setTagColorInput(t.color || "indigo");
    setTagDescInput(t.description || "");
    setTagError("");
    setIsTagModalOpen(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagNameInput.trim()) {
      setTagError("Tag name is required");
      return;
    }

    setSavingTag(true);
    setTagError("");

    try {
      if (editingTag) {
        // Update
        const res = await fetch("/api/tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idOrName: editingTag.id,
            name: tagNameInput.trim(),
            color: tagColorInput,
            description: tagDescInput.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage(`Tag "${tagNameInput.trim()}" updated successfully!`);
          setMessageType("success");
          setIsTagModalOpen(false);
          await loadData();
        } else {
          setTagError(data.error || "Failed to update tag");
        }
      } else {
        // Create
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tagNameInput.trim(),
            color: tagColorInput,
            description: tagDescInput.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage(`Tag "${tagNameInput.trim()}" created successfully!`);
          setMessageType("success");
          setIsTagModalOpen(false);
          await loadData();
        } else {
          setTagError(data.error || "Failed to create tag");
        }
      }
    } catch {
      setTagError("Network error saving tag");
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (t: TagItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete the tag "${t.name}"? This will not delete sentences, but they will no longer be assigned to this tag.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/tags?name=${encodeURIComponent(t.name)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Tag "${t.name}" deleted successfully`);
        setMessageType("success");
        if (selectedTagName?.toLowerCase() === t.name.toLowerCase()) {
          setSelectedTagName(null);
        }
        await loadData();
      } else {
        setMessage(data.error || "Failed to delete tag");
        setMessageType("error");
      }
    } catch {
      setMessage("Error deleting tag");
      setMessageType("error");
    }
  };

  const handleDeleteSentence = async (s: TaggedSentenceResult) => {
    if (!confirm(`Are you sure you want to delete this sentence?`)) return;

    setDeletingSentenceText(s.sentence);
    try {
      const pageParam = s.pageNo !== undefined ? `&pageNo=${s.pageNo}` : "";
      const res = await fetch(
        `/api/sentences?mediaType=${s.mediaType}&mediaName=${encodeURIComponent(s.mediaName)}${pageParam}&sentence=${encodeURIComponent(s.sentence)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        setMessage("Sentence removed successfully");
        setMessageType("success");
        await loadData();
      } else {
        setMessage(data.error || "Failed to delete sentence");
        setMessageType("error");
      }
    } catch {
      setMessage("Network error deleting sentence");
      setMessageType("error");
    } finally {
      setDeletingSentenceText(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider">
              <TagIcon size={14} />
              <span>Taxonomy & Sentences Vault</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Tags & Sentences Vault
            </h1>
            <p className="text-gray-500 text-sm max-w-xl">
              Curate custom tags, explore sentences collected across books,
              songs, and movies, and filter your favorite lines by theme.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openCreateTagModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 cursor-pointer"
            >
              <Plus size={18} />
              <span>Create New Tag</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {message && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 size={20} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0" />
            )}
            <span className="font-medium text-sm">{message}</span>
            <button
              onClick={() => setMessage("")}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs">
            <span className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
              Total Tags
            </span>
            <span className="text-2xl font-black text-indigo-600">
              {tags.length}
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs">
            <span className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
              Total Sentences
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {sentences.length}
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs">
            <span className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
              Book Sentences
            </span>
            <span className="text-2xl font-black text-violet-600">
              {sentences.filter((s) => s.mediaType === "book").length}
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs">
            <span className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
              Songs & Movies
            </span>
            <span className="text-2xl font-black text-amber-600">
              {sentences.filter((s) => s.mediaType !== "book").length}
            </span>
          </div>
        </div>

        {/* Tag Filters Bar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              <h2 className="text-base font-bold text-gray-900">
                Filter by Created Tag
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              Click a tag to view its sentences
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* All Tags Pill */}
            <button
              onClick={() => setSelectedTagName(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTagName === null
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>All Tags</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  selectedTagName === null
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {sentences.length}
              </span>
            </button>

            {/* Each Created Tag */}
            {tags.map((t) => {
              const isSelected =
                selectedTagName?.toLowerCase() === t.name.toLowerCase();
              const style = TAG_COLOR_MAP[t.color] || TAG_COLOR_MAP.indigo;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTagName(isSelected ? null : t.name)}
                  className={`group flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? `${style.bg} ${style.text} border-2 ${style.border} shadow-sm ring-2 ring-indigo-200`
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${style.badge}`} />
                  <span>{t.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${style.pill}`}
                  >
                    {t.sentenceCount}
                  </span>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 border-l pl-1 border-gray-200">
                    <button
                      type="button"
                      onClick={(e) => openEditTagModal(t, e)}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded-md"
                      title="Edit tag"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTag(t, e)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-md"
                      title="Delete tag"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sentence Search Bar */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within sentences, meanings, media names, or tags..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Sentences List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
            <Loader2 className="animate-spin text-indigo-600 mb-3" size={32} />
            <p className="text-gray-500 font-medium text-sm">
              Loading sentences and tags...
            </p>
          </div>
        ) : filteredSentences.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 p-8 space-y-4">
            <div className="inline-flex p-4 rounded-full bg-indigo-50 text-indigo-600">
              <Quote size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              No Sentences Found
            </h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {searchQuery
                ? `No sentences match "${searchQuery}". Try clearing your search filter.`
                : selectedTagName
                  ? `No sentences have been tagged with "${selectedTagName}" yet. Add sentences to your books, songs, or movies with this tag!`
                  : "No sentences have been saved yet. You can add sentences to any book, song, or movie!"}
            </p>
            <div className="pt-2">
              <Link
                href="/add-word"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
              >
                <Plus size={15} />
                <span>Add a Sentence</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Showing {filteredSentences.length} sentence
                {filteredSentences.length === 1 ? "" : "s"}
                {selectedTagName && (
                  <span>
                    {" "}
                    under{" "}
                    <span className="text-indigo-600 font-black">
                      &ldquo;{selectedTagName}&rdquo;
                    </span>
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {filteredSentences.map((item, index) => {
                const tagObj = tags.find(
                  (t) =>
                    t.name.toLowerCase() === (item.tag || "").toLowerCase(),
                );
                const tagColor = tagObj ? tagObj.color : "indigo";
                const colorStyle =
                  TAG_COLOR_MAP[tagColor] || TAG_COLOR_MAP.indigo;

                return (
                  <div
                    key={index}
                    className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group space-y-4"
                  >
                    {/* Top Row: Order # + Tag + Source + Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg shadow-2xs">
                          #{index + 1}
                        </span>

                        {/* Tag Badge */}
                        {item.tag ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${colorStyle.badge}`}
                            />
                            <span>{item.tag}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                            Untagged
                          </span>
                        )}

                        {/* Source Media Badge */}
                        <Link
                          href={
                            item.mediaType === "book"
                              ? `/book/${encodeURIComponent(item.mediaName)}`
                              : item.mediaType === "song"
                                ? `/song/${encodeURIComponent(item.mediaName)}`
                                : `/movie/${encodeURIComponent(item.mediaName)}`
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
                        >
                          {item.mediaType === "book" ? (
                            <BookOpen size={13} className="text-indigo-600" />
                          ) : item.mediaType === "song" ? (
                            <Music size={13} className="text-pink-600" />
                          ) : (
                            <Film size={13} className="text-amber-600" />
                          )}
                          <span className="capitalize">{item.mediaType}:</span>
                          <span className="font-extrabold text-gray-900">
                            {item.mediaName}
                          </span>
                          {item.pageNo !== undefined && (
                            <span className="text-indigo-600">
                              (p. {item.pageNo})
                            </span>
                          )}
                          <ExternalLink size={11} className="opacity-60" />
                        </Link>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSentence({
                              entry: {
                                type: "sentence",
                                sentence: item.sentence,
                                meaning: item.meaning,
                                tag: item.tag,
                              },
                              mediaType: item.mediaType,
                              mediaName: item.mediaName,
                              pageNo: item.pageNo,
                            })
                          }
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Edit sentence"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSentence(item)}
                          disabled={deletingSentenceText === item.sentence}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete sentence"
                        >
                          {deletingSentenceText === item.sentence ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sentence Content (Typographic Quote) */}
                    <div className="relative pl-6 border-l-4 border-indigo-200">
                      <Quote
                        size={20}
                        className="absolute -left-3 top-0 text-indigo-400 fill-indigo-100"
                      />
                      <p className="text-gray-900 text-lg sm:text-xl font-medium leading-relaxed italic">
                        &ldquo;{item.sentence}&rdquo;
                      </p>
                    </div>

                    {/* Meaning / Context */}
                    {item.meaning && (
                      <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 flex items-start gap-2.5">
                        <Info
                          size={16}
                          className="text-indigo-500 mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                            Meaning & Context
                          </span>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {item.meaning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Tag Create/Edit Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
                  <TagIcon size={18} />
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  {editingTag ? "Edit Tag" : "Create New Tag"}
                </h3>
              </div>
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="p-6 space-y-5">
              {tagError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{tagError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Tag Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  placeholder="e.g. Philosophical, Favorite Quotes, Idiom"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Tag Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(TAG_COLOR_MAP).map((colorKey) => {
                    const style = TAG_COLOR_MAP[colorKey];
                    const isSelected = tagColorInput === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setTagColorInput(colorKey)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                          isSelected
                            ? `${style.bg} ${style.text} border-2 ${style.border} ring-2 ring-indigo-200 shadow-xs`
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${style.badge}`}
                        />
                        <span>{colorKey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Description{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={tagDescInput}
                  onChange={(e) => setTagDescInput(e.target.value)}
                  rows={2}
                  placeholder="Brief note about what this tag represents..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTag || !tagNameInput.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {savingTag ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{editingTag ? "Save Tag" : "Create Tag"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sentence Edit Modal */}
      {editingSentence && (
        <SentenceEditModal
          isOpen={true}
          sentence={editingSentence.entry}
          mediaType={editingSentence.mediaType}
          mediaName={editingSentence.mediaName}
          pageNo={editingSentence.pageNo}
          onClose={() => setEditingSentence(null)}
          onSaved={() => {
            setEditingSentence(null);
            void loadData();
          }}
        />
      )}
    </div>
  );
}
