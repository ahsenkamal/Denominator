import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Denominator — Every claim has a denominator",
  description: "Check onchain claims against real Uniswap data. See the baseline, the calculation, and the evidence behind the headline.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
