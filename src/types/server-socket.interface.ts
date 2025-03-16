export interface ServerJoinPayload {
    serverId: string;
    userId: string;
}

export interface ServerMessage {
    type: 'status' | 'error';
    content: string;
    timestamp: number;
}

export interface UserStatusUpdate {
    userId: string;
    isOnline: boolean;
    serverId: string;
}

export enum ServerAction {
    JOIN = 'join',
    LEAVE = 'leave'
}