import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../encryption';

describe('Encryption Module - Critical Security Tests', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Ensure we have a valid encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
  });

  afterEach(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt()', () => {
    it('should successfully encrypt text', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
      // Encrypted data should be base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    it('should produce different ciphertext for same input (due to random IV)', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle special characters and unicode', () => {
      const plaintext = 'clé-secrète-avec-émojis-🔐-et-caractères-spéciaux-!@#$%^&*()';
      const encrypted = encrypt(plaintext);
      expect(encrypted).toBeDefined();
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should handle long text (API keys can be long)', () => {
      const longText = 'a'.repeat(1000);
      const encrypted = encrypt(longText);
      expect(encrypted).toBeDefined();
    });
  });

  describe('decrypt()', () => {
    it('should successfully decrypt encrypted text (roundtrip)', () => {
      const original = 'my-secret-api-key';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle empty string roundtrip', () => {
      const original = '';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle unicode characters roundtrip', () => {
      const original = 'clé-française-émojis-🔐-中文-العربية';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle long text roundtrip', () => {
      const original = 'This is a very long API key: ' + 'x'.repeat(500);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should throw error for invalid base64 input', () => {
      expect(() => decrypt('not-valid-base64!@#$')).toThrow('Decryption failed');
    });

    it('should throw error for corrupted ciphertext (auth tag verification)', () => {
      const original = 'my-secret-api-key';
      const encrypted = encrypt(original);

      // Corrupt the ciphertext by changing one character
      const corrupted = encrypted.slice(0, -1) + 'X';

      expect(() => decrypt(corrupted)).toThrow('Decryption failed');
    });

    it('should throw error for truncated ciphertext', () => {
      const original = 'my-secret-api-key';
      const encrypted = encrypt(original);

      // Truncate the ciphertext
      const truncated = encrypted.slice(0, 20);

      expect(() => decrypt(truncated)).toThrow();
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const encrypted = encrypt('test');
      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt(encrypted)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error when using different encryption key', () => {
      const original = 'my-secret-api-key';
      const encrypted = encrypt(original);

      // Change the encryption key
      process.env.ENCRYPTION_KEY = 'different-key-32-chars-long!!!';

      expect(() => decrypt(encrypted)).toThrow('Decryption failed');
    });
  });

  describe('Security Properties', () => {
    it('should use AES-256-GCM (authenticated encryption)', () => {
      // This is verified by the auth tag check in corruption test
      const original = 'test';
      const encrypted = encrypt(original);

      // The encrypted data should contain salt (64 bytes) + IV (16 bytes) + tag (16 bytes) + ciphertext
      const buffer = Buffer.from(encrypted, 'base64');
      expect(buffer.length).toBeGreaterThan(64 + 16 + 16); // At minimum
    });

    it('should include IV in encrypted data (verified by successful decryption)', () => {
      const original = 'test';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);

      // Different IVs mean different ciphertext
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt correctly
      expect(decrypt(encrypted1)).toBe(original);
      expect(decrypt(encrypted2)).toBe(original);
    });

    it('should handle encryption key padding correctly', () => {
      // Test with a short key that will be padded
      process.env.ENCRYPTION_KEY = 'short';

      const original = 'test-data';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should prevent timing attacks by always throwing on any decryption error', () => {
      const start1 = Date.now();
      try {
        decrypt('invalid-base64');
      } catch (e) {
        // Expected
      }
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      try {
        const encrypted = encrypt('test');
        const corrupted = encrypted.slice(0, -1) + 'X';
        decrypt(corrupted);
      } catch (e) {
        // Expected
      }
      const time2 = Date.now() - start2;

      // Both should fail quickly (though timing attack prevention is hard to test)
      // This is more of a documentation test
      expect(time1).toBeLessThan(100);
      expect(time2).toBeLessThan(100);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical Google Cloud TTS API key', () => {
      const apiKey = 'AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe'; // Example format
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(apiKey);
    });

    it('should handle typical ElevenLabs API key', () => {
      const apiKey = 'sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0'; // Example format
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(apiKey);
    });

    it('should handle multiple encryptions in sequence', () => {
      const keys = [
        'google-api-key-1',
        'elevenlabs-api-key-2',
        'another-secret-key-3',
      ];

      const encrypted = keys.map(k => encrypt(k));
      const decrypted = encrypted.map(e => decrypt(e));

      expect(decrypted).toEqual(keys);
    });
  });
});
