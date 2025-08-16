import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reviews app",
  description: "Created by Minka",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
