
import React, { useEffect, useRef } from 'react';
import { type TimeOfDay } from '../utils/sunUtils';

interface NightStarsProps {
  timeOfDay: TimeOfDay;
}

const NightStars: React.FC<NightStarsProps> = ({ timeOfDay }) => {
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

    // Create stars
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      opacity: Math.random(),
    }));

    // Animate stars
    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (timeOfDay === 'night' || 
          timeOfDay === 'astronomical-twilight' || 
          timeOfDay === 'nautical-twilight') {
        stars.forEach(star => {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Twinkle effect
          star.opacity = 0.3 + (Math.sin(Date.now() * 0.001 + star.x) * 0.7);
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [timeOfDay]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};

export default NightStars;
