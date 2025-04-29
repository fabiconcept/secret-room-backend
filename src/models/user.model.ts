import mongoose from "mongoose";
import { generateVibrantBgColorWithTextVisibility } from "../utils/index.util";

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    currentServer: { type: String, default: null, ref: "Server" },
    createdAt: { type: Date, default: Date.now },
    bgColor: { type: String, default: null },
    textColor: { type: String, default: null },
    typing: { type: Boolean, default: false },
    typingTo: { type: String, default: null },
});

// Pre-save hook to set background and text colors if not already set
userSchema.pre('save', function (next) {
    // Only set colors for new documents (when they don't have an _id yet)
    if (this.isNew && (!this.bgColor || !this.textColor)) {
        const { backgroundColor, isWhiteTextVisible } = generateVibrantBgColorWithTextVisibility();
        this.bgColor = backgroundColor;
        this.textColor = isWhiteTextVisible ? '#FFFFFF' : '#000000';
    }
    next();
});

export const User = mongoose.model("User", userSchema);
