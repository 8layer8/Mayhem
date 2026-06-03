import { alphaIndexLetters } from "../util/groupByLetter";

interface AlphaIndexProps {
  availableLetters: Set<string>;
  onSelect: (letter: string) => void;
}

/** Vertical A–Z scrubber for jumping within a long alphabetical list. */
export function AlphaIndex({ availableLetters, onSelect }: AlphaIndexProps) {
  const letters = alphaIndexLetters(availableLetters.has("#"));

  return (
    <nav className="alpha-index" aria-label="Jump to letter">
      {letters.map((letter) => {
        const enabled = availableLetters.has(letter);
        return (
          <button
            key={letter}
            type="button"
            className={`alpha-letter${enabled ? "" : " disabled"}`}
            disabled={!enabled}
            onClick={() => onSelect(letter)}
            aria-label={enabled ? `Jump to ${letter}` : undefined}
          >
            {letter}
          </button>
        );
      })}
    </nav>
  );
}
