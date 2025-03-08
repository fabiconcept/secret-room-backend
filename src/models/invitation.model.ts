import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
    inviteCode: { type: String, required: true, unique: true },
    used: { type: Boolean, default: false },
    serverId: { type: String, required: true, ref: "Server" },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

const Invitation = mongoose.model("Invitation", invitationSchema);
export default Invitation;