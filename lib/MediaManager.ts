import fs from "fs";
import path from "path";
import { Word, WordMeaning, WordOccurrence } from "@/lib/BookManager";

export interface MediaItemSummary {
  name: string;
  totalWords: number;
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
   * Get list of all media items with total word counts
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
      return {
        name,
        totalWords: words.length,
      };
    });
  }

  /**
   * Get all words stored in a specific media file
   */
  getWords(itemName: string): Word[] {
    const filePath = this.getFilePath(itemName);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`Error reading media file ${filePath}:`, e);
      return [];
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
    const filePath = this.getFilePath(cleanName);

    const words = this.getWords(cleanName);

    // Check for duplicate word
    if (words.some((w) => w.word.toLowerCase() === cleanWord.toLowerCase())) {
      throw new Error(
        `Word "${cleanWord}" already exists in ${this.mediaType} "${cleanName}"`,
      );
    }

    words.push({
      word: cleanWord,
      variations: variations || [],
      meanings,
    });

    fs.writeFileSync(filePath, JSON.stringify(words, null, 2), "utf-8");
    return true;
  }

  /**
   * Add a batch of words to a media file in a single operation
   */
  addWordsBatch(
    itemName: string,
    entries: MediaBatchEntry[],
    skipDuplicates: boolean = true,
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

    const words = this.getWords(cleanName);
    let modified = false;

    for (const entry of entries) {
      const cleanWord = entry.word.trim();
      if (!cleanWord) continue;

      const exists = words.some(
        (w) => w.word.toLowerCase() === cleanWord.toLowerCase(),
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

      words.push({
        word: cleanWord,
        variations: entry.variations || [],
        meanings: entry.meanings || [],
      });
      summary.added++;
      modified = true;
    }

    if (modified || !fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(words, null, 2), "utf-8");
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

    const words = this.getWords(cleanName);
    const filtered = words.filter(
      (w) => w.word.toLowerCase() !== wordToDelete.trim().toLowerCase(),
    );

    if (filtered.length === words.length) {
      return false; // Word wasn't found
    }

    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
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
    const found = words.find((w) => w.word.toLowerCase() === normalized);

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
