import { useState, useCallback, useEffect } from 'react';
import { useSogniAuth } from './services/sogniAuth';
import { useWallet } from './hooks/useWallet';
import { useImageUpload } from './hooks/useImageUpload';
import { useRestoration } from './hooks/useRestoration';
import { useVideo } from './hooks/useVideo';
import { AuthStatus } from './components/auth/AuthStatus';
import { UploadZone } from './components/UploadZone';
import { ImagePreview } from './components/ImagePreview';
import { ProgressIndicator } from './components/ProgressIndicator';
import { OutOfCreditsPopup } from './components/OutOfCreditsPopup';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { BeforeAfterGallery } from './components/BeforeAfterGallery';
import { FeaturesSection } from './components/FeaturesSection';
import { downloadImage } from './utils/download';

function App() {
  const { isAuthenticated, isLoading: authLoading, getSogniClient } = useSogniAuth();
  const { balances, tokenType } = useWallet();
  const { imageUrl, imageData, width, height, error: uploadError, upload, clear: clearUpload } = useImageUpload();
  const { isRestoring, progress, error: restoreError, restoredUrls, restorationJobs, selectedUrl, etaSeconds, completedCount, totalCount, restore, selectResult, clearSelection, reset: resetRestore } = useRestoration();
  const { isGenerating: isGeneratingVideo, progress: videoProgress, error: videoError, videoUrl, generate: generateVideo, reset: resetVideo } = useVideo();
  
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [numberOfImages, setNumberOfImages] = useState<number>(4);

  // Store original URL when image is uploaded
  useEffect(() => {
    if (imageUrl && !originalUrl) {
      setOriginalUrl(imageUrl);
    }
  }, [imageUrl, originalUrl]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // Clear previous restoration
    resetRestore();
    setOriginalUrl(null);
    
    await upload(selectedFile);
  }, [upload, resetRestore]);

  const handleNumberOfImagesChange = useCallback((count: number) => {
    setNumberOfImages(count);
  }, []);

  const handleRestore = useCallback(async () => {
    console.log('[APP] handleRestore called', {
      hasImageData: !!imageData,
      imageDataSize: imageData?.length,
      isAuthenticated,
      width,
      height,
      tokenType,
      numberOfImages,
      balances
    });

    if (!imageData || !isAuthenticated) {
      console.warn('[APP] Cannot restore: missing image data or not authenticated', {
        hasImageData: !!imageData,
        isAuthenticated
      });
      return;
    }

    const client = getSogniClient();
    console.log('[APP] Got Sogni client:', {
      hasClient: !!client,
      clientType: typeof client,
      hasAccount: !!client?.account,
      hasCurrentAccount: !!client?.account?.currentAccount,
      // SDK has typo: isAuthenicated (missing 't')
      isAuthenticated: (client?.account?.currentAccount as any)?.isAuthenicated,
      username: client?.account?.currentAccount?.username
    });

    if (!client) {
      console.error('[APP] No Sogni client available');
      return;
    }

    // Check if user has credits (with small buffer for processing)
    const currentBalance = balances?.[tokenType]?.net || '0';
    const balanceNum = parseFloat(currentBalance);
    
    console.log('[APP] Balance check:', {
      tokenType,
      currentBalance,
      balanceNum,
      hasCredits: balanceNum > 0
    });

    if (balanceNum <= 0) {
      console.warn('[APP] No credits available, showing popup');
      setShowOutOfCredits(true);
      return;
    }

    // Reset any previous errors
    if (restoreError === 'INSUFFICIENT_CREDITS') {
      console.log('[APP] Resetting previous INSUFFICIENT_CREDITS error');
      resetRestore();
    }

    try {
      console.log('[APP] Calling restore function...');
      await restore(client, imageData, width, height, tokenType, numberOfImages);
      console.log('[APP] Restore function completed successfully');
    } catch (error: any) {
      // Error state is already set by useRestoration hook
      // We catch here to handle specific UI actions (like showing credit popup)
      console.error('[APP] Restore function failed:', error?.message);
      if (error.message === 'INSUFFICIENT_CREDITS' || 
          error.message?.toLowerCase().includes('insufficient')) {
        setShowOutOfCredits(true);
      }
      // Don't re-throw - error UI is shown via restoreError state
    }
  }, [imageData, isAuthenticated, getSogniClient, balances, tokenType, width, height, numberOfImages, restore, restoreError, resetRestore]);

  // Auto-restore after upload
  useEffect(() => {
    if (imageData && imageUrl && !isRestoring && restoredUrls.length === 0 && !restoreError) {
      // Small delay to ensure smooth UX transition
      const timer = setTimeout(() => {
        handleRestore();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [imageData, imageUrl, isRestoring, restoredUrls.length, restoreError, handleRestore]);

  const handleDownload = useCallback(async (url: string) => {
    const isOriginal = url === originalUrl;
    console.log('Download request:', { url, originalUrl, isOriginal });
    const filename = isOriginal
      ? `original-photo-${Date.now()}.jpg`
      : `restored-photo-${Date.now()}.jpg`;
    await downloadImage(url, filename);
  }, [originalUrl]);

  const handleGenerateVideo = useCallback(async () => {
    if (!selectedUrl || !isAuthenticated) {
      console.warn('[APP] Cannot generate video: missing selected image or not authenticated');
      return;
    }

    const client = getSogniClient();
    if (!client) {
      console.error('[APP] No Sogni client available');
      return;
    }

    // Check if user has credits
    const currentBalance = balances?.[tokenType]?.net || '0';
    const balanceNum = parseFloat(currentBalance);
    
    if (balanceNum <= 0) {
      setShowOutOfCredits(true);
      return;
    }

    try {
      await generateVideo(client, selectedUrl, width, height, tokenType);
      console.log('[APP] Video generation completed successfully');
    } catch (error: any) {
      // Error state is already set by useVideo hook
      // We catch here to handle specific UI actions (like showing credit popup)
      console.error('[APP] Video generation failed:', error?.message);
      if (error.message === 'INSUFFICIENT_CREDITS' || 
          error.message?.toLowerCase().includes('insufficient')) {
        setShowOutOfCredits(true);
      }
      // Don't re-throw - error UI is shown via videoError state
    }
  }, [selectedUrl, isAuthenticated, getSogniClient, balances, tokenType, width, height, generateVideo]);

  const handleNewPhoto = useCallback(() => {
    clearUpload();
    resetRestore();
    resetVideo();
    setOriginalUrl(null);
  }, [clearUpload, resetRestore, resetVideo]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-transparent mb-4" style={{ 
            borderTopColor: 'var(--sogni-pink)',
            borderRightColor: 'var(--sogni-purple)'
          }}></div>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: '#ffffff' }}>
      {/* Header */}
    <header className="flex-shrink-0" style={{
      background: '#ffffff',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="px-4 lg:px-6 py-0.5" style={{ height: '2.75rem', display: 'flex', alignItems: 'center' }}>
        <div className="flex justify-between items-center w-full">
          <a href="https://restoration-local.sogni.ai/" className="text-sm font-bold gradient-accent hover:opacity-80 transition-opacity cursor-pointer" style={{ letterSpacing: '-0.02em', textDecoration: 'none', fontSize: '1.375rem', lineHeight: '1.5' }}>
            Sogni Restoration
          </a>
          <AuthStatus />
        </div>
      </div>
    </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden main-content-scroll">
        <div className="flex flex-col items-center flex-1 min-h-0 px-4 py-6 lg:py-8 overflow-hidden">
          {!isAuthenticated ? (
            <div className="w-full flex flex-col items-center overflow-y-auto min-h-0">
              {/* Hero Section */}
              <div className="text-center w-full max-w-2xl fade-in flex flex-col items-center justify-center py-8 lg:py-12 flex-shrink-0">
                <h1 className="font-bold mb-4 main-headline text-4xl lg:text-5xl xl:text-6xl" style={{ 
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.2
                }}>
                  Restore Your <span className="gradient-accent whitespace-nowrap">Precious Memories</span>
                </h1>
                <p className="mb-6 main-description" style={{ 
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  fontWeight: 400
                }}>
                  Transform damaged and faded photos into vibrant memories with AI-powered&nbsp;restoration.
                </p>
              </div>

              {/* Features Section */}
              <div className="w-full flex-shrink-0">
                <FeaturesSection />
              </div>

              {/* Before/After Gallery */}
              <div className="w-full flex-shrink-0">
                <BeforeAfterGallery />
              </div>

              {/* Call to Action */}
              <div className="text-center w-full max-w-2xl fade-in flex flex-col items-center py-8 lg:py-12 flex-shrink-0">
                <p className="text-lg font-semibold mb-2 px-4" style={{ 
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.5
                }}>
                  Ready to restore your photos?
                </p>
                <p className="text-base px-4" style={{ 
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  fontWeight: 400
                }}>
                  Sign in to start restoring your precious memories with AI-powered&nbsp;restoration.
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-7xl flex-1 min-h-0 flex flex-col gap-0 overflow-hidden">
              {!imageUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center fade-in min-h-0 overflow-hidden" style={{ 
                  width: '100%',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem'
                }}>
                  <div className="w-full max-w-xl flex-shrink-0 px-2">
                    <UploadZone 
                      onFileSelect={handleFileSelect} 
                      numberOfImages={numberOfImages}
                      onNumberOfImagesChange={handleNumberOfImagesChange}
                    />
                  </div>
                  {uploadError && (
                    <div className="card-premium px-5 py-3 max-w-2xl" style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#dc2626'
                    }}>
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="fade-in flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                  {/* Header Row */}
                  <div className="flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold" style={{ 
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.02em'
                    }}>
                      {videoUrl ? '✨ Video Complete!' : isGeneratingVideo ? '🎬 Creating Video...' : selectedUrl ? '✨ Result Selected' : restoredUrls.length > 0 ? '🎨 Pick Your Favorite' : isRestoring ? '✨ Restoring Your Photo...' : 'Photo Uploaded'}
                    </h2>
                    <div className="flex flex-col gap-2 items-end">
                      <button
                        onClick={handleNewPhoto}
                        className="btn-secondary"
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.8125rem',
                          fontWeight: 500
                        }}
                      >
                        ↻ New Photo
                      </button>
                      {restoredUrls.length > 0 && !isRestoring && (
                        <button
                          onClick={handleRestore}
                          disabled={isRestoring || !imageData}
                          className="btn-secondary"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            opacity: (isRestoring || !imageData) ? 0.5 : 1,
                            cursor: (isRestoring || !imageData) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          🔄 Retry
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Indicator - Only show for video generation */}
                  {isGeneratingVideo && (
                    <div className="card-premium p-4 flex-shrink-0">
                      <ProgressIndicator 
                        progress={videoProgress} 
                        message="Bringing photo to life..." 
                      />
                    </div>
                  )}

                  {/* Error Messages */}
                  {restoreError && restoreError !== 'INSUFFICIENT_CREDITS' && (
                    <div className="card-premium px-5 py-3 flex-shrink-0" style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#dc2626'
                    }}>
                      <div className="text-sm">{restoreError}</div>
                      <button
                        onClick={handleRestore}
                        className="mt-2 font-medium text-sm gradient-accent underline"
                        style={{ cursor: 'pointer' }}
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {videoError && videoError !== 'INSUFFICIENT_CREDITS' && (
                    <div className="card-premium px-5 py-3 flex-shrink-0 text-sm" style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#dc2626'
                    }}>
                      {videoError}
                    </div>
                  )}

                  {/* Content Area */}
                  <div className="flex-1 min-h-0 card-premium p-4 overflow-hidden flex flex-col">
                    {videoUrl ? (
                      <div className="flex-1 flex flex-col items-center gap-4 min-h-0" style={{ justifyContent: 'center' }}>
                        <video 
                          src={videoUrl} 
                          controls 
                          autoPlay 
                          loop 
                          className="max-w-full max-h-full object-contain"
                          style={{ 
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-lg)',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                        />
                        <div className="flex gap-3 flex-shrink-0">
                          <a
                            href={videoUrl}
                            download={`restored-video-${Date.now()}.mp4`}
                            className="btn-primary"
                            style={{
                              textDecoration: 'none',
                              padding: '0.625rem 1.5rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            Download Video
                          </a>
                          <button
                            onClick={() => resetVideo()}
                            className="btn-secondary"
                            style={{
                              padding: '0.625rem 1.5rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            Back to Photo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
                        <div className="flex-1 min-h-0 overflow-auto">
                          <ImagePreview
                            imageUrl={imageUrl}
                            originalUrl={originalUrl || undefined}
                            restoredUrls={restoredUrls}
                            restorationJobs={restorationJobs}
                            selectedUrl={selectedUrl}
                            onRestore={handleRestore}
                            onSelectResult={selectResult}
                            onClearSelection={clearSelection}
                            isRestoring={isRestoring}
                            progress={progress}
                            etaSeconds={etaSeconds}
                            completedCount={completedCount}
                            totalCount={totalCount}
                            onDownload={handleDownload}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>


      {/* Footer - Compact Design */}
      {!imageUrl && (
        <footer className="flex-shrink-0 app-footer" style={{
          background: 'var(--color-bg-elevated)',
          borderTop: '1px solid var(--color-border)',
          padding: '1rem 0'
        }}>
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 footer-content">
              <div className="text-center md:text-left footer-title">
                <h2 className="footer-heading">
                  Discover More Sogni&nbsp;Apps
                </h2>
                <p className="footer-subtitle">
                  Powered by the Sogni&nbsp;Supernet
                </p>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-1.5 footer-apps">
                <a
                  href="https://www.sogni.ai/studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-app-link inline-flex items-center gap-1 px-2 py-1 rounded hover:opacity-80 transition-opacity"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>💻</span>
                  <span className="footer-app-name">Studio&nbsp;Pro</span>
                </a>
                
                <a
                  href="https://www.sogni.ai/pocket"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-app-link inline-flex items-center gap-1 px-2 py-1 rounded hover:opacity-80 transition-opacity"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>📱</span>
                  <span className="footer-app-name">Pocket</span>
                </a>
                
                <a
                  href="https://web.sogni.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-app-link inline-flex items-center gap-1 px-2 py-1 rounded hover:opacity-80 transition-opacity"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>🌐</span>
                  <span className="footer-app-name">Web</span>
                </a>
                
                <a
                  href="https://photobooth.sogni.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-app-link inline-flex items-center gap-1 px-2 py-1 rounded hover:opacity-80 transition-opacity"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>📸</span>
                  <span className="footer-app-name">Photobooth</span>
                </a>
                
                <a
                  href="https://www.sogni.ai/super-apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-app-link inline-flex items-center gap-0.5 px-2 py-1 rounded hover:opacity-80 transition-opacity"
                  style={{
                    background: 'var(--sogni-purple)',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span className="whitespace-nowrap">View&nbsp;All</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Out of Credits Popup */}
      <OutOfCreditsPopup
        isOpen={showOutOfCredits}
        onClose={() => setShowOutOfCredits(false)}
      />
    </div>
  );
}

export default App;
