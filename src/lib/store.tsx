"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react"
import type { Letter, ThreadMessage } from "./types"
import {
  signIn,
  sendLetterToFirebase,
  fetchRandomLetter,
  fetchReceivedLetters,
  fetchSentLetters,
  passLetterToFirebase,
  markAsReadInFirebase,
  reportLetterInFirebase,
  listenForNewLetters,
} from "./firebase"

const PRESETS = [
  "오늘 하루도 수고했어.",
  "누군가 널 응원하고 있어.",
  "지금 하는 일이 잘 될 거야.",
  "너는 충분히 잘하고 있어.",
  "잠시 멈춰도 괜찮아.",
  "네가 있어 정말 다행이야.",
  "오늘은 좋은 일이 있을 거야.",
  "스스로를 믿어도 좋아.",
  "고생한 나에게 선물을 줘.",
  "편지를 읽어줘서 고마워.",
]

const RANDOM_LIMIT = 10
const RANDOM_WINDOW_MS = 3600000

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function migrateLetterDates(letters: Letter[]): Letter[] {
  return letters.map((l) => ({
    ...l,
    createdAt: l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt),
    thread: l.thread?.map((m) => ({
      ...m,
      createdAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt),
    })),
  }))
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

interface LetterStore {
  receivedLetters: Letter[]
  sentLetters: Letter[]
  myUserId: string
  firebaseUserId: string | null
  isFetching: boolean
  isConnected: boolean
  canWriteToday: boolean
  remainingWritesToday: number
  remainingRandomFetches: number
  signInToFirebase: () => Promise<void>
  sendLetter: (content: string, replyToId?: string) => boolean
  fetchRandom: () => void
  passLetter: (letter: Letter) => void
  markAsRead: (letter: Letter) => void
  deleteLetter: (letter: Letter) => void
  reportLetter: (letter: Letter) => void
  hasReply: (letterId: string) => boolean
  buildThread: (letterId: string) => Letter[]
  getRandomPreset: () => string
  refreshFromFirebase: () => Promise<void>
  requestExtraWrite: () => void
}

const Ctx = createContext<LetterStore | null>(null)

export function useLetterStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useLetterStore must be inside LetterProvider")
  return ctx
}

export function LetterProvider({ children }: { children: ReactNode }) {
  const myUserId = useMemo(
    () => loadFromStorage("myUserId", "") || crypto.randomUUID(),
    []
  )

  const [receivedLetters, setReceivedLetters] = useState<Letter[]>(() =>
    migrateLetterDates(loadFromStorage<Letter[]>("receivedLetters", []))
  )
  const [sentLetters, setSentLetters] = useState<Letter[]>(() =>
    migrateLetterDates(loadFromStorage<Letter[]>("sentLetters", []))
  )
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(() =>
    loadFromStorage<string | null>("firebaseUserId", null)
  )
  const [writesUsedToday, setWritesUsedToday] = useState(() =>
    loadFromStorage("writesUsedToday", 0)
  )
  const [extraWritesAvailable, setExtraWritesAvailable] = useState(() =>
    loadFromStorage("extraWritesAvailable", 0)
  )
  const [lastWriteDate, setLastWriteDate] = useState(() =>
    loadFromStorage("lastWriteDate", "")
  )
  const [lastPresetDate, setLastPresetDate] = useState(() =>
    loadFromStorage("lastPresetDate", "")
  )
  const [randomFetchCount, setRandomFetchCount] = useState(() =>
    loadFromStorage("randomFetchCount", 0)
  )
  const [randomFetchWindow, setRandomFetchWindow] = useState(() =>
    loadFromStorage("randomFetchWindow", 0)
  )
  const [mounted, setMounted] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    saveToStorage("myUserId", myUserId)
  }, [myUserId])

  const persist = useCallback(() => {
    saveToStorage("receivedLetters", receivedLetters)
    saveToStorage("sentLetters", sentLetters)
    saveToStorage("writesUsedToday", writesUsedToday)
    saveToStorage("extraWritesAvailable", extraWritesAvailable)
    saveToStorage("lastWriteDate", lastWriteDate)
    saveToStorage("lastPresetDate", lastPresetDate)
    saveToStorage("randomFetchCount", randomFetchCount)
    saveToStorage("randomFetchWindow", randomFetchWindow)
    saveToStorage("firebaseUserId", firebaseUserId)
  }, [
    receivedLetters, sentLetters,
    writesUsedToday, extraWritesAvailable,
    lastWriteDate, lastPresetDate,
    randomFetchCount, randomFetchWindow,
    firebaseUserId,
  ])

  useEffect(() => {
    persist()
  }, [persist])

  const resetDaily = useCallback(() => {
    const today = todayString()
    if (lastWriteDate !== today) {
      setLastWriteDate(today)
      setWritesUsedToday(0)
      setExtraWritesAvailable(0)
    }
  }, [lastWriteDate])

  useEffect(() => {
    resetDaily()
  }, [])

  const resetRandomWindow = useCallback(() => {
    const now = Date.now()
    if (now - randomFetchWindow > RANDOM_WINDOW_MS) {
      setRandomFetchWindow(now)
      setRandomFetchCount(0)
    }
  }, [randomFetchWindow])

  useEffect(() => {
    resetRandomWindow()
  }, [])

  const remainingRandomFetches = Math.max(0, RANDOM_LIMIT - randomFetchCount)

  const canWriteToday = writesUsedToday < 3 + extraWritesAvailable
  const remainingWritesToday = Math.max(0, 3 + extraWritesAvailable - writesUsedToday)

  const signInToFirebase = useCallback(async () => {
    try {
      const uid = await signIn()
      setFirebaseUserId(uid)
      setIsConnected(true)

      const unsub = listenForNewLetters(uid, (letter) => {
        setReceivedLetters((prev) => {
          if (prev.some((l) => l.id === letter.id)) return prev
          return [...prev, letter]
        })
      })
      unsubRef.current = unsub
    } catch {}
  }, [])

  useEffect(() => {
    if (firebaseUserId) {
      const unsub = listenForNewLetters(firebaseUserId, (letter) => {
        setReceivedLetters((prev) => {
          if (prev.some((l) => l.id === letter.id)) return prev
          return [...prev, letter]
        })
      })
      unsubRef.current = unsub
      return () => unsub()
    }
  }, [firebaseUserId])

  useEffect(() => {
    return () => {
      unsubRef.current?.()
    }
  }, [])

  const sendLetter = useCallback(
    (content: string, replyToId?: string): boolean => {
      const today = todayString()
      if (lastWriteDate !== today) {
        setLastWriteDate(today)
        setWritesUsedToday(1)
        setExtraWritesAvailable(0)
      } else {
        if (writesUsedToday >= 3 + extraWritesAvailable) return false
        setWritesUsedToday((p) => p + 1)
      }

      const trimmed = content.slice(0, 50)
      const letter: Letter = {
        id: crypto.randomUUID(),
        content: trimmed,
        senderId: myUserId,
        pathCount: 0,
        isRead: false,
        isReported: false,
        createdAt: new Date(),
        status: replyToId ? "reply" : "original",
        replyToId,
      }
      setSentLetters((prev) => [...prev, letter])

      if (firebaseUserId) {
        sendLetterToFirebase(letter, firebaseUserId)
      }
      return true
    },
    [myUserId, firebaseUserId, lastWriteDate, writesUsedToday, extraWritesAvailable]
  )

  const fetchRandom = useCallback(() => {
    if (isFetching) return

    const now = Date.now()
    const effectiveCount =
      now - randomFetchWindow > RANDOM_WINDOW_MS ? 0 : randomFetchCount

    if (effectiveCount >= RANDOM_LIMIT) {
      return
    }

    setIsFetching(true)
    if (effectiveCount === 0) {
      setRandomFetchWindow(now)
    }
    setRandomFetchCount(effectiveCount + 1)

    const tryFirebase = async () => {
      if (firebaseUserId) {
        try {
          const letter = await fetchRandomLetter(firebaseUserId)
          if (letter) {
            setReceivedLetters((prev) => [...prev, letter])
            setIsFetching(false)
            return
          }
        } catch {}
      }
      tryLocal()
    }

    const tryLocal = () => {
      const pool = migrateLetterDates(loadFromStorage<Letter[]>("letterPool", []))
      const available = pool.filter((l) => l.senderId !== myUserId)

      if (available.length > 0) {
        const idx = Math.floor(Math.random() * available.length)
        const picked = { ...available[idx], id: crypto.randomUUID(), isRead: false }
        pool.splice(idx, 1)
        saveToStorage("letterPool", pool)
        setReceivedLetters((prev) => [...prev, picked])
        setIsFetching(false)
        return
      }

      const today = todayString()
      if (lastPresetDate !== today) {
        const content = PRESETS[Math.floor(Math.random() * PRESETS.length)]
        const preset: Letter = {
          id: crypto.randomUUID(),
          content,
          senderId: "",
          pathCount: 0,
          isRead: false,
          isReported: false,
          createdAt: new Date(),
          status: "original",
        }
        setLastPresetDate(today)
        setReceivedLetters((prev) => [...prev, preset])
      }
      setIsFetching(false)
    }

    tryFirebase()
  }, [firebaseUserId, isFetching, myUserId, lastPresetDate, randomFetchCount, randomFetchWindow])

  const passLetter = useCallback(
    (letter: Letter) => {
      const allLetters = [...receivedLetters, ...sentLetters]
      const related = new Set<string>()
      const queue = [letter.id]

      while (queue.length > 0) {
        const current = queue.shift()!
        if (related.has(current)) continue
        related.add(current)
        const l = allLetters.find((x) => x.id === current)
        if (l?.replyToId) queue.push(l.replyToId)
        for (const x of allLetters) {
          if (x.replyToId === current) queue.push(x.id)
        }
      }

      const threadLetters = allLetters
        .filter((l) => related.has(l.id))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

      const thread: ThreadMessage[] = threadLetters.map((l) => ({
        content: l.content,
        isReply: l.senderId === myUserId,
        createdAt: l.createdAt,
      }))

      const passed: Letter = {
        ...letter,
        pathCount: letter.pathCount + 1,
        senderId: myUserId,
        thread,
      }
      const pool = loadFromStorage<Letter[]>("letterPool", [])
      pool.push(passed)
      saveToStorage("letterPool", pool)

      if (firebaseUserId) {
        passLetterToFirebase(letter, firebaseUserId, thread)
      }
      setReceivedLetters((prev) => {
        const next = prev.filter((l) => l.id !== letter.id)
        saveToStorage("receivedLetters", next)
        return next
      })
    },
    [myUserId, firebaseUserId, receivedLetters, sentLetters]
  )

  const markAsRead = useCallback((letter: Letter) => {
    setReceivedLetters((prev) => {
      const idx = prev.findIndex((l) => l.id === letter.id)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], isRead: true }
      saveToStorage("receivedLetters", updated)
      return updated
    })
    if (firebaseUserId) {
      markAsReadInFirebase(letter)
    }
  }, [firebaseUserId])

  const deleteLetter = useCallback((letter: Letter) => {
    setReceivedLetters((prev) => {
      const next = prev.filter((l) => l.id !== letter.id)
      saveToStorage("receivedLetters", next)
      return next
    })
    if (firebaseUserId && letter.firestoreDocId) {
      reportLetterInFirebase(letter)
    }
  }, [firebaseUserId])

  const reportLetter = useCallback((letter: Letter) => {
    setReceivedLetters((prev) => {
      const next = prev.filter((l) => l.id !== letter.id)
      saveToStorage("receivedLetters", next)
      return next
    })
    if (firebaseUserId) {
      reportLetterInFirebase(letter)
    }
  }, [firebaseUserId])

  const hasReply = useCallback(
    (letterId: string): boolean => {
      return (
        receivedLetters.some((l) => l.replyToId === letterId) ||
        sentLetters.some((l) => l.replyToId === letterId)
      )
    },
    [receivedLetters, sentLetters]
  )

  const buildThread = useCallback(
    (letterId: string): Letter[] => {
      const all = [...receivedLetters, ...sentLetters]
      const related = new Set<string>()
      const queue = [letterId]

      while (queue.length > 0) {
        const current = queue.shift()!
        if (related.has(current)) continue
        related.add(current)
        const l = all.find((x) => x.id === current)
        if (l?.replyToId) queue.push(l.replyToId)
        for (const x of all) {
          if (x.replyToId === current) queue.push(x.id)
        }
      }

      return all
        .filter((l) => related.has(l.id))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    },
    [receivedLetters, sentLetters]
  )

  const getRandomPreset = useCallback((): string => {
    return PRESETS[Math.floor(Math.random() * PRESETS.length)]
  }, [])

  const refreshFromFirebase = useCallback(async () => {
    if (!firebaseUserId) return
    const [received, sent] = await Promise.all([
      fetchReceivedLetters(firebaseUserId),
      fetchSentLetters(firebaseUserId),
    ])
    setReceivedLetters(received)
    setSentLetters(sent)
  }, [firebaseUserId])

  const requestExtraWrite = useCallback(() => {
    setExtraWritesAvailable((p) => p + 3)
  }, [])

  const store: LetterStore = useMemo(
    () => ({
      receivedLetters,
      sentLetters,
      myUserId,
      firebaseUserId,
      isFetching,
      isConnected,
      canWriteToday,
      remainingWritesToday,
      remainingRandomFetches,
      signInToFirebase,
      sendLetter,
      fetchRandom,
      passLetter,
      markAsRead,
      deleteLetter,
      reportLetter,
      hasReply,
      buildThread,
      getRandomPreset,
      refreshFromFirebase,
      requestExtraWrite,
    }),
    [
      receivedLetters, sentLetters,
      myUserId, firebaseUserId,
      isFetching, isConnected,
      canWriteToday, remainingWritesToday, remainingRandomFetches,
      signInToFirebase, sendLetter, fetchRandom, passLetter,
      markAsRead, deleteLetter, reportLetter,
      hasReply, buildThread, getRandomPreset,
      refreshFromFirebase, requestExtraWrite,
    ]
  )

  if (!mounted) {
    return <div className="min-h-screen bg-bg" />
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
