import { useLocation, useNavigate } from "react-router-dom";
import { GlyphBack } from "./Glyphs";

/** Touch-friendly back control for drill-down pages. */
export function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <button
      type="button"
      className="back-btn btn-secondary"
      onClick={() => {
        if (location.key !== "default") navigate(-1);
        else navigate(fallback);
      }}
    >
      <GlyphBack /> Back
    </button>
  );
}
