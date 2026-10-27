import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

// The mockups' typeface. Variable font, so every weight (body 400/500, headings 700) is available.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyDesk",
  description: "Personal dashboard for courses, assignments, grades and Outlook mail.",
  applicationName: "StudyDesk",
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS "Add to Home Screen" standalone mode. black-translucent draws the page under the
  // status bar, which is why the layout pads for env(safe-area-inset-top) (see globals.css).
  appleWebApp: {
    capable: true,
    title: "StudyDesk",
    statusBarStyle: "black-translucent",
  },
  // Next emits the standard `mobile-web-app-capable`; older iOS only honours the Apple name.
  other: { "apple-mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Extend under the notch / home indicator; the layout pads with env(safe-area-inset-*).
  viewportFit: "cover",
  // Mirrors --background in globals.css and the manifest's theme_color.
  themeColor: "#292727",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
