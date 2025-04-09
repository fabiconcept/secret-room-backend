import { Server } from '../models/server.model';
import { User } from '../models/user.model';

interface ServerUser {
    userId: string;
    username: string;
    isOnline: boolean;
    lastSeen: Date;
    bgColor: string;
    textColor: string;
}

class UserController {
    private static instance: UserController;

    private constructor() {}

    public static getInstance(): UserController {
        if (!UserController.instance) {
            UserController.instance = new UserController();
        }
        return UserController.instance;
    }

    public async addUserToServer(serverId: string, user: Omit<ServerUser, 'bgColor' | 'textColor'>): Promise<void> {
        const server = await Server.findOne({ serverId });
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }

        let dbUser = await User.findOne({ userId: user.userId });
        if (!dbUser) {
            dbUser = await User.create({
                userId: user.userId,
                username: user.username,
                isOnline: true,
                currentServer: serverId
            });
        } else {
            await User.updateOne(
                { userId: user.userId },
                { 
                    isOnline: true,
                    currentServer: serverId,
                    lastSeen: new Date()
                }
            );
        }

        if (!server.users.includes(dbUser.userId)) {
            server.users.push(dbUser.userId);
            await server.save();
        }
        
        console.log(`User ${user.username} added to Server ${serverId}`);
    }

    public async removeUserFromServer(serverId: string, userId: string): Promise<void> {
        const server = await Server.findOne({ serverId });
        if (!server) return;

        server.users = server.users.filter(id => id !== userId);
        await server.save();

        // Update user status
        await User.updateOne(
            { userId },
            { 
                isOnline: false,
                currentServer: null,
                lastSeen: new Date()
            }
        );
        
        console.log(`User ${userId} removed from Server ${serverId}`);
    }

    public async getActiveUsers(serverId: string): Promise<ServerUser[]> {
        const server = await Server.findOne({ serverId });
        if (!server) return [];
        
        const users = await User.find({ userId: { $in: server.users } });
        return users.map(user => ({
            userId: user.userId,
            username: user.username,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            bgColor: user.bgColor,
            textColor: user.textColor
        }));
    }

    public async clearServerUsers(serverId: string): Promise<void> {
        const server = await Server.findOne({ serverId });
        if (!server) return;

        // Update all users in this server to offline
        await User.updateMany(
            { userId: { $in: server.users } },
            { 
                isOnline: false,
                currentServer: null,
                lastSeen: new Date()
            }
        );

        server.users = [];
        await server.save();
        console.log(`Server ${serverId} users cleared`);
    }

    public async isUserInServer(serverId: string, userId: string): Promise<boolean> {
        const server = await Server.findOne({ serverId });
        if (!server) return false;
        
        return server.users.includes(userId);
    }

    public async setUserOnlineStatus(userId: string, isOnline: boolean, serverId?: string): Promise<void> {
        await User.updateOne(
            { userId },
            { 
                isOnline,
                currentServer: isOnline ? serverId : null,
                lastSeen: new Date()
            }
        );
    }
}

// Export singleton instance methods
const userController = UserController.getInstance();

export const addUserToServer = (serverId: string, user: Omit<ServerUser, 'bgColor' | 'textColor'>): Promise<void> =>
    userController.addUserToServer(serverId, user);

export const removeUserFromServer = (serverId: string, userId: string): Promise<void> =>
    userController.removeUserFromServer(serverId, userId);

export const getActiveUsers = (serverId: string): Promise<ServerUser[]> =>
    userController.getActiveUsers(serverId);

export const clearServerUsers = (serverId: string): Promise<void> =>
    userController.clearServerUsers(serverId);

export const isUserInServer = (serverId: string, userId: string): Promise<boolean> =>
    userController.isUserInServer(serverId, userId);

export const setUserOnlineStatus = (userId: string, isOnline: boolean, serverId?: string): Promise<void> =>
    userController.setUserOnlineStatus(userId, isOnline, serverId);
