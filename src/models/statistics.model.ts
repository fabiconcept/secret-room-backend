import { Schema, model, Document } from 'mongoose';

export interface IAppStatistics extends Document {
  totalServers: number;
  totalMessages: number;
  totalUsers: number;
  activeServers: number;
  activeUsers: number;
  totalFileUploads: number;
  fileTypes: {
    images: number;
    videos: number;
    gifs: number;
    pdfs: number;
    others?: number;
  };
  lastUpdated: Date;
}

const AppStatisticsSchema = new Schema<IAppStatistics>({
  totalServers: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  totalUsers: { type: Number, default: 0 },
  activeServers: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  totalFileUploads: { type: Number, default: 0 },
  fileTypes: {
    images: { type: Number, default: 0 },
    videos: { type: Number, default: 0 },
    gifs: { type: Number, default: 0 },
    pdfs: { type: Number, default: 0 },
    others: { type: Number, default: 0 },
  },
  lastUpdated: { type: Date, default: Date.now }
});

export const AppStatistics = model<IAppStatistics>('AppStatistics', AppStatisticsSchema);