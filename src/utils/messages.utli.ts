import crypto from "crypto";

// Function to encrypt messages
function encryptMessage(text: string, salt: string): string {
    const iv = crypto.randomBytes(16);

    const key = crypto.pbkdf2Sync(salt, 'fixed-salt', 100000, 32, 'sha256');

    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + encrypted;
}

// Function to decrypt messages
function decryptMessage(encryptedText: string, salt: string): string {
    const iv = Buffer.from(encryptedText.slice(0, 32), 'hex');
    const encryptedContent = encryptedText.slice(32);

    const key = crypto.pbkdf2Sync(salt, 'fixed-salt', 100000, 32, 'sha256');

    const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);

    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

export { decryptMessage, encryptMessage }