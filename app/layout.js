export const metadata = {
  title: "ROUTINE MASTER",
  description: "Manage your daily routines",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
