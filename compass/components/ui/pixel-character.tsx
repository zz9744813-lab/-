"use client";

import { useState, useCallback } from "react";

type Mood = "idle" | "happy" | "cheer" | "pout" | "wink" | "blush";

const MOOD_CONFIG: Record<Mood, { emoji: string; text: string; duration: number }> = {
  idle: { emoji: "", text: "", duration: 0 },
  happy: { emoji: "✨", text: "がんばって!", duration: 2500 },
  cheer: { emoji: "🎉", text: "すごい!", duration: 2500 },
  pout: { emoji: "💢", text: "サボらないで!", duration: 2500 },
  wink: { emoji: "💕", text: "いい感じ~", duration: 2500 },
  blush: { emoji: "🌸", text: "えへへ…", duration: 2500 },
};

/**
 * 像素风性感美女角色 — 多邻国风格可交互吉祥物
 * 支持点击/hover触发不同情绪
 */
export function PixelCharacter({ className = "" }: { className?: string }) {
  const [mood, setMood] = useState<Mood>("idle");
  const [clickCount, setClickCount] = useState(0);

  const triggerMood = useCallback((newMood: Mood) => {
    setMood(newMood);
    setTimeout(() => setMood("idle"), MOOD_CONFIG[newMood].duration);
  }, []);

  const handleClick = () => {
    const count = clickCount + 1;
    setClickCount(count);

    if (count % 5 === 0) {
      triggerMood("blush");
    } else if (count % 3 === 0) {
      triggerMood("wink");
    } else {
      const moods: Mood[] = ["happy", "cheer", "wink"];
      triggerMood(moods[Math.floor(Math.random() * moods.length)]);
    }
  };

  const handleMouseEnter = () => {
    if (mood === "idle") {
      triggerMood("happy");
    }
  };

  // 根据情绪变化眼睛和嘴巴
  const getEyes = () => {
    switch (mood) {
      case "happy": return { left: "^", right: "^" };
      case "cheer": return { left: "★", right: "★" };
      case "pout": return { left: ">", right: "<" };
      case "wink": return { left: "−", right: "●" };
      case "blush": return { left: "≧", right: "≦" };
      default: return { left: "●", right: "●" };
    }
  };

  const getMouth = () => {
    switch (mood) {
      case "happy": return "ω";
      case "cheer": return "▽";
      case "pout": return "3";
      case "wink": return "∀";
      case "blush": return "///";
      default: return "◡";
    }
  };

  const eyes = getEyes();
  const mouth = getMouth();
  const moodInfo = MOOD_CONFIG[mood];
  const isActive = mood !== "idle";

  return (
    <div
      className={`pixel-mascot group relative select-none ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      role="button"
      tabIndex={0}
      aria-label="点击互动"
    >
      {/* Speech bubble */}
      {isActive && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1 text-xs text-text-primary animate-bounce-in z-10">
          <span className="mr-1">{moodInfo.emoji}</span>
          <span>{moodInfo.text}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/10 border-b border-r border-white/20 rotate-45" />
        </div>
      )}

      {/* Character body — pixel art style */}
      <svg
        viewBox="0 0 32 48"
        width="56"
        height="84"
        className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Hair */}
        <rect x="8" y="0" width="16" height="4" fill="#2d1b69" />
        <rect x="6" y="2" width="4" height="10" fill="#2d1b69" />
        <rect x="22" y="2" width="4" height="10" fill="#2d1b69" />
        <rect x="7" y="4" width="18" height="4" fill="#3d2b7a" />
        <rect x="24" y="6" width="3" height="14" fill="#2d1b69" />
        <rect x="5" y="6" width="3" height="14" fill="#2d1b69" />

        {/* Face */}
        <rect x="8" y="6" width="16" height="14" fill="#fdd9b5" />

        {/* Blush cheeks */}
        {(mood === "blush" || mood === "happy") && (
          <>
            <rect x="8" y="13" width="3" height="2" fill="#ff9999" opacity="0.6" />
            <rect x="21" y="13" width="3" height="2" fill="#ff9999" opacity="0.6" />
          </>
        )}

        {/* Eyes */}
        <text x="11" y="13" fontSize="4" fill="#1a1a2e" textAnchor="middle" fontFamily="monospace">{eyes.left}</text>
        <text x="21" y="13" fontSize="4" fill="#1a1a2e" textAnchor="middle" fontFamily="monospace">{eyes.right}</text>

        {/* Mouth */}
        <text x="16" y="18" fontSize="3.5" fill="#e74c6f" textAnchor="middle" fontFamily="monospace">{mouth}</text>

        {/* Neck */}
        <rect x="13" y="20" width="6" height="2" fill="#fdd9b5" />

        {/* Body — crop top */}
        <rect x="9" y="22" width="14" height="4" fill="#e74c6f" />
        <rect x="8" y="22" width="2" height="3" fill="#fdd9b5" />
        <rect x="22" y="22" width="2" height="3" fill="#fdd9b5" />

        {/* Midriff */}
        <rect x="11" y="26" width="10" height="3" fill="#fdd9b5" />

        {/* Skirt */}
        <rect x="9" y="29" width="14" height="6" fill="#6c3baa" />
        <rect x="8" y="31" width="16" height="4" fill="#5a2d91" />

        {/* Legs */}
        <rect x="10" y="35" width="4" height="8" fill="#fdd9b5" />
        <rect x="18" y="35" width="4" height="8" fill="#fdd9b5" />

        {/* Shoes */}
        <rect x="9" y="43" width="5" height="3" fill="#e74c6f" />
        <rect x="18" y="43" width="5" height="3" fill="#e74c6f" />

        {/* Arms */}
        <rect
          x={mood === "cheer" ? "4" : "6"}
          y={mood === "cheer" ? "18" : "22"}
          width="3"
          height={mood === "cheer" ? "6" : "8"}
          fill="#fdd9b5"
        />
        <rect
          x={mood === "cheer" ? "25" : "23"}
          y={mood === "cheer" ? "18" : "22"}
          width="3"
          height={mood === "cheer" ? "6" : "8"}
          fill="#fdd9b5"
        />

        {/* Sparkle effects when active */}
        {isActive && (
          <>
            <rect x="2" y="4" width="2" height="2" fill="var(--accent)" opacity="0.8">
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.8s" repeatCount="indefinite" />
            </rect>
            <rect x="28" y="8" width="2" height="2" fill="var(--purple)" opacity="0.8">
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.8s" repeatCount="indefinite" />
            </rect>
            <rect x="3" y="38" width="2" height="2" fill="var(--orange)" opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1s" repeatCount="indefinite" />
            </rect>
          </>
        )}
      </svg>

      {/* Hover hint */}
      <p className="text-[10px] text-text-tertiary text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        点我~
      </p>

      <style jsx>{`
        .pixel-mascot {
          cursor: pointer;
          animation: mascot-float 3s ease-in-out infinite;
        }
        .pixel-mascot:active {
          animation: none;
        }
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: translate(-50%, 4px) scale(0.8); }
          50% { transform: translate(-50%, -2px) scale(1.05); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
