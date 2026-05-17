import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

export function generateShortCode(): string {
  return nanoid();
}

export function isValidShortCode(code: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(code);
}
