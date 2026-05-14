"use client"

import { useEffect, useState } from "react"
import { useLetterStore } from "@/lib/store"
import LetterCard from "@/components/LetterCard"
import ComposeLetter from "@/components/ComposeLetter"
import Link from "next/link"

export default function PostboxPage() {
  const store = useLetterStore()
  const [showCompose, setShowCompose] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return
    setInitialized(true)
    const doInit = async () => {
      if (!store.firebaseUserId) {
        await store.signInToFirebase()
        await store.refreshFromFirebase()
      }
      if (store.receivedLetters.length === 0) {
        store.fetchRandom()
      }
    }
    doInit()
  }, [])

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-primary">패스레터</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => store.fetchRandom()}
                disabled={store.isFetching || store.remainingRandomFetches === 0}
                className="text-primary disabled:opacity-30"
              >
                {store.isFetching ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
              <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold text-white bg-primary rounded-full w-4 h-4 flex items-center justify-center">
                {store.remainingRandomFetches}
              </span>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="text-primary"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>
        </header>

        <section className="mb-8">
          <SectionHeader icon="📥" title="받은 편지함" />
          {store.receivedLetters.length === 0 ? (
            <EmptyCard text="아직 받은 편지가 없습니다" />
          ) : (
            <div className="space-y-3">
              {store.receivedLetters.map((letter) => (
                <Link key={letter.id} href={`/letter/${letter.id}`}>
                  <LetterCard
                    letter={letter}
                    hasReply={store.hasReply(letter.id)}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader icon="✈️" title="보낸 편지함" />
          {store.sentLetters.length === 0 ? (
            <EmptyCard text="아직 보낸 편지가 없습니다" />
          ) : (
            <div className="space-y-3">
              {store.sentLetters.map((letter) => (
                <Link key={letter.id} href={`/letter/${letter.id}`}>
                  <LetterCard
                    letter={letter}
                    hasReply={store.hasReply(letter.id)}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {showCompose && (
        <ComposeLetter onClose={() => setShowCompose(false)} />
      )}
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold text-primary mb-3 pl-1">
      <span>{icon}</span>
      {title}
    </h2>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <p className="text-sm text-secondary text-center py-8 bg-paper rounded-xl">
      {text}
    </p>
  )
}
