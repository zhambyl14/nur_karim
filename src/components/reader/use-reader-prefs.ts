"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Small per-device reader preferences in localStorage (theme, fit, spread).
 * Uses useSyncExternalStore so the server render and hydration agree
 * (server snapshot = default value).
 */

const EVENT = "nk-reader-prefs";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useReaderPref<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const stored = read(key);
      return stored !== null && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;
    },
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // storage blocked (private mode) — the preference just is not remembered
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set] as const;
}

const DEVICE_KEY = "nk_reader_device";
let memoryDeviceId: string | null = null;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable id of this browser for the reader device limit (call from effects/handlers only). */
export function getDeviceId(): string {
  try {
    const stored = window.localStorage.getItem(DEVICE_KEY);
    if (stored && /^[A-Za-z0-9-]{8,80}$/.test(stored)) return stored;
    const id = newId();
    window.localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    memoryDeviceId ??= newId();
    return memoryDeviceId;
  }
}
