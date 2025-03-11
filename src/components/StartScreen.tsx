'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

interface StartScreenProps {
  onStartGame: () => void;
}

// Instructions popup component
interface InstructionsPopupProps {
  onClose: () => void;
}

// Enemy and Power-up image components
const EnemyImage: React.FC<{ type: string }> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const forceUpdateKey = useRef(0);
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    if (type === 'tank') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw Tank enemy (hexagon)
      canvas.width = 50;
      canvas.height = 50;
      
      ctx.fillStyle = '#4488ff';
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const size = 20;
      
      // Draw hexagon shape
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const xPos = centerX + size * Math.cos(angle);
        const yPos = centerY + size * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(xPos, yPos);
        } else {
          ctx.lineTo(xPos, yPos);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      // Add glow effect
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 5;
      ctx.stroke();
    } else {
      // Load the appropriate image based on enemy type
      const img = document.createElement('img');
      
      if (type === 'basic') {
        img.src = 'https://media.veefriends.com/image/upload/v1700083055/veefriends/specials/series2/characters/bad-intentions-competing-shrinkwrapped.png';
      } else if (type === 'shooter') {
        img.src = 'https://media.veefriends.com/image/upload/v1700083055/veefriends/specials/series2/characters/cynical-cat-competing-shrinkwrapped.png';
      } else if (type === 'fast') {
        img.src = 'https://media.veefriends.com/image/upload/v1700083055/veefriends/specials/series2/characters/befuddled-burglar-competing-shrinkwrapped.png';
      }
      
      img.onload = () => {
        imageRef.current = img;
        // Trigger a re-render
        forceUpdateKey.current += 1;
        forceUpdate(forceUpdateKey.current);
      };
    }
  }, [type]);
  
  // For Tank enemy, render the canvas
  if (type === 'tank') {
    return <canvas ref={canvasRef} width="50" height="50" className="mx-auto mb-2" />;
  }
  
  // For image-based enemies, render the image if loaded
  return imageRef.current ? (
    <Image 
      src={imageRef.current.src} 
      alt={`${type} enemy`} 
      className="h-16 w-16 object-contain mx-auto mb-2"
      width={64}
      height={64}
    />
  ) : (
    <div className="h-16 w-16 bg-gray-700 animate-pulse rounded-full mx-auto mb-2"></div>
  );
};

const PowerUpImage: React.FC<{ type: string }> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 40;
    canvas.height = 40;
    
    // Draw power-up based on type
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 15;
    
    ctx.save();
    
    // Base glow effect for all power-ups
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    
    if (type === 'rapid-fire') {
      // Rapid fire - Red double arrow
      ctx.fillStyle = '#ff3333';
      ctx.shadowColor = '#ff3333';
      
      // First arrow
      ctx.beginPath();
      ctx.moveTo(centerX - size, centerY - size/2);
      ctx.lineTo(centerX, centerY - size/2);
      ctx.lineTo(centerX, centerY - size);
      ctx.lineTo(centerX + size, centerY);
      ctx.lineTo(centerX, centerY + size);
      ctx.lineTo(centerX, centerY + size/2);
      ctx.lineTo(centerX - size, centerY + size/2);
      ctx.closePath();
      ctx.fill();
      
    } else if (type === 'shield') {
      // Shield - Cyan shield shape
      ctx.fillStyle = '#33ccff';
      ctx.shadowColor = '#33ccff';
      
      // Shield shape
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - size);
      ctx.lineTo(centerX + size, centerY - size/2);
      ctx.lineTo(centerX + size, centerY + size/2);
      ctx.lineTo(centerX, centerY + size);
      ctx.lineTo(centerX - size, centerY + size/2);
      ctx.lineTo(centerX - size, centerY - size/2);
      ctx.closePath();
      ctx.fill();
      
      // Inner shield detail
      ctx.beginPath();
      ctx.arc(centerX, centerY, size/2, 0, Math.PI * 2);
      ctx.fillStyle = '#88eeff';
      ctx.fill();
      
    } else if (type === 'speed') {
      // Speed - Yellow lightning bolt
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffcc00';
      
      // Lightning bolt
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - size);
      ctx.lineTo(centerX + size/2, centerY);
      ctx.lineTo(centerX, centerY);
      ctx.lineTo(centerX + size/2, centerY + size);
      ctx.lineTo(centerX - size/3, centerY + size/3);
      ctx.lineTo(centerX, centerY);
      ctx.lineTo(centerX - size/2, centerY - size/2);
      ctx.closePath();
      ctx.fill();
      
    } else if (type === 'health') {
      // Health - Pink heart
      ctx.fillStyle = '#ff3366';
      ctx.shadowColor = '#ff3366';
      
      // Heart shape
      ctx.beginPath();
      ctx.moveTo(centerX, centerY + size/2);
      
      // Left curve
      ctx.bezierCurveTo(
        centerX - size/2, centerY, 
        centerX - size, centerY - size/2, 
        centerX, centerY - size
      );
      
      // Right curve
      ctx.bezierCurveTo(
        centerX + size, centerY - size/2, 
        centerX + size/2, centerY, 
        centerX, centerY + size/2
      );
      
      ctx.closePath();
      ctx.fill();
    }
    
    // Add outer glow
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke();
    
    ctx.restore();
  }, [type]);
  
  return <canvas ref={canvasRef} width="40" height="40" className="mx-auto mb-2" />;
};

const InstructionsPopup: React.FC<InstructionsPopupProps> = ({ onClose }) => {
  // Handle clicks outside the popup to close it
  const popupRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div 
        ref={popupRef}
        className="bg-gray-900 border-2 border-pink-500 rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-white hover:text-pink-300 text-xl"
        >
          ✕
        </button>
        
        <h2 className="text-3xl font-bold text-pink-500 mb-4">How to Play Heart-Trooper</h2>
        
        <div className="space-y-6 text-white">
          <section>
            <h3 className="text-2xl font-bold text-pink-300 mb-2">Controls</h3>
            <p className="mb-2">• Move your ship with the <b>arrow keys</b> or <b>WASD</b></p>
            <p>• Fire heart bullets with the <b>spacebar</b></p>
          </section>
          
          <section>
            <h3 className="text-2xl font-bold text-pink-300 mb-2">Enemy Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <EnemyImage type="basic" />
                <h4 className="font-bold text-lg mb-1 text-orange-400">Bad Intentions</h4>
                <p className="text-center">Basic enemies that move side to side and shoot orange carrot bullets.</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <EnemyImage type="shooter" />
                <h4 className="font-bold text-lg mb-1 text-pink-400">Cynical Cat</h4>
                <p className="text-center">Shooter enemies that fire more frequently with green bullets.</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <EnemyImage type="tank" />
                <h4 className="font-bold text-lg mb-1 text-blue-500">Tank Hexagon</h4>
                <p className="text-center">Durable enemies that take multiple hits to destroy. They shrink with each hit.</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <EnemyImage type="fast" />
                <h4 className="font-bold text-lg mb-1 text-cyan-400">Befuddled Burglar</h4>
                <p className="text-center">Fast enemies that move quickly and can dodge your attacks.</p>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-2xl font-bold text-pink-300 mb-2">Power-Ups</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <PowerUpImage type="rapid-fire" />
                <h4 className="font-bold text-lg mb-1 text-red-400">Rapid Fire</h4>
                <p className="text-center">Increases your fire rate for 5 seconds, allowing you to shoot more hearts.</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <PowerUpImage type="shield" />
                <h4 className="font-bold text-lg mb-1 text-cyan-400">Shield</h4>
                <p className="text-center">Provides temporary invincibility for 5 seconds, protecting you from all damage.</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <PowerUpImage type="speed" />
                <h4 className="font-bold text-lg mb-1 text-yellow-400">Speed</h4>
                <p className="text-center">Increases movement speed by 50% for 5 seconds, helping you dodge bullets.</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                <PowerUpImage type="health" />
                <h4 className="font-bold text-lg mb-1 text-pink-400">Health</h4>
                <p className="text-center">Restores 1 health point instantly, healing your ship.</p>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-2xl font-bold text-pink-300 mb-2">Tips</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prioritize dodging enemy bullets over shooting</li>
              <li>Collect power-ups to gain an advantage</li>
              <li>Watch out for the Tank enemies - they take multiple hits!</li>
              <li>The game gets progressively harder with each level</li>
              <li>Try to save health power-ups for when you really need them</li>
            </ul>
          </section>
        </div>
        
        <div className="mt-6 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-full font-bold text-lg transition-all transform hover:scale-105"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const [isHovering, setIsHovering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [hearts, setHearts] = useState<Array<{
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
  }>>([]);
  const [showInstructions, setShowInstructions] = useState(false);

  // Use useCallback to memoize the animate function
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw and animate hearts
    setHearts(prevHearts => 
      prevHearts.map(heart => {
        // Move heart up
        heart.y -= heart.speed;
        
        // If heart goes off top of screen, reset to bottom
        if (heart.y < -heart.size) {
          heart.y = window.innerHeight + heart.size;
          heart.x = Math.random() * window.innerWidth;
        }
        
        // Draw heart
        drawHeart(heart.x, heart.y, heart.size, heart.opacity);
        
        return heart;
      })
    );
    
    // Continue animation loop
    animationRef.current = requestAnimationFrame(animate);
  }, []);
  
  // Update useEffect dependencies
  useEffect(() => {
    // Generate initial hearts
    const initialHearts = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 5 + Math.random() * 20,
      speed: 0.5 + Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.3
    }));
    
    setHearts(initialHearts);
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]); // Include animate in dependencies

  const drawHeart = (x: number, y: number, size: number, opacity: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    ctx.save();
    
    // Set fill style with opacity
    ctx.fillStyle = `rgba(255, 51, 102, ${opacity})`;
    
    // Draw heart
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    
    // Left curve
    ctx.bezierCurveTo(
      x - size / 2, y - size / 2,   // Control point 1
      x - size, y,                  // Control point 2
      x, y + size                   // End point
    );
    
    // Right curve
    ctx.bezierCurveTo(
      x + size, y,                  // Control point 1
      x + size / 2, y - size / 2,   // Control point 2
      x, y + size / 4               // End point
    );
    
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background canvas for floating hearts */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full -z-10"
      />
      
      {/* Game title */}
      <h1 className="text-6xl font-bold text-pink-500 mb-2 text-center animate-pulse" 
          style={{ textShadow: '0 0 10px #ff3366' }}>
        Heart-Trooper
      </h1>
      
      {/* Subtitle */}
      <p className="text-2xl text-white mb-12 text-center italic">
        love&apos;s sharp shooter
      </p>
      
      {/* Play button */}
      <button
        onClick={onStartGame}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="group relative bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-12 rounded-full text-xl mb-8 transition-all transform hover:scale-110"
        style={{ 
          boxShadow: isHovering ? '0 0 20px #ff3366' : '0 0 10px #ff3366',
          transition: 'all 0.3s ease'
        }}
      >
        <div className="flex items-center">
          {/* Heart icon */}
          <span className="mr-3 inline-block transform group-hover:scale-125 transition-transform">
            ❤️
          </span>
          Play
        </div>
      </button>
      
      {/* Instructions button */}
      <button
        onClick={() => setShowInstructions(true)}
        className="bg-transparent hover:bg-pink-900 text-pink-300 border border-pink-500 font-bold py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105"
      >
        Instructions
      </button>
      
      {/* Instructions popup */}
      {showInstructions && (
        <InstructionsPopup onClose={() => setShowInstructions(false)} />
      )}
    </div>
  );
};

export default StartScreen; 