import { useEffect, useMemo, useRef, useState } from "react";


export default function MoviesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(12);
  const sentinelRef = useRef(null);
  const savingScroll = useRef(false);

  // Determine batch size by viewport
  useEffect(() => {
    const decide = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(max-width: 640px)').matches) {
        setPageSize(4); // Mobile: 1x4
      } else if (window.matchMedia('(max-width: 1024px)').matches) {
        setPageSize(8); // Tablet: 2x4
      } else {
        setPageSize(12); // Desktop: 3x4 (4 columns)
      }
    };
    decide();
    window.addEventListener('resize', decide);
    return () => window.removeEventListener('resize', decide);
  }, []);

  // Fetch data with pagination
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/movies?page=${page}&pageSize=${pageSize}`);
        const js = await res.json();
        if (!mounted) return;
        if (!res.ok || !js.ok) throw new Error(js.error || 'Failed');
        setItems(prev => page === 1 ? (js.files || []) : [...prev, ...(js.files || [])]);
        setHasMore((js.files || []).length >= pageSize);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [page, pageSize]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setPage(p => p + 1);
        }
      });
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, sentinelRef.current]);

  // Preserve scroll position across navigation
  useEffect(() => {
    const y = sessionStorage.getItem('moviesScrollY');
    if (y) {
      requestAnimationFrame(() => window.scrollTo({ top: parseFloat(y), behavior: 'instant' }));
    }
    const onSave = () => {
      if (savingScroll.current) return;
      savingScroll.current = true;
      sessionStorage.setItem('moviesScrollY', String(window.scrollY || 0));
      setTimeout(() => { savingScroll.current = false; }, 100);
    };
    window.addEventListener('scroll', onSave, { passive: true });
    window.addEventListener('beforeunload', onSave);
    return () => {
      window.removeEventListener('scroll', onSave);
      window.removeEventListener('beforeunload', onSave);
    };
  }, []);

  const Skeletons = useMemo(() => Array.from({ length: pageSize }), [pageSize]);

  if (error) return <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white"><div className="p-6 max-w-6xl mx-auto">Failed to load movies.</div></div>;

  if (!items?.length && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
        <div className="p-6 space-y-3 max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold">Movies</h1>
          <p className="text-white/80">No movies found.</p>
          <p className="text-white/70">Create a folder named <b>Movies</b> in your Google Drive and move your videos inside it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Movies</h1>
        {/* Grid: mobile 1 col, tablet 2, desktop 4 (batches match pageSize) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((f) => {
            const id = f?.shortcutDetails?.targetId || f.id;
            const thumb = f.thumbnailLink;
            return (
              <a
                key={f.id}
                href={`/movies/${encodeURIComponent(id)}`}
                onClick={() => sessionStorage.setItem('moviesScrollY', String(window.scrollY || 0))}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition-all"
                style={{ height: 220 }}
              >
                {thumb ? (
                  <img src={thumb} alt={f.name} loading="lazy" className="w-full h-[160px] object-cover" />
                ) : (
                  <div className="w-full h-[160px] flex items-center justify-center text-3xl">🎬</div>
                )}
                <div className="p-4">
                  <div className="font-medium line-clamp-2">{f.name}</div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Skeletons during fetch */}
        {loading && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {Skeletons.map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 animate-pulse" style={{ height: 220 }}>
                <div className="w-full h-[160px] bg-white/10" />
                <div className="p-4">
                  <div className="h-4 w-2/3 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sentinel to trigger next batch */}
        <div ref={sentinelRef} className="h-10" />
      </div>
    </div>
  );
}
