import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from '../models/server.model';
import { io } from '../../server';
import { ServerJoinPayload, ServerMessage, ServerAction, UserStatusUpdate } from '../types/server-socket.interface';
import { getActiveUsers, setUserOnlineStatus } from '../controllers/users.controller';
import messagesController from '../controllers/messages.controller';
import { Message } from '../types/message.interface';
import { LeaveServer } from '../controllers/server.controller';
import { User } from '../models/user.model';

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
            if (server.expiresAt < new Date() && server.type === "Private") return false;
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
            
            // Emit typing status
            await this.broadcastUserTypingStatus(update.serverId, update.userId, false, "");
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
                await messagesController.sendMessage(serverId, message.content, message.senderId, message.receiverId, message.attachmentUrl);
            });

            socket.on('mark_message_read', async (messageId: string) => {
                await messagesController.markMessageRead(messageId);
            });

            socket.on('leave_server', async (serverId: string) => {
                socket.leave(serverId);
                try {
                    if (currentUserId) {
                        await this.untrackUserSocket(currentUserId, socket.id);
                        await LeaveServer(serverId, currentUserId);
                    }
                } catch (error) {
                    console.error('Error during leave process:', error);
                }
                currentServerId = null;
                currentUserId = null;
                
                // emit typing status
                await this.broadcastUserTypingStatus(serverId, serverId, false, "");

                socket.emit('server_left', {
                    type: 'status',
                    content: 'Left the server',
                    timestamp: Date.now()
                });
            });

            // user is typing
            socket.on('typing', async (serverId: string, receiverId: string, userId: string) => {
                await User.updateOne({ userId }, { typing: true, typingTo: receiverId });
                await this.broadcastUserTypingStatus(serverId, userId, true, receiverId);
            });

            // user is not typing
            socket.on('not_typing', async (serverId: string, userId: string) => {
                const user = await User.findOne({ userId });
                if (!user) {
                    return;
                }

                user.typing = false;
                const typingTo = user.typingTo;
                user.typingTo = "";
                await user.save();
                await this.broadcastUserTypingStatus(serverId, userId, false, typingTo);
            });

            // user disconnect
            socket.on('disconnect', async () => {
                if (currentUserId) {
                    await this.untrackUserSocket(currentUserId, socket.id);
                }
            });
        });
    }

    private async broadcastUserTypingStatus(serverId: string, userId: string, typing: boolean, typingTo: string | null): Promise<void> {
        this.io.in(serverId).emit('user_typing', { userId, typing, typingTo });
    }

    public emitToServer(serverId: string, message: ServerMessage): void {
        this.io.to(serverId).emit('server_message', message);
    }

    // broadcast new message
    public broadcastNewMessage(serverId: string, message: Omit<Message, 'messageId'>): void {
        this.io.in(serverId).emit('new-message', message);
    }

    // emit server actions
    public emitServerActions(serverId: string, action: ServerAction, username?: string): void {
        this.io.to(serverId).emit('server_action', {
            type: 'status',
            content: `${username || 'A user'} ${action === ServerAction.JOIN ? 'joined' : 'left'} the server`,
            action,
            username,
            timestamp: Date.now()
        });
    }

    public broadcastServerMessage(serverId: string, message: ServerMessage): void {
        this.io.in(serverId).emit('server_message', message);
    }

    public broadcastMessageRead(messageId: string, serverId: string): void {
        console.log('Broadcasting message read:', messageId, serverId);
        this.io.in(serverId).emit('message_read', messageId);
    }

    public broadcastServerDeleted(serverId: string) {
        this.io.in(serverId).emit("server_deleted");
    }
}

export const getSocketService = (): ServerSocketService => {
    return ServerSocketService.getInstance();
};
