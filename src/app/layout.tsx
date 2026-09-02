import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

/*
 * The two faces the design specifies: Playfair Display for headlines,
 * Montserrat for body and labels.
 *
 * `shadcn init` added Geist here and pointed --font-sans at it. That has been
 * removed: it would have quietly made every shadcn component render in a
 * typeface the design does not use. --font-sans is mapped to Montserrat in
 * globals.css instead, so those components inherit the right face.
 *
 * Loaded through next/font so they are self-hosted and preloaded rather than
 * fetched from Google at runtime — a third-party request blocking first paint
 * is exactly what makes a listing page feel slow on a Kenyan mobile
 * connection.
 */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Homes by Serenity",
    template: "%s · Homes by Serenity",
  },
  description:
    "Short-term stays along the Kenyan coast and beyond. Book directly with the host and pay by M-Pesa.",
};

// The design is drawn for mobile, so the viewport is declared rather than left
// to the browser's desktop-width emulation.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#001e40",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", playfair.variable, montserrat.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
