"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Welcome to BookWord</h1>
        <p className={styles.subtitle}>
          Store and organize words from your books with meanings and page
          numbers
        </p>

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📚</div>
            <h3>Organize Books</h3>
            <p>Create and manage multiple books in your library</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>✍️</div>
            <h3>Add Words</h3>
            <p>Store words with meanings and page references</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Track Progress</h3>
            <p>View analytics and statistics about your learning</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => router.push("/add-word")}
            className={`${styles.button} ${styles.primary}`}
          >
            Add Word Now
          </button>
          <button
            onClick={() => router.push("/book-list")}
            className={`${styles.button} ${styles.secondary}`}
          >
            View Books
          </button>
        </div>

        <div className={styles.info}>
          <p>
            Use the navigation menu above to access all features. Start by
            creating a new book or adding a word to an existing one!
          </p>
        </div>
      </div>
    </div>
  );
}
