# Testing Documentation - Auditicle

## Test Coverage Summary

**Overall Coverage:** 100% statements, 81.81% branches, 100% functions

### Current Test Suite

✅ **96 tests** across 3 test suites
✅ **All tests passing**

---

## Test Files

### 1. `src/utils/__tests__/encryption.test.ts` (22 tests)
**Critical Security Tests - 100% Coverage**

Tests the AES-256-GCM encryption module used for API key storage.

**Test Categories:**
- ✅ Basic encryption/decryption roundtrip
- ✅ Empty string handling
- ✅ Unicode and special character support
- ✅ Error handling (missing keys, corrupted data)
- ✅ Auth tag verification (prevents tampering)
- ✅ Security properties (IV randomness, key padding)
- ✅ Real-world scenarios (Google TTS, ElevenLabs keys)

**Why Critical:** Bugs in encryption could expose API keys in plaintext in the database.

---

### 2. `src/utils/__tests__/content-extraction.test.ts` (40 tests)
**Input Validation & Content Security - 100% Coverage**

Tests URL validation, content cleaning, and text chunking.

**Test Categories:**

#### `validateUrl()` - XSS Prevention
- ✅ Accept valid HTTP/HTTPS URLs
- ✅ Reject dangerous protocols (javascript:, data:, file:)
- ✅ Handle URLs with query params and fragments

#### `cleanTextForTTS()` - Content Sanitization
- ✅ Remove HTML tags (including script tags)
- ✅ Replace URLs with French placeholder
- ✅ Preserve French accents and punctuation
- ✅ Remove potentially problematic characters
- ✅ Normalize spacing and paragraph breaks

#### `splitTextIntoChunks()` - Text Processing
- ✅ Respect max chunk size (5000 chars)
- ✅ Split on sentence boundaries
- ✅ Preserve all text (no data loss)
- ✅ Handle edge cases (empty text, long sentences)

#### `extractArticleContent()` - Integration
- ✅ HTTP error handling (404, 500)
- ✅ Network error handling
- ✅ User-Agent header inclusion
- ✅ Readability parsing failures

**Why Critical:** Prevents XSS attacks and ensures clean TTS input.

---

### 3. `api/feed/__tests__/rss.test.ts` (34 tests)
**RSS Feed & XML Security - Helper Functions Tested**

Tests XML escaping and RSS feed formatting.

**Test Categories:**

#### `escapeXml()` - XSS Prevention
- ✅ Escape all XML entities (&, <, >, ", ')
- ✅ Prevent script tag injection
- ✅ Prevent img tag with onerror attacks
- ✅ Handle CDATA injection attempts
- ✅ Preserve French characters and emojis
- ✅ Handle very long strings

#### `formatDuration()` - RSS Compliance
- ✅ Format seconds as HH:MM:SS
- ✅ Pad single digits with zeros
- ✅ Handle durations up to 2 hours

#### Real-world Attack Scenarios
- ✅ Malicious podcast titles
- ✅ XML injection in descriptions
- ✅ Mixed content with multiple attack vectors

**Why Critical:** Prevents XSS in podcast apps reading RSS feeds.

---

## Running Tests

### All Tests (Watch Mode)
```bash
npm test
```

### Run Once (CI Mode)
```bash
npm run test:run
```

### With Coverage Report
```bash
npm run test:coverage
```

### Interactive UI
```bash
npm run test:ui
```

---

## Test Configuration

- **Framework:** Vitest 4.0
- **Test Environment:** happy-dom (lightweight DOM implementation)
- **Coverage Provider:** v8
- **Setup File:** `src/test/setup.ts`

### Environment Variables for Tests
Set in `src/test/setup.ts`:
- `ENCRYPTION_KEY`: Test encryption key (32 chars)
- `VITE_APP_URL`: Test app URL

---

## Coverage Targets

| Module | Current | Target | Status |
|--------|---------|--------|--------|
| `encryption.ts` | 100% | 100% | ✅ Achieved |
| `content-extraction.ts` | 100% | 90%+ | ✅ Exceeded |
| RSS helpers | Tested | 85%+ | ✅ Achieved |

---

## What's NOT Tested (Yet)

### High Priority (Phase 2)
- [ ] API endpoints (`api/articles/add.ts`, `api/episodes/generate.ts`)
- [ ] TTS providers (`src/lib/tts/google.ts`, `src/lib/tts/elevenlabs.ts`)
- [ ] R2 storage operations (`src/lib/r2.ts`)
- [ ] Settings management endpoints

### Medium Priority (Phase 3)
- [ ] React components (`src/components/*.tsx`)
- [ ] Integration tests (full article → audio → RSS flow)
- [ ] Database operations with Supabase mocks

### Lower Priority (Phase 4)
- [ ] E2E tests with Playwright
- [ ] Visual regression tests
- [ ] Performance tests

---

## Writing New Tests

### Test File Naming Convention
- Unit tests: `__tests__/[filename].test.ts` next to source file
- Integration tests: `__tests__/integration/[feature].test.ts`

### Test Structure
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../module';

describe('Module Name', () => {
  describe('functionToTest()', () => {
    it('should handle normal case', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = functionToTest('');
      expect(result).toBe('');
    });

    it('should throw on invalid input', () => {
      expect(() => functionToTest(null)).toThrow('Error message');
    });
  });
});
```

### Mocking External Services
```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  // Mock fetch
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'mock' }),
  });
});
```

---

## Continuous Integration

### Pre-commit Hook (Recommended)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run test:run
npm run type-check
```

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
```

---

## Security Testing Checklist

When adding new features, ensure you test:

- [ ] **Input Validation:** All user inputs validated
- [ ] **XSS Prevention:** HTML/XML properly escaped
- [ ] **Injection Prevention:** No SQL/command injection vectors
- [ ] **Authentication:** API keys properly encrypted
- [ ] **Error Handling:** No sensitive data in error messages
- [ ] **Rate Limiting:** API endpoints have rate limits (future)

---

## Debugging Tests

### Run Single Test File
```bash
npm test encryption.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- -t "encryption"
```

### Debug Mode
```bash
npm test -- --inspect-brk
```

### VS Code Integration
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

---

## Test Maintenance

### Monthly Review
- [ ] Check for deprecated Vitest APIs
- [ ] Update dependencies (`npm outdated`)
- [ ] Review coverage reports for gaps
- [ ] Remove obsolete tests

### When Bugs Are Found
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test now passes
4. Commit both test and fix together

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Happy DOM](https://github.com/capricorn86/happy-dom)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Last Updated:** 2025-11-18
**Test Suite Version:** 1.0.0
**Total Tests:** 96
**Pass Rate:** 100%
