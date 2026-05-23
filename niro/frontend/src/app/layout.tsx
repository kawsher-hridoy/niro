import type { Metadata } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const banglaFont = Noto_Sans_Bengali({
  variable: "--font-bangla",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Niro — আপনার স্বাস্থ্য, আপন হাতে",
  description:
    "Bangladesh's first patient-owned medical record. AI explains every prescription and report in Bangla.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`${banglaFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-bangla">
        {children}
      </body>
    </html>
  );
}
