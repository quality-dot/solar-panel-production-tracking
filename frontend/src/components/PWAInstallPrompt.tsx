import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ 
  isVisible = false, 
  onClose 
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show our custom prompt after a short delay
      setTimeout(() => {
        if (!checkIfInstalled()) {
          setShowPrompt(true);
        }
      }, 2000); // Show after 2 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    // Check if already installed
    if (checkIfInstalled()) {
      return;
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Check if we have a deferred prompt when manually triggered
  useEffect(() => {
    if (isVisible && !deferredPrompt) {
      // If manually triggered but no deferred prompt, check if we can install
      const checkInstallability = async () => {
        // Try to trigger the beforeinstallprompt event by checking PWA criteria
        if (window.matchMedia('(display-mode: standalone)').matches) {
          setIsInstalled(true);
          return;
        }
        
        // If not installed, we can still show the prompt for manual installation
        // The user can use Chrome's menu or address bar install button
        setShowPrompt(true);
      };
      
      checkInstallability();
    }
  }, [isVisible, deferredPrompt]);

  // Listen for PWA installation status changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true)
        setShowPrompt(false)
        onClose?.()
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [onClose])

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      if (deferredPrompt) {
        // Show the native install prompt if available
        await deferredPrompt.prompt();
        
        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('PWA installation accepted');
          setIsInstalled(true);
          setShowPrompt(false);
        } else {
          console.log('PWA installation dismissed');
        }
      } else {
        // No deferred prompt available, guide user to manual installation
        console.log('No deferred prompt, guiding user to manual installation');
        
        // Show instructions for manual installation
        alert('To install this app:\n\n1. Click the menu button (⋮) in Chrome\n2. Select "Install Solar Panel Tracker"\n3. Follow the installation prompts\n\nOr look for the install icon (📱) in the address bar.');
        
        // Close the prompt after showing instructions
        setShowPrompt(false);
        onClose?.();
      }
    } catch (error) {
      console.error('PWA installation error:', error);
      alert('Installation failed. Please try using Chrome\'s menu (⋮) → Install Solar Panel Tracker');
    } finally {
      setIsInstalling(false);
      if (deferredPrompt) {
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onClose?.();
  };



  // Don't show if already installed or if controlled externally
  if (isInstalled || (!showPrompt && !isVisible)) {
    return null;
  }

  return (
    <Modal isOpen={showPrompt || isVisible} onClose={handleDismiss}>
      <Card className="max-w-md mx-auto">
        <div className="p-6 text-center">
          {/* PWA Icon */}
          <div className="mb-4">
            <img 
              src="/pwa-192x192.png" 
              alt="Solar Panel Tracker" 
              className="w-16 h-16 mx-auto rounded-lg shadow-lg"
            />
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Install Solar Panel Tracker
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            Install this app on your device for quick and easy access. 
            It works offline and won't take up much space.
          </p>

          {/* Benefits */}
          <div className="text-left mb-6 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Quick access from home screen
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Works offline
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              No app store required
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isInstalling ? 'Installing...' : 'Install App'}
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="w-full text-gray-600"
            >
              Not Now
            </Button>
          </div>


        </div>
      </Card>
    </Modal>
  );
};

export default PWAInstallPrompt;
