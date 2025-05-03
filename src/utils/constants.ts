/**
 * Initial statistics values used for new instances and resets
 * These values match the structure of the IAppStatistics interface
 */
export const initialStats = {
    totalServers: 0,
    totalMessages: 0,
    totalUsers: 0,
    activeServers: 0,
    activeUsers: 0,
    totalFileUploads: 0,
    fileTypes: {
        images: 0,
        videos: 0,
        gifs: 0,
        pdfs: 0,
        others: 0,
    },
};

/**
 * Statistics keys for type safety throughout the application
 */
export const STAT_KEYS = {
    // Top-level stats
    TOTAL_SERVERS: 'totalServers' as const,
    TOTAL_MESSAGES: 'totalMessages' as const,
    TOTAL_USERS: 'totalUsers' as const,
    ACTIVE_SERVERS: 'activeServers' as const,
    ACTIVE_USERS: 'activeUsers' as const,
    TOTAL_FILE_UPLOADS: 'totalFileUploads' as const,

    // File type stats
    FILE_TYPES: {
        IMAGES: 'images' as const,
        VIDEOS: 'videos' as const,
        GIFS: 'gifs' as const,
        PDFS: 'pdfs' as const,
        OTHERS: 'others' as const
    }
};