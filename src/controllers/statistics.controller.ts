// controllers/statistics.controller.ts
import { AppStatistics, IAppStatistics } from '../models/statistics.model';
import { config } from '../config/dotenv.config';
import { initialStats, STAT_KEYS } from '../utils/constants';
import { FilterQuery } from 'mongoose';
import { Server } from '../models/server.model';
import { User } from '../models/user.model';
import { Message } from '../models/messages.model';

const { STATS_ID } = config;

type StatKey = keyof typeof initialStats;
type FileTypeKey = keyof IAppStatistics['fileTypes'];
type UpdateResult = { success: boolean; data?: any; error?: Error };

export class StatisticsController {
    // Individual field-specific methods

    constructor() {
        this.initialize();
    }

    private async initialize() {
        const stats = await AppStatistics.findOne({ _id: STATS_ID });

        const servers = await Server.find();
        const users = await User.find();
        const messages = await Message.find();

        const messagesWithAttachments = await Message.find({ attachments: { $exists: true, $ne: [] } });
        const payload = {
            ...initialStats,
            totalServers: servers.length,
            totalMessages: messages.length,
            totalUsers: users.length,
            totalFileUploads: messagesWithAttachments.length
        };

        if (!stats) {
            await AppStatistics.create(payload);
        }
    }
    
    /**
     * Increment total servers count
     * @param count Amount to increment (default: 1)
     */
    static async incrementTotalServers(count = 1): Promise<UpdateResult> {
        return this.increment('totalServers', count);
    }
    
    /**
     * Set total servers count
     * @param value New value to set
     */
    static async setTotalServers(value: number): Promise<UpdateResult> {
        return this.set('totalServers', value);
    }
    
    /**
     * Increment total messages count
     * @param count Amount to increment (default: 1)
     */
    static async incrementTotalMessages(count = 1): Promise<UpdateResult> {
        return this.increment('totalMessages', count);
    }
    
    /**
     * Set total messages count
     * @param value New value to set
     */
    static async setTotalMessages(value: number): Promise<UpdateResult> {
        return this.set('totalMessages', value);
    }
    
    /**
     * Increment total users count
     * @param count Amount to increment (default: 1)
     */
    static async incrementTotalUsers(count = 1): Promise<UpdateResult> {
        return this.increment('totalUsers', count);
    }
    
    /**
     * Set total users count
     * @param value New value to set
     */
    static async setTotalUsers(value: number): Promise<UpdateResult> {
        return this.set('totalUsers', value);
    }
    
    /**
     * Increment active servers count
     * @param count Amount to increment (default: 1)
     */
    static async incrementActiveServers(count = 1): Promise<UpdateResult> {
        return this.increment('activeServers', count);
    }
    
    /**
     * Set active servers count
     * @param value New value to set
     */
    static async setActiveServers(value: number): Promise<UpdateResult> {
        return this.set('activeServers', value);
    }
    
    /**
     * Increment active users count
     * @param count Amount to increment (default: 1)
     */
    static async incrementActiveUsers(count = 1): Promise<UpdateResult> {
        return this.increment('activeUsers', count);
    }
    
    /**
     * Set active users count
     * @param value New value to set
     */
    static async setActiveUsers(value: number): Promise<UpdateResult> {
        return this.set('activeUsers', value);
    }
    
    /**
     * Increment total file uploads count
     * @param count Amount to increment (default: 1)
     */
    static async incrementTotalFileUploads(count = 1): Promise<UpdateResult> {
        return this.increment('totalFileUploads', count);
    }
    
    /**
     * Set total file uploads count
     * @param value New value to set
     */
    static async setTotalFileUploads(value: number): Promise<UpdateResult> {
        return this.set('totalFileUploads', value);
    }
    
    /**
     * Increment image uploads count
     * @param count Amount to increment (default: 1)
     */
    static async incrementImageUploads(count = 1): Promise<UpdateResult> {
        return this.incrementFileType('images', count);
    }
    
    /**
     * Increment video uploads count
     * @param count Amount to increment (default: 1)
     */
    static async incrementVideoUploads(count = 1): Promise<UpdateResult> {
        return this.incrementFileType('videos', count);
    }
    
    /**
     * Increment gif uploads count
     * @param count Amount to increment (default: 1)
     */
    static async incrementGifUploads(count = 1): Promise<UpdateResult> {
        return this.incrementFileType('gifs', count);
    }
    
    /**
     * Increment PDF uploads count
     * @param count Amount to increment (default: 1)
     */
    static async incrementPdfUploads(count = 1): Promise<UpdateResult> {
        return this.incrementFileType('pdfs', count);
    }
    
    /**
     * Increment other file type uploads count
     * @param count Amount to increment (default: 1)
     */
    static async incrementOtherFileUploads(count = 1): Promise<UpdateResult> {
        return this.incrementFileType('others', count);
    }
    
    /**
     * Get total servers count
     */
    static async getTotalServers(): Promise<number | null> {
        const result = await this.getStats();
        return result.success ? result.data?.totalServers ?? null : null;
    }
    
    /**
     * Get total messages count
     */
    static async getTotalMessages(): Promise<number | null> {
        const result = await this.getStats();
        return result.success ? result.data?.totalMessages ?? null : null;
    }
    
    /**
     * Get total users count
     */
    static async getTotalUsers(): Promise<number | null> {
        const result = await this.getStats();
        return result.success ? result.data?.totalUsers ?? null : null;
    }
    
    /**
     * Get active servers count
     */
    static async getActiveServers(): Promise<number | null> {
        const result = await this.getStats();
        return result.success ? result.data?.activeServers ?? null : null;
    }
    
    /**
     * Get active users count
     */
    static async getActiveUsers(): Promise<number | null> {
        const result = await this.getStats();
        return result.success ? result.data?.activeUsers ?? null : null;
    }
    
    /**
     * Get total file uploads count
     */
    static async getTotalFileUploads(): Promise<number | null> {
        const result = await this.getStats();
        return result.success ? result.data?.totalFileUploads ?? null : null;
    }
    
    /**
     * Get file type statistics
     */
    static async getFileTypeStats(): Promise<IAppStatistics['fileTypes'] | null> {
        const result = await this.getStats();
        return result.success ? result.data?.fileTypes ?? null : null;
    }
    
    /**
     * Get a specific file type count
     * @param fileType The file type to get count for
     */
    static async getFileTypeCount(fileType: FileTypeKey): Promise<number | null> {
        const result = await this.getStats();
        return result.success ? result.data?.fileTypes?.[fileType] ?? null : null;
    }
    
    /**
     * Update statistics for active usage
     * Used for tracking currently active users and servers
     * @param activeUsers Number of currently active users
     * @param activeServers Number of currently active servers
     */
    static async updateActiveStats(activeUsers: number, activeServers: number): Promise<UpdateResult> {
        return this.batchUpdate({
            activeUsers,
            activeServers
        });
    }
    
    /**
     * Record a file upload with automatic type detection
     * @param fileType The type of file being uploaded
     */
    static async recordFileUpload(fileType: FileTypeKey): Promise<UpdateResult> {
        // Increment both the specific file type and total file uploads
        return this.incrementFileType(fileType);
    }
    
    /**
     * Get the last time statistics were updated
     */
    static async getLastUpdated(): Promise<Date | null> {
        const result = await this.getStats();
        return result.success ? result.data?.lastUpdated ?? null : null;
    }
    /**
     * Increment a top-level statistic value
     * @param key The statistic key to increment
     * @param count The amount to increment by (default: 1)
     * @returns Promise with the operation result
     */
    static async increment(key: StatKey, count = 1): Promise<UpdateResult> {
        try {
            // Validate increment amount
            if (isNaN(count) || count <= 0) {
                return { 
                    success: false, 
                    error: new Error(`Invalid increment value for "${key}": ${count}`) 
                };
            }
            
            const stats = await AppStatistics.findOneAndUpdate(
                { _id: STATS_ID },
                { 
                    $inc: { [key]: count },
                    $set: { lastUpdated: new Date() }
                },
                { upsert: true, new: true }
            );
            
            return { success: true, data: stats };
        } catch (err) {
            console.error(`Failed to increment stat "${key}":`, err);
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }

    /**
     * Increment a file type statistic
     * @param fileType The file type to increment
     * @param count The amount to increment by (default: 1)
     * @returns Promise with the operation result
     */
    static async incrementFileType(fileType: FileTypeKey, count = 1): Promise<UpdateResult> {
        try {
            // Validate increment amount
            if (isNaN(count) || count <= 0) {
                return { 
                    success: false, 
                    error: new Error(`Invalid increment value for file type "${fileType}": ${count}`) 
                };
            }
            
            const stats = await AppStatistics.findOneAndUpdate(
                { _id: STATS_ID },
                { 
                    $inc: { [`fileTypes.${fileType}`]: count, totalFileUploads: count },
                    $set: { lastUpdated: new Date() } 
                },
                { upsert: true, new: true }
            );
            
            return { success: true, data: stats };
        } catch (err) {
            console.error(`Failed to increment file type "${fileType}":`, err);
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }

    /**
     * Set a statistic to a specific value
     * @param key The statistic key to set
     * @param value The value to set
     * @returns Promise with the operation result
     */
    static async set(key: StatKey, value: number): Promise<UpdateResult> {
        try {
            const stats = await AppStatistics.findOneAndUpdate(
                { _id: STATS_ID },
                { 
                    $set: { 
                        [key]: value,
                        lastUpdated: new Date()
                    } 
                },
                { upsert: true, new: true }
            );
            
            return { success: true, data: stats };
        } catch (err) {
            console.error(`Failed to set stat "${key}":`, err);
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }

    /**
     * Get all statistics or filter by specific keys
     * @param filter Optional filter to apply to the query
     * @returns Promise with the operation result containing stats
     */
    static async getStats(filter?: FilterQuery<IAppStatistics>): Promise<UpdateResult> {
        try {
            const query = filter ? { _id: STATS_ID, ...filter } : { _id: STATS_ID };
            const stats = await AppStatistics.findOne(query).lean();
            
            return { success: true, data: stats };
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }

    /**
     * Reset statistics to initial values
     * @returns Promise with the operation result
     */
    static async resetStats(): Promise<UpdateResult> {
        try {
            const stats = await AppStatistics.findOneAndUpdate(
                { _id: STATS_ID },
                { 
                    $set: { 
                        ...initialStats,
                        lastUpdated: new Date() 
                    } 
                },
                { upsert: true, new: true }
            );
            
            return { success: true, data: stats };
        } catch (err) {
            console.error('Failed to reset stats:', err);
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }

    /**
     * Batch update multiple statistics at once
     * @param updates Object containing stat keys and their new values
     * @returns Promise with the operation result
     */
    static async batchUpdate(updates: Partial<Record<StatKey, number>>): Promise<UpdateResult> {
        try {
            const updateObj: Record<string, number> = {};
            
            // Process each update
            Object.entries(updates).forEach(([key, value]) => {
                updateObj[key] = value;
            });
            
            const stats = await AppStatistics.findOneAndUpdate(
                { _id: STATS_ID },
                { 
                    $set: { 
                        ...updateObj,
                        lastUpdated: new Date() 
                    } 
                },
                { upsert: true, new: true }
            );
            
            return { success: true, data: stats };
        } catch (err) {
            console.error('Failed to batch update stats:', err);
            return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }
}