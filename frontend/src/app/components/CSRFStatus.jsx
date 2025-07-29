'use client';

import { useAuth } from '../contexts/AuthContext';

export const CSRFStatus = () => {
  const { csrfToken, makeAuthenticatedRequest } = useAuth();

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  const testCSRF = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/debug`,
        { method: 'GET' }
      );
      const data = await response.json();
      console.log('CSRF test response:', data);
    } catch (error) {
      console.error('CSRF test failed:', error);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>CSRF Token: {csrfToken ? '✅' : '❌'}</div>
      <button onClick={testCSRF} style={{
        background: '#007bff',
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '3px',
        fontSize: '10px',
        cursor: 'pointer',
        marginTop: '5px'
      }}>
        Test CSRF
      </button>
    </div>
  );
};
