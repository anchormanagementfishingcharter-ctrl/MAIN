import type { Metadata, Viewport } from "next";
import "./globals.css";

// Your main web address, used to build full links for Google and social sharing.
const base = (() => {
  try { return new URL(process.env.SITE_URL ?? ""); } catch { return new URL("https://www.anchormanagementfishing.com"); }
})();

const description =
  "Fishing gear rental in Destin, FL, delivered to your condo or beach house. Rods, reels, tackle and bait for surf, kids and family trips. Reserve online.";

export const metadata: Metadata = {
  metadataBase: base,
  // Search results show the title (about 60 characters) and description (about 155 characters).
  title: {
    default: "Fishing Gear Rental in Destin, FL | Anchor Management Destin",
    template: "%s | Anchor Management Destin", // other pages: "Their title | Anchor Management Destin"
  },
  description,
  alternates: { canonical: "/" }, // tells Google which web address is the main one
  openGraph: {
    type: "website",
    siteName: "Anchor Management Destin",
    title: "Fishing Gear Rental in Destin, FL | Anchor Management Destin",
    description,
    url: "/",
    locale: "en_US",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
