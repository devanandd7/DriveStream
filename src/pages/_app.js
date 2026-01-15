import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";

export default function App({ Component, pageProps }) {
  const { session, ...rest } = pageProps || {};
  return (
    <SessionProvider session={session}>

      <Component {...rest} />
    </SessionProvider>
  );
}
