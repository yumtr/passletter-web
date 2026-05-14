export interface ThreadMessage {
  content: string
  isReply: boolean
  createdAt: Date
}

export interface Letter {
  id: string
  content: string
  senderId: string
  pathCount: number
  isRead: boolean
  isReported: boolean
  createdAt: Date
  status: "original" | "reply" | "passed"
  replyToId?: string
  firestoreDocId?: string
  thread?: ThreadMessage[]
}
