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

export function generateUsername(salt: string): string {
    if (!salt || typeof salt !== 'string' || salt.length === 0) {
        throw new Error('A non-empty salt string must be provided');
    }
    
    // Use the salt to create a deterministic random value
    const hashCode = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    };
    
    const hash = hashCode(salt);
    
    // Define patterns for username generation
    const patterns = [
        // Pattern for non-alphanumeric (using letters only)
        {
            generate: () => {
                const consonants = 'bcdfghjklmnpqrstvwxyz';
                const vowels = 'aeiou';
                let result = '';
                
                // Use the hash to deterministically generate a username
                const seed = hash;
                const length = (seed % 6) + 3; // Length between 3 and 8
                
                for (let i = 0; i < length; i++) {
                    // Alternate between consonants and vowels
                    const charSet = i % 2 === 0 ? consonants : vowels;
                    const charIndex = Math.floor((seed / (i + 1)) % charSet.length);
                    result += charSet[charIndex];
                }
                
                return result;
            }
        },
        // Pattern for alphanumeric
        {
            generate: () => {
                const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                
                const seed = hash;
                const length = (seed % 6) + 3; // Length between 3 and 8
                
                for (let i = 0; i < length; i++) {
                    const charIndex = Math.floor((seed / (i + 1)) % chars.length);
                    result += chars[charIndex];
                }
                
                return result;
            }
        }
    ];

    // Use the first digit of the hash to determine whether to use alphanumeric
    const alphanumeric = (hash % 10) < 3; // 30% chance, just like the original
    
    // Generate username based on the selected pattern
    const pattern = alphanumeric ? patterns[1] : patterns[0];
    const username = pattern.generate();
    
    return username;
}

export function validateUsername(username: string): boolean {
    if (username.length < 3 || username.length > 8) return false;
    return /^[a-zA-Z0-9]+$/.test(username);
}