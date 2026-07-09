import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  type?: "waves" | "pulse" | "filament" | "neuron";
  size?: number;
  framed?: boolean;
  frameBg?: "dark" | "blue" | "light"; // Background color inside the rounded frame
  orientation?: "horizontal" | "vertical"; // Orientation of the elements inside the logo
  thickness?: number; // Thickness level from 1 to 10 (default: 5)
}

export const Logo: React.FC<LogoProps> = ({ 
  type = "waves", 
  size = 48, 
  framed = true, 
  frameBg = "dark", 
  orientation = "horizontal",
  thickness = 5,
  ...props 
}) => {
  const renderLogoContent = () => {
    const strokeWidth = 2 + thickness;

    if (type === "pulse") {
      // Improved Pulse (ECG): Neon light tube effect + drop shadow + glowing light flare at peak
      const coreStroke = strokeWidth * 0.35;
      const shadowStroke = strokeWidth + 2;
      
      return (
        <>
          {/* 1. Subtle 3D Drop Shadow */}
          <path
            d="M 15,50 C 30,50 32,50 36,50 C 41,50 43,20 47,20 C 51,20 54,80 58,80 C 62,80 64,42 68,42 C 72,42 75,50 85,50"
            fill="none"
            stroke={frameBg === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(0, 0, 0, 0.3)"}
            strokeWidth={shadowStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logo-shadow-pulse)"
          />
          
          {/* 2. Outer Glow Layer */}
          <path
            d="M 15,50 C 30,50 32,50 36,50 C 41,50 43,20 47,20 C 51,20 54,80 58,80 C 62,80 64,42 68,42 C 72,42 75,50 85,50"
            fill="none"
            stroke="url(#logo-pulse-grad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logo-glow-pulse)"
            opacity="0.75"
          />

          {/* 3. Inner White Core (Neon Tube Light Effect) */}
          <path
            d="M 15,50 C 30,50 32,50 36,50 C 41,50 43,20 47,20 C 51,20 54,80 58,80 C 62,80 64,42 68,42 C 72,42 75,50 85,50"
            fill="none"
            stroke="#ffffff"
            strokeWidth={coreStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />

          {/* 4. Glowing 4-Point Light Sparkle (Destello) at the highest peak */}
          <path
            d="M 47,13 Q 47,20 40,20 Q 47,20 47,27 Q 47,20 54,20 Q 47,20 47,13 Z"
            fill="#ffffff"
            filter="url(#logo-glow-pulse)"
          />
          <path
            d="M 47,15 Q 47,20 42,20 Q 47,20 47,25 Q 47,20 52,20 Q 47,20 47,15 Z"
            fill="#e0f2fe"
          />
        </>
      );
    }

    if (type === "filament") {
      // Filament: Glowing lightbulb filament shape (tungsten wire)
      // Combines Light (Llum) and Loop/Sync (Sync)
      const coreStroke = strokeWidth * 0.35;
      const shadowStroke = strokeWidth + 2;
      const filamentPath = "M 35,75 L 35,48 C 35,26 42,22 46,34 C 48,42 52,42 54,34 C 58,22 65,26 65,48 L 65,75";

      return (
        <>
          {/* 1. Subtle 3D Drop Shadow */}
          <path
            d={filamentPath}
            fill="none"
            stroke={frameBg === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(0, 0, 0, 0.3)"}
            strokeWidth={shadowStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logo-shadow-pulse)"
          />

          {/* 2. Outer Glow Layer */}
          <path
            d={filamentPath}
            fill="none"
            stroke="url(#logo-pulse-grad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logo-glow-pulse)"
            opacity="0.75"
          />

          {/* 3. Inner White Core (Glowing Hot Filament Effect) */}
          <path
            d={filamentPath}
            fill="none"
            stroke="#ffffff"
            strokeWidth={coreStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />

          {/* 4. Glowing 4-Point Light Sparkle at the center peak */}
          <path
            d="M 50,27 Q 50,34 43,34 Q 50,34 50,41 Q 50,34 57,34 Q 50,34 50,27 Z"
            fill="#ffffff"
            filter="url(#logo-glow-pulse)"
          />
          <path
            d="M 50,29 Q 50,34 45,34 Q 50,34 50,39 Q 50,34 55,34 Q 50,34 50,29 Z"
            fill="#e0f2fe"
          />
        </>
      );
    }

    if (type === "neuron") {
      // Claude Code Asterisk style re-imagined as a Light Destello
      const rayStroke = 2 + (thickness * 0.7);
      const coreRadius = 4 + (thickness * 0.8);
      
      const rays = [
        { x2: 50, y2: 14, grad: "1" },
        { x2: 64, y2: 20, grad: "2" },
        { x2: 79, y2: 26, grad: "1" },
        { x2: 81, y2: 42, grad: "2" },
        { x2: 86, y2: 56, grad: "1" },
        { x2: 78, y2: 69, grad: "2" },
        { x2: 69, y2: 83, grad: "1" },
        { x2: 50, y2: 85, grad: "2" },
        { x2: 31, y2: 83, grad: "1" },
        { x2: 23, y2: 69, grad: "2" },
        { x2: 13, y2: 53, grad: "1" },
        { x2: 19, y2: 36, grad: "2" },
        { x2: 28, y2: 19, grad: "1" },
        { x2: 44, y2: 18, grad: "2" }
      ];

      return (
        <>
          {/* Radiating Light Beams (Spokes) */}
          {rays.map((ray, i) => (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={ray.x2}
              y2={ray.y2}
              stroke={`url(#logo-wave-grad-${ray.grad})`}
              strokeWidth={rayStroke}
              strokeLinecap="round"
              filter="url(#logo-glow-waves)"
            />
          ))}

          {/* Central Glowing Core (Nucleus) */}
          <circle
            cx="50"
            cy="50"
            r={coreRadius}
            fill="url(#logo-pulse-grad)"
            filter="url(#logo-glow-pulse)"
          />
        </>
      );
    }

    // Default: waves (exact match of the original logo curves, Y-scaled)
    const waveScaleY = 0.4 + (thickness * 0.12);
    const transformScaleY = `translate(0, 50) scale(1, ${waveScaleY}) translate(0, -50)`;

    return (
      <g transform={transformScaleY}>
        {/* Top Wave */}
        <path
          d="M 15,38 C 32,22 48,22 65,33 C 78,42 90,42 99,35 C 88,48 72,48 60,36 C 48,28 32,28 15,38 Z"
          fill="url(#logo-wave-grad-1)"
          filter="url(#logo-glow-waves)"
        />
        {/* Bottom Wave */}
        <path
          d="M 15,64 C 32,48 48,48 65,59 C 78,68 90,68 99,61 C 88,74 72,74 60,62 C 48,54 32,54 15,64 Z"
          fill="url(#logo-wave-grad-2)"
          filter="url(#logo-glow-waves)"
        />
      </g>
    );
  };

  const transformRotation = orientation === "vertical" ? "rotate(90, 50, 50)" : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: "inline-block", verticalAlign: "middle", overflow: "visible" }}
      {...props}
    >
      <defs>
        {/* BACKGROUND GRADIENT OPTION 1: Dark / Negro */}
        <linearGradient id="logo-bg-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="30%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>

        {/* BACKGROUND GRADIENT OPTION 2: Blue / Azul */}
        <linearGradient id="logo-bg-blue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="40%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* BACKGROUND GRADIENT OPTION 3: Light / Blanco */}
        <linearGradient id="logo-bg-light" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>

        {/* Waves gradients */}
        <linearGradient id="logo-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="logo-wave-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>

        {/* Pulse gradient */}
        <linearGradient id="logo-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Glow Filters */}
        <filter id="logo-glow-waves" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="logo-glow-pulse" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Soft Drop Shadow Filter for 3D depth */}
        <filter id="logo-shadow-pulse" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.05   0 0 0 0 0.09   0 0 0 0 0.16  0 0 0 0.12 0" />
          <feOffset dx="0" dy="2.5" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {framed ? (
        <>
          {/* iOS-style squircle background */}
          <rect 
            x="2" 
            y="2" 
            width="96" 
            height="96" 
            rx="22" 
            fill={`url(#logo-bg-${frameBg})`} 
            stroke={frameBg === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"} 
            strokeWidth="1.2" 
          />
          {/* Subtle inner top light reflection for glass/3D look */}
          <rect 
            x="3" 
            y="3" 
            width="94" 
            height="47" 
            rx="20" 
            fill={frameBg === "light" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.02)"} 
            style={{ pointerEvents: "none" }}
          />
          {/* Centered logo inside the frame with optional rotation */}
          <g transform="translate(13.5, 13.5) scale(0.73)">
            <g transform={transformRotation}>
              {renderLogoContent()}
            </g>
          </g>
        </>
      ) : (
        <g transform={transformRotation}>
          {renderLogoContent()}
        </g>
      )}
    </svg>
  );
};
