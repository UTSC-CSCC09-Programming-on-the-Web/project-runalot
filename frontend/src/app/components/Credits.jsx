"use client";

export default function Credits({ navigate }) {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'sans-serif', paddingTop: '80px' }}>
      <h1>Credits</h1>
      <p>
        Tileset by <a href="https://pipoya.itch.io/pipoya-rpg-tileset-32x32" target="_blank" rel="noopener noreferrer">pipoya</a>
      </p>
      <p>
        Sprites by <a href="https://pipoya.itch.io/pipoya-rpg-tileset-32x32" target="_blank" rel="noopener noreferrer">pipoya</a>
      </p>
      <button 
        onClick={() => navigate('home')}
        style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        Back to Home
      </button>
    </main>
  );
}
