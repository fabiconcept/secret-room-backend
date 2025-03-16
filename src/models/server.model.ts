import mongoose from "mongoose";

const serverSchema = new mongoose.Schema({
    serverId: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    serverName: { type: String, required: true },
    salt: { type: String, required: true },
    globalInvitationId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    users: [{ type: String, ref: 'User' }]  // Array of user IDs referencing User model
});

// Middleware to clean up users when server is deleted
serverSchema.pre('deleteOne', async function (next) {
    await mongoose.model('User').deleteMany({ userId: { $in: this.get('users') } });
    next();
});

export const Server = mongoose.model("Server", serverSchema);