import { splitTextIntoChunks } from '@/utils/content-extraction';

interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId?: string;
}

export async function generateElevenLabsTTS(
  text: string,
  config: ElevenLabsConfig
): Promise<Buffer> {
  const chunks = splitTextIntoChunks(text, 5000);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const audioBuffer = await synthesizeSpeech(chunk, config);
    audioBuffers.push(audioBuffer);
  }

  return Buffer.concat(audioBuffers);
}

async function synthesizeSpeech(
  text: string,
  config: ElevenLabsConfig
): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`;

  const requestBody = {
    text,
    model_id: config.modelId || 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': config.apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function listElevenLabsVoices(apiKey: string): Promise<any[]> {
  const url = 'https://api.elevenlabs.io/v1/voices';

  const response = await fetch(url, {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch ElevenLabs voices');
  }

  const data = await response.json();
  return data.voices || [];
}
