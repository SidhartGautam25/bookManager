"use client";

import { useState, useEffect } from "react";
import {
  X,
  Save,
  Loader2,
  Tag as TagIcon,
  Quote,
  Plus,
  AlertCircle,
  Check,
} from "lucide-react";
import { SentenceEntry } from "@/lib/BookManager";
import { TagItem } from "@/lib/TagManager";

interface SentenceEditModalProps {
  isOpen: boolean;
  sentence: SentenceEntry | null;
  mediaType: "book" | "song" | "movie";
  mediaName: string;
  pageNo?: number;
  onClose: () => void;
  onSaved: (updated: SentenceEntry) => void;
}

const TAG_COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    badge: "bg-indigo-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-600",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badge: "bg-rose-600",
  },
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    badge: "bg-violet-600",
  },
  cyan: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    badge: "bg-cyan-600",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-600",
  },
};

function SentenceEditContent({
  sentence,
  mediaType,
  mediaName,
  pageNo,
  onClose,
  onSaved,
}: {
  sentence: SentenceEntry;
  mediaType: "book" | "song" | "movie";
  mediaName: string;
  pageNo?: number;
  onClose: () => void;
  onSaved: (updated: SentenceEntry) => void;
}) {
  const [sentenceText, setSentenceText] = useState(sentence.sentence || "");
  const [meaning, setMeaning] = useState(sentence.meaning || "");
  const [selectedTag, setSelectedTag] = useState(sentence.tag || "");
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Inline Tag Creation state
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("indigo");
  const [creatingTag, setCreatingTag] = useState(false);

  // Load created tags
  useEffect(() => {
    let isMounted = true;
    async function loadTags() {
      setLoadingTags(true);
      try {
        const res = await fetch("/api/tags");
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.tags)) {
          setTags(data.tags);
        }
      } catch (err) {
        console.error("Failed to load tags:", err);
      } finally {
        if (isMounted) setLoadingTags(false);
      }
    }

    void loadTags();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    setError("");

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      const data = await res.json();
      if (data.success && data.tag) {
        setTags((prev) => [...prev, data.tag]);
        setSelectedTag(data.tag.name);
        setNewTagName("");
        setShowNewTagInput(false);
      } else {
        setError(data.error || "Failed to create tag");
      }
    } catch {
      setError("Network error creating tag");
    } finally {
      setCreatingTag(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentenceText.trim()) {
      setError("Sentence cannot be empty");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/sentences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          mediaName,
          pageNo,
          originalSentence: sentence.sentence,
          updatedSentence: sentenceText.trim(),
          meaning: meaning.trim(),
          tag: selectedTag.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSaved({
          ...sentence,
          sentence: sentenceText.trim(),
          meaning: meaning.trim(),
          tag: selectedTag.trim(),
          tags: selectedTag.trim() ? [selectedTag.trim()] : [],
        });
        onClose();
      } else {
        setError(data.error || "Failed to update sentence");
      }
    } catch {
      setError("Network error updating sentence");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Quote size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Edit Sentence
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                {mediaType === "book"
                  ? `Book "${mediaName}" (Page ${pageNo})`
                  : `${mediaType === "song" ? "Song" : "Movie"} "${mediaName}"`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sentence Text */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Sentence Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={sentenceText}
              onChange={(e) => setSentenceText(e.target.value)}
              rows={4}
              required
              placeholder="Enter the full sentence..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-base text-gray-900 leading-relaxed resize-none"
            />
          </div>

          {/* Meaning / Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Meaning / Context / Explanation{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              rows={2}
              placeholder="Provide meaning, context, or notes on this sentence..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm text-gray-800 leading-relaxed resize-none"
            />
          </div>

          {/* Tag Selector (Only created tags) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <TagIcon size={14} className="text-indigo-600" />
                <span>Sentence Tag</span>
                <span className="text-gray-400 font-normal text-[11px]">
                  (Only created tags)
                </span>
              </label>
              {!showNewTagInput && (
                <button
                  type="button"
                  onClick={() => setShowNewTagInput(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Plus size={14} />
                  <span>Create New Tag</span>
                </button>
              )}
            </div>

            {/* Inline new tag form */}
            {showNewTagInput && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">
                    Create New Tag
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewTagInput(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Philosophical, Favorite Quotes"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white outline-none"
                  >
                    <option value="indigo">Indigo</option>
                    <option value="emerald">Emerald</option>
                    <option value="amber">Amber</option>
                    <option value="rose">Rose</option>
                    <option value="violet">Violet</option>
                    <option value="cyan">Cyan</option>
                    <option value="blue">Blue</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={creatingTag || !newTagName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {creatingTag ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </div>
            )}

            {loadingTags ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading available tags...</span>
              </div>
            ) : tags.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-2">
                No tags created yet. Click &quot;Create New Tag&quot; above to
                add one.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedTag("")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedTag === ""
                      ? "bg-gray-800 text-white border-gray-800 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  None
                </button>
                {tags.map((t) => {
                  const style = TAG_COLOR_MAP[t.color] || TAG_COLOR_MAP.indigo;
                  const isSelected =
                    selectedTag.toLowerCase() === t.name.toLowerCase();
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTag(t.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? `${style.bg} ${style.text} border-2 ${style.border} shadow-sm ring-2 ring-indigo-200`
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${isSelected ? style.badge : "bg-gray-400"}`}
                      />
                      <span>{t.name}</span>
                      {isSelected && (
                        <Check size={12} className="ml-0.5 text-indigo-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !sentenceText.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Sentence</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SentenceEditModal({
  isOpen,
  sentence,
  mediaType,
  mediaName,
  pageNo,
  onClose,
  onSaved,
}: SentenceEditModalProps) {
  if (!isOpen || !sentence) return null;

  return (
    <SentenceEditContent
      key={sentence.sentence}
      sentence={sentence}
      mediaType={mediaType}
      mediaName={mediaName}
      pageNo={pageNo}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
