import fs from "fs";
import path from "path";
import { dictionaryManager } from "@/lib/DictionaryPartitionManager";

export interface WordMeaning {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

export interface Word {
  type?: "word";
  word: string;
  pageNo?: number;
  variations?: string[];
  meanings: WordMeaning[];
}

export interface LeanWordEntry {
  type?: "word";
  word: string;
  pageNo?: number;
  variations?: string[];
}

export interface SentenceEntry {
  type: "sentence";
  sentence: string;
  meaning?: string;
  tag?: string;
  tags?: string[];
  pageNo?: number;
  createdAt?: string;
}

export type MediaEntry = Word | SentenceEntry | LeanWordEntry;

export interface PageData {
  [key: string]: Word[]; // page number as key, array of words as value
}

export interface WordOccurrence {
  word: string;
  variations?: string[];
  meanings: WordMeaning[];
  frequency: number;
  pages: number[];
  bookName?: string;
}

export interface BatchWordEntry {
  pageNo: number;
  word: string;
  meanings: WordMeaning[];
  variations?: string[];
}

export interface BatchResultSummary {
  totalProcessed: number;
  added: number;
  skipped: number;
  pagesAffected: number[];
  errors: string[];
}

export class BookManager {
  private booksDir: string;

  constructor(booksDir: string = path.join(process.cwd(), "books")) {
    this.booksDir = booksDir;
    this.ensureBooksDirectory();
  }

  /**
   * Ensure the books directory exists
   */
  private ensureBooksDirectory(): void {
    if (!fs.existsSync(this.booksDir)) {
      fs.mkdirSync(this.booksDir, { recursive: true });
    }
  }

  /**
   * Create a new book folder
   */
  createBook(bookName: string): boolean {
    const bookPath = path.join(this.booksDir, bookName);

    if (fs.existsSync(bookPath)) {
      throw new Error(`Book "${bookName}" already exists`);
    }

    fs.mkdirSync(bookPath, { recursive: true });
    return true;
  }

  /**
   * Get list of all books
   */
  getAllBooks(): string[] {
    this.ensureBooksDirectory();

    if (!fs.existsSync(this.booksDir)) {
      return [];
    }

    const books = fs.readdirSync(this.booksDir).filter((file) => {
      const filePath = path.join(this.booksDir, file);
      return fs.statSync(filePath).isDirectory();
    });

    return books;
  }

  /**
   * Check if a book exists
   */
  bookExists(bookName: string): boolean {
    const bookPath = path.join(this.booksDir, bookName);
    return fs.existsSync(bookPath);
  }

  /**
   * Add a word to a specific page of a book
   */
  addWord(
    bookName: string,
    pageNo: number,
    word: string,
    meanings: WordMeaning[],
    variations?: string[],
  ): boolean {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    let pageData: Word[] = [];

    // Read existing page data if file exists
    if (fs.existsSync(pageFilePath)) {
      const fileContent = fs.readFileSync(pageFilePath, "utf-8");
      pageData = JSON.parse(fileContent);
    }

    // Check if word already exists on this page
    if (
      pageData.some(
        (item) => item.word && item.word.toLowerCase() === word.toLowerCase(),
      )
    ) {
      throw new Error(
        `Word "${word}" already exists on page ${pageNo} of book "${bookName}"`,
      );
    }

    // Add new word
    pageData.push({
      word,
      variations,
      meanings,
    });

    // Write updated data back to file
    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
    return true;
  }

  /**
   * Add multiple words across pages in a single batch pass
   */
  addWordsBatch(
    bookName: string,
    entries: BatchWordEntry[],
    skipDuplicates: boolean = true,
  ): BatchResultSummary {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const summary: BatchResultSummary = {
      totalProcessed: entries.length,
      added: 0,
      skipped: 0,
      pagesAffected: [],
      errors: [],
    };

    // Group entries by page
    const pageGroups = new Map<number, BatchWordEntry[]>();
    for (const entry of entries) {
      if (!pageGroups.has(entry.pageNo)) {
        pageGroups.set(entry.pageNo, []);
      }
      pageGroups.get(entry.pageNo)!.push(entry);
    }

    // Process each page
    for (const [pageNo, pageEntries] of pageGroups.entries()) {
      const pageFileName = `page_${pageNo}.json`;
      const pageFilePath = path.join(bookPath, pageFileName);

      let pageData: Word[] = [];
      if (fs.existsSync(pageFilePath)) {
        try {
          const fileContent = fs.readFileSync(pageFilePath, "utf-8");
          pageData = JSON.parse(fileContent);
        } catch (e) {
          summary.errors.push(
            `Failed to read page ${pageNo}: ${(e as Error).message}`,
          );
          continue;
        }
      }

      let pageModified = false;
      for (const item of pageEntries) {
        const cleanWord = item.word.trim();
        if (!cleanWord) continue;

        const exists = pageData.some(
          (w) => w.word.toLowerCase() === cleanWord.toLowerCase(),
        );

        if (exists) {
          if (skipDuplicates) {
            summary.skipped++;
            continue;
          } else {
            summary.errors.push(
              `Word "${cleanWord}" already exists on page ${pageNo}`,
            );
            continue;
          }
        }

        pageData.push({
          word: cleanWord,
          variations: item.variations,
          meanings: item.meanings,
        });
        summary.added++;
        pageModified = true;
      }

      if (pageModified) {
        fs.writeFileSync(
          pageFilePath,
          JSON.stringify(pageData, null, 2),
          "utf-8",
        );
        summary.pagesAffected.push(pageNo);
      }
    }

    summary.pagesAffected.sort((a, b) => a - b);
    return summary;
  }

  /**
   * Version 2: Add a word to a specific page of a book
   * Only stores { word, pageNo } in the book's page file.
   * If the word is NOT in the root dictionary, it adds word + meanings + examples.
   * If the word IS in the dictionary, it leaves dictionary untouched without editing.
   */
  addWordV2(
    bookName: string,
    pageNo: number,
    word: string,
    meanings: WordMeaning[],
    variations?: string[],
  ): { success: boolean; dictionaryAdded: boolean } {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const cleanWord = word.trim();
    if (!cleanWord) {
      throw new Error("Word cannot be empty");
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    let pageData: MediaEntry[] = [];
    if (fs.existsSync(pageFilePath)) {
      const fileContent = fs.readFileSync(pageFilePath, "utf-8");
      pageData = JSON.parse(fileContent);
    }

    // Check if word already exists on this page
    if (
      pageData.some(
        (item) =>
          item.type !== "sentence" &&
          (item as Word).word &&
          (item as Word).word.toLowerCase() === cleanWord.toLowerCase(),
      )
    ) {
      throw new Error(
        `Word "${cleanWord}" already exists on page ${pageNo} of book "${bookName}"`,
      );
    }

    // 1. Check & Sync with Dictionary Partition Manager
    let dictionaryAdded = false;
    if (!dictionaryManager.hasWord(cleanWord)) {
      const dictRes = dictionaryManager.addWord(
        {
          word: cleanWord,
          meanings: meanings || [],
          variations: variations || [],
        },
        false, // do not overwrite
      );
      dictionaryAdded = dictRes.added;
    }

    // 2. Append lean word reference in book page file
    pageData.push({
      type: "word",
      word: cleanWord,
      pageNo,
    });

    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
    return { success: true, dictionaryAdded };
  }

  /**
   * Version 2: Batch add words across pages
   * Stores lean { word, pageNo } in book pages and syncs new words to dictionary.
   */
  addWordsBatchV2(
    bookName: string,
    entries: BatchWordEntry[],
    skipDuplicates: boolean = true,
  ): BatchResultSummary & { dictionaryWordsAdded: number } {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const summary: BatchResultSummary & { dictionaryWordsAdded: number } = {
      totalProcessed: entries.length,
      added: 0,
      skipped: 0,
      pagesAffected: [],
      errors: [],
      dictionaryWordsAdded: 0,
    };

    // Group entries by page
    const pageGroups = new Map<number, BatchWordEntry[]>();
    for (const entry of entries) {
      if (!pageGroups.has(entry.pageNo)) {
        pageGroups.set(entry.pageNo, []);
      }
      pageGroups.get(entry.pageNo)!.push(entry);
    }

    // Process each page
    for (const [pageNo, pageEntries] of pageGroups.entries()) {
      const pageFileName = `page_${pageNo}.json`;
      const pageFilePath = path.join(bookPath, pageFileName);

      let pageData: MediaEntry[] = [];
      if (fs.existsSync(pageFilePath)) {
        try {
          const fileContent = fs.readFileSync(pageFilePath, "utf-8");
          pageData = JSON.parse(fileContent);
        } catch (e) {
          summary.errors.push(
            `Failed to read page ${pageNo}: ${(e as Error).message}`,
          );
          continue;
        }
      }

      let pageModified = false;
      for (const item of pageEntries) {
        const cleanWord = item.word.trim();
        if (!cleanWord) continue;

        const exists = pageData.some(
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
              `Word "${cleanWord}" already exists on page ${pageNo}`,
            );
            continue;
          }
        }

        // Check dictionary and insert only if missing
        if (!dictionaryManager.hasWord(cleanWord)) {
          const dictRes = dictionaryManager.addWord(
            {
              word: cleanWord,
              meanings: item.meanings || [],
              variations: item.variations || [],
            },
            false,
          );
          if (dictRes.added) {
            summary.dictionaryWordsAdded++;
          }
        }

        // Lean book page record
        pageData.push({
          type: "word",
          word: cleanWord,
          pageNo,
        });
        summary.added++;
        pageModified = true;
      }

      if (pageModified) {
        fs.writeFileSync(
          pageFilePath,
          JSON.stringify(pageData, null, 2),
          "utf-8",
        );
        summary.pagesAffected.push(pageNo);
      }
    }

    summary.pagesAffected.sort((a, b) => a - b);
    return summary;
  }

  /**
   * Get all raw items (words and sentences) from a specific page
   */
  getPageItems(bookName: string, pageNo: number): MediaEntry[] {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    if (!fs.existsSync(pageFilePath)) {
      return [];
    }

    try {
      const fileContent = fs.readFileSync(pageFilePath, "utf-8");
      const parsed = JSON.parse(fileContent);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Get all words from a specific page of a book
   * Automatically hydrates meanings and variations from dictionary if missing (v2 format support)
   */
  getPageWords(bookName: string, pageNo: number): Word[] {
    const items = this.getPageItems(bookName, pageNo);
    const rawWords = items.filter(
      (item): item is Word =>
        item.type !== "sentence" && typeof (item as Word).word === "string",
    );

    return rawWords.map((w) => {
      if (w.meanings && w.meanings.length > 0) {
        return w;
      }
      const dictEntry = dictionaryManager.getWord(w.word);
      if (dictEntry) {
        return {
          ...w,
          variations:
            w.variations && w.variations.length > 0
              ? w.variations
              : dictEntry.variations,
          meanings: dictEntry.meanings,
        };
      }
      return {
        ...w,
        meanings: w.meanings || [],
      };
    });
  }

  /**
   * Get all sentences from a specific page of a book
   */
  getPageSentences(bookName: string, pageNo: number): SentenceEntry[] {
    const items = this.getPageItems(bookName, pageNo);
    return items
      .filter(
        (item): item is SentenceEntry =>
          item.type === "sentence" &&
          typeof (item as SentenceEntry).sentence === "string",
      )
      .map((s) => ({
        ...s,
        pageNo: s.pageNo !== undefined ? s.pageNo : Number(pageNo),
      }));
  }

  /**
   * Get all words from a book across all pages
   */
  getAllWordsFromBook(bookName: string): { page: number; words: Word[] }[] {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const files = fs
      .readdirSync(bookPath)
      .filter((file) => file.startsWith("page_") && file.endsWith(".json"));

    const result: { page: number; words: Word[] }[] = [];

    files.forEach((file) => {
      const pageNo = parseInt(file.replace("page_", "").replace(".json", ""));
      const words = this.getPageWords(bookName, pageNo);
      result.push({ page: pageNo, words });
    });

    return result.sort((a, b) => a.page - b.page);
  }

  /**
   * Get word frequency, meaning and pages for a word across a book
   */
  getWordOccurrences(bookName: string, word: string): WordOccurrence | null {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord) {
      return null;
    }

    const allWords = this.getAllWordsFromBook(bookName);

    let frequency = 0;
    let meanings: WordMeaning[] = [];
    const pages: number[] = [];

    allWords.forEach((pageData) => {
      pageData.words.forEach((item) => {
        if (item.word && item.word.trim().toLowerCase() === normalizedWord) {
          frequency += 1;
          if (meanings.length === 0) {
            meanings = item.meanings || [];
            // Handle legacy single-meaning data if necessary
            const legacy = item as unknown as {
              meaning?: string;
              partOfSpeech?: string;
              examples?: string[];
            };
            if (!item.meanings && legacy.meaning) {
              meanings = [
                {
                  partOfSpeech: legacy.partOfSpeech || "",
                  definition: legacy.meaning,
                  examples: legacy.examples || [],
                },
              ];
            }
          }
          if (!pages.includes(pageData.page)) {
            pages.push(pageData.page);
          }
        }
      });
    });

    if (frequency === 0) {
      return null;
    }

    // If no inline meanings found, hydrate from partition dictionary
    if (meanings.length === 0) {
      const dictEntry = dictionaryManager.getWord(normalizedWord);
      if (dictEntry) {
        meanings = dictEntry.meanings;
      }
    }

    // Get the latest occurrence metadata
    const latest = allWords
      .slice()
      .reverse()
      .find((p) =>
        p.words.some(
          (w) => w.word && w.word.trim().toLowerCase() === normalizedWord,
        ),
      )
      ?.words.find(
        (w) => w.word && w.word.trim().toLowerCase() === normalizedWord,
      );

    return {
      word: word.trim(),
      variations: latest?.variations,
      meanings: meanings,
      frequency,
      pages: pages.sort((a, b) => a - b),
      bookName,
    };
  }

  /**
   * Get word frequency, meaning and pages for a word across ALL books
   */
  getGlobalWordOccurrences(word: string): WordOccurrence | null {
    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord) {
      return null;
    }

    const books = this.getAllBooks();
    for (const book of books) {
      const occurrence = this.getWordOccurrences(book, normalizedWord);
      if (occurrence) {
        return occurrence;
      }
    }

    return null;
  }

  /**
   * Get word statistics across ALL books, detailing frequency and pages per book
   */
  getWordStatsAcrossAllBooks(word: string) {
    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord) {
      return null;
    }

    const books = this.getAllBooks();
    const stats: { bookName: string; frequency: number; pages: number[] }[] =
      [];
    let totalFrequency = 0;
    let combinedMeanings: WordMeaning[] = [];

    for (const book of books) {
      const occurrence = this.getWordOccurrences(book, normalizedWord);
      if (occurrence) {
        stats.push({
          bookName: book,
          frequency: occurrence.frequency,
          pages: occurrence.pages,
        });
        totalFrequency += occurrence.frequency;
        if (combinedMeanings.length === 0 && occurrence.meanings) {
          combinedMeanings = occurrence.meanings;
        }
      }
    }

    if (stats.length === 0) {
      return null;
    }

    return {
      word: word.trim(),
      meanings: combinedMeanings,
      totalFrequency,
      books: stats.sort((a, b) => b.frequency - a.frequency),
    };
  }

  /**
   * Get all pages in a book
   */
  getBookPages(bookName: string): number[] {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const files = fs
      .readdirSync(bookPath)
      .filter((file) => file.startsWith("page_") && file.endsWith(".json"));

    const pages = files.map((file) =>
      parseInt(file.replace("page_", "").replace(".json", "")),
    );
    return pages.sort((a, b) => a - b);
  }

  /**
   * Delete a word from a page
   */
  deleteWord(bookName: string, pageNo: number, wordToDelete: string): boolean {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    if (!fs.existsSync(pageFilePath)) {
      throw new Error(`Page ${pageNo} does not exist in book "${bookName}"`);
    }

    const fileContent = fs.readFileSync(pageFilePath, "utf-8");
    let pageData: MediaEntry[] = JSON.parse(fileContent);

    pageData = pageData.filter(
      (item) =>
        !(
          item.type !== "sentence" &&
          (item as Word).word &&
          (item as Word).word.toLowerCase() === wordToDelete.toLowerCase()
        ),
    );

    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
    return true;
  }

  /**
   * Update a word's meanings, variations, or spelling on a specific page
   */
  updateWord(
    bookName: string,
    pageNo: number,
    originalWord: string,
    updatedWordData: {
      word?: string;
      meanings: WordMeaning[];
      variations?: string[];
    },
  ): boolean {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    if (!fs.existsSync(pageFilePath)) {
      throw new Error(`Page ${pageNo} does not exist in book "${bookName}"`);
    }

    const fileContent = fs.readFileSync(pageFilePath, "utf-8");
    const pageData: MediaEntry[] = JSON.parse(fileContent);

    const normOriginal = originalWord.trim().toLowerCase();
    const index = pageData.findIndex(
      (item) =>
        item.type !== "sentence" &&
        (item as Word).word &&
        (item as Word).word.toLowerCase() === normOriginal,
    );

    if (index === -1) {
      throw new Error(
        `Word "${originalWord}" not found on page ${pageNo} of book "${bookName}"`,
      );
    }

    const existingWord = pageData[index] as Word;
    const newWordName = (updatedWordData.word || originalWord).trim();
    pageData[index] = {
      type: "word",
      word: newWordName,
      meanings: updatedWordData.meanings,
      variations: updatedWordData.variations || existingWord.variations || [],
    };

    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
    return true;
  }

  /**
   * Add a sentence to a specific page of a book
   */
  addSentence(
    bookName: string,
    pageNo: number,
    sentence: string,
    meaning?: string,
    tag?: string,
  ): boolean {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const cleanSentence = sentence.trim();
    if (!cleanSentence) {
      throw new Error("Sentence cannot be empty");
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    let pageData: MediaEntry[] = [];
    if (fs.existsSync(pageFilePath)) {
      const fileContent = fs.readFileSync(pageFilePath, "utf-8");
      pageData = JSON.parse(fileContent);
    }

    // Check if sentence already exists on this page
    const normSentence = cleanSentence.toLowerCase();
    if (
      pageData.some(
        (item) =>
          item.type === "sentence" &&
          (item as SentenceEntry).sentence.trim().toLowerCase() ===
            normSentence,
      )
    ) {
      throw new Error(
        `Sentence already exists on page ${pageNo} of book "${bookName}"`,
      );
    }

    const cleanTag = tag?.trim() || "";
    const sentenceEntry: SentenceEntry = {
      type: "sentence",
      sentence: cleanSentence,
      meaning: meaning?.trim() || "",
      tag: cleanTag,
      tags: cleanTag ? [cleanTag] : [],
      pageNo: Number(pageNo),
      createdAt: new Date().toISOString(),
    };

    pageData.push(sentenceEntry);
    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
    return true;
  }

  /**
   * Update an existing sentence on a specific page
   */
  updateSentence(
    bookName: string,
    pageNo: number,
    originalSentence: string,
    updatedData: {
      sentence?: string;
      meaning?: string;
      tag?: string;
    },
  ): boolean {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    if (!fs.existsSync(pageFilePath)) {
      throw new Error(`Page ${pageNo} does not exist in book "${bookName}"`);
    }

    const fileContent = fs.readFileSync(pageFilePath, "utf-8");
    const pageData: MediaEntry[] = JSON.parse(fileContent);

    const normOriginal = originalSentence.trim().toLowerCase();
    const index = pageData.findIndex(
      (item) =>
        item.type === "sentence" &&
        (item as SentenceEntry).sentence.trim().toLowerCase() === normOriginal,
    );

    if (index === -1) {
      throw new Error(
        `Sentence not found on page ${pageNo} of book "${bookName}"`,
      );
    }

    const existing = pageData[index] as SentenceEntry;
    const newSentenceText = updatedData.sentence
      ? updatedData.sentence.trim()
      : existing.sentence;
    const cleanTag =
      updatedData.tag !== undefined
        ? updatedData.tag.trim()
        : existing.tag || "";

    pageData[index] = {
      ...existing,
      sentence: newSentenceText,
      meaning:
        updatedData.meaning !== undefined
          ? updatedData.meaning.trim()
          : existing.meaning,
      tag: cleanTag,
      tags: cleanTag ? [cleanTag] : [],
      pageNo: existing.pageNo !== undefined ? existing.pageNo : Number(pageNo),
    };

    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
    return true;
  }

  /**
   * Delete a sentence from a specific page
   */
  deleteSentence(
    bookName: string,
    pageNo: number,
    sentenceToDelete: string,
  ): boolean {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    if (!fs.existsSync(pageFilePath)) {
      throw new Error(`Page ${pageNo} does not exist in book "${bookName}"`);
    }

    const fileContent = fs.readFileSync(pageFilePath, "utf-8");
    const pageData: MediaEntry[] = JSON.parse(fileContent);

    const normDelete = sentenceToDelete.trim().toLowerCase();
    const filtered = pageData.filter(
      (item) =>
        !(
          item.type === "sentence" &&
          (item as SentenceEntry).sentence.trim().toLowerCase() === normDelete
        ),
    );

    if (filtered.length === pageData.length) {
      return false;
    }

    fs.writeFileSync(pageFilePath, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  }

  /**
   * Get total word count from a book
   */
  getTotalWordCount(bookName: string): number {
    const allWords = this.getAllWordsFromBook(bookName);
    return allWords.reduce((sum, pageData) => sum + pageData.words.length, 0);
  }

  /**
   * Get total sentence count from a book
   */
  getTotalSentenceCount(bookName: string): number {
    const pages = this.getBookPages(bookName);
    return pages.reduce(
      (sum, p) => sum + this.getPageSentences(bookName, p).length,
      0,
    );
  }

  /**
   * Get all sentences from a book across all pages
   */
  getAllSentencesFromBook(
    bookName: string,
  ): { page: number; sentences: SentenceEntry[] }[] {
    const pages = this.getBookPages(bookName);
    return pages.map((page) => ({
      page,
      sentences: this.getPageSentences(bookName, page),
    }));
  }

  /**
   * Get total pages count from a book
   */
  getTotalPagesCount(bookName: string): number {
    return this.getBookPages(bookName).length;
  }
}
