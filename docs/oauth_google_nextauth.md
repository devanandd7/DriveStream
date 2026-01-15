---
title: Beginner-friendly guide to Google OAuth in Next.js (pages router) with NextAuth
description: Step-by-step guide to implement Google Sign-In with Drive access using NextAuth, including setup, code, reasons, and troubleshooting.
---

# Google OAuth in Next.js (pages router) with NextAuth

This guide shows you how to add “Sign in with Google” to a Next.js app using NextAuth, request Google Drive access, display the user’s profile, and safely handle tokens. It’s written for beginners and includes copy‑paste code.

## What you will build
- A login button that redirects to Google.
- After login, show profile photo, name, and email.
- Buttons to sign out and list Google Drive files (read-only).
- Secure token handling with automatic refresh.

---

## 1) Prerequisites
- Next.js app using the pages router (has a `src/pages` folder)
- Node 18+
- A Google Cloud project (free)

Optional but recommended:
- TailwindCSS for quick styling

---

## 2) Install NextAuth

```bash
npm install next-auth
# or
yarn add next-auth
```

Why: NextAuth provides providers (Google, GitHub, etc.), session handling, CSRF protection, and token management out of the box.

---

## 3) Create a Google OAuth client (Google Cloud Console)
1. Go to: Google Cloud Console → APIs & Services → OAuth consent screen.
   - App status: In testing (for development)
   - Add your email under Test users (so you can grant sensitive scopes like Drive)
   - Add the scope: https://www.googleapis.com/auth/drive.readonly (plus the default openid/email/profile)
2. APIs & Services → Credentials → Create credentials → OAuth client ID → Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
3. Copy your Client ID and Client Secret (we’ll put them in environment variables next).

Why: Google must know which website is allowed to use your OAuth client. NextAuth’s callback path is always `/api/auth/callback/google` for the Google provider.

---

## 4) Add environment variables (.env.local)
Create a file at the root of your Next.js app (same folder as `package.json`). For this project that is `web_auth/.env.local`.

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_random_string
NEXTAUTH_URL=http://localhost:3000
```

Tips:
- Generate `NEXTAUTH_SECRET` with a strong random value (e.g., `openssl rand -base64 32`).
- Never commit secrets to Git.
- Restart `npm run dev` after saving .env.

---

## 5) Wrap the app with SessionProvider
File: `src/pages/_app.js`

```javascript
import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";

export default function App({ Component, pageProps }) {
  const { session, ...rest } = pageProps || {};
  return (
    <SessionProvider session={session}>
      <Component {...rest} />
    </SessionProvider>
  );
}
```

Why: This gives every component access to session state via `useSession()`.

---

## 6) Create the NextAuth route (Google provider + Drive scope)
File: `src/pages/api/auth/[...nextauth].js`

```javascript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

async function refreshAccessToken(token) {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const refreshedTokens = await response.json();
    if (!response.ok) throw refreshedTokens;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }) {
      // On first sign-in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in ?? 0) * 1000,
          refreshToken: account.refresh_token,
          user,
        };
      }
      // Return existing token if still valid
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }
      // Refresh token
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = token.user ?? session.user;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
```

Why: 
- We request Drive read-only scope and ask Google for a refresh token (`access_type=offline`, `prompt=consent`).
- We store tokens in the JWT and refresh the access token as needed.

---

## 7) Build the UI (Home page)
File: `src/pages/index.js`

```javascript
import { Geist, Geist_Mono } from "next/font/google";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function Home() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const handleSignIn = () => signIn("google");
  const handleSignOut = () => signOut();

  const fetchDriveFiles = async () => {
    setError("");
    setFiles([]);
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name)",
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to fetch files");
      setFiles(json.files || []);
    } catch (e) {
      setError(e.message || "Unexpected error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10">
            <h1 className="text-xl font-semibold tracking-tight">Tele Auth</h1>
            <p className="text-sm text-white/70 mt-1">Sign in with Google to access your Drive files.</p>
          </div>

          <div className="p-6">
            {status === "loading" && (
              <div className="animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
                <div className="h-10 bg-white/10 rounded" />
              </div>
            )}

            {status !== "loading" && !session && (
              <div className="text-center">
                <button
                  onClick={handleSignIn}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors px-4 py-2.5 font-medium"
                >
                  Sign in with Google
                </button>
              </div>
            )}

            {session && (
              <div className="flex flex-col items-center text-center gap-5">
                <div className="flex flex-col items-center gap-3">
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user?.name || "User"}
                      className="w-16 h-16 rounded-full ring-2 ring-white/20"
                    />
                  )}
                  <div>
                    <p className="text-lg font-semibold">{session.user?.name || "User"}</p>
                    <p className="text-white/70 text-sm">{session.user?.email}</p>
                  </div>
                </div>

                <div className="flex w-full gap-3">
                  <button
                    onClick={fetchDriveFiles}
                    className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors px-4 py-2.5 font-medium"
                  >
                    List Drive Files
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors px-4 py-2.5 font-medium"
                  >
                    Sign Out
                  </button>
                </div>

                {error && (
                  <div className="w-full text-left text-rose-300 text-sm bg-rose-950/40 border border-rose-900/40 rounded-lg p-3">
                    {error}
                  </div>
                )}

                {!!files.length && (
                  <div className="w-full text-left">
                    <p className="text-sm font-medium mb-2 text-white/80">Your Drive files</p>
                    <ul className="space-y-1 max-h-56 overflow-auto pr-1">
                      {files.map((f) => (
                        <li key={f.id} className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-3 py-2">
                          {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Why: `useSession` gives you session and user info. We call `signIn('google')` and `signOut()`. We use the `accessToken` from session to call the Drive API.

---

## 8) Test locally
1. Restart dev server: `npm run dev`.
2. Visit `http://localhost:3000`.
3. Click Sign in with Google.
4. Approve the Drive permission (use a Test user account from the consent screen setup).
5. After redirect back, you should see your profile and can list Drive files.

If you see errors, check the Troubleshooting section below.

---

## 9) Production notes
- Set `NEXTAUTH_URL` to your deployed domain (e.g., `https://yourdomain.com`).
- In Google Cloud, add your production Origin and Redirect URI.
- Keep scopes minimal (principle of least privilege).
- Never commit secrets; rotate immediately if exposed.

---

## 10) Troubleshooting
- redirect_uri_mismatch / OAuthSignin:
  - Add `http://localhost:3000/api/auth/callback/google` to Google Redirect URIs.
- access_denied (403) during testing:
  - Add your email under Test users in the OAuth consent screen.
- ENOTFOUND accounts.google.com:
  - Network/DNS issue. Check internet/VPN/proxy. Try different DNS temporarily (e.g., 1.1.1.1).
- invalid_client:
  - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` and restart dev.
- No refresh token:
  - Ensure `prompt=consent` and `access_type=offline` are present. Try removing the app from https://myaccount.google.com/permissions and sign in again.

---

## 11) Why these choices?
- NextAuth with JWT strategy is simple for serverless/edge and doesn’t require a database for sessions.
- Requesting `drive.readonly` allows listing files without risk of modifying your Drive.
- Refresh token flow ensures long-lived sessions without repeatedly asking the user to log in.

---

## 12) Next steps
- Add protected pages using `getServerSideProps` and `getSession`.
- Move Google API calls to API routes if you want to hide access tokens from the browser.
- Replace Drive scope with `drive.file` (app-created files) or `drive` (full access) if needed, but expect stricter Google verification.

---

Happy building!
