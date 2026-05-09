"use client";

import { useState, useCallback } from "react";

type Mood = "idle" | "happy" | "cheer" | "wink" | "blush";

const MOOD_CONFIG: Record<Mood, { emoji: string; text: string; duration: number }> = {
  idle: { emoji: "", text: "", duration: 0 },
  happy: { emoji: "✨", text: "がんばって!", duration: 2500 },
  cheer: { emoji: "🎉", text: "すごい!", duration: 2500 },
  wink: { emoji: "💕", text: "いい感じ~", duration: 2500 },
  blush: { emoji: "🌸", text: "えへへ…", duration: 2500 },
};

/**
 * 娜美风格像素美女 — 橘发大眼 + 性感身材
 * 多邻国式可交互吉祥物
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
    if (mood === "idle") triggerMood("happy");
  };

  const moodInfo = MOOD_CONFIG[mood];
  const isActive = mood !== "idle";

  // 娜美风：大眼、橘色长发、比基尼上衣、牛仔短裤、长腿
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

      <svg
        viewBox="0 0 32 56"
        width="56"
        height="98"
        className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
        style={{ imageRendering: "pixelated" }}
      >
        {/* === HAIR (orange, long, flowing) === */}
        <rect x="9" y="0" width="14" height="3" fill="#FF6B00" />
        <rect x="7" y="2" width="18" height="3" fill="#FF8C00" />
        <rect x="6" y="4" width="20" height="4" fill="#FF6B00" />
        {/* Side hair flowing down */}
        <rect x="5" y="5" width="3" height="18" fill="#FF8C00" />
        <rect x="24" y="5" width="3" height="18" fill="#FF8C00" />
        <rect x="4" y="10" width="2" height="12" fill="#FF6B00" />
        <rect x="26" y="10" width="2" height="12" fill="#FF6B00" />
        {/* Hair bangs */}
        <rect x="9" y="5" width="4" height="3" fill="#FF8C00" />
        <rect x="19" y="5" width="4" height="3" fill="#FF8C00" />

        {/* === FACE === */}
        <rect x="9" y="7" width="14" height="12" fill="#FFE0BD" />

        {/* Big eyes — anime style */}
        {mood === "wink" ? (
          <>
            {/* Left eye winking */}
            <rect x="11" y="11" width="4" height="1" fill="#2d1b00" />
            {/* Right eye open */}
            <rect x="19" y="10" width="4" height="4" fill="#FFFFFF" />
            <rect x="20" y="11" width="2" height="2" fill="#4A2800" />
            <rect x="20" y="11" width="1" height="1" fill="#FFFFFF" />
          </>
        ) : mood === "happy" || mood === "cheer" ? (
          <>
            {/* Happy closed eyes ^ ^ */}
            <rect x="11" y="12" width="4" height="1" fill="#2d1b00" />
            <rect x="12" y="11" width="2" height="1" fill="#2d1b00" />
            <rect x="19" y="12" width="4" height="1" fill="#2d1b00" />
            <rect x="20" y="11" width="2" height="1" fill="#2d1b00" />
          </>
        ) : mood === "blush" ? (
          <>
            {/* Shy eyes */}
            <rect x="11" y="11" width="4" height="2" fill="#4A2800" />
            <rect x="12" y="11" width="1" height="1" fill="#FFFFFF" />
            <rect x="19" y="11" width="4" height="2" fill="#4A2800" />
            <rect x="20" y="11" width="1" height="1" fill="#FFFFFF" />
          </>
        ) : (
          <>
            {/* Normal big eyes */}
            <rect x="10" y="10" width="5" height="4" fill="#FFFFFF" />
            <rect x="11" y="11" width="3" height="2" fill="#4A2800" />
            <rect x="12" y="11" width="1" height="1" fill="#FFFFFF" />
            <rect x="19" y="10" width="5" height="4" fill="#FFFFFF" />
            <rect x="20" y="11" width="3" height="2" fill="#4A2800" />
            <rect x="21" y="11" width="1" height="1" fill="#FFFFFF" />
          </>
        )}

        {/* Blush cheeks */}
        {(mood === "blush" || mood === "happy") && (
          <>
            <rect x="9" y="14" width="3" height="2" fill="#FF9999" opacity="0.5" />
            <rect x="20" y="14" width="3" height="2" fill="#FF9999" opacity="0.5" />
          </>
        )}

        {/* Mouth */}
        {mood === "happy" || mood === "cheer" ? (
          <rect x="14" y="16" width="4" height="2" fill="#FF6B8A" rx="1" />
        ) : mood === "blush" ? (
          <>
            <rect x="14" y="16" width="4" height="1" fill="#FF6B8A" />
            <rect x="15" y="17" width="2" height="1" fill="#FF6B8A" />
          </>
        ) : (
          <rect x="14" y="16" width="4" height="1" fill="#FF6B8A" />
        )}

        {/* === NECK === */}
        <rect x="14" y="19" width="4" height="2" fill="#FFE0BD" />

        {/* === BODY — Bikini top (blue striped like Nami) === */}
        <rect x="10" y="21" width="12" height="5" fill="#FFE0BD" />
        <rect x="11" y="21" width="4" height="4" fill="#2196F3" />
        <rect x="17" y="21" width="4" height="4" fill="#2196F3" />
        <rect x="11" y="22" width="4" height="1" fill="#1565C0" />
        <rect x="17" y="22" width="4" height="1" fill="#1565C0" />
        {/* Strap */}
        <rect x="14" y="20" width="1" height="2" fill="#2196F3" />
        <rect x="17" y="20" width="1" height="2" fill="#2196F3" />

        {/* === WAIST (slim) === */}
        <rect x="12" y="26" width="8" height="3" fill="#FFE0BD" />
        {/* Navel */}
        <rect x="15" y="27" width="2" height="1" fill="#EDCBA0" />

        {/* === SHORTS (denim) === */}
        <rect x="10" y="29" width="12" height="5" fill="#1565C0" />
        <rect x="10" y="29" width="12" height="1" fill="#0D47A1" />
        {/* Belt */}
        <rect x="10" y="29" width="12" height="1" fill="#795548" />
        <rect x="15" y="29" width="2" height="1" fill="#FFD700" />

        {/* === LEGS (long, slim) === */}
        <rect x="11" y="34" width="4" height="12" fill="#FFE0BD" />
        <rect x="17" y="34" width="4" height="12" fill="#FFE0BD" />

        {/* === SANDALS === */}
        <rect x="10" y="46" width="5" height="2" fill="#FF6B00" />
        <rect x="17" y="46" width="5" height="2" fill="#FF6B00" />
        <rect x="12" y="45" width="1" height="1" fill="#FF8C00" />
        <rect x="19" y="45" width="1" height="1" fill="#FF8C00" />

        {/* === ARMS === */}
        {mood === "cheer" ? (
          <>
            {/* Arms raised */}
            <rect x="6" y="16" width="3" height="8" fill="#FFE0BD" />
            <rect x="23" y="16" width="3" height="8" fill="#FFE0BD" />
            {/* Hands */}
            <rect x="6" y="14" width="3" height="3" fill="#FFE0BD" />
            <rect x="23" y="14" width="3" height="3" fill="#FFE0BD" />
          </>
        ) : mood === "wink" ? (
          <>
            {/* One hand on hip, one waving */}
            <rect x="7" y="22" width="3" height="7" fill="#FFE0BD" />
            <rect x="23" y="18" width="3" height="6" fill="#FFE0BD" />
            <rect x="23" y="16" width="3" height="3" fill="#FFE0BD" />
          </>
        ) : (
          <>
            {/* Relaxed arms */}
            <rect x="7" y="22" width="3" height="9" fill="#FFE0BD" />
            <rect x="22" y="22" width="3" height="9" fill="#FFE0BD" />
          </>
        )}

        {/* Sparkles when active */}
        {isActive && (
          <>
            <rect x="1" y="3" width="2" height="2" fill="#FFD700" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.7s" repeatCount="indefinite" />
            </rect>
            <rect x="28" y="6" width="2" height="2" fill="#FF69B4" opacity="0.8">
              <animate attributeName="opacity" values="0.2;0.9;0.2" dur="0.8s" repeatCount="indefinite" />
            </rect>
            <rect x="2" y="40" width="2" height="2" fill="#00BCD4" opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1s" repeatCount="indefinite" />
            </rect>
            <rect x="29" y="35" width="2" height="2" fill="#FFD700" opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.9s" repeatCount="indefinite" />
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
