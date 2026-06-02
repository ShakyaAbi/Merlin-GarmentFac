import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Hashes a plain-text password with bcrypt
export const hashPassword = async (password: string) => bcrypt.hash(password, SALT_ROUNDS);

// Compares a password against a bcrypt hash
export const comparePassword = async (password: string, hash: string) => bcrypt.compare(password, hash);
