"use client"

import type { Letter } from "@/lib/types"

export default function LetterCard({
  letter,
  hasReply,
}: {
  letter: Letter
  hasReply?: boolean
}) {
  return (
    <div className="flex items-start gap-3.5 p-3.5 bg-paper rounded-xl card-shadow">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-text leading-snug line-clamp-2">
          {letter.content}
        </p>
        <div className="flex items-center gap-2.5 mt-1.5">
          <span className="text-xs text-secondary">
            {new Date(letter.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          {letter.pathCount > 0 && (
            <span className="text-xs text-orange-500 flex items-center gap-0.5">
              → {letter.pathCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        {hasReply && (
          <span className="text-[11px] font-bold text-primary px-2 py-0.5 bg-accent/20 rounded-full">
            답장
          </span>
        )}
        {!letter.isRead && (
          <div className="w-2 h-2 rounded-full bg-accent" />
        )}
      </div>
    </div>
  )
}
