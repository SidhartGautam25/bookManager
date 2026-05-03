"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import styles from "./page.module.css";

interface BookStats {
  name: string;
  totalWords: number;
  totalPages: number;
}

export default function AnalyticsPage() {
  const [bookStats, setBookStats] = useState<BookStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Fetch all books
        const booksResponse = await fetch("/api/books");
        const booksData = await booksResponse.json();

        if (booksData.success) {
          // Fetch stats for each book
          const stats: BookStats[] = [];
          for (const book of booksData.books) {
            try {
              const wordsResponse = await fetch(
                `/api/words?bookName=${encodeURIComponent(book)}`,
              );
              const wordsData = await wordsResponse.json();

              if (wordsData.success) {
                let totalWords = 0;
                let totalPages = 0;

                if (wordsData.data && Array.isArray(wordsData.data)) {
                  totalPages = wordsData.data.length;
                  wordsData.data.forEach(
                    (page: {
                      words: Array<{ word: string; meaning: string }>;
                    }) => {
                      totalWords += page.words.length;
                    },
                  );
                }

                stats.push({
                  name: book,
                  totalWords,
                  totalPages,
                });
              }
            } catch {
              console.error(`Error fetching stats for book: ${book}`);
            }
          }

          setBookStats(stats.sort((a, b) => b.totalWords - a.totalWords));
        } else {
          setMessage("Error fetching books");
          setMessageType("error");
        }
      } catch {
        setMessage("Error loading analytics");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, []);

  const calculateOverallStats = () => {
    const totalBooks = bookStats.length;
    let totalWords = 0;
    let totalPages = 0;
    let averageWordsPerBook = 0;

    bookStats.forEach((stat) => {
      totalWords += stat.totalWords;
      totalPages += stat.totalPages;
    });

    if (totalBooks > 0) {
      averageWordsPerBook = Math.round(totalWords / totalBooks);
    }

    return { totalBooks, totalWords, totalPages, averageWordsPerBook };
  };

  const stats = calculateOverallStats();

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <h1>Analytics Dashboard</h1>

        {message && (
          <div className={`${styles.message} ${styles[messageType]}`}>
            {message}
          </div>
        )}

        {loading ? (
          <p className={styles.loading}>Loading analytics...</p>
        ) : (
          <>
            {/* Overall Statistics */}
            <div className={styles.overallStats}>
              <h2>Overall Statistics</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📚</div>
                  <div className={styles.statDetails}>
                    <span className={styles.statValue}>{stats.totalBooks}</span>
                    <span className={styles.statLabel}>Total Books</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📝</div>
                  <div className={styles.statDetails}>
                    <span className={styles.statValue}>{stats.totalWords}</span>
                    <span className={styles.statLabel}>Total Words</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📄</div>
                  <div className={styles.statDetails}>
                    <span className={styles.statValue}>{stats.totalPages}</span>
                    <span className={styles.statLabel}>Total Pages</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>⚡</div>
                  <div className={styles.statDetails}>
                    <span className={styles.statValue}>
                      {stats.averageWordsPerBook}
                    </span>
                    <span className={styles.statLabel}>Avg Words/Book</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Books Details */}
            {bookStats.length === 0 ? (
              <p className={styles.noBooks}>
                No books found. Start by creating a book and adding words!
              </p>
            ) : (
              <div className={styles.booksDetails}>
                <h2>Books Breakdown</h2>
                <div className={styles.booksTable}>
                  <div className={styles.tableHeader}>
                    <div className={styles.tableCell}>Book Name</div>
                    <div className={styles.tableCell}>Total Words</div>
                    <div className={styles.tableCell}>Total Pages</div>
                    <div className={styles.tableCell}>Avg Words/Page</div>
                  </div>

                  {bookStats.map((book) => (
                    <div key={book.name} className={styles.tableRow}>
                      <div className={styles.tableCell}>{book.name}</div>
                      <div className={styles.tableCell}>{book.totalWords}</div>
                      <div className={styles.tableCell}>{book.totalPages}</div>
                      <div className={styles.tableCell}>
                        {book.totalPages > 0
                          ? Math.round(book.totalWords / book.totalPages)
                          : 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
