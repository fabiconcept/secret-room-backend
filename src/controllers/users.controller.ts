const activeUsers = new Map<string, Set<string>>();

export function addUserToServer(serverId: string, userId: string) {
    if (!activeUsers.has(serverId)) {
        activeUsers.set(serverId, new Set());
    }
    activeUsers.get(serverId)?.add(userId);
}

export function removeUserFromServer(serverId: string, userId: string) {
    activeUsers.get(serverId)?.delete(userId);
    if (activeUsers.get(serverId)?.size === 0) {
        activeUsers.delete(serverId);
    }
}

export function getActiveUsers(serverId: string): string[] {
    return Array.from(activeUsers.get(serverId) || []);
}

export function clearServerUsers(serverId: string) {
    activeUsers.delete(serverId);
    console.log(`Server ${serverId} users cleared.`);
}
