![Project Snapshot](https://github.com/fabiconcept/secret-room-backend/blob/main/image-main.png)
# 🕵️‍♂️ Secret Room - Backend

**Secret Room** is a fully anonymous, real-time chat web app that lets users create temporary servers and invite others to chat without ever revealing their identity. This is the backend service powering the chat experience, built with **Node.js**, **Express**, **MongoDB**, and **Socket.io**.

> 💡 This is my first personal Node.js backend project. It focuses heavily on secure communication, temporary server lifecycles, and anonymous user management.

---

## 🚀 Features

- 🔒 JWT Authentication for secure access  
- 🧠 Anonymous user identification via fingerprinting  
- 💬 Real-time chat between host and guests (powered by Socket.io)  
- ⚡ Instant join/leave/typing notifications  
- ⏳ Self-destructing servers based on a lifespan  
- 📨 Global & Unique server invitation system  
- 👻 Deterministic anonymous usernames per server  
- 📦 Clean modular structure: Models, Routes, Controllers, Middleware  

---

## 📁 Project Structure

```
.
├── controllers/
│   ├── userController.js
│   ├── serverController.js
│   └── messagesController.js
├── middleware/
│   └── authenticateJWT.js
├── models/
│   ├── User.js
│   ├── Server.js
│   ├── Message.js
│   └── Invitation.js
├── socket/
│   └── socketHandler.js
├── routes/
│   └── ...
```

---

## 📦 Tech Stack

- **Node.js**
- **Express**
- **MongoDB** (Mongoose)
- **Socket.io** for real-time communication
- **JWT** for authentication
- **UUID + Custom Encryption** for anonymous ID and secure communication

---

## 🔐 Authentication

- Uses JWT tokens to secure private routes  
- Fingerprinting used to generate a unique ID for users (without collecting sensitive info)  

---

## 💬 Real-time Communication (Socket.io)

- Users join a room corresponding to the serverId  
- On joining, a deterministic **anonymous username** is generated using a `serverId-userId` combo (see below)  
- Events include:
  - `user:join` – Notify server members of a new user
  - `user:leave` – Broadcast when a user disconnects
  - `user:active` - Broadcast when the user is active
  - `server:deleted` - Broadcast when the server is deleted
  - `message:send` – Relay messages between users
  - `message:read` – Relay messages between users
- Socket connections are JWT-authenticated and scoped to server rooms

---

## 👻 Username Generation (Anonymity)

Usernames are deterministically generated per server using a salted pattern based on the combination: `serverId-userId`.

```ts
// utils/generateUsername.ts
export function generateUsername(salt: string): string {
  // uses custom hash + either consonant-vowel or alphanumeric pattern
}
```

### Why this matters:
- Ensures each user has a **unique, anonymous identity** _per server_  
- Zero chance of real user data leaks  
- No usernames are ever reused across different servers  

---

## 🧪 API Endpoints

### 🔐 Authentication Required

| Method | Endpoint |
|--------|----------|
| `POST` | `/` – Create a new server |
| `POST` | `/invitation/:globalInvitationId` – Join with a global invite |
| `POST` | `/unique-invitation/:inviteCode` – Join with a unique invite |
| `GET`  | `/:serverId` – Get server data |
| `GET`  | `/:serverId/active-users` – Get current active users |
| `GET`  | `/:serverId/generate-unique-server-invitation-id` – Generate a unique invite |
| `GET`  | `/:serverId/messages` – Fetch messages in the server |
| `DELETE` | `/:serverId` – Delete a server |

---

## 🧬 Mongoose Models

### 🧑‍💻 User
```ts
userId, isOnline, lastSeen, currentServer, createdAt, bgColor, textColor
```

### 💬 Message
```ts
serverId, senderId, receiverId, content, attachmentUrl, sent, readBySender, readByReceiver
```

### 🏠 Server
```ts
serverId, owner, serverName, salt, globalInvitationId, expiresAt, approvedUsers, allUsers
```

### 🎟️ Invitation
```ts
inviteCode, used, serverId, expiresAt
```

---

## ⚙️ Setup Instructions

```bash
# 1. Clone the repo
git clone [https://github.com/your-username/secret-room-backend](https://github.com/fabiconcept/secret-room-backend.git)

# 2. Navigate into the folder
cd secret-room-backend

# 3. Install dependencies
npm install

# 4. Create a `.env` file and add:
# PORT
# HOST
# CORS_ORIGIN
# JWT_SECRET
# MONGODB_URI
# API_KEY

# 5. Run the server
npm run dev
```


---

## 🙌 Author

Made with ❤️ by [Favour Tochukwu Ajokubi](https://github.com/FavourBE)

---

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).
