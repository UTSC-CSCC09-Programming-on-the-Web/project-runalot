"use client";

import CheckoutForm from "./components/stripeCheckout";
import Navbar from "./components/Navbar";
import { useAuth } from "./contexts/AuthContext";
import { useEffect, useState } from "react";


export default function Home() {

  const { user, loading } = useAuth();

  const goToGame = () => {
    window.location.href = "/play";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black relative overflow-x-hidden">
      {/* Spooky vignette overlay */}
      <div className="pointer-events-none absolute inset-0 z-10" style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)', mixBlendMode: 'multiply'}} />
      {/* Spooky mist overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 animate-spookyMist" style={{background: 'linear-gradient(120deg, rgba(30,30,40,0.18) 0%, rgba(80,80,100,0.12) 100%)', filter: 'blur(2.5px)'}} />
      <Navbar />
      {/* Header */}
      <header className="relative overflow-visible bg-transparent shadow-none pt-20 z-30">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-0 pt-12">
          <div className="text-center">
            <span className="text-5xl md:text-7xl font-extrabold mb-6 block tracking-tight animate-spookyPulse" style={{fontFamily: 'Creepster, Luckiest Guy, Comic Sans MS, cursive', color: '#e0e0e0'}}>
              <span className="text-gray-200">TAG</span>
              <span className="text-indigo-400">GIT</span>
            </span>
            <p className="text-xl md:text-2xl text-gray-300 font-semibold mb-8 max-w-2xl mx-auto animate-spookyPulse" style={{fontFamily: 'Comic Sans MS, cursive', textShadow: '0 0 8px #222'}}>
              Ultimate online tag game. Run, chase, and outsmart your friends in a haunted arena!
            </p>
            {user && <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={goToGame} className="bg-gray-900 hover:bg-indigo-800 text-white font-extrabold py-3 px-10 rounded-xl text-xl shadow-lg border-2 border-gray-700 hover:scale-105 transition-all duration-200 ease-out animate-spookyPulse" style={{fontFamily: 'Luckiest Guy, Comic Sans MS, cursive', letterSpacing: 2, textShadow: '0 0 8px #000'}}>
                PLAY NOW
              </button>
            </div>}
          </div>
        </div>
        <style jsx global>{`
          @keyframes spookyMist {
            0% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
            50% { opacity: 0.85; filter: blur(3.5px) brightness(1.1); }
            100% { opacity: 0.95; filter: blur(2.5px) brightness(1); }
          }
          .animate-spookyMist { animation: spookyMist 4s ease-in-out infinite; }
          @keyframes spookyGlow {
            0%, 100% { text-shadow: 0 0 12px #fff, 0 0 12px #a855f7; }
            50% { text-shadow: 0 0 24px #fff, 0 0 32px #a855f7; }
          }
          .animate-spookyGlow { animation: spookyGlow 2.8s alternate infinite; }
          @keyframes spookyPulse {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.04); }
          }
          .animate-spookyPulse { animation: spookyPulse 2.2s infinite; }
        `}</style>
      </header>

      {/* Features Section */}
      <section id="features" className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-300 dark:text-gray-100 mb-4" style={{fontFamily: 'Luckiest Guy, Comic Sans MS, cursive'}}>Game Features</h2>
          <p className="text-lg text-gray-400 dark:text-gray-300 max-w-2xl mx-auto font-semibold" style={{fontFamily: 'Comic Sans MS, cursive'}}>Experience the fun and strategy of tag with these features!</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800 dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:scale-105 transition-all duration-200 border border-gray-200 dark:border-gray-700">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-3xl">👥</div>
            <h3 className="text-xl font-extrabold text-gray-200 dark:text-indigo-300 mb-2" style={{fontFamily: 'Luckiest Guy, Comic Sans MS, cursive'}}>Individual Play</h3>
            <p className="text-gray-400 dark:text-gray-700 font-semibold">You are on your own, sabotage fellow runners to give yourself an edge!</p>
          </div>
          <div className="bg-gray-800 dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:scale-105 transition-all duration-200 border border-gray-200 dark:border-gray-700">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-3xl">🎙️</div>
            <h3 className="text-xl font-extrabold text-gray-200 dark:text-indigo-300 mb-2" style={{fontFamily: 'Luckiest Guy, Comic Sans MS, cursive'}}>Proximity Chat</h3>
            <p className="text-gray-400 dark:text-gray-700 font-semibold">Trash talk, coordinate, and make friends (or enemies) with real-time voice chat!</p>
          </div>
          <div className="bg-gray-800 dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:scale-105 transition-all duration-200 border border-gray-200 dark:border-gray-700">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-3xl">🏗️</div>
            <h3 className="text-xl font-extrabold text-gray-200 dark:text-indigo-300 mb-2" style={{fontFamily: 'Luckiest Guy, Comic Sans MS, cursive'}}>Dynamic Obstacles</h3>
            <p className="text-gray-400 dark:text-gray-700 font-semibold">Use the obstacles and weave through to escape!</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white dark:bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">1</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Join or Create a Room</h3>
                    <p className="text-gray-600 dark:text-gray-300">Set up your game lobby and invite friends to join the action.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">2</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Get your role</h3>
                    <p className="text-gray-600 dark:text-gray-300">Become a cunning Tagger or an agile Runner in this thrilling chase game.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold">3</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Play & Communicate</h3>
                    <p className="text-gray-600 dark:text-gray-300">Use proximity chat to trash talk and ragebait other players.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-xl p-8 h-80 flex items-center justify-center">
              <div className="text-center">
                <span className="text-6xl mb-4 block">🎮</span>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Real-time multiplayer gaming experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      {user && (<section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-300 dark:text-white mb-4">
            Ready to Play?
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-300 mb-8">
            Subscribe now to play Taggit with your friends
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <CheckoutForm />
        </div>
      </section>)}
      {!user && (<section id="pricing" className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Join Us Today!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Taggit is free, but we like to pretend to take your money 💸. 
          </p>
        </div>
      </section>)}

      {/* Tech Stack */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Built with Modern Technology</h3>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Next.js</span>
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Phaser</span>            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Express.js</span>
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">WebSockets</span>
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Stripe</span>
          </div>
        </div>
      </section>
    </div>
  );
}
