import React from 'react';

interface TemperatureIcebergProps {
  temperature: number;
  isVisible: boolean;
}

const TemperatureIceberg: React.FC<TemperatureIcebergProps> = ({ temperature, isVisible }) => {
  if (!isVisible || temperature >= 0) {
    return null;
  }

  return (
    <div className="absolute bottom-0 right-8 pointer-events-none z-20 animate-in slide-in-from-bottom-4 duration-1000">
      {/* Iceberg SVG */}
      <div className="relative">
        <svg
          width="120"
          height="160"
          viewBox="0 0 120 160"
          fill="none"
          className="drop-shadow-lg"
        >
          {/* Above water portion (smaller) */}
          <path
            d="M20 80 L35 60 L50 65 L65 55 L80 70 L95 65 L100 80 L20 80 Z"
            fill="rgba(200, 230, 255, 0.9)"
            stroke="rgba(150, 200, 240, 0.8)"
            strokeWidth="1"
          />
          
          {/* Below water portion (larger, underwater) */}
          <path
            d="M15 80 L25 95 L35 110 L20 125 L30 140 L45 150 L60 155 L75 150 L90 140 L100 125 L85 110 L95 95 L105 80 L15 80 Z"
            fill="rgba(180, 220, 255, 0.7)"
            stroke="rgba(130, 180, 220, 0.6)"
            strokeWidth="1"
          />
          
          {/* Water line */}
          <line
            x1="10"
            y1="80"
            x2="110"
            y2="80"
            stroke="rgba(100, 150, 200, 0.8)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {/* Ice crystals/sparkles */}
          <circle cx="40" cy="70" r="1.5" fill="rgba(255, 255, 255, 0.8)" />
          <circle cx="70" cy="65" r="1" fill="rgba(255, 255, 255, 0.9)" />
          <circle cx="85" cy="75" r="1.2" fill="rgba(255, 255, 255, 0.7)" />
          <circle cx="30" cy="100" r="1" fill="rgba(200, 230, 255, 0.8)" />
          <circle cx="80" cy="120" r="1.3" fill="rgba(200, 230, 255, 0.6)" />
        </svg>
        
        {/* Temperature indicator */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-900 bg-opacity-80 text-white px-2 py-1 rounded text-xs font-bold">
          {temperature}°C
        </div>
        
        {/* Floating ice particles */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-60"
              style={{
                left: `${20 + i * 10}%`,
                top: `${30 + (i % 3) * 15}%`,
                animation: `float-ice-${i} ${4 + i * 0.3}s ease-in-out infinite`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* CSS animations for floating ice particles */}
      <style>{`
        @keyframes float-ice-0 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-8px) rotate(180deg); opacity: 0.3; }
        }
        @keyframes float-ice-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-12px) rotate(90deg); opacity: 0.8; }
        }
        @keyframes float-ice-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-6px) rotate(270deg); opacity: 0.4; }
        }
        @keyframes float-ice-3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-10px) rotate(45deg); opacity: 0.9; }
        }
        @keyframes float-ice-4 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-14px) rotate(135deg); opacity: 0.6; }
        }
        @keyframes float-ice-5 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
          50% { transform: translateY(-5px) rotate(225deg); opacity: 0.5; }
        }
        @keyframes float-ice-6 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-9px) rotate(315deg); opacity: 0.7; }
        }
        @keyframes float-ice-7 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-11px) rotate(60deg); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default TemperatureIceberg;