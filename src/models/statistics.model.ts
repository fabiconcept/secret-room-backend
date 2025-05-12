import { Schema, model, Document } from 'mongoose';
import { config } from '../config/dotenv.config';

interface previousStats extends Omit<IAppStatistics, "id" | "lastUpdated" | "previousStats"> {
  recordedOn: Date;
}

export interface IAppStatistics extends Document {
  id: string;
  totalServers: number;
  totalMessages: number;
  totalUsers: number;
  activeServers: number;
  activeUsers: number;
  totalFileUploads: number;
  deletedServers: number;
  expiredServers: number;
  fileTypes: {
    images: number;
    videos: number;
    gifs: number;
    pdfs: number;
    others?: number;
  };
  lastUpdated: Date;
  previousStats: previousStats[];
}

const AppStatisticsSchema = new Schema<IAppStatistics>({
  id: { type: String, default: config.STATS_ID },
  totalServers: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  totalUsers: { type: Number, default: 0 },
  activeServers: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  totalFileUploads: { type: Number, default: 0 },
  deletedServers: { type: Number, default: 0 },
  expiredServers: { type: Number, default: 0 },
  fileTypes: {
    images: { type: Number, default: 0 },
    videos: { type: Number, default: 0 },
    gifs: { type: Number, default: 0 },
    pdfs: { type: Number, default: 0 },
    others: { type: Number, default: 0 },
  },
  lastUpdated: { type: Date, default: Date.now },
  previousStats: [{
    totalServers: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    activeServers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    totalFileUploads: { type: Number, default: 0 },
    deletedServers: { type: Number, default: 0 },
    expiredServers: { type: Number, default: 0 },
    fileTypes: {
      images: { type: Number, default: 0 },
      videos: { type: Number, default: 0 },
      gifs: { type: Number, default: 0 },
      pdfs: { type: Number, default: 0 },
      others: { type: Number, default: 0 },
    },
    recordedOn: { type: Date, default: Date.now }
  }]
});

export const AppStatistics = model<IAppStatistics>('AppStatistics', AppStatisticsSchema);