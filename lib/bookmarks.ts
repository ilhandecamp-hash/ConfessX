"use client";

const KEY = "confessx_bookmarks";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function isBookmarked(id: string): boolean {
  return read().includes(id);
}

export function toggleBookmark(id: string): boolean {
  const arr = read();
  const idx = arr.indexOf(id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    write(arr);
    return false;
  }
  arr.unshift(id);
  write(arr.slice(0, 500)); // cap
  return true;
}

export function listBookmarks(): string[] {
  return read();
}
