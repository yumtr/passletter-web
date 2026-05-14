import type { Metadata } from "next"
import "./globals.css"
import { LetterProvider } from "@/lib/store"

export const metadata: Metadata = {
  title: "패스레터",
  description: "익명의 편지를 주고받는 공간",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <LetterProvider>{children}</LetterProvider>
      </body>
    </html>
  )
}
