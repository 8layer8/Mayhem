import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getArtists, getMusicSections } from "../api/plex";
import { AlphaIndex } from "../components/AlphaIndex";
import { Artwork } from "../components/Artwork";
import { groupByLetter } from "../util/groupByLetter";

export function ArtistsPage() {
  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: getMusicSections,
  });
  const [sectionId, setSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId && sections?.length) setSectionId(sections[0].key);
  }, [sections, sectionId]);

  const { data: artists, isLoading } = useQuery({
    queryKey: ["artists", sectionId],
    queryFn: () => getArtists(sectionId!),
    enabled: !!sectionId,
  });

  const groups = useMemo(() => (artists ? groupByLetter(artists) : []), [artists]);
  const availableLetters = useMemo(
    () => new Set(groups.map((g) => g.letter)),
    [groups],
  );

  const scrollToLetter = (letter: string) => {
    document.getElementById(`artist-letter-${letter}`)?.scrollIntoView({
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
          <h2>Artists</h2>
          {isLoading && <p className="muted">Loading…</p>}
          {groups.map(({ letter, items }) => (
            <section
              key={letter}
              id={`artist-letter-${letter}`}
              className="artist-letter-section"
            >
              <h3 className="artist-letter-heading">{letter}</h3>
              <div className="card-grid">
                {items.map((artist) => (
                  <Link key={artist.ratingKey} to={`/artist/${artist.ratingKey}`} className="card">
                    <Artwork thumb={artist.thumb} alt={artist.title} className="round" />
                    <div className="card-title">{artist.title}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
          {artists && artists.length === 0 && <p className="muted">No artists found.</p>}
        </div>

        {groups.length > 0 && (
          <AlphaIndex availableLetters={availableLetters} onSelect={scrollToLetter} />
        )}
      </div>
    </div>
  );
}
