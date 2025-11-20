export * from './google.js';
export * from './elevenlabs.js';

import { generateGoogleTTS } from './google.js';
import { generateElevenLabsTTS } from './elevenlabs.js';
import type { TTSProvider } from '../../types/index.js';

interface TTSConfig {
  provider: TTSProvider;
  apiKey: string;
  voiceId: string;
  languageCode?: string;
}

export async function generateTTS(text: string, config: TTSConfig): Promise<Buffer> {
  if (config.provider === 'google') {
    return generateGoogleTTS(text, {
      apiKey: config.apiKey,
      voiceName: config.voiceId,
      languageCode: config.languageCode,
    });
  } else if (config.provider === 'elevenlabs') {
    return generateElevenLabsTTS(text, {
      apiKey: config.apiKey,
      voiceId: config.voiceId,
    });
  } else {
    throw new Error(`Unknown TTS provider: ${config.provider}`);
  }
}
