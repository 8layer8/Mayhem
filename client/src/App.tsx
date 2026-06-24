import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { getMe } from "./api/auth";
import { AudioEngine } from "./audio/AudioEngine";
import { MediaSession } from "./audio/MediaSession";
import { DocumentTitle } from "./components/DocumentTitle";
import { NowPlayingBar } from "./components/NowPlayingBar";
import { NowPlayingScreen } from "./components/NowPlayingScreen";
import { QueuePanel } from "./components/QueuePanel";
import { Sidebar } from "./components/Sidebar";
import { AlbumPage } from "./pages/AlbumPage";
import { AlbumsPage } from "./pages/AlbumsPage";
import { ArtistPage } from "./pages/ArtistPage";
import { ArtistsPage } from "./pages/ArtistsPage";
import { AuthCallback } from "./pages/AuthCallback";
import { Library } from "./pages/Library";
import { Login } from "./pages/Login";
import { PlaylistPage } from "./pages/PlaylistPage";
import { PlaylistsPage } from "./pages/PlaylistsPage";
import { SearchPage } from "./pages/SearchPage";
import { ServerSelect } from "./pages/ServerSelect";

export function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </>
  );
}

function MainApp() {
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    refetchOnWindowFocus: true,
  });

  const [queueOpen, setQueueOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  if (isLoading) {
    return <div className="centered-screen muted">Loading…</div>;
  }
  if (!me?.authenticated) {
    return <Login />;
  }
  if (!me.server) {
    return <ServerSelect />;
  }

  return (
    <div className="app-shell">
      <AudioEngine />
      <MediaSession />
      <div className="app-body">
        <Sidebar username={me.username} userThumb={me.userThumb} serverName={me.server.name} />
        <main className="content">
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/artist/:ratingKey" element={<ArtistPage />} />
            <Route path="/album/:ratingKey" element={<AlbumPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlist/:ratingKey" element={<PlaylistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Library />} />
          </Routes>
        </main>
        {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}
      </div>

      <NowPlayingBar
        onToggleQueue={() => setQueueOpen((v) => !v)}
        onToggleNowPlaying={() => setNowPlayingOpen(true)}
      />

      {nowPlayingOpen && <NowPlayingScreen onClose={() => setNowPlayingOpen(false)} />}
    </div>
  );
}
