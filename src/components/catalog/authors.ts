/** Kazakh Cyrillic alphabet order (Russian letters are a subset of it) */
const KK_ALPHABET = "АӘБВГҒДЕЁЖЗИЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫІЬЭЮЯ";
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type AuthorEntry = { name: string; count: number };
export type AuthorGroup = { letter: string; authors: AuthorEntry[] };

/** Letter used for grouping: first Cyrillic/Latin letter, otherwise "#" */
function groupLetter(name: string): string {
  const first = name.trim().charAt(0).toLocaleUpperCase("kk");
  if (first === "Ё") return "Е";
  if (first && (KK_ALPHABET.includes(first) || LATIN.includes(first))) return first;
  return "#";
}

function charRank(ch: string): number {
  const upper = ch.toLocaleUpperCase("kk");
  const kk = KK_ALPHABET.indexOf(upper);
  if (kk >= 0) return 1000 + kk;
  const latin = LATIN.indexOf(upper);
  if (latin >= 0) return 2000 + latin;
  if (/\s/.test(ch)) return 0;
  return 3000 + ch.charCodeAt(0);
}

/** Compares strings in Kazakh alphabet order (case-insensitive) */
export function compareKk(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = charRank(a[i]) - charRank(b[i]);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

function letterRank(letter: string): number {
  return letter === "#" ? 99999 : charRank(letter);
}

/** Groups authors by first letter in Kazakh alphabet order */
export function groupAuthors(list: AuthorEntry[]): AuthorGroup[] {
  const map = new Map<string, AuthorEntry[]>();
  for (const entry of list) {
    const letter = groupLetter(entry.name);
    const bucket = map.get(letter);
    if (bucket) bucket.push(entry);
    else map.set(letter, [entry]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => letterRank(a) - letterRank(b))
    .map(([letter, authors]) => ({ letter, authors: [...authors].sort((x, y) => compareKk(x.name, y.name)) }));
}
