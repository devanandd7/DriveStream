import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDb, ensureIndexes } from "@/lib/mongo";

async function refreshAccessToken(token) {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
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
      if (account && user) {
        const newToken = {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in ?? 0) * 1000,
          refreshToken: account.refresh_token,
          user,
        };

        try {
          await ensureIndexes();
          const db = await getDb();
          const col = db.collection("user_credentials");
          await col.updateOne(
            { provider: account.provider, providerAccountId: account.providerAccountId },
            {
              $set: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                userId: user.email,
                email: user.email,
                name: user.name,
                image: user.image,
                accessToken: newToken.accessToken,
                accessTokenExpires: newToken.accessTokenExpires,
                refreshToken: newToken.refreshToken,
                scope: "openid email profile https://www.googleapis.com/auth/drive.readonly",
                updatedAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );
        } catch (_) {}

        return newToken;
      }

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      const refreshed = await refreshAccessToken(token);
      try {
        await ensureIndexes();
        const db = await getDb();
        const col = db.collection("user_credentials");
        await col.updateOne(
          { userId: (refreshed.user && refreshed.user.email) || (token.user && token.user.email) },
          {
            $set: {
              accessToken: refreshed.accessToken,
              accessTokenExpires: refreshed.accessTokenExpires,
              refreshToken: refreshed.refreshToken,
              updatedAt: new Date(),
            },
          }
        );
      } catch (_) {}
      return refreshed;
    },
    async session({ session, token }) {
      session.user = token.user ?? session.user;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      try {
        const email = token?.user?.email || token?.email;
        if (!email) return;
        await ensureIndexes();
        const db = await getDb();
        const col = db.collection("user_credentials");
        const doc = await col.findOne({ userId: email });
        await col.updateOne(
          { userId: email },
          { $set: { "telegram.active": false, updatedAt: new Date() } }
        );

        // Notify owner and active members that access is disabled
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken && doc?.telegram?.tgId) {
            const notify = async (chatId, text) => {
              try {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chat_id: String(chatId), text }),
                });
              } catch (_) {}
            };
            await notify(doc.telegram.tgId, "You have signed out from the website. Bot access is now disabled until you sign in again.");
            const members = Array.isArray(doc.telegram?.members) ? doc.telegram.members : [];
            for (const m of members) {
              if (m?.active && m?.tgId) {
                await notify(m.tgId, "Owner signed out. Your access to Drive via bot is temporarily disabled.");
              }
            }
          }
        } catch (_) {}
      } catch (_) {}
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
