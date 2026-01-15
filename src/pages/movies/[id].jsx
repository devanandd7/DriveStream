import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/movies/${encodeURIComponent(id)}`);
        const js = await res.json();
        if (!mounted) return;
        setData(js);
        if (!res.ok || !js.ok) setError(js.error || "Failed");
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    // restore timecode
    if (!id) return;
    const t = Number(localStorage.getItem(`mv:${id}:t`) || 0);
    const v = videoRef.current;
    if (v && t > 0) {
      v.currentTime = t;
    }
  }, [id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !id) return;
    const onTime = () => {
      try { localStorage.setItem(`mv:${id}:t`, String(v.currentTime || 0)); } catch {}
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [id]);

  if (error) return <div className="p-6">Failed to load.</div>;
  if (loading || !data) return <div className="p-6">Loading…</div>;
  if (!data.ok) return <div className="p-6">{data.error || "Error"}</div>;

  const f = data.file || {};
  const previewUrl = f.previewUrl;
  const dl = f.webContentLink;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Compact header under sticky navbar */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/10 bg-black/60">
        <a className="text-blue-400 hover:text-blue-300" href="/movies">← Movies</a>
        <div className="font-medium truncate" title={f.name}>{f.name}</div>
      </div>
      {/* Player area fills remaining viewport height (assume ~56px header) */}
      <div className="w-full" style={{ height: "calc(100vh - 56px)" }}>
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : dl ? (
          <video ref={videoRef} className="w-full h-full object-contain" src={dl} controls preload="metadata" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/70">No preview available.</div>
        )}
      </div>
    </div>
  );
}
