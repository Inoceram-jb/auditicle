import { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useToastStore } from '@/store/toast';
import type { GetSettingsResponse, UpdateSettingsRequest } from '@/types';

export function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GetSettingsResponse['settings'] | null>(null);
  const { addToast } = useToastStore();

  const [formData, setFormData] = useState({
    podcast_title: '',
    podcast_description: '',
    podcast_author: '',
    podcast_cover_url: '',
    google_tts_api_key: '',
    elevenlabs_api_key: '',
    default_tts_provider: 'google' as 'google' | 'elevenlabs',
    google_voice_name: 'fr-FR-Neural2-A',
    elevenlabs_voice_id: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/get');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data: GetSettingsResponse = await response.json();
      setSettings(data.settings);

      setFormData({
        podcast_title: data.settings.podcast_title,
        podcast_description: data.settings.podcast_description,
        podcast_author: data.settings.podcast_author,
        podcast_cover_url: data.settings.podcast_cover_url || '',
        google_tts_api_key: '',
        elevenlabs_api_key: '',
        default_tts_provider: data.settings.default_tts_provider,
        google_voice_name: data.settings.google_voice_name,
        elevenlabs_voice_id: data.settings.elevenlabs_voice_id || '',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates: UpdateSettingsRequest = {
        podcast_title: formData.podcast_title,
        podcast_description: formData.podcast_description,
        podcast_author: formData.podcast_author,
        podcast_cover_url: formData.podcast_cover_url || null,
        default_tts_provider: formData.default_tts_provider,
        google_voice_name: formData.google_voice_name,
        elevenlabs_voice_id: formData.elevenlabs_voice_id || null,
      };

      if (formData.google_tts_api_key) {
        updates.google_tts_api_key = formData.google_tts_api_key;
      }

      if (formData.elevenlabs_api_key) {
        updates.elevenlabs_api_key = formData.elevenlabs_api_key;
      }

      const response = await fetch('/api/settings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      addToast({
        type: 'success',
        message: 'Settings saved successfully',
      });

      // Clear API key fields after save
      setFormData(prev => ({
        ...prev,
        google_tts_api_key: '',
        elevenlabs_api_key: '',
      }));
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Podcast Metadata</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Podcast Title
            </label>
            <input
              type="text"
              value={formData.podcast_title}
              onChange={(e) => setFormData({ ...formData, podcast_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.podcast_description}
              onChange={(e) => setFormData({ ...formData, podcast_description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <input
              type="text"
              value={formData.podcast_author}
              onChange={(e) => setFormData({ ...formData, podcast_author: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Image URL (optional)
            </label>
            <input
              type="url"
              value={formData.podcast_cover_url}
              onChange={(e) => setFormData({ ...formData, podcast_cover_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://example.com/cover.jpg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">TTS Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default TTS Provider
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="google"
                  checked={formData.default_tts_provider === 'google'}
                  onChange={(e) => setFormData({ ...formData, default_tts_provider: e.target.value as 'google' })}
                  className="mr-2"
                />
                Google Cloud TTS
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="elevenlabs"
                  checked={formData.default_tts_provider === 'elevenlabs'}
                  onChange={(e) => setFormData({ ...formData, default_tts_provider: e.target.value as 'elevenlabs' })}
                  className="mr-2"
                />
                ElevenLabs
              </label>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Google Cloud TTS</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key {settings?.has_google_key && <span className="text-green-600">(Set)</span>}
                </label>
                <input
                  type="password"
                  value={formData.google_tts_api_key}
                  onChange={(e) => setFormData({ ...formData, google_tts_api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Leave empty to keep current key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voice Name
                </label>
                <select
                  value={formData.google_voice_name}
                  onChange={(e) => setFormData({ ...formData, google_voice_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="fr-FR-Neural2-A">fr-FR-Neural2-A (Female)</option>
                  <option value="fr-FR-Neural2-B">fr-FR-Neural2-B (Male)</option>
                  <option value="fr-FR-Neural2-C">fr-FR-Neural2-C (Female)</option>
                  <option value="fr-FR-Neural2-D">fr-FR-Neural2-D (Male)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">ElevenLabs (Optional)</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key {settings?.has_elevenlabs_key && <span className="text-green-600">(Set)</span>}
                </label>
                <input
                  type="password"
                  value={formData.elevenlabs_api_key}
                  onChange={(e) => setFormData({ ...formData, elevenlabs_api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Leave empty to keep current key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voice ID
                </label>
                <input
                  type="text"
                  value={formData.elevenlabs_voice_id}
                  onChange={(e) => setFormData({ ...formData, elevenlabs_voice_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
        >
          {saving ? (
            <>
              <LoadingSpinner size="sm" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </form>
  );
}
