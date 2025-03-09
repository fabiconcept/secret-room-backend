interface ServerUser {
    userId: string;
    username: string;
}

class UserController {
    private static instance: UserController;
    private activeUsers: Map<string, Set<ServerUser>>;

    private constructor() {
        this.activeUsers = new Map();
    }

    public static getInstance(): UserController {
        if (!UserController.instance) {
            UserController.instance = new UserController();
        }
        return UserController.instance;
    }

    public addUserToServer(serverId: string, user: ServerUser): void {
        if (!this.activeUsers.has(serverId)) {
            this.activeUsers.set(serverId, new Set());
        }

        const serverUsers = this.activeUsers.get(serverId)!;
        // Remove existing user with same ID if exists
        for (const existingUser of serverUsers) {
            if (existingUser.userId === user.userId) {
                serverUsers.delete(existingUser);
                break;
            }
        }

        serverUsers.add(user);
        console.log(`User ${user.username} added to Server ${serverId}`);
    }

    public removeUserFromServer(serverId: string, userId: string): void {
        const serverUsers = this.activeUsers.get(serverId);
        if (!serverUsers) return;

        for (const user of serverUsers) {
            if (user.userId === userId) {
                serverUsers.delete(user);
                console.log(`User ${user.username} removed from Server ${serverId}`);
                break;
            }
        }

        if (serverUsers.size === 0) {
            this.activeUsers.delete(serverId);
            console.log(`Server ${serverId} removed due to no active users`);
        }
    }

    public getActiveUsers(serverId: string): ServerUser[] {
        return Array.from(this.activeUsers.get(serverId) || []);
    }

    public clearServerUsers(serverId: string): void {
        this.activeUsers.delete(serverId);
        console.log(`Server ${serverId} users cleared`);
    }

    public isUserInServer(serverId: string, userId: string): boolean {
        const serverUsers = this.activeUsers.get(serverId);
        console.log({
            method: 'isUserInServer',
            serverId,
            userId,
            serverUsers: serverUsers ? Array.from(serverUsers) : null,
            hasServer: !!serverUsers
        });
        if (!serverUsers) return false;
        return Array.from(serverUsers).some(user => user.userId === userId);
    }
}

// Export singleton instance methods
const userController = UserController.getInstance();

export const addUserToServer = (serverId: string, user: ServerUser): void =>
    userController.addUserToServer(serverId, user);

export const removeUserFromServer = (serverId: string, userId: string): void =>
    userController.removeUserFromServer(serverId, userId);

export const getActiveUsers = (serverId: string): ServerUser[] =>
    userController.getActiveUsers(serverId);

export const clearServerUsers = (serverId: string): void =>
    userController.clearServerUsers(serverId);

export const isUserInServer = (serverId: string, userId: string): boolean =>
    userController.isUserInServer(serverId, userId);
