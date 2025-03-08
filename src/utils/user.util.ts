import { adjectives, nouns } from "../../constants/user.constant";

const patterns = [
    // Pattern types
    { type: 'alpha', generate: () => generateAlphaPattern() },
    { type: 'alphaNum', generate: () => generateAlphaNumPattern() }
];

function generateAlphaPattern(): string {
    const pattern = Math.random() < 0.5
        ? adjectives[Math.floor(Math.random() * adjectives.length)]
        : nouns[Math.floor(Math.random() * nouns.length)];

    // Capitalize first letter sometimes
    return Math.random() < 0.3 ? capitalize(pattern) : pattern;
}

function generateAlphaNumPattern(): string {
    const word = Math.random() < 0.5
        ? adjectives[Math.floor(Math.random() * adjectives.length)]
        : nouns[Math.floor(Math.random() * nouns.length)];

    const number = Math.floor(Math.random() * 99) + 1;
    return `${word}${number}`;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateUsername(): string {
    const alphanumeric = Math.random() < 0.3;

    let username: string;
    do {
        const pattern = alphanumeric ? patterns[1] : patterns[0];
        username = pattern.generate();
    } while (username.length < 3 || username.length > 8);

    return username;
}

export function validateUsername(username: string): boolean {
    if (username.length < 3 || username.length > 8) return false;
    return /^[a-zA-Z0-9]+$/.test(username);
}