'use client';

import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('home');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('home')}
          className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition duration-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Home</span>
        </button>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-4 mb-6">
            {user.photos && user.photos[0] && (
              <img
                src={user.photos[0].value}
                alt="Profile"
                className="w-16 h-16 rounded-full border-4 border-blue-600"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.displayName || user.username}!
              </h1>
              <p className="text-gray-600">
                {user.emails?.[0]?.value}
              </p>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
