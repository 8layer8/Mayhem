import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getAlbums, getMusicSections } from "../api/plex";
import { AlbumGrid } from "../components/AlbumGrid";
import { AlphaIndex } from "../components/AlphaIndex";
import { groupByLetter } from "../util/groupByLetter";

export function AlbumsPage() {
  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: getMusicSections,
  });
  const [sectionId, setSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId && sections?.length) setSectionId(sections[0].key);
  }, [sections, sectionId]);

  const { data: albums, isLoading } = useQuery({
    queryKey: ["albums", sectionId],
    queryFn: () => getAlbums(sectionId!),
    enabled: !!sectionId,
  });

  const groups = useMemo(() => (albums ? groupByLetter(albums) : []), [albums]);
  const availableLetters = useMemo(
    () => new Set(groups.map((g) => g.letter)),
    [groups],
  );

  const scrollToLetter = (letter: string) => {
    document.getElementById(`album-letter-${letter}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="page artists-page">
      {sections && sections.length > 1 && (
        <div className="section-tabs">
          {sections.map((s) => (
            <button
              key={s.key}
              className={s.key === sectionId ? "tab active" : "tab"}
              onClick={() => setSectionId(s.key)}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="artists-layout">
        <div className="artists-main">
          <h2>Albums</h2>
          {isLoading && <p className="muted">Loading…</p>}
          {groups.map(({ letter, items }) => (
            <section
              key={letter}
              id={`album-letter-${letter}`}
              className="artist-letter-section"
            >
              <h3 className="artist-letter-heading">{letter}</h3>
              <AlbumGrid albums={items} />
            </section>
          ))}
          {albums && albums.length === 0 && <p className="muted">No albums found.</p>}
        </div>

        {groups.length > 0 && (
          <AlphaIndex availableLetters={availableLetters} onSelect={scrollToLetter} />
        )}
      </div>
    </div>
  );
}
