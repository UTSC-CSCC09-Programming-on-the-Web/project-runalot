"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Home from './Home';
import Game from './Game';
import Credits from './Credits';
import Navbar from './Navbar';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const { user, loading } = useAuth();

  // Navigate to different views
  const navigate = (view) => {
    setCurrentView(view);
  };

  // Check if user is authenticated for protected routes
  useEffect(() => {
    if (currentView === 'play' && !loading && !user) {
      setCurrentView('home');
    }
  }, [currentView, loading, user]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <Home navigate={navigate} />;
      case 'play':
        return <Game navigate={navigate} />;
      case 'credits':
        return <Credits navigate={navigate} />;
      default:
        return <Home navigate={navigate} />;
    }
  };

  return (
    <div>
      <Navbar navigate={navigate} currentView={currentView} />
      {renderCurrentView()}
    </div>
  );
}
