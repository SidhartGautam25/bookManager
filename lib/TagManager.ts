import fs from "fs";
import path from "path";

export interface TagItem {
  id: string;
  name: string;
  color: string; // e.g. "indigo", "emerald", "amber", "rose", "violet", "cyan", "blue"
  description?: string;
  createdAt: string;
}

export interface TaggedSentenceResult {
  sentence: string;
  meaning?: string;
  tag: string;
  mediaType: "book" | "song" | "movie";
  mediaName: string;
  pageNo?: number;
  createdAt?: string;
}

const DEFAULT_TAGS: TagItem[] = [
  {
    id: "favorite-quotes",
    name: "Favorite Quotes",
    color: "indigo",
    description: "Memorable lines, impactful citations, and timeless quotes.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "philosophy",
    name: "Philosophy",
    color: "violet",
    description:
      "Deep existential thoughts, reflections, and philosophical insights.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "vocabulary-in-context",
    name: "Vocabulary in Context",
    color: "emerald",
    description:
      "Sentences highlighting rich and sophisticated vocabulary usage.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "idioms-and-expressions",
    name: "Idioms & Expressions",
    color: "amber",
    description: "Idiomatic phrasing, colloquialisms, and figurative speech.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "dialogue",
    name: "Dialogue",
    color: "rose",
    description:
      "Sharp character dialogue, conversational nuances, and banter.",
    createdAt: new Date().toISOString(),
  },
];

export class TagManager {
  private dataDir: string;
  private tagsFilePath: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), "data");
    this.tagsFilePath = path.join(this.dataDir, "tags.json");
    this.ensureFile();
  }

  private ensureFile(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.tagsFilePath)) {
      fs.writeFileSync(
        this.tagsFilePath,
        JSON.stringify(DEFAULT_TAGS, null, 2),
        "utf-8",
      );
    }
  }

  /**
   * Get all registered tags
   */
  getAllTags(): TagItem[] {
    this.ensureFile();
    try {
      const content = fs.readFileSync(this.tagsFilePath, "utf-8");
      const tags = JSON.parse(content);
      if (Array.isArray(tags)) return tags;
      return DEFAULT_TAGS;
    } catch (e) {
      console.error("Error reading tags.json:", e);
      return DEFAULT_TAGS;
    }
  }

  /**
   * Check if a tag exists by name (case-insensitive)
   */
  tagExists(name: string): boolean {
    const tags = this.getAllTags();
    const clean = name.trim().toLowerCase();
    return tags.some((t) => t.name.trim().toLowerCase() === clean);
  }

  /**
   * Find tag by name
   */
  findTagByName(name: string): TagItem | undefined {
    const tags = this.getAllTags();
    const clean = name.trim().toLowerCase();
    return tags.find((t) => t.name.trim().toLowerCase() === clean);
  }

  /**
   * Create a new tag (must be unique)
   */
  createTag(
    name: string,
    color: string = "indigo",
    description?: string,
  ): TagItem {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error("Tag name cannot be empty");
    }

    if (this.tagExists(cleanName)) {
      throw new Error(`Tag "${cleanName}" already exists`);
    }

    const tags = this.getAllTags();
    const id =
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `tag-${Date.now()}`;

    const newTag: TagItem = {
      id,
      name: cleanName,
      color: color || "indigo",
      description: description?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    tags.push(newTag);
    fs.writeFileSync(this.tagsFilePath, JSON.stringify(tags, null, 2), "utf-8");
    return newTag;
  }

  /**
   * Update an existing tag and cascade name changes across books, songs, and movies
   */
  updateTag(
    idOrName: string,
    updates: { name?: string; color?: string; description?: string },
  ): TagItem {
    const tags = this.getAllTags();
    const cleanQuery = idOrName.trim().toLowerCase();
    const index = tags.findIndex(
      (t) => t.id === cleanQuery || t.name.toLowerCase() === cleanQuery,
    );

    if (index === -1) {
      throw new Error(`Tag "${idOrName}" not found`);
    }

    const currentTag = tags[index];
    const oldName = currentTag.name;
    const newName = updates.name ? updates.name.trim() : oldName;

    // If name changed, check uniqueness
    if (
      newName.toLowerCase() !== oldName.toLowerCase() &&
      this.tagExists(newName)
    ) {
      throw new Error(`Tag with name "${newName}" already exists`);
    }

    const updatedTag: TagItem = {
      ...currentTag,
      name: newName,
      color: updates.color || currentTag.color,
      description:
        updates.description !== undefined
          ? updates.description.trim()
          : currentTag.description,
    };

    tags[index] = updatedTag;
    fs.writeFileSync(this.tagsFilePath, JSON.stringify(tags, null, 2), "utf-8");

    // Cascade rename to sentences across media if the name changed
    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      this.cascadeTagRename(oldName, newName);
    }

    return updatedTag;
  }

  /**
   * Delete a tag
   */
  deleteTag(idOrName: string): boolean {
    const tags = this.getAllTags();
    const cleanQuery = idOrName.trim().toLowerCase();
    const filtered = tags.filter(
      (t) => t.id !== cleanQuery && t.name.toLowerCase() !== cleanQuery,
    );

    if (filtered.length === tags.length) {
      return false;
    }

    fs.writeFileSync(
      this.tagsFilePath,
      JSON.stringify(filtered, null, 2),
      "utf-8",
    );
    return true;
  }

  /**
   * Cascades a tag rename through all books, songs, and movies
   */
  private cascadeTagRename(oldName: string, newName: string): void {
    const normOld = oldName.trim().toLowerCase();

    // 1. Scan Books
    const booksDir = path.join(process.cwd(), "books");
    if (fs.existsSync(booksDir)) {
      const bookFolders = fs.readdirSync(booksDir);
      for (const folder of bookFolders) {
        const bookPath = path.join(booksDir, folder);
        if (!fs.statSync(bookPath).isDirectory()) continue;

        const files = fs
          .readdirSync(bookPath)
          .filter((f) => f.startsWith("page_") && f.endsWith(".json"));

        for (const file of files) {
          const filePath = path.join(bookPath, file);
          try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (!Array.isArray(data)) continue;
            let modified = false;

            for (const item of data) {
              if (
                item.type === "sentence" &&
                item.tag &&
                item.tag.toLowerCase() === normOld
              ) {
                item.tag = newName;
                if (Array.isArray(item.tags)) {
                  item.tags = item.tags.map((t: string) =>
                    t.toLowerCase() === normOld ? newName : t,
                  );
                }
                modified = true;
              }
            }

            if (modified) {
              fs.writeFileSync(
                filePath,
                JSON.stringify(data, null, 2),
                "utf-8",
              );
            }
          } catch (e) {
            console.error(`Error updating tag in ${filePath}:`, e);
          }
        }
      }
    }

    // 2. Scan Songs
    const songsDir = path.join(process.cwd(), "songs");
    if (fs.existsSync(songsDir)) {
      const songFiles = fs
        .readdirSync(songsDir)
        .filter((f) => f.endsWith(".json"));
      for (const file of songFiles) {
        const filePath = path.join(songsDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          const items = Array.isArray(content) ? content : content.words;
          if (!Array.isArray(items)) continue;

          let modified = false;
          for (const item of items) {
            if (
              item.type === "sentence" &&
              item.tag &&
              item.tag.toLowerCase() === normOld
            ) {
              item.tag = newName;
              if (Array.isArray(item.tags)) {
                item.tags = item.tags.map((t: string) =>
                  t.toLowerCase() === normOld ? newName : t,
                );
              }
              modified = true;
            }
          }

          if (modified) {
            fs.writeFileSync(
              filePath,
              JSON.stringify(content, null, 2),
              "utf-8",
            );
          }
        } catch (e) {
          console.error(`Error updating tag in song ${filePath}:`, e);
        }
      }
    }

    // 3. Scan Movies
    const moviesDir = path.join(process.cwd(), "movies");
    if (fs.existsSync(moviesDir)) {
      const movieFiles = fs
        .readdirSync(moviesDir)
        .filter((f) => f.endsWith(".json"));
      for (const file of movieFiles) {
        const filePath = path.join(moviesDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          const items = Array.isArray(content) ? content : content.words;
          if (!Array.isArray(items)) continue;

          let modified = false;
          for (const item of items) {
            if (
              item.type === "sentence" &&
              item.tag &&
              item.tag.toLowerCase() === normOld
            ) {
              item.tag = newName;
              if (Array.isArray(item.tags)) {
                item.tags = item.tags.map((t: string) =>
                  t.toLowerCase() === normOld ? newName : t,
                );
              }
              modified = true;
            }
          }

          if (modified) {
            fs.writeFileSync(
              filePath,
              JSON.stringify(content, null, 2),
              "utf-8",
            );
          }
        } catch (e) {
          console.error(`Error updating tag in movie ${filePath}:`, e);
        }
      }
    }
  }

  /**
   * Collect all sentences across books, songs, and movies, optionally filtered by tagName
   */
  getAllSentencesByTag(tagName?: string): TaggedSentenceResult[] {
    const results: TaggedSentenceResult[] = [];
    const normTarget = tagName ? tagName.trim().toLowerCase() : null;

    // 1. Books
    const booksDir = path.join(process.cwd(), "books");
    if (fs.existsSync(booksDir)) {
      const bookFolders = fs.readdirSync(booksDir);
      for (const folder of bookFolders) {
        const bookPath = path.join(booksDir, folder);
        if (!fs.statSync(bookPath).isDirectory()) continue;

        const files = fs
          .readdirSync(bookPath)
          .filter((f) => f.startsWith("page_") && f.endsWith(".json"));

        for (const file of files) {
          const pageNo = parseInt(
            file.replace("page_", "").replace(".json", ""),
            10,
          );
          const filePath = path.join(bookPath, file);
          try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (!Array.isArray(data)) continue;

            for (const item of data) {
              if (item.type === "sentence" && item.sentence) {
                const itemTag = item.tag || "";
                if (!normTarget || itemTag.toLowerCase() === normTarget) {
                  results.push({
                    sentence: item.sentence,
                    meaning: item.meaning || "",
                    tag: itemTag,
                    mediaType: "book",
                    mediaName: folder,
                    pageNo,
                    createdAt: item.createdAt,
                  });
                }
              }
            }
          } catch (e) {
            console.error(`Error reading ${filePath}:`, e);
          }
        }
      }
    }

    // 2. Songs
    const songsDir = path.join(process.cwd(), "songs");
    if (fs.existsSync(songsDir)) {
      const songFiles = fs
        .readdirSync(songsDir)
        .filter((f) => f.endsWith(".json"));
      for (const file of songFiles) {
        const songName = file.replace(/\.json$/, "");
        const filePath = path.join(songsDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          const items = Array.isArray(content) ? content : content.words;
          if (!Array.isArray(items)) continue;

          for (const item of items) {
            if (item.type === "sentence" && item.sentence) {
              const itemTag = item.tag || "";
              if (!normTarget || itemTag.toLowerCase() === normTarget) {
                results.push({
                  sentence: item.sentence,
                  meaning: item.meaning || "",
                  tag: itemTag,
                  mediaType: "song",
                  mediaName: songName,
                  createdAt: item.createdAt,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Error reading song ${filePath}:`, e);
        }
      }
    }

    // 3. Movies
    const moviesDir = path.join(process.cwd(), "movies");
    if (fs.existsSync(moviesDir)) {
      const movieFiles = fs
        .readdirSync(moviesDir)
        .filter((f) => f.endsWith(".json"));
      for (const file of movieFiles) {
        const movieName = file.replace(/\.json$/, "");
        const filePath = path.join(moviesDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          const items = Array.isArray(content) ? content : content.words;
          if (!Array.isArray(items)) continue;

          for (const item of items) {
            if (item.type === "sentence" && item.sentence) {
              const itemTag = item.tag || "";
              if (!normTarget || itemTag.toLowerCase() === normTarget) {
                results.push({
                  sentence: item.sentence,
                  meaning: item.meaning || "",
                  tag: itemTag,
                  mediaType: "movie",
                  mediaName: movieName,
                  createdAt: item.createdAt,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Error reading movie ${filePath}:`, e);
        }
      }
    }

    return results;
  }

  /**
   * Get tag counts for all tags
   */
  getTagStats(): { tag: TagItem; sentenceCount: number }[] {
    const tags = this.getAllTags();
    const allSentences = this.getAllSentencesByTag();

    return tags.map((t) => {
      const count = allSentences.filter(
        (s) => s.tag && s.tag.toLowerCase() === t.name.toLowerCase(),
      ).length;
      return {
        tag: t,
        sentenceCount: count,
      };
    });
  }
}

export const tagManager = new TagManager();
