"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [active, setActive] = useState<string>("add-word");

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <h1 className={styles.logo}>BookWord</h1>
        <ul className={styles.navMenu}>
          <li className={styles.navItem}>
            <Link
              href="/add-word"
              className={`${styles.navLink} ${active === "add-word" ? styles.active : ""}`}
              onClick={() => setActive("add-word")}
            >
              Add Word
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/book-list"
              className={`${styles.navLink} ${active === "book-list" ? styles.active : ""}`}
              onClick={() => setActive("book-list")}
            >
              Book List
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/analytics"
              className={`${styles.navLink} ${active === "analytics" ? styles.active : ""}`}
              onClick={() => setActive("analytics")}
            >
              Analytics
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
