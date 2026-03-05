import { useEffect, useState } from 'react';

import { logger } from '../utils/logger';

/**
 * Custom hook to load external scripts dynamically
 * Useful for loading payment gateways, analytics, etc.
 *
 * @param src - The URL of the script to load
 * @returns loaded - Boolean indicating if the script has loaded
 *
 * @example
 * const razorpayLoaded = useScript('https://checkout.razorpay.com/v1/checkout.js');
 */
export const useScript = (src: string): boolean => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      // Script already loaded
      setLoaded(true);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    // Handle script load success
    const handleLoad = () => {
      setLoaded(true);
      setError(false);
      logger.debug(`[useScript] Loaded: ${src}`);
    };

    // Handle script load error
    const handleError = () => {
      setError(true);
      setLoaded(false);
      logger.error(`[useScript] Error loading: ${src}`);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    // Append script to document
    document.body.appendChild(script);

    // Cleanup
    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);

      // Optional: Remove script on unmount
      // Uncomment if you want to remove the script when component unmounts
      // if (script.parentNode) {
      //   script.parentNode.removeChild(script);
      // }
    };
  }, [src]);

  return loaded;
};

/**
 * Hook to check if a global variable exists (useful for checking if SDK loaded)
 *
 * @param globalName - Name of the global variable (e.g., 'Razorpay', 'google')
 * @returns exists - Boolean indicating if the global exists
 *
 * @example
 * const razorpayAvailable = useGlobalExists('Razorpay');
 */
export const useGlobalExists = (globalName: string): boolean => {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const checkGlobal = () => {
      const global = (window as any)[globalName];
      setExists(!!global);
    };

    // Check immediately
    checkGlobal();

    // Check again after a delay (in case script is still loading)
    const timer = setTimeout(checkGlobal, 500);

    return () => clearTimeout(timer);
  }, [globalName]);

  return exists;
};
