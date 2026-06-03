import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMusicSections, getRecentAlbums } from "../api/plex";
import { AlbumGrid } from "../components/AlbumGrid";

export function Library() {
  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: getMusicSections,
  });
  const [sectionId, setSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId && sections?.length) setSectionId(sections[0].key);
  }, [sections, sectionId]);

  const { data: recent } = useQuery({
    queryKey: ["recent", sectionId],
    queryFn: () => getRecentAlbums(sectionId!),
    enabled: !!sectionId,
  });

  return (
    <div className="page">
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

      <h2>Recently Added</h2>
      {recent ? <AlbumGrid albums={recent} /> : <p className="muted">Loading…</p>}
    </div>
  );
}
