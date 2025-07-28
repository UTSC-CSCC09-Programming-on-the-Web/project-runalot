"use client";

import { useNavigation } from "../contexts/NavigationContext";

export default function CreditsPage() {
  const { navigate } = useNavigation();

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
        <button
          onClick={() => navigate("home")}
          style={{
            position: 'absolute',
            top: '-40px',
            left: '0',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          Back
        </button>
        
        <h1>Credits</h1>
        <p>
          Tileset by <a href="https://pipoya.itch.io/pipoya-rpg-tileset-32x32" target="_blank" rel="noopener noreferrer">pipoya</a>
        </p>
        <p>
          Sprites by <a href="https://pipoya.itch.io/pipoya-rpg-tileset-32x32" target="_blank" rel="noopener noreferrer">pipoya</a>
        </p>
      </div>
    </main>
  );
}
