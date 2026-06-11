import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/src/__tests__/**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true,
  slowTestThreshold: 10
};

export default config;
