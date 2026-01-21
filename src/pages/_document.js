import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/CrossEye.ico?v=2" type="image/x-icon" />
        <link rel="shortcut icon" href="/CrossEye.ico?v=2" type="image/x-icon" />
        <meta name="google-site-verification" content="lg-F3bHO2He35ctDW-J6KJe03_HjA59tPqoilb6z5TY" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
