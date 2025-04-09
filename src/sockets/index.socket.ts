import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from '../models/server.model';
import { io } from '../../server';
import { ServerJoinPayload, ServerMessage, ServerAction, UserStatusUpdate } from '../types/server-socket.interface';
import { getActiveUsers, setUserOnlineStatus } from '../controllers/users.controller';
import messagesController from '../controllers/messages.controller';
import { Message } from '../types/message.interface';

class ServerSocketService {
    private static instance: ServerSocketService;
    private io: SocketServer;
    private userSocketMap: Map<string, Set<string>>; // userId -> Set of socket IDs
    private serverUsersMap: Map<string, Set<string>>; // serverId -> Set of userIds

    private constructor() {
        this.io = io;
        this.userSocketMap = new Map();
        this.serverUsersMap = new Map();
        this.setupSocketHandlers();
    }

    public static getInstance(): ServerSocketService {
        if (!ServerSocketService.instance) {
            ServerSocketService.instance = new ServerSocketService();
        }
        return ServerSocketService.instance;
    }

    private async validateServerAccess(serverId: string): Promise<boolean> {
        try {
            const server = await Server.findOne({ serverId });
            if (!server) return false;
            if (server.expiresAt < new Date()) return false;
            return true;
        } catch (error) {
            console.error('Error validating server access:', error);
            return false;
        }
    }

    private async broadcastActiveUsers(serverId: string): Promise<void> {
        try {
            const activeUsers = await getActiveUsers(serverId);
            this.io.to(serverId).emit('active_users_updated', activeUsers);
        } catch (error) {
            console.error('Error broadcasting active users:', error);
        }
    }

    private async broadcastUserStatus(update: UserStatusUpdate): Promise<void> {
        try {
            // First update the user's status in the database
            await setUserOnlineStatus(update.userId, update.isOnline, update.serverId);
            
            // Then broadcast the updated user list to all clients in the server
            await this.broadcastActiveUsers(update.serverId);
            
            // Also emit a specific status update event for real-time UI updates
            this.io.to(update.serverId).emit('user_status_changed', update);
        } catch (error) {
            console.error('Error broadcasting user status:', error);
        }
    }

    private trackUserSocket(userId: string, socketId: string, serverId: string): void {
        // Track socket for user
        if (!this.userSocketMap.has(userId)) {
            this.userSocketMap.set(userId, new Set());
        }
        this.userSocketMap.get(userId)!.add(socketId);

        // Track user for server
        if (!this.serverUsersMap.has(serverId)) {
            this.serverUsersMap.set(serverId, new Set());
        }
        this.serverUsersMap.get(serverId)!.add(userId);
    }

    private async untrackUserSocket(userId: string, socketId: string): Promise<void> {
        const userSockets = this.userSocketMap.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.userSocketMap.delete(userId);
                
                // Find which server this user was in
                for (const [serverId, users] of this.serverUsersMap) {
                    if (users.has(userId)) {
                        users.delete(userId);
                        // Broadcast status update
                        await this.broadcastUserStatus({
                            userId,
                            isOnline: false,
                            serverId
                        });
                        break;
                    }
                }
            }
        }
    }

    private setupSocketHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log('Client connected:', socket.id);
            let currentServerId: string | null = null;
            let currentUserId: string | null = null;

            socket.on('join_server', async (payload: ServerJoinPayload) => {
                try {
                    const { serverId, userId } = payload;
                    currentServerId = serverId;
                    currentUserId = userId;
                    
                    const hasAccess = await this.validateServerAccess(serverId);
                    if (!hasAccess) {
                        socket.emit('server_error', {
                            type: 'error',
                            content: 'Invalid server credentials or server has expired',
                            timestamp: Date.now()
                        });
                        return;
                    }

                    // Leave all other rooms first
                    socket.rooms.forEach(room => {
                        if (room !== socket.id) {
                            socket.leave(room);
                        }
                    });

                    // Track user and join server room
                    if (userId) {
                        this.trackUserSocket(userId, socket.id, serverId);
                        socket.join(serverId);
                        
                        // Broadcast user's online status
                        await this.broadcastUserStatus({
                            userId,
                            isOnline: true,
                            serverId
                        });
                    }

                    socket.emit('server_joined', {
                        type: 'status',
                        content: 'Successfully joined the server',
                        timestamp: Date.now()
                    });

                } catch (error) {
                    console.error('Error during join process:', error);
                    socket.emit('server_error', {
                        type: 'error',
                        content: 'Failed to join server',
                        timestamp: Date.now()
                    });
                }
            });

            socket.on('new-message', async (serverId: string, message: Message) => {
                await messagesController.sendMessage(serverId, message.content, message.senderId, message.receiverId);
            });

            socket.on('leave_server', async (serverId: string) => {
                socket.leave(serverId);
                if (currentUserId) {
                    await this.untrackUserSocket(currentUserId, socket.id);
                }
                socket.emit('server_left', {
                    type: 'status',
                    content: 'Left the server',
                    timestamp: Date.now()
                });
            });

            socket.on('disconnect', async () => {
                if (currentUserId) {
                    await this.untrackUserSocket(currentUserId, socket.id);
                }
            });
        });
    }

    public emitToServer(serverId: string, message: ServerMessage): void {
        this.io.to(serverId).emit('server_message', message);
    }

    // broadcast new message
    public broadcastNewMessage(serverId: string, message: Message): void {
        console.log('Broadcasting new message to server:', serverId);
        console.log('Message:', message);

        this.io.in(serverId).emit('new-message', message);
    }
    public emitServerActions(serverId: string, action: ServerAction, username?: string): void {
        this.io.to(serverId).emit('server_action', {
            type: 'status',
            content: `${username || 'A user'} ${action === ServerAction.JOIN ? 'joined' : 'left'} the server`,
            timestamp: Date.now()
        });
    }

    public broadcastServerMessage(serverId: string, message: ServerMessage): void {
        this.io.in(serverId).emit('server_message', message);
    }
}

export const getSocketService = (): ServerSocketService => {
    return ServerSocketService.getInstance();
};
