interface AudioPlayerProps {
  audioUrl: string;
  title: string;
}

export function AudioPlayer({ audioUrl, title }: AudioPlayerProps) {
  return (
    <div className="w-full bg-gray-50 rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600 mb-2">Audio:</p>
      <audio controls className="w-full" preload="metadata">
        <source src={audioUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      <a
        href={audioUrl}
        download
        className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
      >
        Download MP3
      </a>
    </div>
  );
}
