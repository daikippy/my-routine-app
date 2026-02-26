import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <title>ROUTINE MASTER</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
