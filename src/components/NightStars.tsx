
import React, { useEffect, useRef } from 'react';
import { type TimeOfDay } from '../utils/sunUtils';
import { type MoonPosition } from '../utils/moonUtils';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { type WeatherType } from './CloudLayer';
import { getStarCloudFactor, getTwilightStars } from '../utils/weatherEffectsUtils';

interface NightStarsProps {
  timeOfDay: TimeOfDay;
  moonPosition?: MoonPosition;
  weatherType?: WeatherType;
  cloudCoverPercent?: number | null;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  brightness: number;
}

const createStars = (width: number, height: number): Star[] =>
  Array.from({ length: 300 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height * 0.7, // Keep stars in upper part of sky
    size: Math.random() * 3 + 0.5,
    baseOpacity: Math.random() * 0.8 + 0.2,
    twinkleSpeed: Math.random() * 0.002 + 0.001,
    brightness: Math.random(),
  }));

const NightStars: React.FC<NightStarsProps> = ({ timeOfDay, moonPosition, weatherType = 'clear', cloudCoverPercent = null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const moonBrightnessRef = useRef(moonPosition?.illumination || 0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const cloudFactor = getStarCloudFactor(weatherType, cloudCoverPercent);

  // Keep the latest moon brightness in a ref so the animation effect below
  // doesn't need to depend on the moonPosition object (a new object every
  // update, which would otherwise restart the loop every ~30s).
  useEffect(() => {
    moonBrightnessRef.current = moonPosition?.illumination || 0;
  }, [moonPosition?.illumination]);

  // Create the stars once; only regenerate them when the canvas is resized.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = createStars(canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Twilight shows only the brightest share of the stars, dimmer; clouds dim them all.
    const twilight = getTwilightStars(timeOfDay);
    const skyFactor = twilight.opacity * cloudFactor;
    const isShown = (star: Star) => star.brightness >= 1 - twilight.share;

    if (skyFactor <= 0) {
      // Day or a covered sky: clear once and don't keep an animation loop running.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (prefersReducedMotion) {
      // Draw stars once at a fixed brightness: no twinkle, no shooting stars, no rAF loop.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const moonBrightness = moonBrightnessRef.current;
      const starVisibilityFactor = 1 - (moonBrightness * 0.3);
      starsRef.current.filter(isShown).forEach(star => {
        const opacity = star.baseOpacity * starVisibilityFactor * skyFactor;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      return;
    }

    // Shooting stars occasionally appear
    let shootingStars: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }> = [];

    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = Date.now();

      // Calculate star visibility based on moon brightness
      const moonBrightness = moonBrightnessRef.current;
      const starVisibilityFactor = 1 - (moonBrightness * 0.3); // Moon reduces star visibility

      // Draw regular stars
      starsRef.current.filter(isShown).forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.x) * 0.5 + 0.5;
        const opacity = star.baseOpacity * twinkle * starVisibilityFactor * skyFactor;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.shadowBlur = star.brightness > 0.8 ? 4 : 0;
        ctx.shadowColor = 'white';
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Occasionally create shooting stars (full night only, not in twilight)
      if (timeOfDay === 'night' && Math.random() < 0.001) {
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

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [timeOfDay, cloudFactor, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};

export default NightStars;
