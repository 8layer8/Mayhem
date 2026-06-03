const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function alphaKey(title: string): string {
  const first = title.trim().charAt(0).toUpperCase();
  if (first >= "A" && first <= "Z") return first;
  return "#";
}

export function groupByLetter<T extends { title: string }>(
  items: T[],
): { letter: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
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
