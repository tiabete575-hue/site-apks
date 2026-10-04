import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Central de Apps | Downloads para TV Box",
  description: "Baixe as versões mais recentes dos aplicativos para sua TV Box.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
