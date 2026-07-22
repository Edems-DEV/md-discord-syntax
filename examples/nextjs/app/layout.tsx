import "./globals.css";
import React from "react";

export const metadata = {
  title: "Discord Syntax Next.js Example",
  description: "Test page for @edems-dev/remark-discord-syntax",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
