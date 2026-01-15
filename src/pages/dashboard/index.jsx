import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useMemo, useRef } from "react";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("gallery"); // 'gallery' | 'albums'
  const [filter, setFilter] = useState("all"); // all | images | videos | pdf | docs
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const savingScroll = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/drive?page=${page}&pageSize=${pageSize}`);
        const js = await res.json();
        if (!mounted) return;
        if (!res.ok || !js.ok) throw new Error(js.error || "Failed to load drive data");
        setFiles((prev) => (page === 1 ? (js.files || []) : [...prev, ...(js.files || [])]));
        setTotal(js.total || 0);
        setHasMore((js.files || []).length >= pageSize);
        // auto-select first file on first page only
        if (page === 1) setSelected((cur) => cur || (js.files?.[0] || null));
        setError(null);
      } catch (e) {
        setError(e.message || "Error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [status, page, pageSize]);

  // Decide batch size by viewport
  useEffect(() => {
    const decide = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(max-width: 640px)').matches) {
        setPageSize(4);
      } else if (window.matchMedia('(max-width: 1024px)').matches) {
        setPageSize(8);
      } else {
        setPageSize(12);
      }
    };
    decide();
    window.addEventListener('resize', decide);
    return () => window.removeEventListener('resize', decide);
  }, []);

  // Infinite scroll for gallery
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      });
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, sentinelRef.current]);

  // Preserve scroll position in gallery
  useEffect(() => {
    const y = sessionStorage.getItem('dashGalleryScrollY');
    if (y) {
      requestAnimationFrame(() => window.scrollTo({ top: parseFloat(y), behavior: 'instant' }));
    }
    const onSave = () => {
      if (savingScroll.current) return;
      savingScroll.current = true;
      sessionStorage.setItem('dashGalleryScrollY', String(window.scrollY || 0));
      setTimeout(() => { savingScroll.current = false; }, 100);
    };
    window.addEventListener('scroll', onSave, { passive: true });
    window.addEventListener('beforeunload', onSave);
    return () => {
      window.removeEventListener('scroll', onSave);
      window.removeEventListener('beforeunload', onSave);
    };
  }, []);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const filtered = useMemo(() => {
    if (!Array.isArray(files)) return [];
    if (filter === "all") return files;
    return files.filter((f) => {
      const mt = f.file_type || "";
      if (filter === "images") return mt.startsWith("image/");
      if (filter === "videos") return mt.startsWith("video/");
      if (filter === "pdf") return mt === "application/pdf";
      if (filter === "docs") return mt.includes("google-apps") || mt.includes("msword") || mt.includes("presentation") || mt.includes("spreadsheet");
      return true;
    });
  }, [files, filter]);

  if (status === "loading") return <div className="p-6">Loading…</div>;

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
          <p className="mb-4 text-white/80">You are not logged in.</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2 text-white"
          >
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <Navbar />
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session.user?.image && <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full" />}
            <div>
              <div className="text-sm font-medium">{session.user?.name || "User"}</div>
              <div className="text-xs text-white/70">{session.user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <Link href="/movies" className="text-sm px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10">Movies</Link> */}
            <button onClick={() => signOut()} className="text-sm px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10">Sign Out</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-12 gap-4">
        {/* Main: Gallery/Albums */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden backdrop-blur">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={()=>setView("gallery")} className={`text-sm px-3 py-1.5 rounded-md border ${view==='gallery'?'bg-white/10 border-white/20':'border-white/10 hover:bg-white/10'}`}>Gallery</button>
                <button onClick={()=>setView("albums")} className={`text-sm px-3 py-1.5 rounded-md border ${view==='albums'?'bg-white/10 border-white/20':'border-white/10 hover:bg-white/10'}`}>Albums</button>
              </div>
              <div className="flex items-center gap-2">
                <a href="https://drive.google.com/drive/" target="_blank" rel="noreferrer" className="text-sm px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10">Go to Drive</a>
                <div className="text-xs text-white/70">{total} items</div>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-white/10">
              {[
                {k:'all',label:'All'},
                {k:'images',label:'Images'},
                {k:'videos',label:'Videos'},
                {k:'pdf',label:'PDFs'},
                {k:'docs',label:'Docs'},
              ].map(x=> (
                <button key={x.k} onClick={()=>setFilter(x.k)} className={`text-xs px-3 py-1.5 rounded-full border ${filter===x.k?'bg-white/10 border-white/20':'border-white/10 hover:bg-white/10'}`}>{x.label}</button>
              ))}
            </div>

            {/* Gallery grid with infinite scroll */}
            <div className="p-4">
              {error && <div className="text-sm text-red-300 mb-2">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {filtered.map((f)=>{
                  const isSel = selected?.file_id === f.file_id;
                  const mt = f.file_type || '';
                  const isImg = mt.startsWith('image/');
                  const isVideo = mt.startsWith('video/');
                  const canIframePreview = !isVideo; // show preview for images, pdfs, google docs, etc.
                  return (
                    <button
                      key={f.file_id}
                      onClick={()=>{
                        sessionStorage.setItem('dashGalleryScrollY', String(window.scrollY || 0));
                        setSelected(f);
                      }}
                      className={`group rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 ${isSel?'ring-2 ring-white/40':''}`}
                      style={{ height: 220 }}
                    >
                      <div className="w-full h-[160px] overflow-hidden">
                        {canIframePreview ? (
                          <iframe
                            title={`preview-${f.file_id}`}
                            src={`https://drive.google.com/file/d/${encodeURIComponent(f.file_id)}/preview`}
                            className="w-full h-full"
                            loading="lazy"
                            allow="autoplay; fullscreen"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                        )}
                      </div>
                      <div className="p-2 text-left">
                        <div className="text-xs truncate" title={f.file_name}>{f.file_name}</div>
                      </div>
                    </button>
                  );
                })}
                {/* Skeletons while loading more */}
                {loading && Array.from({length: pageSize}).map((_,i)=> (
                  <div key={`sk-${i}`} className="rounded-xl overflow-hidden border border-white/10 bg-white/5 animate-pulse" style={{ height: 220 }}>
                    <div className="w-full h-[160px] bg-white/10" />
                    <div className="p-2">
                      <div className="h-3 w-2/3 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Sentinel */}
              <div ref={sentinelRef} className="h-10" />
            </div>

            {/* No pagination controls; infinite scroll replaces them */}
          </div>
        </div>

        {/* Right: preview panel */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white/5 border border-white/10 rounded-lg h-[80vh] flex flex-col backdrop-blur">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="font-medium">Preview</div>
              {selected && (
                <div className="text-xs text-white/70 truncate max-w-[50%]" title={selected.file_name}>{selected.file_name}</div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {!selected ? (
                <div className="w-full h-full flex items-center justify-center text-white/70">Select a file to preview</div>
              ) : (
                <div className="w-full h-full">
                  <iframe
                    title="preview"
                    src={`https://drive.google.com/file/d/${encodeURIComponent(selected.file_id)}/preview`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                  />
                </div>
              )}
            </div>
            {selected && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
                {selected.web_view_link && <a className="text-sm px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10" href={selected.web_view_link} target="_blank" rel="noreferrer">Open</a>}
                {selected.drive_download_link && <a className="text-sm px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10" href={selected.drive_download_link} target="_blank" rel="noreferrer">Download</a>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
