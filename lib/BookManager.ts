import fs from "fs";
import path from "path";

export interface Word {
  word: string;
  meaning: string;
  partOfSpeech?: string;
  variations?: string[];
  examples?: string[];
}

export interface PageData {
  [key: string]: Word[]; // page number as key, array of words as value
}

export interface WordOccurrence {
  word: string;
  meaning: string;
  partOfSpeech?: string;
  variations?: string[];
  frequency: number;
  pages: number[];
  examples: string[];
  bookName?: string; // New: to identify which book it belongs to
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
    meaning: string,
    examples: string[] = [],
    partOfSpeech?: string,
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
      pageData.some((item) => item.word.toLowerCase() === word.toLowerCase())
    ) {
      throw new Error(
        `Word "${word}" already exists on page ${pageNo} of book "${bookName}"`,
      );
    }

    // Add new word
    pageData.push({
      word,
      meaning,
      partOfSpeech,
      variations,
      examples,
    });

    // Write updated data back to file
    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
    return true;
  }

  /**
   * Get all words from a specific page of a book
   */
  getPageWords(bookName: string, pageNo: number): Word[] {
    if (!this.bookExists(bookName)) {
      throw new Error(`Book "${bookName}" does not exist`);
    }

    const bookPath = path.join(this.booksDir, bookName);
    const pageFileName = `page_${pageNo}.json`;
    const pageFilePath = path.join(bookPath, pageFileName);

    if (!fs.existsSync(pageFilePath)) {
      return [];
    }

    const fileContent = fs.readFileSync(pageFilePath, "utf-8");
    return JSON.parse(fileContent);
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
    let meaning = "";
    let examples: string[] = [];
    const pages: number[] = [];

    allWords.forEach((pageData) => {
      pageData.words.forEach((item) => {
        if (item.word.trim().toLowerCase() === normalizedWord) {
          frequency += 1;
          if (!meaning) {
            meaning = item.meaning;
            examples = item.examples ?? [];
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
    const latest = allWords.find((p) =>
      p.words.some((w) => w.word.trim().toLowerCase() === normalizedWord),
    )?.words.find((w) => w.word.trim().toLowerCase() === normalizedWord);

    return {
      word: word.trim(),
      meaning,
      partOfSpeech: latest?.partOfSpeech,
      variations: latest?.variations,
      frequency,
      pages: pages.sort((a, b) => a - b),
      examples,
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
    let pageData: Word[] = JSON.parse(fileContent);

    pageData = pageData.filter(
      (item) => item.word.toLowerCase() !== wordToDelete.toLowerCase(),
    );

    fs.writeFileSync(pageFilePath, JSON.stringify(pageData, null, 2), "utf-8");
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
   * Get total pages count from a book
   */
  getTotalPagesCount(bookName: string): number {
    return this.getBookPages(bookName).length;
  }
}
