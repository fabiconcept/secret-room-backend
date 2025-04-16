import mongoose from "mongoose";

const serverSchema = new mongoose.Schema({
    serverId: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    serverName: { type: String, required: true },
    salt: { type: String, required: true },
    globalInvitationId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    approvedUsers: [{ type: String, ref: 'User' }],
    allUsers: [{ type: String, ref: 'User' }]
});

// Add this before the model export
serverSchema.pre('save', function (next) {
    // Get all approved users
    const approvedUsers = this.approvedUsers || [];

    // Initialize all users if it doesn't exist
    if (!this.allUsers) {
        this.allUsers = [];
    }

    // Add any approved users that aren't already in allUsers
    approvedUsers.forEach(userId => {
        if (!this.allUsers.includes(userId)) {
            this.allUsers.push(userId);
        }
    });

    next();
});

export const Server = mongoose.model("Server", serverSchema);