import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

// The mockups' typeface. Variable font, so every weight (body 400/500, headings 700) is available.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyDesk",
  description: "Personal dashboard for courses, assignments, grades and Outlook mail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
