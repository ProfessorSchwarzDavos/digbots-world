import type { Metadata } from "next";
import "./globals.css";
import "./digbots.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://blockwild.app"),
  manifest: "/manifest.webmanifest",
  title: "Blockwild",
  description: "Explore endless streamed biomes, mine deep caves, craft tools, build, smelt, fight creatures, and survive in an original browser voxel world.",
  openGraph: {
    title: "Blockwild — Endless Browser Voxel Survival",
    description: "Explore, build, craft, and survive across an endless original voxel world.",
    type: "website",
    images: [{ url: "/og.png", width: 1527, height: 862, alt: "Blockwild title screen over an endless voxel wilderness" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blockwild — Endless Browser Voxel Survival",
    description: "Explore, build, craft, and survive across an endless original voxel world.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/brand/blockwild-icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/blockwild-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/blockwild-icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/blockwild-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/blockwild-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/brand/blockwild-icon-32.png",
    apple: [{ url: "/brand/blockwild-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Blockwild",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* DIGBOTS loading bar: loads before the game code so the bar shows right away */}
        <script src="/quickstart.js" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}
