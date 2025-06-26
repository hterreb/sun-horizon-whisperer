
import React, { useEffect, useRef } from 'react';
import { type TimeOfDay } from '../utils/sunUtils';
import { type MoonPosition } from '../utils/moonUtils';

interface NightStarsProps {
  timeOfDay: TimeOfDay;
  moonPosition?: MoonPosition;
}

const NightStars: React.FC<NightStarsProps> = ({ timeOfDay, moonPosition }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars with more variety
    const stars = Array.from({ length: 300 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7, // Keep stars in upper part of sky
      size: Math.random() * 3 + 0.5,
      baseOpacity: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.002 + 0.001,
      brightness: Math.random(),
    }));

    // Create shooting stars occasionally
    let shootingStars: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }> = [];

    // Animate stars
    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const isNightTime = timeOfDay === 'night' || 
                         timeOfDay === 'astronomical-twilight' || 
                         timeOfDay === 'nautical-twilight';
      
      if (isNightTime) {
        const time = Date.now();
        
        // Calculate star visibility based on moon brightness
        const moonBrightness = moonPosition?.illumination || 0;
        const starVisibilityFactor = 1 - (moonBrightness * 0.3); // Moon reduces star visibility
        
        // Draw regular stars
        stars.forEach(star => {
          const twinkle = Math.sin(time * star.twinkleSpeed + star.x) * 0.5 + 0.5;
          const opacity = (star.baseOpacity * twinkle * starVisibilityFactor) * 
                         (timeOfDay === 'night' ? 1 : 0.6);
          
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.shadowBlur = star.brightness > 0.8 ? 4 : 0;
          ctx.shadowColor = 'white';
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // Occasionally create shooting stars
        if (Math.random() < 0.001) {
          shootingStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.3,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 3 + 2,
            life: 0,
            maxLife: 30 + Math.random() * 20
          });
        }

        // Draw and update shooting stars
        shootingStars = shootingStars.filter(star => {
          star.x += star.vx;
          star.y += star.vy;
          star.life++;

          const opacity = 1 - (star.life / star.maxLife);
          
          if (opacity > 0) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 200, ${opacity})`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(star.x - star.vx * 3, star.y - star.vy * 3);
            ctx.stroke();
            
            return true;
          }
          return false;
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [timeOfDay, moonPosition]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};

export default NightStars;
