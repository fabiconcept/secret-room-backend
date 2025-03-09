export interface ServerJoinPayload {
    serverId: string;
    apiKey: string;
}

export interface ServerMessage {
    type: 'message' | 'status' | 'error';
    content: string;
    timestamp: number;
}

export enum ServerAction {
    JOIN = 'join_server',
    LEAVE = 'leave_server'
}