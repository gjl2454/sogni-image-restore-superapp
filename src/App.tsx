import { useState, useCallback, useEffect } from 'react';
import { useSogniAuth } from './services/sogniAuth';
import { useWallet } from './hooks/useWallet';
import { useImageUpload } from './hooks/useImageUpload';
import { useRestoration } from './hooks/useRestoration';
import { useVideo } from './hooks/useVideo';
import { useCredits } from './hooks/useCredits';
import { useToastContext } from './context/ToastContext';
import { AuthStatus } from './components/auth/AuthStatus';
import { UploadZone } from './components/UploadZone';
import { ImagePreview } from './components/ImagePreview';
import { ProgressIndicator } from './components/ProgressIndicator';
import { OutOfCreditsPopup } from './components/OutOfCreditsPopup';
import { BeforeAfterGallery } from './components/BeforeAfterGallery';
import { FeaturesSection } from './components/FeaturesSection';
import { ToastProvider } from './context/ToastContext';
import NetworkStatus from './components/shared/NetworkStatus';
import FriendlyErrorModal from './components/shared/FriendlyErrorModal';
import PWAInstallPrompt from './components/shared/PWAInstallPrompt';
import CreditsDisplay from './components/shared/CreditsDisplay';
import HelpOnboarding from './components/shared/HelpOnboarding';
import RecentProjects from './components/RecentProjects';
import { downloadImage } from './utils/download';
import { downloadImagesAsZip } from './utils/bulkDownload';
import { trackRestorationStarted, trackRestorationCompleted, trackRestorationFailed, trackDownload, trackVideoGenerationStarted, trackVideoGenerationCompleted } from './services/analyticsService';

function AppContent() {
  const { isAuthenticated, isLoading: authLoading, getSogniClient } = useSogniAuth();
  const [resetOnboarding, setResetOnboarding] = useState<(() => void) | null>(null);
  const [onboardingKey, setOnboardingKey] = useState(0); // Force re-render on reset
  const { balances, tokenType } = useWallet();
  const { imageUrl, imageData, width, height, error: uploadError, upload, clear: clearUpload } = useImageUpload();
  const { isRestoring, progress, error: restoreError, restoredUrls, restorationJobs, selectedUrl, selectedJobIndex, etaSeconds, completedCount, totalCount, restore, selectResult, clearSelection, reset: resetRestore } = useRestoration();
  const { isGenerating: isGeneratingVideo, progress: videoProgress, error: videoError, videoUrl, generate: generateVideo, reset: resetVideo } = useVideo();
  
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [numberOfImages, setNumberOfImages] = useState<number>(4);
  const [errorModal, setErrorModal] = useState<any>(null);
  const [connectionState] = useState<'online' | 'offline' | 'connecting' | 'timeout'>('online');
  const [showRecentProjects, setShowRecentProjects] = useState(false);
  
  const { estimatedRestorationCost, trackRestoration: trackRestorationUsage, trackVideo: trackVideoUsage } = useCredits(numberOfImages);
  const { showToast } = useToastContext();

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
      // Track restoration started
      await trackRestorationStarted({ numberOfImages, width, height });
      await restore(client, imageData, width, height, tokenType, numberOfImages);
      console.log('[APP] Restore function completed successfully');
      // Track restoration completed - use numberOfImages since restoredUrls might not be updated yet
      await trackRestorationCompleted({ numberOfImages, restoredCount: numberOfImages });
      trackRestorationUsage(numberOfImages);
      showToast({
        type: 'success',
        title: 'Restoration Complete!',
        message: `Successfully restored ${numberOfImages} image${numberOfImages !== 1 ? 's' : ''}`
      });
    } catch (error: any) {
      // Error state is already set by useRestoration hook
      // We catch here to handle specific UI actions (like showing credit popup)
      console.error('[APP] Restore function failed:', error?.message);
      await trackRestorationFailed(error?.message || 'Unknown error', { numberOfImages });
      if (error.message === 'INSUFFICIENT_CREDITS' || 
          error.message?.toLowerCase().includes('insufficient')) {
        setShowOutOfCredits(true);
      } else {
        setErrorModal({
          type: 'connection_error',
          title: 'Restoration Failed',
          message: error?.message || 'An error occurred during restoration. Please try again.',
          canRetry: true
        });
      }
      // Don't re-throw - error UI is shown via restoreError state
    }
  }, [imageData, isAuthenticated, getSogniClient, balances, tokenType, width, height, numberOfImages, restore, restoreError, resetRestore, restoredUrls, showToast, trackRestorationUsage, trackRestorationStarted, trackRestorationCompleted, trackRestorationFailed]);

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
    try {
      await downloadImage(url, filename);
      await trackDownload({ type: isOriginal ? 'original' : 'restored' });
      showToast({
        type: 'success',
        title: 'Download Started',
        message: 'Your photo is downloading...'
      });
    } catch (error) {
      console.error('Download failed:', error);
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: 'Unable to download photo. Please try again.'
      });
    }
  }, [originalUrl, showToast]);

  const handleBulkDownload = useCallback(async () => {
    if (restoredUrls.length === 0) {
      showToast({
        type: 'error',
        title: 'No Images',
        message: 'No restored images to download.'
      });
      return;
    }

    // Show a single persistent progress toast
    let hideProgressToast: (() => void) | null = null;
    const showProgressToast = (message: string) => {
      // Hide previous toast if it exists
      if (hideProgressToast) {
        hideProgressToast();
      }
      // Show new toast
      hideProgressToast = showToast({
        type: 'info',
        title: 'Downloading...',
        message,
        autoClose: false,
        timeout: 0
      });
    };

    try {
      // Show initial toast
      showProgressToast(`Preparing ${restoredUrls.length} image${restoredUrls.length !== 1 ? 's' : ''}...`);

      // Prepare image data for ZIP
      const images = restoredUrls.map((url, index) => ({
        url,
        filename: `restored-photo-${index + 1}-${Date.now()}.jpg`
      }));

      let currentStage = '';
      let lastUpdateTime = 0;
      const STAGE_UPDATE_INTERVAL = 800; // Update stage messages every 800ms max
      
      // Download as ZIP - only show major stage changes
      const success = await downloadImagesAsZip(
        images,
        `sogni-restoration-${Date.now()}.zip`,
        (current, total, message) => {
          const now = Date.now();
          let newStage = '';
          
          // Determine current stage
          if (message.includes('Starting download preparation')) {
            newStage = 'preparing';
          } else if (message.includes('Adding image')) {
            newStage = 'adding';
          } else if (message.includes('Generating ZIP')) {
            newStage = 'generating';
          } else if (message.includes('Compressing')) {
            newStage = 'compressing';
          } else if (message.includes('Downloading ZIP')) {
            newStage = 'downloading';
          }
          
          // Only update if stage changed and enough time has passed
          if (newStage && newStage !== currentStage && (now - lastUpdateTime >= STAGE_UPDATE_INTERVAL || currentStage === '')) {
            currentStage = newStage;
            lastUpdateTime = now;
            
            // Format message based on stage
            let progressMessage = '';
            if (newStage === 'preparing') {
              progressMessage = `Preparing ${total} image${total !== 1 ? 's' : ''}...`;
            } else if (newStage === 'adding') {
              progressMessage = `Adding images... (${current}/${total})`;
            } else if (newStage === 'generating') {
              progressMessage = 'Creating ZIP file...';
            } else if (newStage === 'compressing') {
              const percentMatch = message.match(/(\d+)%/);
              if (percentMatch) {
                progressMessage = `Compressing... ${percentMatch[1]}%`;
              } else {
                progressMessage = 'Compressing...';
              }
            } else if (newStage === 'downloading') {
              progressMessage = 'Starting download...';
            }
            
            if (progressMessage) {
              showProgressToast(progressMessage);
            }
          }
        }
      );

      // Hide progress toast
      if (hideProgressToast) {
        hideProgressToast();
      }

      if (success) {
        showToast({
          type: 'success',
          title: 'Download Complete!',
          message: `Downloaded ${restoredUrls.length} image${restoredUrls.length !== 1 ? 's' : ''} as ZIP file.`
        });
        // Track bulk download
        await trackDownload({ type: 'bulk', count: restoredUrls.length });
      } else {
        throw new Error('Bulk download failed');
      }
    } catch (error) {
      console.error('Bulk download failed:', error);
      // Hide progress toast if it exists
      if (hideProgressToast) {
        hideProgressToast();
      }
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: 'Unable to download images. Please try again.'
      });
    }
  }, [restoredUrls, showToast]);

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
      await trackVideoGenerationStarted({ width, height });
      await generateVideo(client, selectedUrl, width, height, tokenType);
      console.log('[APP] Video generation completed successfully');
      await trackVideoGenerationCompleted({ width, height });
      trackVideoUsage();
      showToast({
        type: 'success',
        title: 'Video Generated!',
        message: 'Your video is ready to download'
      });
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
  }, [selectedUrl, isAuthenticated, getSogniClient, balances, tokenType, width, height, generateVideo, showToast, trackVideoUsage, trackVideoGenerationStarted, trackVideoGenerationCompleted]);

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
          <div className="flex items-center gap-3">
            {isAuthenticated && balances && tokenType && (
              <CreditsDisplay
                balance={parseFloat(balances[tokenType]?.net || '0')}
                estimatedCost={estimatedRestorationCost}
                numberOfImages={numberOfImages}
                tokenType={tokenType}
              />
            )}
            {isAuthenticated && (
              <button
                onClick={() => setShowRecentProjects(true)}
                className="btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
                title="View recent projects"
              >
                <span>📚</span>
                <span>Recents</span>
              </button>
            )}
            <button
              onClick={() => {
                if (resetOnboarding) {
                  resetOnboarding();
                  // Force re-render of HelpOnboarding component
                  setOnboardingKey(prev => prev + 1);
                } else {
                  // If reset function not ready, manually clear localStorage and reload
                  try {
                    localStorage.removeItem('sogni_restoration_onboarding_completed');
                    localStorage.removeItem('sogni_restoration_onboarding_skipped');
                    window.location.reload();
                  } catch (error) {
                    console.error('Failed to reset onboarding:', error);
                  }
                }
              }}
              title="Show Tutorial"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-elevated)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <span>?</span>
              <span style={{ fontSize: '0.7rem' }}>Help</span>
            </button>
            <AuthStatus />
          </div>
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
                      <div className="flex gap-2">
                        {restoredUrls.length > 1 && !isRestoring && (
                          <button
                            onClick={handleBulkDownload}
                            className="btn-primary"
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.8125rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem'
                            }}
                            title={`Download all ${restoredUrls.length} images as ZIP`}
                          >
                            <span>📦</span>
                            <span>Download All</span>
                          </button>
                        )}
            <div className="flex gap-2">
              <button
                onClick={handleNewPhoto}
                className="btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500
                }}
              >
                ↻ new photo
              </button>
            </div>
                      </div>
                      {restoredUrls.length > 0 && !isRestoring && (
                        <button
                          data-onboarding="restore-button"
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
                          let's try again!
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
                      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0" data-onboarding="results">
                        <div className="flex-1 min-h-0 overflow-auto">
                          <ImagePreview
                            imageUrl={imageUrl}
                            originalUrl={originalUrl || undefined}
                            restoredUrls={restoredUrls}
                            restorationJobs={restorationJobs}
                            selectedUrl={selectedUrl}
                            selectedJobIndex={selectedJobIndex}
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

      {/* Network Status */}
      <NetworkStatus
        connectionState={connectionState}
        isGenerating={isRestoring || isGeneratingVideo}
        onRetryAll={() => {
          if (isRestoring) {
            handleRestore();
          }
        }}
      />

      {/* Friendly Error Modal */}
      <FriendlyErrorModal
        error={errorModal}
        onClose={() => setErrorModal(null)}
        onRetry={() => {
          if (restoreError) {
            handleRestore();
          }
        }}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Help Onboarding - Only shows automatically on first visit when authenticated */}
      {isAuthenticated && (
        <HelpOnboarding 
          key={onboardingKey}
          onResetReady={(reset) => setResetOnboarding(() => reset)}
        />
      )}

      {/* Recent Projects Modal */}
      {isAuthenticated && showRecentProjects && (
        <RecentProjects
          sogniClient={getSogniClient()}
          onClose={() => setShowRecentProjects(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
