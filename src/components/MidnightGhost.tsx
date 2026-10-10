import React, { useState, useEffect } from 'react';
import { Ghost } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type RarityTier } from '@/utils/rarityTier';
import { HitArea, type SceneInfoHandler } from './CloudLayer';

interface MidnightGhostProps {
  currentTime: Date;
  // Item 113: a tap opens its info card (item 95 pattern); the ring shows while it is open.
  onInfo?: SceneInfoHandler;
  ringOn?: boolean;
  ringTier?: RarityTier | null;
}

export const GHOST_RING = 'egg-ghost';
const GHOST_PX = 64;

const MidnightGhost: React.FC<MidnightGhostProps> = ({ currentTime, onInfo, ringOn = false, ringTier = null }) => {
  // Check if it's exactly midnight (00:00)
  const isMidnight = currentTime.getHours() === 0 && currentTime.getMinutes() === 0;

  const [isVisible, setIsVisible] = useState(isMidnight);
  const [position, setPosition] = useState({ x: 50, y: 30, direction: 1 });
  const prefersReducedMotion = usePrefersReducedMotion();
  // Item 116: a double tap opens the card; a single tap shows the ring for a moment.
  const { tap } = useDoubleTap(onInfo);

  // Visibility follows `isMidnight` directly: show as soon as it turns true, hide as
  // soon as it turns false. Adjusting state during render (rather than in an effect)
  // avoids an extra commit; the effect below only owns the 10-second auto-hide timer.
  const [prevIsMidnight, setPrevIsMidnight] = useState(isMidnight);
  if (isMidnight !== prevIsMidnight) {
    setPrevIsMidnight(isMidnight);
    setIsVisible(isMidnight);
  }

  useEffect(() => {
    if (!isMidnight) return;

    // Hide the ghost after 10 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => clearTimeout(hideTimer);
  }, [isMidnight]);

  // Floating animation
  useEffect(() => {
    // Reduced motion: keep the ghost static at its initial position, no floating.
    if (!isVisible || prefersReducedMotion) return;

    const floatInterval = setInterval(() => {
      setPosition(prev => {
        let newX = prev.x + (prev.direction * 0.5);
        let newDirection = prev.direction;

        // Bounce off edges
        if (newX >= 80) {
          newX = 80;
          newDirection = -1;
        } else if (newX <= 20) {
          newX = 20;
          newDirection = 1;
        }

        // Clamp the vertical drift to a sane band so the ghost can't wander off-screen
        const newY = Math.min(50, Math.max(10, prev.y + Math.sin(Date.now() * 0.002) * 0.3));

        return {
          x: newX,
          y: newY,
          direction: newDirection
        };
      });
    }, 100);

    return () => clearInterval(floatInterval);
  }, [isVisible, prefersReducedMotion]);

  if (!isVisible) return null;

  return (
    <div 
      data-scene-hit
      className={`fixed z-10 transition-all duration-1000 ${onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none'}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        opacity: isVisible ? 0.8 : 0
      }}
      aria-hidden={onInfo ? true : undefined}
      data-testid="midnight-ghost"
      onClick={onInfo && (event => tap({ type: 'egg', kind: 'ghost' }, { x: event.clientX, y: event.clientY }, GHOST_RING))}
    >
      {/* Ghost Icon with effects - the style book's D ghost: a soft white glow
          (ROADMAP item 15 D polish, ghostTile('d')). */}
      <div className="relative motion-safe:animate-ghost-breathe">
        <Ghost
          size={GHOST_PX}
          className="drop-shadow-lg"
          style={{
            color: 'hsl(var(--scene-glow-white))',
            filter: 'drop-shadow(0 0 20px hsl(var(--scene-glow-white) / 0.6))'
          }}
        />

        {/* Spooky glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(var(--scene-glow-white) / 0.6) 0%, hsl(var(--scene-ghost-halo) / 0.3) 50%, transparent 70%)',
            transform: 'scale(1.5)'
          }}
        />
      </div>
      
      {onInfo && <HitArea cx={GHOST_PX / 2} cy={GHOST_PX / 2} width={GHOST_PX} height={GHOST_PX} ring={ringOn} tier={ringOn ? ringTier : null} />}

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