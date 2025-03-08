export interface ServerJoinPayload {
    serverId: string;
    apiKey: string;
}

export interface ServerMessage {
    type: 'message' | 'status' | 'error';
    content: string;
    timestamp: number;
}
