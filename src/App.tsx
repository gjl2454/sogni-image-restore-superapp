import React, { useState, useCallback, useEffect } from 'react';
import { useSogniAuth } from './services/sogniAuth';
import { useWallet } from './hooks/useWallet';
import { useImageUpload } from './hooks/useImageUpload';
import { useRestoration } from './hooks/useRestoration';
import { AuthStatus } from './components/auth/AuthStatus';
import { UploadZone } from './components/UploadZone';
import { ImagePreview } from './components/ImagePreview';
import { ProgressIndicator } from './components/ProgressIndicator';
import { OutOfCreditsPopup } from './components/OutOfCreditsPopup';
import { downloadImage } from './utils/download';
import { formatTokenAmount } from './services/walletService';

function App() {
  const { isAuthenticated, isLoading: authLoading, getSogniClient } = useSogniAuth();
  const { balances, tokenType } = useWallet();
  const { file, imageUrl, imageData, width, height, error: uploadError, upload, clear: clearUpload } = useImageUpload();
  const { isRestoring, progress, error: restoreError, restoredUrl, restore, reset: resetRestore } = useRestoration();
  
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
    const filename = `restored-photo-${Date.now()}.jpg`;
    await downloadImage(url, filename);
  }, []);

  const handleNewPhoto = useCallback(() => {
    clearUpload();
    resetRestore();
    setOriginalUrl(null);
  }, [clearUpload, resetRestore]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Photo Restoration</h1>
            <AuthStatus />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Restore Your Damaged Photos</h2>
            <p className="text-lg text-gray-600 mb-8">
              Sign in to start restoring your precious memories with AI-powered restoration.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {!imageUrl ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 text-center">Upload a Damaged Photo</h2>
                <UploadZone onFileSelect={handleFileSelect} />
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {uploadError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {restoredUrl ? 'Restoration Complete' : 'Ready to Restore'}
                  </h2>
                  <button
                    onClick={handleNewPhoto}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Upload New Photo
                  </button>
                </div>

                {isRestoring && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <ProgressIndicator progress={progress} message="Restoring your photo..." />
                  </div>
                )}

                {restoreError && restoreError !== 'INSUFFICIENT_CREDITS' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {restoreError}
                    <button
                      onClick={handleRestore}
                      className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Try again
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow p-6">
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
              </div>
            )}
          </div>
        )}
      </main>

      {/* Out of Credits Popup */}
      <OutOfCreditsPopup
        isOpen={showOutOfCredits}
        onClose={() => setShowOutOfCredits(false)}
      />
    </div>
  );
}

export default App;
