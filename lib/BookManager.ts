import fs from "fs";
import path from "path";

export interface WordMeaning {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

export interface Word {
  type?: "word";
  word: string;
  variations?: string[];
  meanings: WordMeaning[];
}

export interface SentenceEntry {
  type: "sentence";
  sentence: string;
  meaning?: string;
  tag?: string;
  tags?: string[];
  createdAt?: string;
}

export type MediaEntry = Word | SentenceEntry;

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
   */
  getPageWords(bookName: string, pageNo: number): Word[] {
    const items = this.getPageItems(bookName, pageNo);
    return items.filter(
      (item): item is Word =>
        item.type !== "sentence" && typeof (item as Word).word === "string",
    );
  }

  /**
   * Get all sentences from a specific page of a book
   */
  getPageSentences(bookName: string, pageNo: number): SentenceEntry[] {
    const items = this.getPageItems(bookName, pageNo);
    return items.filter(
      (item): item is SentenceEntry =>
        item.type === "sentence" &&
        typeof (item as SentenceEntry).sentence === "string",
    );
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
