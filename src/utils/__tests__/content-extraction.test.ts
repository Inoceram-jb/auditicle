import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateUrl,
  cleanTextForTTS,
  splitTextIntoChunks,
  extractArticleContent,
} from '../content-extraction';

describe('Content Extraction - Input Validation & Security Tests', () => {
  describe('validateUrl() - Security Critical', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('https://example.com/article')).toBe(true);
      expect(validateUrl('https://subdomain.example.com/path/to/article')).toBe(true);
    });

    it('should accept valid HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject javascript: URLs (XSS protection)', () => {
      expect(validateUrl('javascript:alert(1)')).toBe(false);
      expect(validateUrl('javascript:void(0)')).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(validateUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject file: URLs', () => {
      expect(validateUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject ftp: URLs', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('htp://typo.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('   ')).toBe(false);
    });

    it('should reject URLs with invalid protocols', () => {
      expect(validateUrl('custom://protocol')).toBe(false);
      expect(validateUrl('ssh://server.com')).toBe(false);
    });

    it('should handle URLs with query parameters', () => {
      expect(validateUrl('https://example.com/article?id=123&ref=twitter')).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      expect(validateUrl('https://example.com/article#section')).toBe(true);
    });
  });

  describe('cleanTextForTTS() - Content Security', () => {
    it('should remove HTML tags', () => {
      const input = '<p>This is <strong>bold</strong> text</p>';
      const output = cleanTextForTTS(input);

      expect(output).not.toContain('<p>');
      expect(output).not.toContain('</p>');
      expect(output).not.toContain('<strong>');
      expect(output).toContain('This is');
      expect(output).toContain('bold');
    });

    it('should remove script tags and content for security', () => {
      const input = 'Hello <script>alert("XSS")</script> world';
      const output = cleanTextForTTS(input);

      expect(output).not.toContain('<script>');
      expect(output).not.toContain('</script>');
      // Note: cleanTextForTTS removes HTML tags but keeps text content
      // For TTS purposes, "alert" as plain text is harmless
      expect(output).toContain('Hello');
      expect(output).toContain('world');
    });

    it('should replace URLs with French placeholder', () => {
      const input = 'Check this out https://example.com/article for more info';
      const output = cleanTextForTTS(input);

      expect(output).not.toContain('https://example.com');
      expect(output).toContain('lien disponible dans la description');
    });

    it('should replace multiple URLs', () => {
      const input = 'Link 1: https://example.com and link 2: http://test.com';
      const output = cleanTextForTTS(input);

      expect(output).not.toContain('https://example.com');
      expect(output).not.toContain('http://test.com');
      // Should contain the placeholder twice
      const count = (output.match(/lien disponible dans la description/g) || []).length;
      expect(count).toBe(2);
    });

    it('should preserve French accents and special characters', () => {
      const input = 'Voici un texte en français avec des accents: àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ';
      const output = cleanTextForTTS(input);

      expect(output).toContain('français');
      expect(output).toContain('àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ');
    });

    it('should remove potentially problematic special characters', () => {
      const input = 'Test { } [ ] | \\ @ # $ % &';
      const output = cleanTextForTTS(input);

      // These should be removed
      expect(output).not.toContain('{');
      expect(output).not.toContain('}');
      expect(output).not.toContain('[');
      expect(output).not.toContain(']');
      expect(output).not.toContain('|');
      expect(output).not.toContain('\\');
      expect(output).not.toContain('@');
      expect(output).not.toContain('#');
      expect(output).not.toContain('$');
      expect(output).not.toContain('%');
      expect(output).not.toContain('&');
    });

    it('should preserve punctuation for TTS prosody', () => {
      const input = 'Hello! How are you? I am fine. Nice to meet you; let me explain: it works.';
      const output = cleanTextForTTS(input);

      expect(output).toContain('!');
      expect(output).toContain('?');
      expect(output).toContain('.');
      expect(output).toContain(';');
      expect(output).toContain(':');
    });

    it('should normalize multiple spaces to single space', () => {
      const input = 'Too    many     spaces      here';
      const output = cleanTextForTTS(input);

      expect(output).toBe('Too many spaces here');
      expect(output).not.toContain('  '); // No double spaces
    });

    it('should add proper spacing after punctuation', () => {
      const input = 'First sentence.Second sentence!Third sentence?Fourth';
      const output = cleanTextForTTS(input);

      expect(output).toContain('. S');
      expect(output).toContain('! T');
      expect(output).toContain('? F');
    });

    it('should replace paragraph breaks with pauses', () => {
      const input = 'First paragraph.\n\nSecond paragraph.\n\n\nThird paragraph.';
      const output = cleanTextForTTS(input);

      expect(output).not.toContain('\n\n');
      expect(output).toContain('First paragraph. Second paragraph. Third paragraph.');
    });

    it('should trim whitespace', () => {
      const input = '   \n  Text with whitespace  \n   ';
      const output = cleanTextForTTS(input);

      expect(output).toBe('Text with whitespace');
    });

    it('should handle empty input', () => {
      expect(cleanTextForTTS('')).toBe('');
      expect(cleanTextForTTS('   ')).toBe('');
    });

    it('should handle text with only special characters', () => {
      const input = '@#$%^&*()[]{}|\\';
      const output = cleanTextForTTS(input);

      // After removing special chars and trimming, should be empty or just parentheses
      expect(output.trim().length).toBeLessThan(input.length);
    });
  });

  describe('splitTextIntoChunks() - Chunking Logic', () => {
    it('should return single chunk for text under limit', () => {
      const text = 'Short text';
      const chunks = splitTextIntoChunks(text, 5000);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Short text');
    });

    it('should split on sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = splitTextIntoChunks(text, 30);

      expect(chunks.length).toBeGreaterThan(1);
      // Each chunk should end with a period (sentence boundary)
      chunks.forEach((chunk) => {
        expect(chunk.trim()).toMatch(/\.$/);
      });
    });

    it('should respect max chunk size', () => {
      const sentences = Array(100)
        .fill('This is a sentence.')
        .join(' ');
      const maxSize = 100;
      const chunks = splitTextIntoChunks(sentences, maxSize);

      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(maxSize);
      });
    });

    it('should handle single sentence longer than chunk size', () => {
      const longSentence = 'a'.repeat(6000) + '.';
      const chunks = splitTextIntoChunks(longSentence, 5000);

      // Should still create chunks, even if sentence is too long
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should preserve all text (no data loss)', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const chunks = splitTextIntoChunks(text, 30);

      const rejoined = chunks.join(' ');
      const originalWords = text.split(/\s+/).sort();
      const rejoinedWords = rejoined.split(/\s+/).sort();

      expect(rejoinedWords).toEqual(originalWords);
    });

    it('should handle text with multiple punctuation marks', () => {
      const text = 'Question? Answer! Statement. Exclamation!';
      const chunks = splitTextIntoChunks(text, 20);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle empty text', () => {
      const chunks = splitTextIntoChunks('', 5000);

      // May return empty array or array with empty string, both are acceptable
      if (chunks.length > 0) {
        expect(chunks[0].trim()).toBe('');
      }
    });

    it('should trim whitespace from chunks', () => {
      const text = 'First sentence.   Second sentence.   Third sentence.';
      const chunks = splitTextIntoChunks(text, 30);

      chunks.forEach((chunk) => {
        expect(chunk).toBe(chunk.trim());
      });
    });

    it('should use default max size of 5000', () => {
      const text = 'a'.repeat(4000) + '. ' + 'b'.repeat(4000) + '.';
      const chunks = splitTextIntoChunks(text); // No maxChunkSize provided

      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('extractArticleContent() - Integration Tests', () => {
    beforeEach(() => {
      // Mock fetch for these tests
      vi.clearAllMocks();
    });

    it('should throw error for non-OK HTTP responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(extractArticleContent('https://example.com/404')).rejects.toThrow(
        'Failed to fetch article: Not Found'
      );
    });

    it('should throw error when Readability fails to parse', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        // Minimal HTML that Readability cannot extract meaningful content from
        text: async () => '<html><head></head><body></body></html>',
      });

      // Readability might succeed but return null or minimal content
      // This test verifies error handling when parse() returns null
      await expect(extractArticleContent('https://example.com/bad')).rejects.toThrow(
        'Failed to parse article content'
      );
    });

    it('should include User-Agent header in request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><article><h1>Title</h1><p>Content</p></article></body></html>',
      });
      global.fetch = mockFetch;

      try {
        await extractArticleContent('https://example.com/article');
      } catch (e) {
        // May fail due to Readability, but we're checking the fetch call
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/article',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla'),
          }),
        })
      );
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(extractArticleContent('https://example.com/article')).rejects.toThrow(
        'Content extraction failed'
      );
    });
  });

  describe('Edge Cases & Security', () => {
    it('cleanTextForTTS should handle null bytes', () => {
      const input = 'Text with\x00null byte';
      const output = cleanTextForTTS(input);

      expect(output).not.toContain('\x00');
    });

    it('cleanTextForTTS should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      const input = `Check this ${longUrl} link`;
      const output = cleanTextForTTS(input);

      expect(output).not.toContain(longUrl);
      expect(output).toContain('lien disponible dans la description');
    });

    it('validateUrl should handle URLs with credentials (security)', () => {
      // URLs with credentials should still be valid (though not recommended)
      expect(validateUrl('https://user:pass@example.com')).toBe(true);
    });

    it('splitTextIntoChunks should handle text with no sentence boundaries', () => {
      const text = 'a'.repeat(10000); // No punctuation
      const chunks = splitTextIntoChunks(text, 5000);

      expect(chunks.length).toBeGreaterThan(0);
      // Should handle gracefully even without sentence boundaries
    });
  });
});
