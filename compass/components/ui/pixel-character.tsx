"use client";

import { useEffect, useState } from "react";

/**
 * 像素风格动画小人 — 8-bit RPG 风格
 * 会做简单的走路/跳跃动画
 */
export function PixelCharacter({ className = "" }: { className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // 像素小人的不同帧（走路动画）
  const frames = [
    // Frame 0: 站立
    `
      ██████
      █░░░░█
      █●░●░█
      █░░░░█
      █░▬▬░█
      ██████
       ████
      ██████
      █░░░░█
      █░░░░█
      ██████
       █  █
       █  █
      ██  ██
    `,
    // Frame 1: 左脚
    `
      ██████
      █░░░░█
      █●░●░█
      █░░░░█
      █░▬▬░█
      ██████
       ████
      ██████
      █░░░░█
      █░░░░█
      ██████
      ██  █
       █  █
      ██  ██
    `,
    // Frame 2: 站立（微抬）
    `
      ██████
      █░░░░█
      █●░●░█
      █░░░░█
      █░▬▬░█
      ██████
       ████
      ██████
      █░░░░█
      █░░░░█
      ██████
       █  █
       █  █
      ██  ██
    `,
    // Frame 3: 右脚
    `
      ██████
      █░░░░█
      █●░●░█
      █░░░░█
      █░▬▬░█
      ██████
       ████
      ██████
      █░░░░█
      █░░░░█
      ██████
       █  ██
       █  █
      ██  ██
    `,
  ];

  return (
    <div className={`pixel-character ${className}`}>
      <svg viewBox="0 0 16 24" width="48" height="72" className="crisp-edges">
        {/* Head */}
        <rect x="4" y="0" width="8" height="8" fill="var(--purple)" opacity="0.9" />
        {/* Eyes */}
        <rect x="5" y="2" width="2" height="2" fill="var(--text-primary)" />
        <rect x="9" y="2" width="2" height="2" fill="var(--text-primary)" />
        {/* Mouth */}
        <rect x="6" y="5" width="4" height="1" fill="var(--accent)" />
        {/* Body */}
        <rect x="3" y="8" width="10" height="8" fill="var(--blue)" opacity="0.9" />
        {/* Arms */}
        <rect
          x={frame === 1 ? "1" : "2"}
          y="9"
          width="2"
          height="5"
          fill="var(--purple)"
          opacity="0.7"
        />
        <rect
          x={frame === 3 ? "13" : "12"}
          y="9"
          width="2"
          height="5"
          fill="var(--purple)"
          opacity="0.7"
        />
        {/* Legs */}
        <rect
          x="5"
          y="16"
          width="3"
          height={frame === 1 ? "7" : "8"}
          fill="var(--green)"
          opacity="0.8"
        />
        <rect
          x="9"
          y="16"
          width="3"
          height={frame === 3 ? "7" : "8"}
          fill="var(--green)"
          opacity="0.8"
        />
        {/* Shoes */}
        <rect x="4" y={frame === 1 ? "22" : "23"} width="4" height="1" fill="var(--orange)" />
        <rect x="9" y={frame === 3 ? "22" : "23"} width="4" height="1" fill="var(--orange)" />
      </svg>
      <style jsx>{`
        .pixel-character svg {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
        .pixel-character {
          animation: pixel-bounce 1.6s ease-in-out infinite;
        }
        @keyframes pixel-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
