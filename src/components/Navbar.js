import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";
  const [open, setOpen] = useState(false);

  const goLogin = () => {
    const tgId = typeof router.query.tg_id === "string" ? router.query.tg_id : "";
    const cb = tgId ? `/login?tg_id=${encodeURIComponent(tgId)}` : "/login";
    signIn("google", { callbackUrl: cb });
  };

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-black/20 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold">
            DriveStream
          </Link>
          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <Link href="/" className="text-white/80 hover:text-white">Home</Link>
            <Link href="/dashboard" className="text-white/80 hover:text-white">Dashboard</Link>
            <Link href="/movies" className="text-white/80 hover:text-white">Movies</Link>
            <Link href="/terms" className="text-white/80 hover:text-white">Terms</Link>
            {botUsername && (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="text-white/80 hover:text-white"
              >
                Open Telegram
              </a>
            )}
            {status === "authenticated" ? (
              <button onClick={() => signOut()} className="rounded-md bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1">
                Sign Out
              </button>
            ) : (
              <button onClick={goLogin} className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1">
                Login
              </button>
            )}
          </div>
          {/* Mobile hamburger */}
          <button
            className="sm:hidden inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white/80 hover:bg-white/10"
            aria-label="Toggle menu"
            aria-expanded={open ? "true" : "false"}
            onClick={() => setOpen(v => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Mobile menu panel */}
        {open && (
          <div className="sm:hidden mt-2 flex flex-col gap-2 text-sm border-t border-white/10 pt-2">
            <Link href="/" className="text-white/80 hover:text-white" onClick={() => setOpen(false)}>Home</Link>
            <Link href="/dashboard" className="text-white/80 hover:text-white" onClick={() => setOpen(false)}>Dashboard</Link>
            <Link href="/movies" className="text-white/80 hover:text-white" onClick={() => setOpen(false)}>Movies</Link>
            <Link href="/terms" className="text-white/80 hover:text-white" onClick={() => setOpen(false)}>Terms</Link>
            {botUsername && (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="text-white/80 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Open Telegram
              </a>
            )}
            {status === "authenticated" ? (
              <button onClick={() => { setOpen(false); signOut(); }} className="rounded-md bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-2 text-left">
                Sign Out
              </button>
            ) : (
              <button onClick={() => { setOpen(false); goLogin(); }} className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-2 text-left">
                Login
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
