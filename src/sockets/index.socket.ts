import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from '../models/server.model';
import { io } from '../../server';
import { ServerJoinPayload, ServerMessage } from '../types/server-socket.interface';

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

    private async validateServerAccess(serverId: string, apiKey: string): Promise<boolean> {
        try {
            const server = await Server.findOne({ serverId });
            if (!server) return false;
            if (server.salt !== apiKey) return false;
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
                try {
                    const { serverId, apiKey } = payload;
                    const hasAccess = await this.validateServerAccess(serverId, apiKey);

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

                    // Join the new server room
                    socket.join(serverId);

                    // Notify room members
                    this.io.to(serverId).emit('server_message', {
                        type: 'status',
                        content: 'New member joined the server',
                        timestamp: Date.now()
                    });

                    // Send confirmation to the joining client
                    socket.emit('server_joined', {
                        type: 'status',
                        content: 'Successfully joined the server',
                        timestamp: Date.now()
                    });

                } catch (error) {
                    console.error('Error joining server:', error);
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
}

// Export singleton instance
export const getSocketService = (): ServerSocketService => {
    return ServerSocketService.getInstance();
};