
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
    const y = 20 + Math.random() * 30; // Higher in the sky
    
    const particleCount = 30 + Math.random() * 20; // More particles
    const particles: FireworkParticle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 4 + Math.random() * 5; // Faster initial speed
      
      particles.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 400 + Math.random() * 200, // 6-10 seconds at 60fps
        maxLife: 400 + Math.random() * 200
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
              vy: particle.vy + 0.08, // Reduced gravity for slower fall
              vx: particle.vx * 0.995, // Less air resistance
              life: particle.life - 1
            }))
            .filter(particle => particle.life > 0)
        }))
        .filter(firework => firework.particles.length > 0);
    });
  };

  useEffect(() => {
    if (trigger) {
      // Create more fireworks when triggered - spread them out over time
      for (let i = 0; i < 8; i++) { // More fireworks
        setTimeout(() => {
          setFireworks(prev => [...prev, createFirework()]);
        }, i * 300); // Longer delays between fireworks
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
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: particle.color,
              opacity: Math.min(1, particle.life / particle.maxLife * 1.2), // Brighter particles
              boxShadow: `0 0 25px ${particle.color}, 0 0 50px ${particle.color}, 0 0 75px ${particle.color}`, // Much stronger glow
              transform: 'translate(-50%, -50%)',
              width: '6px', // Larger particles
              height: '6px'
            }}
          />
        ))
      )}
    </div>
  );
};

export default Fireworks;
