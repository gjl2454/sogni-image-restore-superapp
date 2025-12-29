import React, { useState, useCallback, useEffect } from 'react';
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
import { downloadImage } from './utils/download';

function App() {
  const { isAuthenticated, isLoading: authLoading, getSogniClient } = useSogniAuth();
  const { balances, tokenType } = useWallet();
  const { file, imageUrl, imageData, width, height, error: uploadError, upload, clear: clearUpload } = useImageUpload();
  const { isRestoring, progress, error: restoreError, restoredUrl, restore, reset: resetRestore } = useRestoration();
  const { isGenerating: isGeneratingVideo, progress: videoProgress, error: videoError, videoUrl, generate: generateVideo, reset: resetVideo } = useVideo();
  
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

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

  const handleRestore = useCallback(async () => {
    if (!imageData || !isAuthenticated) {
      console.warn('[APP] Cannot restore: missing image data or not authenticated');
      return;
    }

    const client = getSogniClient();
    if (!client) {
      console.error('[APP] No Sogni client available');
      return;
    }

    // Check if user has credits (with small buffer for processing)
    const currentBalance = balances?.[tokenType]?.net || '0';
    const balanceNum = parseFloat(currentBalance);
    
    if (balanceNum <= 0) {
      setShowOutOfCredits(true);
      return;
    }

    // Reset any previous errors
    if (restoreError === 'INSUFFICIENT_CREDITS') {
      resetRestore();
    }

    try {
      await restore(client, imageData, width, height, tokenType);
    } catch (error: any) {
      // Error is already handled in useRestoration hook
      // Check if it's an insufficient credits error
      if (error.message === 'INSUFFICIENT_CREDITS' || 
          error.message?.toLowerCase().includes('insufficient')) {
        setShowOutOfCredits(true);
      }
    }
  }, [imageData, isAuthenticated, getSogniClient, balances, tokenType, width, height, restore, restoreError, resetRestore]);

  const handleDownload = useCallback(async (url: string) => {
    const isOriginal = url === originalUrl;
    console.log('Download request:', { url, originalUrl, isOriginal });
    const filename = isOriginal
      ? `original-photo-${Date.now()}.jpg`
      : `restored-photo-${Date.now()}.jpg`;
    await downloadImage(url, filename);
  }, [originalUrl]);

  const handleNewPhoto = useCallback(() => {
    clearUpload();
    resetRestore();
    resetVideo();
    setOriginalUrl(null);
  }, [clearUpload, resetRestore, resetVideo]);

  const handleGenerateVideo = useCallback(async () => {
    const sourceUrl = restoredUrl || imageUrl;
    if (!sourceUrl || !isAuthenticated) {
      console.warn('[APP] Cannot generate video: missing image or not authenticated');
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
      await generateVideo(client, sourceUrl, width, height, tokenType);
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_CREDITS' || 
          error.message?.toLowerCase().includes('insufficient')) {
        setShowOutOfCredits(true);
      }
    }
  }, [restoredUrl, imageUrl, isAuthenticated, getSogniClient, balances, tokenType, width, height, generateVideo]);

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
    <div className="min-h-screen w-screen flex flex-col" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', overflowY: 'auto', height: '100vh' }}>
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
      <main className="flex-1 flex flex-col" style={{ 
        flex: '0 1 auto',
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '450px'
      }}>
        <div className="flex flex-col items-center justify-center p-0" style={{ 
          minHeight: '450px',
          paddingTop: '1rem',
          paddingBottom: '1rem'
        }}>
          {!isAuthenticated ? (
            <div className="text-center max-w-2xl fade-in">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ 
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1
              }}>
                Restore Your <span className="gradient-accent">Precious Memories</span>
              </h2>
              <p className="text-lg lg:text-xl" style={{ 
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                fontWeight: 400
              }}>
                Sign in to experience AI-powered photo restoration that brings your damaged photos back to life.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-7xl h-full flex flex-col gap-0 overflow-hidden">
              {!imageUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-0.5 fade-in min-h-0 overflow-hidden" style={{ 
                  width: '100%',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem'
                }}>
                  <div className="text-center flex-shrink-0 mb-0.5">
                    <h2 className="text-base font-bold mb-0.25" style={{ 
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2
                    }}>
                      Upload Your Photo
                    </h2>
                    <p style={{ 
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.8125rem',
                      lineHeight: 1.2
                    }}>
                      Drop your damaged photo here or click to browse
                    </p>
                  </div>
                  <div className="w-full max-w-xl flex-shrink-0 px-2">
                    <UploadZone onFileSelect={handleFileSelect} />
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
                <div className="fade-in flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
                  {/* Header Row */}
                  <div className="flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold" style={{ 
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.02em'
                    }}>
                      {videoUrl ? '✨ Video Complete!' : restoredUrl ? '✨ Restoration Complete' : 'Ready to Restore'}
                    </h2>
                    <button
                      onClick={handleNewPhoto}
                      className="btn-secondary"
                      style={{
                        padding: '0.5rem 1.25rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      Upload New Photo
                    </button>
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
                  <div className="flex-1 card-premium p-4 overflow-hidden flex flex-col min-h-0">
                    {videoUrl ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
                        <video 
                          src={videoUrl} 
                          controls 
                          autoPlay 
                          loop 
                          className="max-w-full max-h-full object-contain"
                          style={{ 
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-lg)'
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
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <ImagePreview
                            imageUrl={imageUrl}
                            originalUrl={originalUrl || undefined}
                            restoredUrl={restoredUrl || undefined}
                            onRestore={handleRestore}
                            isRestoring={isRestoring}
                            progress={progress}
                            onDownload={handleDownload}
                          />
                        </div>
                        {restoredUrl && !isRestoring && (
                          <div className="flex justify-center flex-shrink-0">
                            <button
                              onClick={handleGenerateVideo}
                              disabled={isGeneratingVideo}
                              className="btn-primary flex items-center gap-2"
                              style={{
                                padding: '0.75rem 2rem',
                                fontSize: '1rem'
                              }}
                            >
                              <span style={{ fontSize: '1.25rem' }}>🎬</span>
                              <span style={{ fontWeight: 600 }}>Bring to Life</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Tagline Section */}
      {!imageUrl && isAuthenticated && (
        <div className="flex-shrink-0" style={{
          background: 'transparent',
          padding: '0.125rem 0 2rem 0',
          flex: '0 0 auto'
        }}>
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="flex justify-center">
              <div style={{ 
                display: 'flex',
                gap: '4rem',
                maxWidth: '900px',
                width: '100%'
              }}>
                <div style={{ flex: '1 1 0' }}>
                  <p style={{
                    fontSize: '3rem',
                    color: 'var(--color-text-primary)',
                    letterSpacing: '0.02em',
                    fontWeight: 700,
                    textAlign: 'left',
                    lineHeight: 1.4
                  }}>
                    Timeless Restoration.<br />
                    Preserve their Story.
                  </p>
                </div>
                <div style={{ flex: '1 1 0' }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  fontWeight: 600,
                  textAlign: 'right',
                  lineHeight: 1.4,
                  marginBottom: '0.75rem',
                  paddingRight: '4rem'
                }}>
                  How it Works
                </h2>
                <div style={{
                  display: 'table',
                  marginLeft: 'auto'
                }}>
                  <div style={{ display: 'table-row' }}>
                    <div style={{
                      display: 'table-cell',
                      paddingRight: '0.5rem',
                      verticalAlign: 'top',
                      width: '2.25rem'
                    }}>
                      <span style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '50%',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)'
                      }}>
                        1
                      </span>
                    </div>
                    <div style={{
                      display: 'table-cell',
                      verticalAlign: 'top'
                    }}>
                      <span style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.4
                      }}>
                        Upload your image
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'table-row' }}>
                    <div style={{
                      display: 'table-cell',
                      paddingRight: '0.5rem',
                      verticalAlign: 'top',
                      width: '2.25rem'
                    }}>
                      <span style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '50%',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)'
                      }}>
                        2
                      </span>
                    </div>
                    <div style={{
                      display: 'table-cell',
                      verticalAlign: 'top'
                    }}>
                      <span style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.4
                      }}>
                        Take a look at your new restored image!
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'table-row' }}>
                    <div style={{
                      display: 'table-cell',
                      paddingRight: '0.5rem',
                      verticalAlign: 'top',
                      width: '2.25rem'
                    }}>
                      <span style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '50%',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)'
                      }}>
                        3
                      </span>
                    </div>
                    <div style={{
                      display: 'table-cell',
                      verticalAlign: 'top'
                    }}>
                      <span style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.4
                      }}>
                        Download your image
                      </span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Take Control of Your Creative Journey */}
      {!imageUrl && (
        <footer style={{
          background: 'var(--color-bg-elevated)',
          padding: '1.5rem 0',
          marginTop: '6rem',
          width: '100%'
        }}>
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="text-center mb-4">
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '0.25rem'
              }}>
                Take Control of Your Creative Journey
              </h2>
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '1rem'
              }}>
                Discover Creative AI Tools powered by the Sogni Supernet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {/* Sogni Studio Pro */}
            <a
              href="https://www.sogni.ai/studio"
              target="_blank"
              rel="noopener noreferrer"
              className="card-premium p-3 text-center hover:shadow-lg transition-all"
              style={{
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <div style={{
                fontSize: '1.75rem',
                marginBottom: '0.5rem'
              }}>💻</div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '0.375rem',
                letterSpacing: '-0.01em'
              }}>
                Sogni Studio Pro
              </h3>
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                Dream it. Make it.
              </p>
              <p style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.02em'
              }}>
                For Mac
              </p>
            </a>

            {/* Sogni Pocket */}
            <a
              href="https://www.sogni.ai/pocket"
              target="_blank"
              rel="noopener noreferrer"
              className="card-premium p-3 text-center hover:shadow-lg transition-all"
              style={{
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <div style={{
                fontSize: '1.75rem',
                marginBottom: '0.5rem'
              }}>📱</div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '0.375rem',
                letterSpacing: '-0.01em'
              }}>
                Sogni Pocket
              </h3>
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                Create anywhere.
              </p>
              <p style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.02em'
              }}>
                For iPhone & iPad
              </p>
            </a>

            {/* Sogni Web */}
            <a
              href="https://web.sogni.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="card-premium p-3 text-center hover:shadow-lg transition-all"
              style={{
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <div style={{
                fontSize: '1.75rem',
                marginBottom: '0.5rem'
              }}>🌐</div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '0.375rem',
                letterSpacing: '-0.01em'
              }}>
                Sogni Web
              </h3>
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                The power of Sogni on the web
              </p>
              <p style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.02em'
              }}>
                For all browsers
              </p>
            </a>

            {/* Photobooth */}
            <a
              href="https://photobooth.sogni.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="card-premium p-3 text-center hover:shadow-lg transition-all"
              style={{
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <div style={{
                fontSize: '1.75rem',
                marginBottom: '0.5rem'
              }}>📸</div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '0.375rem',
                letterSpacing: '-0.01em'
              }}>
                Photobooth
              </h3>
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                Turn yourself into any Character.
              </p>
              <p style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.02em'
              }}>
                For all browsers
              </p>
            </a>
          </div>

            <div className="text-center">
              <a
                href="https://www.sogni.ai/super-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-block"
                style={{
                  textDecoration: 'none',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.8125rem'
                }}
              >
                View All Super Apps
              </a>
              <p style={{
                fontSize: '0.625rem',
                color: 'var(--color-text-tertiary)',
                marginTop: '0.5rem',
                letterSpacing: '0.02em'
              }}>
                Powered by the Sogni Supernet.
              </p>
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
