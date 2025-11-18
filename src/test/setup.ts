import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup environment variables for tests
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.VITE_APP_URL = 'http://localhost:3000';
