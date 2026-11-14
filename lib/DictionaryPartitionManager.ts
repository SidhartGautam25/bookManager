import fs from "fs";
import path from "path";

export interface DictionaryMeaning {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

export interface DictionaryEntry {
  word: string;
  meanings: DictionaryMeaning[];
  variations?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DictionaryStats {
  totalWords: number;
  letterCounts: Record<string, number>;
}

export class DictionaryPartitionManager {
  private dictionaryDir: string;
  private initialized: boolean = false;

  constructor(dictionaryDir?: string) {
    // Dynamic project root path resolution using Node.js process.cwd()
    this.dictionaryDir = dictionaryDir
      ? path.resolve(dictionaryDir)
      : path.resolve(process.cwd(), "dictionary");
    this.ensureInitialized();
  }

  /**
   * Ensure root /dictionary folder and all a.json..z.json files exist
   */
  public ensureInitialized(): void {
    if (this.initialized) return;

    if (!fs.existsSync(this.dictionaryDir)) {
      fs.mkdirSync(this.dictionaryDir, { recursive: true });
    }

    // Initialize a.json to z.json and other.json if missing
    for (let i = 97; i <= 122; i++) {
      const letter = String.fromCharCode(i);
      const filePath = path.join(this.dictionaryDir, `${letter}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf-8");
      }
    }

    const otherPath = path.join(this.dictionaryDir, "other.json");
    if (!fs.existsSync(otherPath)) {
      fs.writeFileSync(otherPath, JSON.stringify({}, null, 2), "utf-8");
    }

    this.initialized = true;
  }

  /**
   * Determine the letter bucket for a given word
   */
  public getLetterKey(word: string): string {
    const trimmed = (word || "").trim().toLowerCase();
    if (!trimmed) return "other";
    const firstChar = trimmed[0];
    if (firstChar >= "a" && firstChar <= "z") {
      return firstChar;
    }
    return "other";
  }

  /**
   * Get the file path for a word's letter bucket
   */
  public getLetterFilePath(letterOrWord: string): string {
    this.ensureInitialized();
    const key =
      letterOrWord.length === 1 && letterOrWord >= "a" && letterOrWord <= "z"
        ? letterOrWord.toLowerCase()
        : this.getLetterKey(letterOrWord);
    return path.join(this.dictionaryDir, `${key}.json`);
  }

  /**
   * Read all entries for a specific letter file
   */
  public readLetterFile(letter: string): Record<string, DictionaryEntry> {
    this.ensureInitialized();
    const filePath = this.getLetterFilePath(letter);
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) || {};
    } catch (err) {
      console.error(`Error reading letter file ${filePath}:`, err);
      return {};
    }
  }

  /**
   * Write entries back to a specific letter file safely without Windows rename lock issues
   */
  public writeLetterFile(
    letter: string,
    entries: Record<string, DictionaryEntry>,
  ): void {
    this.ensureInitialized();
    const filePath = this.getLetterFilePath(letter);
    const content = JSON.stringify(entries, null, 2);

    try {
      fs.writeFileSync(filePath, content, "utf-8");
    } catch (err) {
      // In case of transient file locking by OS or watchers, retry once
      try {
        fs.writeFileSync(filePath, content, "utf-8");
      } catch (retryErr) {
        throw new Error(
          `Failed to save dictionary file ${filePath}: ${(retryErr as Error).message}`,
        );
      }
    }
  }

  /**
   * Check if a word exists in the dictionary
   */
  public hasWord(word: string): boolean {
    const key = (word || "").trim().toLowerCase();
    if (!key) return false;
    const letter = this.getLetterKey(key);
    const entries = this.readLetterFile(letter);
    return Object.prototype.hasOwnProperty.call(entries, key);
  }

  /**
   * Get a word entry from the dictionary
   */
  public getWord(word: string): DictionaryEntry | null {
    const key = (word || "").trim().toLowerCase();
    if (!key) return null;
    const letter = this.getLetterKey(key);
    const entries = this.readLetterFile(letter);
    return entries[key] || null;
  }

  /**
   * Add a word to its respective letter file.
   * If overwrite is false and word exists, returns { added: false, reason: "already_exists" }
   */
  public addWord(
    entry: {
      word: string;
      meanings: DictionaryMeaning[];
      variations?: string[];
    },
    overwrite: boolean = false,
  ): { success: boolean; added: boolean; entry: DictionaryEntry; reason?: string } {
    this.ensureInitialized();
    const rawWord = (entry.word || "").trim();
    const key = rawWord.toLowerCase();
    if (!key) {
      throw new Error("Word cannot be empty");
    }

    const letter = this.getLetterKey(key);
    const entries = this.readLetterFile(letter);

    if (entries[key] && !overwrite) {
      return {
        success: true,
        added: false,
        entry: entries[key],
        reason: "already_exists",
      };
    }

    const now = new Date().toISOString();
    const cleanMeanings: DictionaryMeaning[] = (entry.meanings || []).map((m) => ({
      partOfSpeech: (m.partOfSpeech || "").trim().toLowerCase(),
      definition: (m.definition || "").trim(),
      examples: (m.examples || [])
        .map((ex) => (typeof ex === "string" ? ex.trim() : ""))
        .filter(Boolean),
    }));

    const cleanVariations = Array.from(
      new Set(
        (entry.variations || [])
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean),
      ),
    );

    const newEntry: DictionaryEntry = {
      word: rawWord,
      meanings: cleanMeanings,
      variations: cleanVariations,
      createdAt: entries[key]?.createdAt || now,
      updatedAt: now,
    };

    entries[key] = newEntry;
    this.writeLetterFile(letter, entries);

    return {
      success: true,
      added: true,
      entry: newEntry,
    };
  }

  /**
   * Update an existing word's meanings, variations, etc.
   */
  public updateWord(
    originalWord: string,
    updated: {
      word?: string;
      meanings?: DictionaryMeaning[];
      variations?: string[];
    },
  ): DictionaryEntry {
    this.ensureInitialized();
    const origKey = (originalWord || "").trim().toLowerCase();
    if (!origKey) throw new Error("Original word is required");

    const origLetter = this.getLetterKey(origKey);
    const origEntries = this.readLetterFile(origLetter);

    if (!origEntries[origKey]) {
      throw new Error(`Word "${originalWord}" not found in dictionary`);
    }

    const existing = origEntries[origKey];
    const newWord = updated.word ? updated.word.trim() : existing.word;
    const newKey = newWord.toLowerCase();
    const now = new Date().toISOString();

    const cleanMeanings = updated.meanings
      ? updated.meanings.map((m) => ({
          partOfSpeech: (m.partOfSpeech || "").trim().toLowerCase(),
          definition: (m.definition || "").trim(),
          examples: (m.examples || [])
            .map((ex) => (typeof ex === "string" ? ex.trim() : ""))
            .filter(Boolean),
        }))
      : existing.meanings;

    const cleanVariations = updated.variations
      ? Array.from(
          new Set(
            updated.variations
              .map((v) => (typeof v === "string" ? v.trim() : ""))
              .filter(Boolean),
          ),
        )
      : existing.variations || [];

    const updatedEntry: DictionaryEntry = {
      word: newWord,
      meanings: cleanMeanings,
      variations: cleanVariations,
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    if (newKey === origKey) {
      origEntries[origKey] = updatedEntry;
      this.writeLetterFile(origLetter, origEntries);
    } else {
      // Word was renamed: remove from old letter file, insert into new letter file
      delete origEntries[origKey];
      this.writeLetterFile(origLetter, origEntries);

      const targetLetter = this.getLetterKey(newKey);
      const targetEntries = this.readLetterFile(targetLetter);
      targetEntries[newKey] = updatedEntry;
      this.writeLetterFile(targetLetter, targetEntries);
    }

    return updatedEntry;
  }

  /**
   * Add an example sentence to a specific meaning of a word
   */
  public addExample(
    word: string,
    meaningIndex: number,
    example: string,
  ): DictionaryEntry {
    const cleanExample = (example || "").trim();
    if (!cleanExample) throw new Error("Example cannot be empty");

    const entry = this.getWord(word);
    if (!entry) throw new Error(`Word "${word}" not found in dictionary`);

    if (!entry.meanings[meaningIndex]) {
      throw new Error(`Meaning index ${meaningIndex} out of range`);
    }

    if (!entry.meanings[meaningIndex].examples.includes(cleanExample)) {
      entry.meanings[meaningIndex].examples.push(cleanExample);
    }

    return this.updateWord(word, { meanings: entry.meanings });
  }

  /**
   * Delete a word from the dictionary
   */
  public deleteWord(word: string): boolean {
    const key = (word || "").trim().toLowerCase();
    if (!key) return false;

    const letter = this.getLetterKey(key);
    const entries = this.readLetterFile(letter);

    if (entries[key]) {
      delete entries[key];
      this.writeLetterFile(letter, entries);
      return true;
    }
    return false;
  }

  /**
   * Get dictionary statistics (total words & counts per letter)
   */
  public getStats(): DictionaryStats {
    this.ensureInitialized();
    let totalWords = 0;
    const letterCounts: Record<string, number> = {};

    for (let i = 97; i <= 122; i++) {
      const letter = String.fromCharCode(i);
      const count = Object.keys(this.readLetterFile(letter)).length;
      letterCounts[letter] = count;
      totalWords += count;
    }

    const otherCount = Object.keys(this.readLetterFile("other")).length;
    letterCounts["other"] = otherCount;
    totalWords += otherCount;

    return { totalWords, letterCounts };
  }

  /**
   * Search words across dictionary files with optional letter filtering
   */
  public searchWords(
    query: string,
    options: { letter?: string; limit?: number; offset?: number } = {},
  ): { total: number; entries: DictionaryEntry[] } {
    this.ensureInitialized();
    const cleanQuery = (query || "").trim().toLowerCase();
    const { letter, limit = 50, offset = 0 } = options;

    let targetLetters: string[] = [];
    if (letter) {
      targetLetters = [letter.toLowerCase()];
    } else if (cleanQuery.length >= 1 && cleanQuery[0] >= "a" && cleanQuery[0] <= "z") {
      // If user typed a query, search primary matching letter first, plus others
      targetLetters = [cleanQuery[0]];
    } else {
      targetLetters = [];
      for (let i = 97; i <= 122; i++) {
        targetLetters.push(String.fromCharCode(i));
      }
      targetLetters.push("other");
    }

    const matches: DictionaryEntry[] = [];

    for (const l of targetLetters) {
      const fileEntries = this.readLetterFile(l);
      for (const [key, item] of Object.entries(fileEntries)) {
        if (!cleanQuery || key.includes(cleanQuery)) {
          matches.push(item);
        }
      }
    }

    // Sort matches alphabetically by word
    matches.sort((a, b) => a.word.localeCompare(b.word));

    return {
      total: matches.length,
      entries: matches.slice(offset, offset + limit),
    };
  }

  /**
   * Migrate existing words from books, data/dictinary/dictionary_cache.json, songs, and movies
   */
  public migrateFromLegacySources(): {
    seededFromCache: number;
    seededFromBooks: number;
    seededFromMedia: number;
    totalUniqueInDictionary: number;
  } {
    this.ensureInitialized();
    let seededFromCache = 0;
    let seededFromBooks = 0;
    let seededFromMedia = 0;

    // 1. Ingest existing dictionary_cache.json
    const cachePath = path.join(
      process.cwd(),
      "data",
      "dictinary",
      "dictionary_cache.json",
    );
    if (fs.existsSync(cachePath)) {
      try {
        const raw = fs.readFileSync(cachePath, "utf-8");
        const parsed = JSON.parse(raw);
        const entries = parsed.entries || {};
        for (const val of Object.values(entries)) {
          const item = val as {
            word?: string;
            meanings?: DictionaryMeaning[];
            variations?: string[];
          };
          if (item && item.word && Array.isArray(item.meanings)) {
            const res = this.addWord(
              {
                word: item.word,
                meanings: item.meanings,
                variations: item.variations,
              },
              false, // do not overwrite if exists
            );
            if (res.added) seededFromCache++;
          }
        }
      } catch (err) {
        console.error("Error migrating from dictionary_cache.json:", err);
      }
    }

    // 2. Ingest existing books/
    const booksDir = path.join(process.cwd(), "books");
    if (fs.existsSync(booksDir)) {
      try {
        const bookFolders = fs.readdirSync(booksDir).filter((f) => {
          const fp = path.join(booksDir, f);
          return fs.statSync(fp).isDirectory();
        });

        for (const book of bookFolders) {
          const bDir = path.join(booksDir, book);
          const pageFiles = fs
            .readdirSync(bDir)
            .filter((f) => f.startsWith("page_") && f.endsWith(".json"));

          for (const pf of pageFiles) {
            try {
              const content = fs.readFileSync(path.join(bDir, pf), "utf-8");
              const items = JSON.parse(content);
              if (Array.isArray(items)) {
                for (const it of items) {
                  if (it && it.word && Array.isArray(it.meanings)) {
                    const res = this.addWord(
                      {
                        word: it.word,
                        meanings: it.meanings,
                        variations: it.variations,
                      },
                      false,
                    );
                    if (res.added) seededFromBooks++;
                  }
                }
              }
            } catch (pErr) {
              console.error(`Error reading page file ${pf} of book ${book}:`, pErr);
            }
          }
        }
      } catch (bErr) {
        console.error("Error migrating from books directory:", bErr);
      }
    }

    // 3. Ingest existing songs/ and movies/
    for (const dirName of ["songs", "movies"]) {
      const mediaDir = path.join(process.cwd(), dirName);
      if (fs.existsSync(mediaDir)) {
        try {
          const files = fs.readdirSync(mediaDir).filter((f) => f.endsWith(".json"));
          for (const f of files) {
            try {
              const content = fs.readFileSync(path.join(mediaDir, f), "utf-8");
              const items = JSON.parse(content);
              if (Array.isArray(items)) {
                for (const it of items) {
                  if (it && it.word && Array.isArray(it.meanings)) {
                    const res = this.addWord(
                      {
                        word: it.word,
                        meanings: it.meanings,
                        variations: it.variations,
                      },
                      false,
                    );
                    if (res.added) seededFromMedia++;
                  }
                }
              }
            } catch {
              // Ignore single file error
            }
          }
        } catch {
          // Ignore dir error
        }
      }
    }

    const stats = this.getStats();

    return {
      seededFromCache,
      seededFromBooks,
      seededFromMedia,
      totalUniqueInDictionary: stats.totalWords,
    };
  }
}

export const dictionaryManager = new DictionaryPartitionManager();
