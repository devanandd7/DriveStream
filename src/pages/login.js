import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";

export default function Login() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [message, setMessage] = useState("");
  const tgId = typeof router.query.tg_id === "string" ? router.query.tg_id : "";
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";

  useEffect(() => {
    async function linkTelegram() {
      if (!session || !tgId) return;
      try {
        setMessage("Linking your Telegram account…");
        const res = await fetch("/api/bot/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tgId }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to link");
        setMessage("✅ Linked. Redirecting to dashboard…");
        // Small delay to show success, then go to dashboard
        setTimeout(() => {
          router.replace("/?linked=1");
        }, 700);
      } catch (e) {
        setMessage(`❌ ${e.message || "Failed to link"}`);
      }
    }
    linkTelegram();
  }, [session, tgId]);

  const handleSignIn = () => {
    const cb = tgId ? `/login?tg_id=${encodeURIComponent(tgId)}` : "/login";
    signIn("google", { callbackUrl: cb });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      <div className="w-full max-w-md mx-auto mt-8 bg-white/5 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="text-xl font-semibold tracking-tight">Verify access</h1>
          <p className="text-sm text-white/70 mt-1">Sign in with Google and we will link your Telegram account.</p>
        </div>
        <div className="p-6 space-y-4">
          {!tgId && (
            <p className="text-sm text-amber-300">Missing tg_id in URL. Please open this page from the Telegram bot.</p>
          )}

          {status === "loading" && <p>Loading…</p>}
          {status !== "loading" && !session && (
            <button
              onClick={handleSignIn}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors px-4 py-2.5 font-medium"
            >
              Continue with Google
            </button>
          )}

          {session && (
            <div className="space-y-3 text-sm">
              <p>Signed in as <span className="font-medium">{session.user?.email}</span></p>
              <p>{message || "Waiting…"}</p>
              {botUsername && message.startsWith("✅") && (
                <div className="pt-2">
                  <a
                    href={`https://t.me/${botUsername}`}
                    className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors px-4 py-2.5 font-medium"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Telegram Bot (@{botUsername})
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
