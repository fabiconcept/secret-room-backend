export interface Message {
    serverId: string,
    senderId: string,
    receiverId: string,
    content: string,
    createdAt: Date,
    read: boolean
}