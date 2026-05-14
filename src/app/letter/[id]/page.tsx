"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useLetterStore } from "@/lib/store"
import ComposeLetter from "@/components/ComposeLetter"

export default function LetterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const store = useLetterStore()
  const [isTorn, setIsTorn] = useState(false)
  const [showPassConfirm, setShowPassConfirm] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const markedRead = useRef(false)

  const allLetters = [...store.receivedLetters, ...store.sentLetters]
  const letter = allLetters.find((l) => l.id === id)
  const isSentByMe = letter ? store.sentLetters.some((l) => l.id === letter.id) : false
  const thread = letter ? store.buildThread(letter.id) : []

  useEffect(() => {
    if (!isSentByMe && letter && !markedRead.current) {
      markedRead.current = true
      store.markAsRead(letter)
    }
  })

  if (!letter) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-secondary">편지를 찾을 수 없습니다</p>
      </div>
  )
}

function ThreadMsg({
  content,
  isReply,
  createdAt,
}: {
  content: string
  isReply: boolean
  createdAt: Date
}) {
  return (
    <div className={`flex ${isReply ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-3 py-2.5 rounded-xl ${
          isReply ? "bg-primary/8" : "bg-paper"
        }`}
      >
        <p className="text-sm serif text-text leading-snug">{content}</p>
        <div className={`flex items-center gap-1.5 mt-1 ${isReply ? "justify-end" : "justify-start"}`}>
          <span className="text-[11px] text-accent">
            {isReply ? "✉︎ 답장" : "편지"}
          </span>
          <span className="text-[11px] text-secondary">
            {new Date(createdAt).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  )
}


  const handleDelete = () => {
    setIsTorn(true)
    setTimeout(() => {
      store.deleteLetter(letter)
      router.push("/")
    }, 600)
  }

  const handleReport = () => {
    setIsTorn(true)
    setTimeout(() => {
      store.reportLetter(letter)
      router.push("/")
    }, 600)
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-primary font-medium mb-4 inline-flex items-center gap-1"
        >
          ← 뒤로
        </button>

        <div
          className={`space-y-4 transition-all duration-500 ${
            isTorn
              ? "opacity-0 blur-sm -translate-x-8 translate-y-10 scale-50"
              : "opacity-100 blur-0 translate-x-0 translate-y-0 scale-100"
          }`}
        >
          {letter.thread
            ? <>
                {letter.thread.map((msg, i) => (
                  <ThreadMsg key={i} content={msg.content} isReply={msg.isReply} createdAt={msg.createdAt} />
                ))}
                <LetterPaper letter={letter} store={store} />
              </>
            : thread.map((tl) => {
                const isMain = tl.id === letter.id
                const isMine = store.sentLetters.some((l) => l.id === tl.id)
                return isMain ? (
                  <LetterPaper key={tl.id} letter={tl} store={store} />
                ) : (
                  <ThreadCard
                    key={tl.id}
                    letter={tl}
                    isMine={isMine}
                    store={store}
                  />
                )
              })}
        </div>

        {!isSentByMe && !isTorn && (
          <div className="mt-6 space-y-2.5">
            {!store.hasReply(letter.id) && (
              <button
                onClick={() => setShowReply(true)}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                답장하기
              </button>
            )}
            <button
              onClick={() => setShowPassConfirm(true)}
              className="w-full py-3.5 rounded-xl bg-success text-white font-medium text-sm flex items-center justify-center gap-2"
            >
              다른 사람에게 패스
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-3.5 rounded-xl bg-destructive text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                삭제하기
              </button>
              <button
                onClick={handleReport}
                className="px-4 py-3.5 rounded-xl bg-destructive/6 text-destructive/40 flex items-center justify-center"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showPassConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-paper rounded-xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-bold text-text mb-2">
              이 편지를 패스할까요?
            </h3>
            <p className="text-sm text-secondary mb-5">
              편지를 다른 익명의 사용자에게 전달합니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  store.passLetter(letter)
                  router.push("/")
                }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white font-medium text-sm"
              >
                패스
              </button>
              <button
                onClick={() => setShowPassConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-accent/20 text-primary font-medium text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showReply && (
        <ComposeLetter
          replyToId={letter.id}
          onClose={() => {
            setShowReply(false)
            router.push("/")
          }}
        />
      )}
    </div>
  )
}

function LetterPaper({
  letter,
  store,
}: {
  letter: { id: string; content: string; pathCount: number; createdAt: Date; status: string }
  store: ReturnType<typeof useLetterStore>
}) {
  const isSentByMe = store.sentLetters.some((l) => l.id === letter.id)
  return (
    <div className="bg-paper rounded-xl card-shadow overflow-hidden">
      <div className="flex justify-center py-1.5">
        <div className="triangle" />
      </div>
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">익명의 편지</span>
          {letter.pathCount > 0 && (
            <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1">
              → {letter.pathCount}번째 전달
            </span>
          )}
        </div>
        <div className="border-t border-accent/30" />
        <p className="text-[15px] text-text leading-relaxed serif">
          {letter.content}
        </p>
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-xs text-secondary">
              {new Date(letter.createdAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {isSentByMe && (
              <p className="text-[11px] text-accent">내가 보낸 편지</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ThreadCard({
  letter,
  isMine,
  store,
}: {
  letter: { id: string; content: string; createdAt: Date; status: string }
  isMine: boolean
  store: ReturnType<typeof useLetterStore>
}) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-3 py-2.5 rounded-xl ${
          isMine ? "bg-primary/8" : "bg-paper"
        }`}
      >
        <p className="text-sm serif text-text leading-snug">{letter.content}</p>
        <div
          className={`flex items-center gap-1.5 mt-1 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span className="text-[11px] text-accent">
            {letter.status === "reply"
              ? "✉︎ 답장"
              : letter.status === "passed"
                ? "▶︎ 전달된 편지"
                : ""}
          </span>
          <span className="text-[11px] text-secondary">
            {new Date(letter.createdAt).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
