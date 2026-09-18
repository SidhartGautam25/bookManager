"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  Loader2,
  Database,
  Sparkles,
} from "lucide-react";
import { Word, WordMeaning } from "@/lib/BookManager";

interface WordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordData: Word | null;
  onSave: (updatedWord: Word) => Promise<void>;
  contextTitle?: string;
}

interface WordEditContentProps {
  wordData: Word;
  onClose: () => void;
  onSave: (updatedWord: Word) => Promise<void>;
  contextTitle: string;
}

const COMMON_POS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "idiom",
  "phrasal verb",
  "general",
];

function WordEditContent({
  wordData,
  onClose,
  onSave,
  contextTitle,
}: WordEditContentProps) {
  const [word, setWord] = useState(wordData.word);
  const [variationsInput, setVariationsInput] = useState(
    (wordData.variations || []).join(", "),
  );
  const [meanings, setMeanings] = useState<WordMeaning[]>(
    wordData.meanings && wordData.meanings.length > 0
      ? JSON.parse(JSON.stringify(wordData.meanings))
      : [{ partOfSpeech: "general", definition: "", examples: [""] }],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMeaning = () => {
    setMeanings((prev) => [
      ...prev,
      {
        partOfSpeech: "general",
        definition: "",
        examples: [""],
      },
    ]);
  };

  const handleRemoveMeaning = (index: number) => {
    if (meanings.length <= 1) return;
    setMeanings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMeaningChange = (
    index: number,
    field: "partOfSpeech" | "definition",
    value: string,
  ) => {
    setMeanings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleExampleChange = (mIdx: number, exIdx: number, value: string) => {
    setMeanings((prev) => {
      const updated = [...prev];
      const newExamples = [...(updated[mIdx].examples || [])];
      newExamples[exIdx] = value;
      updated[mIdx] = { ...updated[mIdx], examples: newExamples };
      return updated;
    });
  };

  const handleAddExample = (mIdx: number) => {
    setMeanings((prev) => {
      const updated = [...prev];
      const newExamples = [...(updated[mIdx].examples || []), ""];
      updated[mIdx] = { ...updated[mIdx], examples: newExamples };
      return updated;
    });
  };

  const handleRemoveExample = (mIdx: number, exIdx: number) => {
    setMeanings((prev) => {
      const updated = [...prev];
      const newExamples = (updated[mIdx].examples || []).filter(
        (_, i) => i !== exIdx,
      );
      updated[mIdx] = { ...updated[mIdx], examples: newExamples };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim();
    if (!cleanWord) {
      setError("Word name cannot be empty");
      return;
    }

    const cleanMeanings = meanings
      .map((m) => ({
        partOfSpeech: (m.partOfSpeech || "general").trim(),
        definition: m.definition.trim(),
        examples: (m.examples || []).map((ex) => ex.trim()).filter(Boolean),
      }))
      .filter((m) => m.definition.length > 0);

    if (cleanMeanings.length === 0) {
      setError("At least one meaning with a definition is required");
      return;
    }

    const variations = variationsInput
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter(Boolean);

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        word: cleanWord,
        meanings: cleanMeanings,
        variations,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
            {contextTitle}
          </span>
          <h2 className="text-xl font-black text-gray-900 capitalize tracking-tight flex items-center gap-2">
            <span>{wordData.word}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 rounded-xl transition-colors shadow-2xs"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
      >
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {/* Word Name & Variations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">
              Word Spelling
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">
              Variations (comma-separated)
            </label>
            <input
              type="text"
              value={variationsInput}
              onChange={(e) => setVariationsInput(e.target.value)}
              placeholder="grafts, grafting, grafted"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Meanings Header */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" />
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Meanings & Definitions ({meanings.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={handleAddMeaning}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Plus size={14} />
            Add Meaning
          </button>
        </div>

        {/* Meanings List */}
        <div className="space-y-4">
          {meanings.map((meaning, mIdx) => (
            <div
              key={mIdx}
              className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Part of speech selector */}
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  <span className="text-xs font-bold text-gray-500 mr-1">
                    POS:
                  </span>
                  <input
                    type="text"
                    value={meaning.partOfSpeech}
                    onChange={(e) =>
                      handleMeaningChange(mIdx, "partOfSpeech", e.target.value)
                    }
                    placeholder="e.g. verb, noun"
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-200 bg-white text-indigo-700 uppercase tracking-wider w-28 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <div className="hidden sm:flex items-center gap-1">
                    {COMMON_POS.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          handleMeaningChange(mIdx, "partOfSpeech", pos)
                        }
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md transition-colors ${
                          meaning.partOfSpeech.toLowerCase() === pos
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {meanings.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMeaning(mIdx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove this meaning"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Definition */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600">
                  Definition
                </label>
                <textarea
                  rows={2}
                  value={meaning.definition}
                  onChange={(e) =>
                    handleMeaningChange(mIdx, "definition", e.target.value)
                  }
                  placeholder="Enter precise definition..."
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Usage Examples */}
              <div className="space-y-2 pt-1 border-t border-gray-200/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Usage Examples
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddExample(mIdx)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add Example
                  </button>
                </div>

                <div className="space-y-2">
                  {(meaning.examples || []).map((example, exIdx) => (
                    <div key={exIdx} className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-mono">•</span>
                      <input
                        type="text"
                        value={example}
                        onChange={(e) =>
                          handleExampleChange(mIdx, exIdx, e.target.value)
                        }
                        placeholder="Example sentence illustrating usage..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none italic text-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExample(mIdx, exIdx)}
                        className="p-1 text-gray-300 hover:text-red-500"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Persistent Cache Sync Notice */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
          <Database
            size={16}
            className="text-emerald-600 flex-shrink-0 mt-0.5"
          />
          <p className="leading-relaxed font-medium">
            <strong className="font-bold">Persistent Cache Sync:</strong> Saving
            will update this word in the media file AND automatically write the
            new definitions to the persistent dictionary cache (
            <code className="text-emerald-800 font-mono text-[11px]">
              data/dictinary/dictionary_cache.json
            </code>
            ). Future batch lookups for this word will immediately use your
            updated meaning!
          </p>
        </div>
      </form>

      {/* Modal Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Saving & Syncing...</span>
            </>
          ) : (
            <>
              <Check size={14} />
              <span>Save & Sync Cache</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function WordEditModal({
  isOpen,
  onClose,
  wordData,
  onSave,
  contextTitle = "Edit Word",
}: WordEditModalProps) {
  if (!isOpen || !wordData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <WordEditContent
        key={wordData.word}
        wordData={wordData}
        onClose={onClose}
        onSave={onSave}
        contextTitle={contextTitle}
      />
    </div>
  );
}
