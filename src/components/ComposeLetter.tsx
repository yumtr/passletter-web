"use client"

import { useState } from "react"
import { useLetterStore } from "@/lib/store"

const MAX = 50

export default function ComposeLetter({
  replyToId,
  onClose,
}: {
  replyToId?: string
  onClose: () => void
}) {
  const store = useLetterStore()
  const [content, setContent] = useState("")

  const handleSend = () => {
    if (!content.trim()) return
    store.sendLetter(content.trim(), replyToId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary">
            {replyToId ? "답장 쓰기" : "편지 쓰기"}
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-primary font-medium"
          >
            취소
          </button>
        </div>

        {store.canWriteToday ? (
          <div className="space-y-4">
            <div className="relative bg-paper rounded-xl card-shadow">
              <textarea
                value={content}
                onChange={(e) =>
                  setContent(e.target.value.slice(0, MAX))
                }
                placeholder="익명의 누군가에게..."
                className="w-full min-h-[120px] bg-transparent text-text serif text-[15px] leading-relaxed p-4 outline-none resize-none placeholder:text-secondary/50"
                autoFocus
              />
              <div className="border-t border-accent/20 mx-4" />
              <div className="flex items-center justify-between px-4 py-2.5">
                <span
                  className={`text-xs ${
                    content.length >= MAX
                      ? "text-destructive"
                      : "text-secondary"
                  }`}
                >
                  {content.length} / {MAX}
                </span>
                <span className="text-xs text-secondary">
                  하루 {store.remainingWritesToday}회
                </span>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={!content.trim()}
              className="w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:bg-accent/30 disabled:text-secondary bg-primary text-white"
            >
              전송하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-10">
            <svg
              className="w-9 h-9 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z"
              />
            </svg>
            <div className="text-center">
              <p className="text-base font-bold text-text">
                오늘 작성 횟수를 모두 사용했습니다
              </p>
              <p className="text-sm text-secondary mt-1">
                광고를 시청하고 추가로 작성해보세요
              </p>
            </div>
            <button
              onClick={() => {
                store.requestExtraWrite()
                alert(
                  "웹 버전에서는 광고가 제공되지 않습니다.\n추가 작성권이 활성화되었습니다."
                )
              }}
              className="w-full max-w-xs py-3.5 rounded-xl bg-primary text-white font-medium text-sm"
            >
              광고 시청하고 추가 작성
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
