import "./globals.css";
import { Geist, DM_Sans } from "next/font/google";

const bodyFont = Geist({
  subsets: ["latin"],
  variable: "--body-font"
});

const headingFont = DM_Sans({
  subsets: ["latin"],
  variable: "--heading-font",
});

export const metadata = {
  title: "Room Planner",
  description: "Описание сайта",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${bodyFont.className} ${headingFont.variable}`}>
        {children}
      </body>
    </html>
  );
}