import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cargo Insurance Analytics Dashboard",
  description: "Analytics for Nacora Insurance Brokers and Kuehne Nagel partnership.",
    generator: 'v0.dev'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-gray-50 font-sans antialiased", inter.className)}>
        {children}
      </body>
    </html>
  );
}
