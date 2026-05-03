"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import styles from "./page.module.css";

interface Word {
  word: string;
  meaning: string;
}

interface PageData {
  page: number;
  words: Word[];
}

export default function BookListPage() {
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [bookData, setBookData] = useState<PageData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  // Fetch existing books on component mount
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch("/api/books");
        const data = await response.json();
        if (data.success) {
          setBooks(data.books);
        }
      } catch {
        console.error("Error fetching books");
        setMessage("Error fetching books");
        setMessageType("error");
      }
    };

    void fetchBooks();
  }, []);

  const handleSelectBook = async (bookName: string) => {
    setSelectedBook(bookName);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/words?bookName=${encodeURIComponent(bookName)}`,
      );
      const data = await response.json();

      if (data.success) {
        setBookData(data.data || []);
        setMessage("");
      } else {
        setMessage(data.error);
        setMessageType("error");
        setBookData([]);
      }
    } catch {
      setMessage("Error fetching book data");
      setMessageType("error");
      setBookData([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    let totalWords = 0;
    let totalPages = 0;

    bookData.forEach((page) => {
      totalWords += page.words.length;
      totalPages++;
    });

    return { totalWords, totalPages };
  };

  const stats = calculateStats();

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <h1>Book List</h1>

        {message && (
          <div className={`${styles.message} ${styles[messageType]}`}>
            {message}
          </div>
        )}

        <div className={styles.booksGrid}>
          <div className={styles.bookSelector}>
            <h2>Select a Book</h2>
            {books.length === 0 ? (
              <p className={styles.noBooks}>
                No books found. Create one from the Add Word page.
              </p>
            ) : (
              <div className={styles.bookList}>
                {books.map((book) => (
                  <button
                    key={book}
                    onClick={() => void handleSelectBook(book)}
                    className={`${styles.bookButton} ${selectedBook === book ? styles.active : ""}`}
                  >
                    {book}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBook && (
            <div className={styles.bookContent}>
              <div className={styles.bookHeader}>
                <h2>{selectedBook}</h2>
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Words:</span>
                    <span className={styles.statValue}>{stats.totalWords}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Pages:</span>
                    <span className={styles.statValue}>{stats.totalPages}</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <p className={styles.loading}>Loading...</p>
              ) : bookData.length === 0 ? (
                <p className={styles.noData}>No words added yet.</p>
              ) : (
                <div className={styles.pagesContainer}>
                  {bookData.map((pageData) => (
                    <div key={pageData.page} className={styles.pageSection}>
                      <h3>Page {pageData.page}</h3>
                      <div className={styles.wordsList}>
                        {pageData.words.map((item, index) => (
                          <div key={index} className={styles.wordItem}>
                            <div className={styles.wordHeader}>
                              <strong className={styles.wordText}>
                                {item.word}
                              </strong>
                            </div>
                            <p className={styles.meaning}>{item.meaning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
