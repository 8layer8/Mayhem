/** Pure-CSS icons for browsers with poor unicode/emoji support (e.g. Tesla). */

function glyphClass(base: string, className?: string) {
  return ["glyph", base, className].filter(Boolean).join(" ");
}

export function GlyphPlay({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-play", className)} aria-hidden />;
}

export function GlyphClose({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-close", className)} aria-hidden />;
}

export function GlyphGrip({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-grip", className)} aria-hidden />;
}

export function GlyphPlus({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-plus", className)} aria-hidden />;
}

export function GlyphQueue({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-queue", className)} aria-hidden />;
}

export function GlyphBackspace({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-backspace", className)} aria-hidden />;
}

export function GlyphCheck({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-check", className)} aria-hidden />;
}

export function GlyphBack({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-back", className)} aria-hidden />;
}

export function GlyphLock({ className }: { className?: string }) {
  return <span className={glyphClass("glyph-lock", className)} aria-hidden />;
}
