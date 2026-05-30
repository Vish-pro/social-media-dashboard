import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SocialPulse — Social Media Dashboard",
  description: "Schedule posts, track analytics, and manage YouTube, Instagram, and Threads from one powerful dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <NextAuthProvider>
          <WorkspaceProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </WorkspaceProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
