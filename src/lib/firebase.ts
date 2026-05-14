import { initializeApp } from "@firebase/app"
import { getAuth, signInAnonymously } from "@firebase/auth"
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "@firebase/firestore"
import type { Letter } from "./types"

const firebaseConfig = {
  apiKey: "AIzaSyAVIYU6jjuD87tfvp587tIKTx7UQfbn8E0",
  authDomain: "paetter-9b868.firebaseapp.com",
  projectId: "paetter-9b868",
  storageBucket: "paetter-9b868.firebasestorage.app",
  messagingSenderId: "295646597712",
  appId: "1:295646597712:ios:ad42190b531513346a7755",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export async function signIn(): Promise<string> {
  const result = await signInAnonymously(auth)
  return result.user.uid
}

export function toFirestore(letter: Letter, senderId: string) {
  const data: Record<string, unknown> = {
    content: letter.content,
    senderId,
    recipientId: "",
    pathCount: letter.pathCount,
    isRead: letter.isRead,
    isReported: letter.isReported,
    createdAt: Timestamp.fromDate(letter.createdAt),
    status: letter.status,
  }
  if (letter.replyToId) data.replyToId = letter.replyToId
  return data
}

export function fromFirestore(data: Record<string, unknown>, docId: string): Letter | null {
  const content = data.content as string | undefined
  const senderId = data.senderId as string | undefined
  const pathCount = data.pathCount as number | undefined
  const isRead = data.isRead as boolean | undefined
  const isReported = data.isReported as boolean | undefined
  const timestamp = data.createdAt as Timestamp | undefined
  const status = data.status as string | undefined
  const replyToId = data.replyToId as string | undefined

  if (!content || !senderId || pathCount === undefined || isRead === undefined ||
      isReported === undefined || !timestamp || !status) return null

  return {
    id: docId,
    content,
    senderId,
    pathCount,
    isRead,
    isReported,
    createdAt: timestamp.toDate(),
    status: status as Letter["status"],
    replyToId,
    firestoreDocId: docId,
  }
}

export async function sendLetterToFirebase(letter: Letter, senderId: string) {
  const data = toFirestore(letter, senderId)
  await addDoc(collection(db, "letters"), data)
}

export async function fetchRandomLetter(userId: string): Promise<Letter | null> {
  const q = query(
    collection(db, "letters"),
    where("recipientId", "==", ""),
    limit(10)
  )
  const snapshot = await getDocs(q)
  const unclaimed = snapshot.docs.filter(
    (d) => (d.data().senderId as string) !== userId
  )
  if (unclaimed.length === 0) return null

  const selected = unclaimed[Math.floor(Math.random() * unclaimed.length)]
  await updateDoc(doc(db, "letters", selected.id), { recipientId: userId })
  return fromFirestore(selected.data() as Record<string, unknown>, selected.id)
}

export async function fetchReceivedLetters(userId: string): Promise<Letter[]> {
  const q = query(
    collection(db, "letters"),
    where("recipientId", "==", userId)
  )
  const snapshot = await getDocs(q)
  const letters = snapshot.docs
    .map((d) => fromFirestore(d.data() as Record<string, unknown>, d.id))
    .filter((l): l is Letter => l !== null)
  letters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return letters
}

export async function fetchSentLetters(userId: string): Promise<Letter[]> {
  const q = query(
    collection(db, "letters"),
    where("senderId", "==", userId)
  )
  const snapshot = await getDocs(q)
  const letters = snapshot.docs
    .map((d) => fromFirestore(d.data() as Record<string, unknown>, d.id))
    .filter((l): l is Letter => l !== null)
  letters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return letters
}

export async function passLetterToFirebase(letter: Letter, senderId: string) {
  await addDoc(collection(db, "letters"), {
    content: letter.content,
    senderId,
    recipientId: "",
    pathCount: letter.pathCount + 1,
    isRead: false,
    isReported: false,
    createdAt: Timestamp.fromDate(new Date()),
    status: "passed",
  })
}

export async function markAsReadInFirebase(letter: Letter) {
  if (!letter.firestoreDocId) return
  await updateDoc(doc(db, "letters", letter.firestoreDocId), { isRead: true })
}

export async function reportLetterInFirebase(letter: Letter) {
  if (!letter.firestoreDocId) return
  await deleteDoc(doc(db, "letters", letter.firestoreDocId))
}

export function listenForNewLetters(
  userId: string,
  onNew: (letter: Letter) => void
): Unsubscribe {
  const q = query(
    collection(db, "letters"),
    where("recipientId", "==", "")
  )
  return onSnapshot(q, (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== "added") continue
      const data = change.doc.data() as Record<string, unknown>
      if ((data.senderId as string) === userId) continue
      const letter = fromFirestore(data, change.doc.id)
      if (!letter) continue

      updateDoc(doc(db, "letters", change.doc.id), { recipientId: userId })
      onNew(letter)
    }
  })
}
