import { splitTextIntoChunks } from '../../utils/content-extraction.js';

interface GoogleTTSConfig {
  apiKey: string;
  voiceName: string;
  languageCode?: string;
}

interface GoogleTTSResponse {
  audioContent: string;
}

export async function generateGoogleTTS(
  text: string,
  config: GoogleTTSConfig
): Promise<Buffer> {
  const chunks = splitTextIntoChunks(text);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const audioBuffer = await synthesizeSpeech(chunk, config);
    audioBuffers.push(audioBuffer);
  }

  // Concatenate all audio buffers
  return Buffer.concat(audioBuffers);
}

async function synthesizeSpeech(
  text: string,
  config: GoogleTTSConfig
): Promise<Buffer> {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.apiKey}`;

  const requestBody = {
    input: { text },
    voice: {
      languageCode: config.languageCode || 'fr-FR',
      name: config.voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
      sampleRateHertz: 44100,
      effectsProfileId: ['headphone-class-device'],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google TTS API error: ${JSON.stringify(error)}`);
  }

  const data: GoogleTTSResponse = await response.json();

  if (!data.audioContent) {
    throw new Error('No audio content received from Google TTS');
  }

  return Buffer.from(data.audioContent, 'base64');
}

export async function listGoogleVoices(apiKey: string, languageCode: string = 'fr-FR'): Promise<any[]> {
  const url = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}&languageCode=${languageCode}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Google voices');
  }

  const data = await response.json();
  return data.voices || [];
}
