import React, { useEffect, useState } from 'react';

interface TemperatureIcebergProps {
  temperature: number;
  isVisible: boolean;
}

const TemperatureIceberg: React.FC<TemperatureIcebergProps> = ({ temperature, isVisible }) => {
  const [position, setPosition] = useState({ x: -10, y: 75 }); // Start off-screen left
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!isVisible || temperature >= 0) {
      // Reset position when not visible
      setPosition({ x: -10, y: 75 });
      setDirection(1);
      return;
    }

    // Floating animation - slower than ships
    const floatInterval = setInterval(() => {
      setPosition(prev => {
        let newX = prev.x + (direction * 0.02); // Much slower than ships (0.04)
        let newDirection = direction;

        // Bounce off edges (with margins for the iceberg size)
        if (newX >= 85) {
          newX = 85;
          newDirection = -1;
        } else if (newX <= -10) {
          newX = -10;
          newDirection = 1;
        }

        setDirection(newDirection);

        return {
          x: newX,
          y: prev.y + Math.sin(Date.now() * 0.001) * 0.2 // Gentle vertical float
        };
      });
    }, 100);

    return () => clearInterval(floatInterval);
  }, [isVisible, temperature, direction]);

  if (!isVisible || temperature >= 0) {
    return null;
  }

  return (
    <div 
      className="absolute pointer-events-none z-20 transition-all duration-1000"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        opacity: isVisible ? 0.9 : 0
      }}
    >
      {/* Iceberg SVG */}
      <div className="relative">
        <svg
          width="80"
          height="80"
          viewBox="0 0 463 463"
          className="drop-shadow-lg transition-colors duration-1000"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(200, 230, 255, 0.6))'
          }}
        >
          <g>
            <path 
              d="m455.5,348h-18.275l-46.544-154.661c-0.438-1.457-1.309-2.745-2.496-3.695l-39.772-31.817-21.559-107.798c-0.594-2.969-2.915-5.29-5.884-5.884l-40-8c-2.169-0.433-4.424,0.114-6.156,1.498l-38.303,30.642-69.84,7.76c-3.04,0.338-5.569,2.487-6.395,5.432l-27.758,99.137-39.804,15.922c-1.97,0.788-3.514,2.373-4.25,4.363l-54.373,147.101h-26.591c-4.143,0-7.5,3.358-7.5,7.5s3.357,7.5 7.5,7.5h448c4.143,0 7.5-3.358 7.5-7.5s-3.357-7.5-7.5-7.5zm-354.12-138.774l26.045-10.418-23.148,82.67c-1.116,3.988 1.212,8.127 5.2,9.244 3.995,1.12 8.129-1.212 9.245-5.2l54.635-195.126 60.137-6.682 30.358,151.786-7.706,38.529c-0.285,1.426-0.149,2.905 0.391,4.256l16,40c1.173,2.932 3.989,4.716 6.966,4.716 0.928,0 1.87-0.173 2.783-0.539 3.846-1.538 5.717-5.903 4.179-9.749l-15.172-37.93 7.563-37.814c0.194-0.971 0.194-1.971 0-2.941l-31.106-155.523 26.713-21.371 20.528,107.772c0.685,3.595 3.829,6.098 7.358,6.098 0.466,0 0.938-0.043 1.412-0.134 4.069-0.775 6.739-4.702 5.964-8.771l-20.774-109.061 24.175,4.835 47.02,235.097c0.713,3.565 3.845,6.031 7.347,6.031 0.487,0 0.982-0.048 1.479-0.147 4.062-0.813 6.696-4.764 5.884-8.825l-21.867-109.334 24.004,19.203 44.568,148.102h-371.477l51.296-138.774z" 
              fill="rgba(200, 230, 255, 0.9)"
              stroke="rgba(150, 200, 240, 0.8)"
              strokeWidth="2"
            />
            <path 
              d="m311.5,380h-144c-4.143,0-7.5,3.358-7.5,7.5s3.357,7.5 7.5,7.5h144c4.143,0 7.5-3.358 7.5-7.5s-3.357-7.5-7.5-7.5z" 
              fill="rgba(180, 220, 255, 0.8)"
            />
            <path 
              d="m135.5,380h-64c-4.143,0-7.5,3.358-7.5,7.5s3.357,7.5 7.5,7.5h64c4.143,0 7.5-3.358 7.5-7.5s-3.357-7.5-7.5-7.5z" 
              fill="rgba(180, 220, 255, 0.8)"
            />
            <path 
              d="m359.5,380h-16c-4.143,0-7.5,3.358-7.5,7.5s3.357,7.5 7.5,7.5h16c4.143,0 7.5-3.358 7.5-7.5s-3.357-7.5-7.5-7.5z" 
              fill="rgba(180, 220, 255, 0.8)"
            />
            <path 
              d="m295.5,412h-79.998c-4.143,0-7.5,3.358-7.5,7.5s3.357,7.5 7.5,7.5h79.998c4.143,0 7.5-3.358 7.5-7.5s-3.357-7.5-7.5-7.5z" 
              fill="rgba(180, 220, 255, 0.8)"
            />
            <path 
              d="m183.501,412h-16.001c-4.143,0-7.5,3.358-7.5,7.5s3.357,7.5 7.5,7.5h16.001c4.143,0 7.5-3.358 7.5-7.5s-3.357-7.5-7.5-7.5z" 
              fill="rgba(180, 220, 255, 0.8)"
            />
            <path 
              d="m315.819,194.097c-0.774-4.07-4.708-6.738-8.771-5.964-4.069,0.775-6.739,4.702-5.964,8.771l3.048,15.999c0.685,3.595 3.829,6.098 7.358,6.098 0.466,0 0.938-0.043 1.412-0.134 4.069-0.775 6.739-4.702 5.964-8.771l-3.047-15.999z" 
              fill="rgba(220, 240, 255, 0.9)"
            />
            <path 
              d="m200.431,124.058c-4.117-0.516-7.859,2.401-8.373,6.512l-18,144.001c-0.514,4.11 2.402,7.858 6.512,8.372 0.316,0.04 0.63,0.059 0.94,0.059 3.727,0 6.958-2.776 7.433-6.571l18-144.001c0.513-4.11-2.403-7.859-6.512-8.372z" 
              fill="rgba(220, 240, 255, 0.9)"
            />
            <path 
              d="m178.431,300.059c-4.118-0.516-7.859,2.401-8.373,6.512l-2,15.999c-0.514,4.11 2.402,7.858 6.512,8.372 0.316,0.04 0.63,0.059 0.94,0.059 3.727,0 6.958-2.776 7.433-6.571l2-15.999c0.513-4.109-2.403-7.858-6.512-8.372z" 
              fill="rgba(220, 240, 255, 0.9)"
            />
          </g>
        </svg>
        
        {/* Temperature indicator */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-900 bg-opacity-80 text-white px-2 py-1 rounded text-xs font-bold">
          {temperature}°C
        </div>
        
        {/* Floating ice particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
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
      `}</style>
    </div>
  );
};

export default TemperatureIceberg;