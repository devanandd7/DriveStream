import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-20 pb-32">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo/Brand */}
            <div className="mb-8 inline-block">
              <div className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 shadow-2xl">
                <svg className="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  DriveStream
                </h1>
              </div>
            </div>

            {/* Tagline */}
            <h2 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              Seamlessly Connect
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Telegram & Google Drive
              </span>
            </h2>

            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Authenticate your Telegram bot users with Google OAuth and give them instant access to their Google Drive files—all in one secure platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl px-8 py-4 font-semibold text-lg shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Get Started
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-xl px-8 py-4 font-semibold text-lg transition-all duration-300 hover:scale-105"
              >
                Learn More
              </Link>
            </div>

            {/* Quick Info Banner */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-300 text-sm font-medium">Secure • Fast • Easy to integrate</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Why Choose <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">DriveStream?</span>
            </h3>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">Secure Authentication</h4>
                <p className="text-white/70 leading-relaxed">
                  OAuth 2.0 powered Google authentication ensures your users' data is protected with industry-standard security.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">Google Drive Integration</h4>
                <p className="text-white/70 leading-relaxed">
                  Browse, preview, and manage Google Drive files directly from your Telegram bot with seamless integration.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">Lightning Fast</h4>
                <p className="text-white/70 leading-relaxed">
                  Built with Next.js and optimized for performance—experience instant authentication and rapid file access.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">Telegram Bot Ready</h4>
                <p className="text-white/70 leading-relaxed">
                  Link Telegram accounts effortlessly and provide your bot users with authenticated access to their files.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">Media Gallery</h4>
                <p className="text-white/70 leading-relaxed">
                  View images, videos, PDFs, and Google Docs with a beautiful gallery interface and instant previews.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3">Developer Friendly</h4>
                <p className="text-white/70 leading-relaxed">
                  Clean API, comprehensive documentation, and easy integration make development a breeze.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold text-center mb-16">
              How It <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Works</span>
            </h3>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-6 items-start group">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  1
                </div>
                <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 group-hover:bg-white/10 transition-all">
                  <h4 className="text-xl font-bold mb-2">Connect Your Telegram Bot</h4>
                  <p className="text-white/70">Users interact with your Telegram bot and receive a unique authentication link.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start group">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  2
                </div>
                <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 group-hover:bg-white/10 transition-all">
                  <h4 className="text-xl font-bold mb-2">Google OAuth Login</h4>
                  <p className="text-white/70">Users sign in securely with their Google account using OAuth 2.0.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start group">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-700 rounded-full flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  3
                </div>
                <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 group-hover:bg-white/10 transition-all">
                  <h4 className="text-xl font-bold mb-2">Access Google Drive</h4>
                  <p className="text-white/70">Browse, preview, and manage their Google Drive files through an elegant dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 pb-20">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h3>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join users who trust DriveStream for secure Telegram bot authentication and Google Drive integration.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl px-8 py-4 font-semibold text-lg shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Start Authenticating
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-white/10 bg-black/20">
          <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-white/80">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
                <span className="font-semibold">DriveStream</span>
              </div>
              <p className="text-sm text-white/70">Streamlining your personal cloud experience through beautiful design and smart automation.</p>
              <div className="flex gap-3 mt-4">
                <a href="#" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center">t</a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center">X</a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center">G</a>
              </div>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Product</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white">Features</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/movies" className="hover:text-white">Web Player</Link></li>
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Resources</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Community</a></li>
                <li><a href="#" className="hover:text-white">API Docs</a></li>
                <li><a href="#" className="hover:text-white">System Status</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/policy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 pb-8 text-xs text-white/60 flex items-center justify-between">
            <div>© {new Date().getFullYear()} DriveStream. All rights reserved.</div>
            <div className="text-white/60">Powered by Google Drive</div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .delay-500 {
          animation-delay: 500ms;
        }
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}
