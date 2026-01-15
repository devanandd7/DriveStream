import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";

export default function About() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";

  const handleSignIn = () => {
    // If user came from Telegram with tg_id, preserve it through the login
    const tgId = typeof router.query.tg_id === "string" ? router.query.tg_id : "";
    const cb = tgId ? `/login?tg_id=${encodeURIComponent(tgId)}` : "/login";
    signIn("google", { callbackUrl: cb });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">About Tele Auth</h1>
          <p className="text-sm text-white/70 mt-2">Link your Telegram to Google Drive and use a simple bot to browse and search your files.</p>
        </header>

        <section className="space-y-6 bg-white/5 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-6">
          <div>
            <h2 className="text-xl font-semibold">What this website does</h2>
            <p className="mt-2 text-white/80 text-sm">
              Tele Auth securely connects your Google account to a Telegram bot. Once linked, you can:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/80 list-disc list-inside">
              <li>View recent Drive files right inside Telegram</li>
              <li>Search your Drive by filename or content</li>
              <li>See quick stats (folders, images, PDFs, videos)</li>
              <li>Optionally add up to 3 family members to access via their Telegram</li>
              <li>Log out anytime to immediately disable bot access</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">How it helps</h2>
            <ul className="mt-2 space-y-2 text-sm text-white/80 list-disc list-inside">
              <li>Fast access to your Drive without opening the browser</li>
              <li>Simple commands for search and listing</li>
              <li>Privacy: your tokens stay on this server; Telegram sees only the results you request</li>
              <li>Control: you can revoke access with a single command or website sign out</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">How to use</h2>
            <ol className="mt-2 space-y-2 text-sm text-white/80 list-decimal list-inside">
              <li>Click the button below to sign in with Google and link your Telegram</li>
              <li>In Telegram, open the bot {botUsername ? `(e.g., @${botUsername})` : ""} and send /start</li>
              <li>Use /show (or /s) to list files, /find (or /f) to search</li>
              <li>Owner only: /members, /addmember, /removemember to manage family access</li>
              <li>/logout to disable bot access until you sign in again</li>
            </ol>
          </div>

          <div className="pt-2">
            {status !== "loading" && !session && (
              <button
                onClick={handleSignIn}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors px-4 py-2.5 font-medium"
              >
                Sign in with Google
              </button>
            )}
            {status === "authenticated" && (
              <div className="text-sm text-emerald-300">You are signed in as {session?.user?.email}. You can proceed to the dashboard.</div>
            )}
          </div>
        </section>

        <footer className="mt-6 text-xs text-white/60">
          <p>
            Having trouble? You can always browse your files on the website dashboard, or open Google Drive directly. If the bot can’t open a link on your device, use the website as a fallback.
          </p>
        </footer>
      </div>
    </div>
  );
}
