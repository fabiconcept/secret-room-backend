import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from '../models/server.model';
import { io } from '../../server';
import { ServerJoinPayload, ServerMessage, ServerAction } from '../types/server-socket.interface';

class ServerSocketService {
    private static instance: ServerSocketService;
    private io: SocketServer;

    private constructor() {
        this.io = io;
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

    private setupSocketHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log('Client connected:', socket.id);

            socket.on('join_server', async (payload: ServerJoinPayload) => {
                console.log('[join_server] Received join request:', { serverId: payload.serverId });
                try {
                    const { serverId, apiKey } = payload;
                    console.log('[join_server] Validating server access...');
                    const hasAccess = await this.validateServerAccess(serverId);
                    console.log('[join_server] Access validation result:', { hasAccess });

                    if (!hasAccess) {
                        console.log('[join_server] Access denied for server:', serverId);
                        socket.emit('server_error', {
                            type: 'error',
                            content: 'Invalid server credentials or server has expired',
                            timestamp: Date.now()
                        });
                        return;
                    }

                    // Leave all other rooms first
                    console.log('[join_server] Current rooms:', Array.from(socket.rooms));
                    socket.rooms.forEach(room => {
                        if (room !== socket.id) {
                            console.log('[join_server] Leaving room:', room);
                            socket.leave(room);
                        }
                    });

                    // Join the new server room
                    console.log('[join_server] Joining new server room:', serverId);
                    socket.join(serverId);

                    // Notify room members
                    console.log('[join_server] Broadcasting new member notification');
                    this.io.to(serverId).emit('server_message', {
                        type: 'status',
                        content: 'New member joined the server',
                        timestamp: Date.now()
                    });

                    // Send confirmation to the joining client
                    console.log('[join_server] Sending join confirmation to client');
                    socket.emit('server_joined', {
                        type: 'status',
                        content: 'Successfully joined the server',
                        timestamp: Date.now()
                    });
                    console.log('[join_server] Join process completed successfully');

                } catch (error) {
                    console.error('[join_server] Error during join process:', error);
                    socket.emit('server_error', {
                        type: 'error',
                        content: 'Failed to join server',
                        timestamp: Date.now()
                    });
                }
            });

            socket.on('leave_server', (serverId: string) => {
                socket.leave(serverId);
                socket.emit('server_left', {
                    type: 'status',
                    content: 'Left the server',
                    timestamp: Date.now()
                });
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    public emitToServer(serverId: string, message: ServerMessage): void {
        this.io.to(serverId).emit('server_message', message);
    }

    public emitServerActions(serverId: string, action: ServerAction, username?: string): void {
        // Broadcast to all clients in the room except sender
        this.io.to(serverId).emit('server_action', {
            type: 'status',
            content: `${username || 'A user'} ${action === ServerAction.JOIN ? 'joined' : 'left'} the server`,
            timestamp: Date.now()
        });
    }

    public broadcastServerMessage(serverId: string, message: ServerMessage): void {
        // Broadcast to all clients in the room
        this.io.in(serverId).emit('server_message', message);
    }
}

// Export singleton instance
export const getSocketService = (): ServerSocketService => {
    return ServerSocketService.getInstance();
};