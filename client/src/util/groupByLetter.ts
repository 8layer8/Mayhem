const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Strip a leading "The " for artist-style alphabetization. */
function sortKey(title: string): string {
  return title.trim().replace(/^the\s+/i, "");
}

export function alphaKey(title: string): string {
  const first = sortKey(title).charAt(0).toUpperCase();
  if (first >= "A" && first <= "Z") return first;
  return "#";
}

export function groupByLetter<T extends { title: string }>(
  items: T[],
): { letter: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) =>
    sortKey(a.title).localeCompare(sortKey(b.title), undefined, { sensitivity: "base" }),
  );

  const groups = new Map<string, T[]>();
  for (const item of sorted) {
    const letter = alphaKey(item.title);
    const bucket = groups.get(letter);
    if (bucket) bucket.push(item);
    else groups.set(letter, [item]);
  }

  const ordered: { letter: string; items: T[] }[] = [];
  if (groups.has("#")) ordered.push({ letter: "#", items: groups.get("#")! });
  for (const letter of LETTERS) {
    if (groups.has(letter)) ordered.push({ letter, items: groups.get(letter)! });
  }
  return ordered;
}

export function alphaIndexLetters(hasHash: boolean): string[] {
  return hasHash ? ["#", ...LETTERS] : LETTERS;
}
