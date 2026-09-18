import fs from "fs";
import path from "path";
import {
  Word,
  WordMeaning,
  WordOccurrence,
  SentenceEntry,
  MediaEntry,
} from "@/lib/BookManager";

export interface MediaItemSummary {
  name: string;
  totalWords: number;
  totalSentences?: number;
}

export interface MediaBatchEntry {
  word: string;
  meanings: WordMeaning[];
  variations?: string[];
}

export interface MediaBatchResultSummary {
  totalProcessed: number;
  added: number;
  skipped: number;
  errors: string[];
}

export class FlatMediaManager {
  private mediaDir: string;
  private mediaType: "song" | "movie";

  constructor(mediaType: "song" | "movie", customDir?: string) {
    this.mediaType = mediaType;
    this.mediaDir =
      customDir ||
      (mediaType === "song"
        ? path.join(process.cwd(), "songs")
        : path.join(process.cwd(), "movies"));
    this.ensureMediaDirectory();
  }

  /**
   * Ensure the target directory exists (e.g. songs/ or movies/)
   */
  private ensureMediaDirectory(): void {
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
    }
  }

  /**
   * Clean and normalize file name for the media item
   */
  private getFilePath(itemName: string): string {
    const cleanName = itemName.trim();
    return path.join(this.mediaDir, `${cleanName}.json`);
  }

  /**
   * Check if a media item (song or movie) exists
   */
  mediaExists(itemName: string): boolean {
    const filePath = this.getFilePath(itemName);
    return fs.existsSync(filePath);
  }

  /**
   * Create a new media item (initializes an empty JSON array)
   */
  createMedia(itemName: string): boolean {
    const cleanName = itemName.trim();
    if (!cleanName) {
      throw new Error("Item name cannot be empty");
    }

    this.ensureMediaDirectory();
    const filePath = this.getFilePath(cleanName);

    if (fs.existsSync(filePath)) {
      throw new Error(
        `${this.mediaType === "song" ? "Song" : "Movie"} "${cleanName}" already exists`,
      );
    }

    fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
    return true;
  }

  /**
   * Get list of all media items with total word and sentence counts
   */
  getAllMedia(): MediaItemSummary[] {
    this.ensureMediaDirectory();

    if (!fs.existsSync(this.mediaDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.mediaDir)
      .filter((file) => file.endsWith(".json"));

    return files.map((file) => {
      const name = file.replace(/\.json$/, "");
      const words = this.getWords(name);
      const sentences = this.getSentences(name);
      return {
        name,
        totalWords: words.length,
        totalSentences: sentences.length,
      };
    });
  }

  /**
   * Get all raw entries (both words and sentences) stored in a specific media file
   */
  getAllItems(itemName: string): MediaEntry[] {
    const filePath = this.getFilePath(itemName);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.words)) return parsed.words;
      return [];
    } catch (e) {
      console.error(`Error reading media file ${filePath}:`, e);
      return [];
    }
  }

  /**
   * Get all words stored in a specific media file
   */
  getWords(itemName: string): Word[] {
    const items = this.getAllItems(itemName);
    return items.filter(
      (item): item is Word =>
        item.type !== "sentence" && typeof (item as Word).word === "string",
    );
  }

  /**
   * Get all sentences stored in a specific media file
   */
  getSentences(itemName: string): SentenceEntry[] {
    const items = this.getAllItems(itemName);
    return items.filter(
      (item): item is SentenceEntry =>
        item.type === "sentence" &&
        typeof (item as SentenceEntry).sentence === "string",
    );
  }

  /**
   * Get lyrics stored for this media item (songs)
   */
  getLyrics(itemName: string): string {
    const filePath = this.getFilePath(itemName);
    if (!fs.existsSync(filePath)) {
      return "";
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.lyrics === "string") {
        return parsed.lyrics;
      }
      return "";
    } catch (e) {
      console.error(`Error reading lyrics from ${filePath}:`, e);
      return "";
    }
  }

  /**
   * Save or update lyrics for this media item
   */
  setLyrics(itemName: string, lyrics: string): boolean {
    const cleanName = itemName.trim();
    this.ensureMediaDirectory();
    const items = this.getAllItems(cleanName);
    this.saveMediaFile(cleanName, items, lyrics || "");
    return true;
  }

  /**
   * Internal helper to persist all items and lyrics to disk
   */
  private saveMediaFile(
    itemName: string,
    items: MediaEntry[],
    explicitLyrics?: string,
  ): void {
    const cleanName = itemName.trim();
    this.ensureMediaDirectory();
    const filePath = this.getFilePath(cleanName);

    const currentLyrics =
      explicitLyrics !== undefined ? explicitLyrics : this.getLyrics(cleanName);

    if (currentLyrics && currentLyrics.trim()) {
      const payload = {
        lyrics: currentLyrics,
        words: items,
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    } else {
      fs.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf-8");
    }
  }

  /**
   * Add a single word to a media file
   */
  addWord(
    itemName: string,
    word: string,
    meanings: WordMeaning[],
    variations?: string[],
  ): boolean {
    const cleanName = itemName.trim();
    const cleanWord = word.trim();
    if (!cleanWord) {
      throw new Error("Word cannot be empty");
    }

    this.ensureMediaDirectory();

    const items = this.getAllItems(cleanName);

    // Check for duplicate word
    if (
      items.some(
        (w) =>
          w.type !== "sentence" &&
          (w as Word).word &&
          (w as Word).word.toLowerCase() === cleanWord.toLowerCase(),
      )
    ) {
      throw new Error(
        `Word "${cleanWord}" already exists in ${this.mediaType} "${cleanName}"`,
      );
    }

    items.push({
      type: "word",
      word: cleanWord,
      variations: variations || [],
      meanings,
    });

    this.saveMediaFile(cleanName, items);
    return true;
  }

  /**
   * Add a batch of words to a media file in a single operation
   */
  addWordsBatch(
    itemName: string,
    entries: MediaBatchEntry[],
    skipDuplicates: boolean = true,
    lyrics?: string,
  ): MediaBatchResultSummary {
    const cleanName = itemName.trim();
    this.ensureMediaDirectory();
    const filePath = this.getFilePath(cleanName);

    const summary: MediaBatchResultSummary = {
      totalProcessed: entries.length,
      added: 0,
      skipped: 0,
      errors: [],
    };

    const items = this.getAllItems(cleanName);
    let modified = false;

    for (const entry of entries) {
      const cleanWord = entry.word.trim();
      if (!cleanWord) continue;

      const exists = items.some(
        (w) =>
          w.type !== "sentence" &&
          (w as Word).word &&
          (w as Word).word.toLowerCase() === cleanWord.toLowerCase(),
      );

      if (exists) {
        if (skipDuplicates) {
          summary.skipped++;
          continue;
        } else {
          summary.errors.push(
            `Word "${cleanWord}" already exists in "${cleanName}"`,
          );
          continue;
        }
      }

      items.push({
        type: "word",
        word: cleanWord,
        variations: entry.variations || [],
        meanings: entry.meanings || [],
      });
      summary.added++;
      modified = true;
    }

    if (modified || !fs.existsSync(filePath) || lyrics !== undefined) {
      this.saveMediaFile(cleanName, items, lyrics);
    }

    return summary;
  }

  /**
   * Delete a word from a media file
   */
  deleteWord(itemName: string, wordToDelete: string): boolean {
    const cleanName = itemName.trim();
    const filePath = this.getFilePath(cleanName);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `${this.mediaType === "song" ? "Song" : "Movie"} "${cleanName}" does not exist`,
      );
    }

    const items = this.getAllItems(cleanName);
    const normDelete = wordToDelete.trim().toLowerCase();
    const filtered = items.filter(
      (w) =>
        !(
          w.type !== "sentence" &&
          (w as Word).word &&
          (w as Word).word.toLowerCase() === normDelete
        ),
    );

    if (filtered.length === items.length) {
      return false; // Word wasn't found
    }

    this.saveMediaFile(cleanName, filtered);
    return true;
  }

  /**
   * Update a word's meanings, variations, or spelling in a media file
   */
  updateWord(
    itemName: string,
    originalWord: string,
    updatedWordData: {
      word?: string;
      meanings: WordMeaning[];
      variations?: string[];
    },
  ): boolean {
    const cleanName = itemName.trim();
    const filePath = this.getFilePath(cleanName);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `${this.mediaType === "song" ? "Song" : "Movie"} "${cleanName}" does not exist`,
      );
    }

    const items = this.getAllItems(cleanName);
    const normOriginal = originalWord.trim().toLowerCase();
    const index = items.findIndex(
      (w) =>
        w.type !== "sentence" &&
        (w as Word).word &&
        (w as Word).word.toLowerCase() === normOriginal,
    );

    if (index === -1) {
      throw new Error(
        `Word "${originalWord}" not found in ${this.mediaType} "${cleanName}"`,
      );
    }

    const existingWord = items[index] as Word;
    const newWordName = (updatedWordData.word || originalWord).trim();
    items[index] = {
      type: "word",
      word: newWordName,
      meanings: updatedWordData.meanings,
      variations: updatedWordData.variations || existingWord.variations || [],
    };

    this.saveMediaFile(cleanName, items);
    return true;
  }

  /**
   * Add a sentence to a media file
   */
  addSentence(
    itemName: string,
    sentence: string,
    meaning?: string,
    tag?: string,
  ): boolean {
    const cleanName = itemName.trim();
    const cleanSentence = sentence.trim();
    if (!cleanSentence) {
      throw new Error("Sentence cannot be empty");
    }

    this.ensureMediaDirectory();
    const items = this.getAllItems(cleanName);

    const normSentence = cleanSentence.toLowerCase();
    if (
      items.some(
        (item) =>
          item.type === "sentence" &&
          (item as SentenceEntry).sentence.trim().toLowerCase() ===
            normSentence,
      )
    ) {
      throw new Error(
        `Sentence already exists in ${this.mediaType} "${cleanName}"`,
      );
    }

    const cleanTag = tag?.trim() || "";
    const sentenceEntry: SentenceEntry = {
      type: "sentence",
      sentence: cleanSentence,
      meaning: meaning?.trim() || "",
      tag: cleanTag,
      tags: cleanTag ? [cleanTag] : [],
      createdAt: new Date().toISOString(),
    };

    items.push(sentenceEntry);
    this.saveMediaFile(cleanName, items);
    return true;
  }

  /**
   * Update a sentence in a media file
   */
  updateSentence(
    itemName: string,
    originalSentence: string,
    updatedData: {
      sentence?: string;
      meaning?: string;
      tag?: string;
    },
  ): boolean {
    const cleanName = itemName.trim();
    const filePath = this.getFilePath(cleanName);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `${this.mediaType === "song" ? "Song" : "Movie"} "${cleanName}" does not exist`,
      );
    }

    const items = this.getAllItems(cleanName);
    const normOriginal = originalSentence.trim().toLowerCase();
    const index = items.findIndex(
      (item) =>
        item.type === "sentence" &&
        (item as SentenceEntry).sentence.trim().toLowerCase() === normOriginal,
    );

    if (index === -1) {
      throw new Error(`Sentence not found in ${this.mediaType} "${cleanName}"`);
    }

    const existing = items[index] as SentenceEntry;
    const newSentenceText = updatedData.sentence
      ? updatedData.sentence.trim()
      : existing.sentence;
    const cleanTag =
      updatedData.tag !== undefined
        ? updatedData.tag.trim()
        : existing.tag || "";

    items[index] = {
      ...existing,
      sentence: newSentenceText,
      meaning:
        updatedData.meaning !== undefined
          ? updatedData.meaning.trim()
          : existing.meaning,
      tag: cleanTag,
      tags: cleanTag ? [cleanTag] : [],
    };

    this.saveMediaFile(cleanName, items);
    return true;
  }

  /**
   * Delete a sentence from a media file
   */
  deleteSentence(itemName: string, sentenceToDelete: string): boolean {
    const cleanName = itemName.trim();
    const filePath = this.getFilePath(cleanName);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `${this.mediaType === "song" ? "Song" : "Movie"} "${cleanName}" does not exist`,
      );
    }

    const items = this.getAllItems(cleanName);
    const normDelete = sentenceToDelete.trim().toLowerCase();
    const filtered = items.filter(
      (item) =>
        !(
          item.type === "sentence" &&
          (item as SentenceEntry).sentence.trim().toLowerCase() === normDelete
        ),
    );

    if (filtered.length === items.length) {
      return false;
    }

    this.saveMediaFile(cleanName, filtered);
    return true;
  }

  /**
   * Delete an entire media file
   */
  deleteMedia(itemName: string): boolean {
    const filePath = this.getFilePath(itemName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Search for a word in a specific media item
   */
  getWordOccurrences(itemName: string, word: string): WordOccurrence | null {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return null;

    const words = this.getWords(itemName);
    const found = words.find(
      (w) => w.word && w.word.toLowerCase() === normalized,
    );

    if (!found) return null;

    return {
      word: found.word,
      variations: found.variations,
      meanings: found.meanings,
      frequency: 1,
      pages: [], // Songs and movies have no pages
      bookName: itemName,
    };
  }

  /**
   * Search for word occurrences across ALL items in this media collection
   */
  getWordStatsAcrossAll(
    word: string,
  ): { name: string; frequency: number; meanings: WordMeaning[] }[] {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return [];

    const allMedia = this.getAllMedia();
    const results: {
      name: string;
      frequency: number;
      meanings: WordMeaning[];
    }[] = [];

    for (const item of allMedia) {
      const occurrence = this.getWordOccurrences(item.name, normalized);
      if (occurrence) {
        results.push({
          name: item.name,
          frequency: occurrence.frequency,
          meanings: occurrence.meanings,
        });
      }
    }

    return results;
  }
}

// Singletons for songs and movies
export const songManager = new FlatMediaManager("song");
export const movieManager = new FlatMediaManager("movie");
