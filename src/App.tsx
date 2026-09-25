import { useState, useCallback } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ResultCard from './components/ResultCard';
import HowItWorks from './components/HowItWorks';
import SupportedFormats from './components/SupportedFormats';
import Footer from './components/Footer';
import Toast from './components/Toast';
import { ExtractionResult, ExtractionError, LoadingStage } from './types';
import { extractVideo, validateUrl } from './utils/api';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<LoadingStage | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<ExtractionError | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExtract = useCallback(async () => {
    const trimmedUrl = url.trim();
    const validation = validateUrl(trimmedUrl);
    
    if (!validation.valid) {
      setError({
        code: 'INVALID_URL',
        message: validation.message || 'Please enter a valid HTTP or HTTPS URL.'
      });
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const stages: LoadingStage[] = [
      'Fetching page',
      'Inspecting player',
      'Finding media',
      'Validating stream',
      'Preparing result'
    ];

    for (let i = 0; i < stages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
      setCurrentStage(stages[i]);
    }

    try {
      const data = await extractVideo(trimmedUrl);
      
      if (data.success && data.data) {
        setResult(data.data);
        setError(null);
      } else if (data.error) {
        setError(data.error);
        setResult(null);
      } else {
        setError({
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again.'
        });
      }
    } catch (err) {
      setError({
        code: 'NETWORK_ERROR',
        message: 'Could not connect to the extraction service. Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
      setCurrentStage(null);
    }
  }, [url]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleExtract();
    }
  }, [handleExtract, loading]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection
          url={url}
          setUrl={setUrl}
          loading={loading}
          currentStage={currentStage}
          onExtract={handleExtract}
          onKeyDown={handleKeyDown}
        />

        {error && (
          <div className="max-w-3xl mx-auto px-4 -mt-4 mb-8 animate-slide-up">
            <div className="glass-card p-6 border-red-500/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-400 mb-1">
                    {error.code === 'INVALID_URL' && 'Invalid URL'}
                    {error.code === 'PAGE_NOT_FOUND' && 'Page Not Found'}
                    {error.code === 'ACCESS_DENIED' && 'Access Denied'}
                    {error.code === 'NO_PUBLIC_MEDIA_FOUND' && 'No Video Found'}
                    {error.code === 'DRM' && 'Protected Content'}
                    {error.code === 'TIMEOUT' && 'Request Timeout'}
                    {error.code === 'CORS' && 'Playback Restricted'}
                    {error.code === 'EXPIRED' && 'Stream Expired'}
                    {error.code === 'RATE_LIMITED' && 'Rate Limited'}
                    {error.code === 'UNSUPPORTED' && 'Unsupported Format'}
                    {error.code === 'NETWORK_ERROR' && 'Connection Error'}
                    {error.code === 'UNKNOWN_ERROR' && 'Error'}
                  </h3>
                  <p className="text-gray-300 text-sm">{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <ResultCard result={result} showToast={showToast} />
        )}

        <HowItWorks />
        <SupportedFormats />
      </main>

      <Footer />
      {toast && <Toast message={toast} />}
    </div>
  );
}

export default App;
