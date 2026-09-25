import { LoadingStage } from '../types';

interface HeroSectionProps {
  url: string;
  setUrl: (url: string) => void;
  loading: boolean;
  currentStage: LoadingStage | null;
  onExtract: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function HeroSection({ url, setUrl, loading, currentStage, onExtract, onKeyDown }: HeroSectionProps) {
  return (
    <section id="home" className="max-w-3xl mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          <span className="gradient-text">Extract Public Video Streams</span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto">
          Paste a video webpage URL and discover publicly accessible MP4 and HLS streams.
        </p>
      </div>

      <div className="glass-card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            className="input-field flex-1"
            placeholder="Paste video webpage URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            aria-label="Video webpage URL"
            autoComplete="url"
          />
          <button
            className="btn-primary whitespace-nowrap flex items-center justify-center gap-2 min-w-[160px]"
            onClick={onExtract}
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <span>🔍</span>
                Extract Video
              </>
            )}
          </button>
        </div>

        {loading && currentStage && (
          <div className="mt-4 animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-indigo-300">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{currentStage}...</span>
            </div>
          </div>
        )}

        <p className="text-gray-500 text-xs mt-4 text-center">
          Supports publicly accessible MP4, HLS (.m3u8) and WebM video sources.
        </p>
      </div>
    </section>
  );
}
