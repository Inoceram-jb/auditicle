import { Link } from 'react-router-dom';
import { SettingsForm } from '@/components/SettingsForm';

export function Settings() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Configure your podcast and TTS settings</p>
            </div>
            <Link
              to="/"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <SettingsForm />
      </div>
    </div>
  );
}
