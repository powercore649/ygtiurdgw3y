import React from 'react';

export default function LandingOverlay({ guilds, onSelectGuild }) {
  if (!guilds || guilds.length === 0) return null;

  return (
    <div className="landing-overlay">
      <div className="landing-card">
        
        <h1 className="landing-title">Welcome to <span>zyntra</span></h1>
        <p className="landing-subtitle">Choose a server to access its moderation dashboard.</p>

        <div className="guild-grid">
          {guilds.map(g => (
            <div 
              key={g.id} 
              className="guild-card"
              onClick={() => onSelectGuild(g.id)}
            >
              <div className="guild-icon-wrapper">
                {g.icon ? (
                  <img 
                    src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} 
                    alt="Server Icon" 
                    className="guild-icon"
                  />
                ) : (
                  <div className="guild-placeholder">#</div>
                )}
              </div>

              <h3 className="guild-name">{g.name}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        .landing-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          animation: fadeIn 0.4s ease;
          z-index: 9999;
        }

        .landing-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 40px;
          width: 100%;
          max-width: 650px;
          text-align: center;
          box-shadow: 0 0 40px rgba(0,0,0,0.3);
          animation: popIn 0.35s ease;
        }

        .landing-title {
          font-size: 2.4rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: #fff;
        }

        .landing-title span {
          background: linear-gradient(90deg, #5865F2, #8A5CF6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .landing-subtitle {
          font-size: 1rem;
          opacity: 0.7;
          margin-bottom: 30px;
        }

        .guild-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 20px;
        }

        .guild-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 20px 15px;
          cursor: pointer;
          transition: transform 0.25s ease, background 0.25s ease, border 0.25s ease;
          backdrop-filter: blur(6px);
        }

        .guild-card:hover {
          transform: translateY(-6px) scale(1.03);
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .guild-icon-wrapper {
          width: 70px;
          height: 70px;
          margin: 0 auto 10px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255,255,255,0.1);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .guild-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .guild-placeholder {
          font-size: 2rem;
          color: #ccc;
        }

        .guild-name {
          font-size: 1rem;
          margin-top: 8px;
          color: #fff;
          opacity: 0.9;
          font-weight: 500;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

