
import React, { useEffect, useState } from 'react';

interface FireworkParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Firework {
  id: number;
  x: number;
  y: number;
  particles: FireworkParticle[];
  exploded: boolean;
}

interface FireworksProps {
  trigger: boolean;
}

const Fireworks: React.FC<FireworksProps> = ({ trigger }) => {
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [animationId, setAnimationId] = useState<number | null>(null);

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];

  const createFirework = () => {
    const x = Math.random() * 100;
    const y = 30 + Math.random() * 40; // Upper part of screen
    
    const particleCount = 12 + Math.random() * 8;
    const particles: FireworkParticle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      particles.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60,
        maxLife: 60
      });
    }
    
    return {
      id: Date.now() + Math.random(),
      x,
      y,
      particles,
      exploded: true
    };
  };

  const updateFireworks = () => {
    setFireworks(prevFireworks => {
      return prevFireworks
        .map(firework => ({
          ...firework,
          particles: firework.particles
            .map(particle => ({
              ...particle,
              x: particle.x + particle.vx,
              y: particle.y + particle.vy,
              vy: particle.vy + 0.1, // gravity
              vx: particle.vx * 0.99, // air resistance
              life: particle.life - 1
            }))
            .filter(particle => particle.life > 0)
        }))
        .filter(firework => firework.particles.length > 0);
    });
  };

  useEffect(() => {
    if (trigger) {
      // Create multiple fireworks when triggered
      const newFireworks = [];
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          setFireworks(prev => [...prev, createFirework()]);
        }, i * 200);
      }
    }
  }, [trigger]);

  useEffect(() => {
    if (fireworks.length > 0) {
      const animate = () => {
        updateFireworks();
        setAnimationId(requestAnimationFrame(animate));
      };
      setAnimationId(requestAnimationFrame(animate));
    } else if (animationId) {
      cancelAnimationFrame(animationId);
      setAnimationId(null);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [fireworks.length > 0]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {fireworks.map(firework =>
        firework.particles.map(particle => (
          <div
            key={`${firework.id}-${particle.id}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: particle.color,
              opacity: particle.life / particle.maxLife,
              boxShadow: `0 0 6px ${particle.color}`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))
      )}
    </div>
  );
};

export default Fireworks;
