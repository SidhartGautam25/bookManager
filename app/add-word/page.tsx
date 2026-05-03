"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import styles from "./page.module.css";

export default function AddWordPage() {
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [newBookName, setNewBookName] = useState<string>("");
  const [showNewBookInput, setShowNewBookInput] = useState<boolean>(false);
  const [word, setWord] = useState<string>("");
  const [meaning, setMeaning] = useState<string>("");
  const [pageNo, setPageNo] = useState<string>("");
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

  const handleCreateNewBook = async () => {
    if (!newBookName.trim()) {
      setMessage("Book name cannot be empty");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookName: newBookName, action: "create" }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`Book "${newBookName}" created successfully!`);
        setMessageType("success");
        setSelectedBook(newBookName);
        setNewBookName("");
        setShowNewBookInput(false);

        // Refetch books
        try {
          const response = await fetch("/api/books");
          const result = await response.json();
          if (result.success) {
            setBooks(result.books);
          }
        } catch {
          console.error("Error fetching books");
        }
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch {
      setMessage("Error creating book");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBook) {
      setMessage("Please select or create a book");
      setMessageType("error");
      return;
    }

    if (!word.trim() || !meaning.trim() || !pageNo.trim()) {
      setMessage("All fields are required");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookName: selectedBook,
          word: word.trim(),
          meaning: meaning.trim(),
          pageNo: parseInt(pageNo),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`Word "${word}" added successfully!`);
        setMessageType("success");
        setWord("");
        setMeaning("");
        setPageNo("");
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch {
      setMessage("Error adding word");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <h1>Add Word</h1>

        {message && (
          <div className={`${styles.message} ${styles[messageType]}`}>
            {message}
          </div>
        )}

        <div className={styles.formSection}>
          <h2>Step 1: Select or Create a Book</h2>

          {!showNewBookInput ? (
            <div className={styles.bookSelection}>
              <select
                value={selectedBook}
                onChange={(e) => {
                  setSelectedBook(e.target.value);
                  setShowNewBookInput(false);
                }}
                className={styles.select}
              >
                <option value="">-- Select a book --</option>
                {books.map((book) => (
                  <option key={book} value={book}>
                    {book}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewBookInput(true)}
                className={styles.secondaryBtn}
              >
                Create New Book
              </button>
            </div>
          ) : (
            <div className={styles.newBookInput}>
              <input
                type="text"
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
                placeholder="Enter book name"
                className={styles.input}
              />
              <button
                type="button"
                onClick={handleCreateNewBook}
                disabled={loading}
                className={styles.primaryBtn}
              >
                {loading ? "Creating..." : "Create Book"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewBookInput(false);
                  setNewBookName("");
                }}
                className={styles.secondaryBtn}
              >
                Cancel
              </button>
            </div>
          )}

          {selectedBook && (
            <p className={styles.selectedBook}>
              Selected Book: <strong>{selectedBook}</strong>
            </p>
          )}
        </div>

        {selectedBook && (
          <form onSubmit={handleAddWord} className={styles.wordForm}>
            <h2>Step 2: Add Word Details</h2>

            <div className={styles.formGroup}>
              <label htmlFor="word">Word</label>
              <input
                id="word"
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Enter word"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meaning">Meaning</label>
              <textarea
                id="meaning"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Enter meaning"
                className={styles.textarea}
                rows={4}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pageNo">Page No</label>
              <input
                id="pageNo"
                type="number"
                value={pageNo}
                onChange={(e) => setPageNo(e.target.value)}
                placeholder="Enter page number"
                className={styles.input}
                min="1"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Book</label>
              <input
                type="text"
                value={selectedBook}
                disabled
                className={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.primaryBtn}
            >
              {loading ? "Adding..." : "Add Word"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
