export interface Message {
    serverId: string,
    senderId: string,
    receiverId: string,
    messageId: string,
    content: string,
    createdAt: Date,
    readBySender: boolean,
    readByReceiver: boolean,
    sent: boolean,
    attachmentUrl?: string,
    attachments?: string[]
}