import type { Metadata } from "next";
import "./globals.css";

const fontStylesheet =
  "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap";

export const metadata: Metadata = {
  title: "PersonaAI",
  description:
    "Turn your knowledge into an AI that represents you. Share a public link people can talk to when you’re busy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontStylesheet} rel="stylesheet" />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
