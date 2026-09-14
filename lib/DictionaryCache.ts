import fs from "fs";
import path from "path";
import { EnrichedWordData, MeaningItem } from "@/lib/dictionary";
import { Word } from "@/lib/BookManager";

interface CacheFileFormat {
  version: number;
  lastUpdated: string;
  totalWords: number;
  entries: Record<string, EnrichedWordData>;
}

export class DictionaryCacheManager {
  private cacheDir: string;
  private cacheFile: string;
  private cacheMap: Map<string, EnrichedWordData> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.cacheDir = path.join(process.cwd(), ".cache");
    this.cacheFile = path.join(
      process.cwd(),
      ".cache",
      "dictionary_cache.json",
    );
  }

  /**
   * Ensure cache directory exists and load persisted words + pre-seed from library
   */
  public ensureInitialized(): void {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // 1. Read existing persistent cache from disk if available
      if (fs.existsSync(this.cacheFile)) {
        try {
          const raw = fs.readFileSync(this.cacheFile, "utf-8");
          const parsed: CacheFileFormat = JSON.parse(raw);
          if (parsed && typeof parsed.entries === "object") {
            for (const [key, val] of Object.entries(parsed.entries)) {
              if (val && val.word) {
                this.cacheMap.set(key.toLowerCase().trim(), val);
              }
            }
          }
        } catch (readErr) {
          console.error("Error reading persistent dictionary cache:", readErr);
        }
      }

      // 2. Pre-seed from existing books, songs, and movies
      const initialSize = this.cacheMap.size;
      this.preseedFromLibrary();
      const afterPreseedSize = this.cacheMap.size;

      // Save if new words were pre-seeded or file didn't exist
      if (afterPreseedSize > initialSize || !fs.existsSync(this.cacheFile)) {
        this.saveToDisk();
      }

      this.initialized = true;
    } catch (err) {
      console.error("Error initializing persistent dictionary cache:", err);
      this.initialized = true; // prevent infinite retry loops
    }
  }

  /**
   * Scans existing books/, songs/, and movies/ to harvest previously recorded words
   */
  private preseedFromLibrary(): void {
    // 1. Pre-seed from Books
    const booksDir = path.join(process.cwd(), "books");
    if (fs.existsSync(booksDir)) {
      try {
        const bookFolders = fs.readdirSync(booksDir).filter((file) => {
          const folderPath = path.join(booksDir, file);
          return fs.statSync(folderPath).isDirectory();
        });

        for (const book of bookFolders) {
          const bookPath = path.join(booksDir, book);
          const pageFiles = fs
            .readdirSync(bookPath)
            .filter((f) => f.startsWith("page_") && f.endsWith(".json"));

          for (const pageFile of pageFiles) {
            try {
              const raw = fs.readFileSync(
                path.join(bookPath, pageFile),
                "utf-8",
              );
              const words: Word[] = JSON.parse(raw);
              this.indexWordList(words);
            } catch {
              // Ignore single file parse errors
            }
          }
        }
      } catch {
        // Books folder read error
      }
    }

    // 2. Pre-seed from Songs
    const songsDir = path.join(process.cwd(), "songs");
    if (fs.existsSync(songsDir)) {
      try {
        const songFiles = fs
          .readdirSync(songsDir)
          .filter((f) => f.endsWith(".json"));

        for (const songFile of songFiles) {
          try {
            const raw = fs.readFileSync(path.join(songsDir, songFile), "utf-8");
            const parsed = JSON.parse(raw);
            const words: Word[] = Array.isArray(parsed)
              ? parsed
              : parsed?.words || [];
            this.indexWordList(words);
          } catch {
            // Ignore single file parse errors
          }
        }
      } catch {
        // Songs folder read error
      }
    }

    // 3. Pre-seed from Movies
    const moviesDir = path.join(process.cwd(), "movies");
    if (fs.existsSync(moviesDir)) {
      try {
        const movieFiles = fs
          .readdirSync(moviesDir)
          .filter((f) => f.endsWith(".json"));

        for (const movieFile of movieFiles) {
          try {
            const raw = fs.readFileSync(
              path.join(moviesDir, movieFile),
              "utf-8",
            );
            const parsed = JSON.parse(raw);
            const words: Word[] = Array.isArray(parsed)
              ? parsed
              : parsed?.words || [];
            this.indexWordList(words);
          } catch {
            // Ignore single file parse errors
          }
        }
      } catch {
        // Movies folder read error
      }
    }
  }

  /**
   * Helper to index a list of Word items into cache if valid
   */
  private indexWordList(words: Word[]): void {
    if (!Array.isArray(words)) return;

    for (const w of words) {
      if (!w || !w.word) continue;
      const cleanWord = w.word.trim();
      const norm = cleanWord.toLowerCase();

      // If word not in cache yet and has valid meanings, pre-seed it
      if (
        !this.cacheMap.has(norm) &&
        Array.isArray(w.meanings) &&
        w.meanings.length > 0
      ) {
        const validMeanings: MeaningItem[] = w.meanings
          .filter((m) => m && m.definition && m.definition.trim())
          .map((m) => ({
            partOfSpeech: m.partOfSpeech || "general",
            definition: m.definition.trim(),
            examples: Array.isArray(m.examples)
              ? m.examples.filter(Boolean).map((ex) => String(ex).trim())
              : [],
          }));

        if (validMeanings.length > 0) {
          this.cacheMap.set(norm, {
            word: cleanWord,
            meanings: validMeanings,
            variations: Array.isArray(w.variations) ? w.variations : [],
            source: "cache",
          });
        }
      }
    }
  }

  /**
   * Save the current memory cache map to .cache/dictionary_cache.json on disk
   */
  private saveToDisk(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      const entriesObj: Record<string, EnrichedWordData> = {};
      for (const [key, val] of this.cacheMap.entries()) {
        entriesObj[key] = val;
      }

      const payload: CacheFileFormat = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        totalWords: this.cacheMap.size,
        entries: entriesObj,
      };

      fs.writeFileSync(
        this.cacheFile,
        JSON.stringify(payload, null, 2),
        "utf-8",
      );
    } catch (err) {
      console.error("Error writing dictionary cache to disk:", err);
    }
  }

  /**
   * Get a cached word entry
   */
  public get(word: string): EnrichedWordData | undefined {
    this.ensureInitialized();
    return this.cacheMap.get(word.trim().toLowerCase());
  }

  /**
   * Check if a word is in the persistent cache
   */
  public has(word: string): boolean {
    this.ensureInitialized();
    return this.cacheMap.has(word.trim().toLowerCase());
  }

  /**
   * Set a word entry in cache and persist to disk
   */
  public set(word: string, data: EnrichedWordData): void {
    this.ensureInitialized();
    const norm = word.trim().toLowerCase();
    this.cacheMap.set(norm, { ...data, source: "cache" });
    this.saveToDisk();
  }

  /**
   * Set multiple word entries in cache in a single disk write operation
   */
  public setBatch(entries: Record<string, EnrichedWordData>): void {
    this.ensureInitialized();
    let changed = false;

    for (const [rawWord, data] of Object.entries(entries)) {
      const norm = rawWord.trim().toLowerCase();
      this.cacheMap.set(norm, { ...data, source: "cache" });
      changed = true;
    }

    if (changed) {
      this.saveToDisk();
    }
  }

  /**
   * Returns cache stats
   */
  public getStats(): {
    totalWords: number;
    cacheFile: string;
    isPersistent: boolean;
  } {
    this.ensureInitialized();
    return {
      totalWords: this.cacheMap.size,
      cacheFile: this.cacheFile,
      isPersistent: fs.existsSync(this.cacheFile),
    };
  }
}

// Global server-side singleton
export const persistentDictionaryCache = new DictionaryCacheManager();
