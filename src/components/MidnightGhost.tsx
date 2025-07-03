import React, { useState, useEffect } from 'react';
import { Ghost } from 'lucide-react';

interface MidnightGhostProps {
  currentTime: Date;
}

const MidnightGhost: React.FC<MidnightGhostProps> = ({ currentTime }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 30 });
  const [direction, setDirection] = useState(1);

  // Check if it's exactly midnight (00:00)
  const isMidnight = currentTime.getHours() === 0 && currentTime.getMinutes() === 0;

  useEffect(() => {
    if (isMidnight) {
      setIsVisible(true);
      // Hide the ghost after 10 seconds
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);

      return () => clearTimeout(hideTimer);
    } else {
      setIsVisible(false);
    }
  }, [isMidnight]);

  // Floating animation
  useEffect(() => {
    if (!isVisible) return;

    const floatInterval = setInterval(() => {
      setPosition(prev => {
        let newX = prev.x + (direction * 0.5);
        let newDirection = direction;

        // Bounce off edges
        if (newX >= 80) {
          newX = 80;
          newDirection = -1;
        } else if (newX <= 20) {
          newX = 20;
          newDirection = 1;
        }

        setDirection(newDirection);

        return {
          x: newX,
          y: prev.y + Math.sin(Date.now() * 0.002) * 0.3
        };
      });
    }, 100);

    return () => clearInterval(floatInterval);
  }, [isVisible, direction]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed pointer-events-none z-30 transition-all duration-1000"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        opacity: isVisible ? 0.8 : 0
      }}
    >
      {/* Ghost Icon with effects */}
      <div className="relative animate-pulse">
        <Ghost 
          size={64} 
          className="text-white drop-shadow-lg"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.6))'
          }}
        />
        
        {/* Spooky glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(200,200,255,0.3) 50%, transparent 70%)',
            transform: 'scale(1.5)'
          }}
        />
      </div>
      
      {/* Floating particles around ghost */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60"
            style={{
              left: `${20 + i * 10}%`,
              top: `${30 + (i % 3) * 20}%`,
              animation: `float-particle-${i} ${3 + i * 0.5}s ease-in-out infinite`
            }}
          />
        ))}
      </div>
      
      {/* CSS animations for particles */}
      <style>{`
        @keyframes float-particle-0 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-10px) rotate(180deg); opacity: 0.2; }
        }
        @keyframes float-particle-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-15px) rotate(90deg); opacity: 0.8; }
        }
        @keyframes float-particle-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-8px) rotate(270deg); opacity: 0.3; }
        }
        @keyframes float-particle-3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-12px) rotate(45deg); opacity: 0.9; }
        }
        @keyframes float-particle-4 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-18px) rotate(135deg); opacity: 0.6; }
        }
        @keyframes float-particle-5 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
          50% { transform: translateY(-6px) rotate(225deg); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default MidnightGhost;