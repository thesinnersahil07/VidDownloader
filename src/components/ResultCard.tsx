import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { ExtractionResult, MediaSource, HlsVariant } from '../types';

interface ResultCardProps {
  result: ExtractionResult;
  showToast: (msg: string) => void;
}

export default function ResultCard({ result, showToast }: ResultCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [selectedSource, setSelectedSource] = useState(0);
  const [variants, setVariants] = useState<HlsVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const source = result.media[selectedSource];

  // Parse HLS variants from result
  useEffect(() => {
    if (source?.type === 'hls' && result.media[selectedSource]?.variants) {
      setVariants(result.media[selectedSource].variants || []);
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
    setPlayerError(null);
  }, [source, selectedSource, result.media]);

  // HLS playback with dynamic hls.js import
  useEffect(() => {
    if (!showPlayer || !videoRef.current || source?.type !== 'hls') return;

    const video = videoRef.current;
    const playUrl = selectedVariant || source.url;
    let destroyed = false;

    // Cleanup previous
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playUrl;
      video.play().catch(() => {});
    } else {
      // Dynamic import of hls.js
      import('hls.js').then((HlsModule) => {
        if (destroyed) return;
        const Hls = HlsModule.default;
        
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;
          hls.loadSource(playUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!destroyed) video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              if (!destroyed) {
                setPlayerError('Playback error. The stream may have expired, CORS restrictions, or network issues.');
              }
            }
          });
        } else {
          if (!destroyed) {
            setPlayerError('HLS playback is not supported in this browser.');
          }
        }
      }).catch(() => {
        if (!destroyed) {
          setPlayerError('Failed to load HLS player. Please try opening the stream directly.');
        }
      });
    }

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [showPlayer, source, selectedVariant]);

  // MP4/WebM playback
  useEffect(() => {
    if (!showPlayer || !videoRef.current) return;
    if (source?.type === 'mp4' || source?.type === 'webm') {
      videoRef.current.src = source.url;
    }
  }, [showPlayer, source]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied ✓`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast(`${label} copied ✓`);
      } catch {
        showToast('Failed to copy. Please copy manually.');
      }
      document.body.removeChild(ta);
    }
  };

  const shareUrl = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        copyToClipboard(url, 'URL');
      }
    } else {
      copyToClipboard(url, 'URL');
    }
  };

  const getFfmpegCommand = (url: string) => {
    return `ffmpeg -i "${url}" -c copy "video.mp4"`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hls': return 'HLS / M3U8';
      case 'mp4': return 'MP4';
      case 'webm': return 'WebM';
      default: return type.toUpperCase();
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'hls': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mp4': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'webm': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const hasTokenWarning = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.has('token') || 
             parsed.searchParams.has('sig') || 
             parsed.searchParams.has('signature') ||
             parsed.searchParams.has('expires') ||
             parsed.search.includes('token=');
    } catch {
      return false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 mb-12 animate-slide-up">
      <div className="glass-card p-5 md:p-8">
        {/* Success Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <span className="text-green-400 text-lg">✓</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-green-400">VIDEO FOUND</h2>
            <p className="text-gray-400 text-sm truncate">{result.page.title}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="glass-card-light p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Source</p>
            <p className="text-gray-200 font-medium text-xs sm:text-sm truncate">{result.page.domain}</p>
          </div>
          <div className="glass-card-light p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Type</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getTypeBadgeColor(source.type)}`}>
              {getTypeLabel(source.type)}
            </span>
          </div>
          <div className="glass-card-light p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Quality</p>
            <p className="text-gray-200 font-medium text-xs sm:text-sm capitalize">{source.quality}</p>
          </div>
          <div className="glass-card-light p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</p>
            <p className="text-green-400 font-medium text-xs">
              {source.verified ? '✓ Verified' : '⚡ Detected'}
            </p>
          </div>
        </div>

        {/* Multiple sources selector */}
        {result.media.length > 1 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Multiple video sources found:</p>
            <div className="flex flex-wrap gap-2">
              {result.media.map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedSource(i); setShowPlayer(false); setPlayerError(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    i === selectedSource
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  Source {i + 1} — {getTypeLabel(m.type)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* URL Display */}
        <div className="glass-card-light p-4 mb-6">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Detected URL</p>
          <p className="text-xs text-gray-300 break-all font-mono leading-relaxed select-all">{source.url}</p>
          {hasTokenWarning(source.url) && (
            <p className="text-xs text-yellow-400/80 mt-2 flex items-center gap-1">
              <span>⚠️</span> This stream URL may contain a temporary token and could expire.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setShowPlayer(!showPlayer); setPlayerError(null); }}
            className="btn-secondary flex items-center gap-2"
          >
            <span>▶</span> {showPlayer ? 'Hide Player' : 'Preview'}
          </button>
          <button
            onClick={() => window.open(source.url, '_blank', 'noopener')}
            className="btn-secondary flex items-center gap-2"
          >
            <span>↗</span> Open Stream
          </button>
          <button
            onClick={() => copyToClipboard(source.url, 'URL')}
            className="btn-secondary flex items-center gap-2"
          >
            <span>📋</span> Copy URL
          </button>
          <button
            onClick={() => shareUrl(source.url, result.page.title)}
            className="btn-secondary flex items-center gap-2"
          >
            <span>📤</span> Share
          </button>
          {source.type === 'hls' && (
            <button
              onClick={() => setShowDownload(!showDownload)}
              className="btn-secondary flex items-center gap-2"
            >
              <span>⬇</span> Download
            </button>
          )}
          {(source.type === 'mp4' || source.type === 'webm') && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2 no-underline"
            >
              <span>⬇</span> Download
            </a>
          )}
        </div>

        {/* Video Player */}
        {showPlayer && (
          <div className="mb-6 animate-fade-in">
            <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
              <video
                ref={videoRef}
                controls
                playsInline
                crossOrigin="anonymous"
                className="w-full h-full"
                preload="metadata"
              >
                Your browser does not support video playback.
              </video>
            </div>
            {playerError && (
              <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-300">{playerError}</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {source.type === 'hls' && 'HLS stream playback. If playback fails, the stream may have CORS restrictions or be expired.'}
              {source.type === 'mp4' && 'MP4 video playback. Download may be limited by the source server.'}
              {source.type === 'webm' && 'WebM video playback.'}
            </p>
          </div>
        )}

        {/* HLS Variants */}
        {variants.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3">Available Quality:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedVariant(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !selectedVariant
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600'
                }`}
              >
                Auto (Adaptive)
              </button>
              {variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedVariant(v.url)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedVariant === v.url
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  {v.label || v.resolution || `${Math.round((v.bandwidth || 0) / 1000)}kbps`}
                  {v.resolution && <span className="text-gray-500 ml-1">({v.resolution})</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {source.type === 'hls' && variants.length === 0 && (
          <div className="mb-6 glass-card-light p-3">
            <p className="text-xs text-gray-400">
              {source.quality === 'adaptive' 
                ? 'Adaptive quality information unavailable. The stream may be a single-quality media playlist.'
                : 'This appears to be a single-quality stream.'}
            </p>
          </div>
        )}

        {/* Download Options for HLS */}
        {showDownload && source.type === 'hls' && (
          <div className="glass-card-light p-4 mb-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <span>⬇</span> FFmpeg Download Command
            </h3>
            <div className="bg-black/50 rounded-lg p-3 mb-3 overflow-x-auto">
              <code className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all select-all">
                {getFfmpegCommand(source.url)}
              </code>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyToClipboard(getFfmpegCommand(source.url), 'FFmpeg command')}
                className="btn-secondary text-xs flex items-center gap-2"
              >
                <span>📋</span> Copy Command
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              <p>Works on Windows, Linux, and macOS.</p>
              <p>Requires <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">FFmpeg</a> installed on your system.</p>
              {hasTokenWarning(source.url) && (
                <p className="text-yellow-400/70">⚠️ This URL may expire. Run the command soon.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
