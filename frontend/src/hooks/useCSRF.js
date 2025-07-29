import { useState, useEffect } from 'react';

export const useCSRF = () => {
  const [csrfToken, setCSRFToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCSRFToken = async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/csrf-token`, {
        credentials: 'include',
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCSRFToken(data.csrfToken);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch CSRF token:', response.status, errorText);
        setError(`Failed to fetch CSRF token: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      setError('Network error fetching CSRF token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCSRFToken();
  }, []);

  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!csrfToken) {
      throw new Error('CSRF token not available');
    }

    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      // If we get a 403 error, it might be a CSRF token issue
      if (response.status === 403) {
        console.warn('Received 403 error, refreshing CSRF token and retrying...');
        await fetchCSRFToken();
        
        // Retry with new token
        if (csrfToken) {
          const retryOptions = {
            ...defaultOptions,
            headers: {
              ...defaultOptions.headers,
              'X-CSRF-Token': csrfToken
            }
          };
          return fetch(url, { ...retryOptions, ...options });
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in authenticated request:', error);
      throw error;
    }
  };

  const refreshCSRFToken = () => {
    setLoading(true);
    fetchCSRFToken();
  };

  return {
    csrfToken,
    loading,
    error,
    makeAuthenticatedRequest,
    refreshCSRFToken
  };
};
