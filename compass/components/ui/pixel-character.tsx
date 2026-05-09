"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Mood = "idle" | "happy" | "cheer" | "wink" | "blush";

const MOOD_CONFIG: Record<Mood, { emoji: string; text: string; duration: number }> = {
  idle: { emoji: "", text: "", duration: 0 },
  happy: { emoji: "✨", text: "がんばって!", duration: 2500 },
  cheer: { emoji: "🎉", text: "すごい!", duration: 2500 },
  wink: { emoji: "💕", text: "いい感じ~", duration: 2500 },
  blush: { emoji: "🌸", text: "えへへ…", duration: 2500 },
};

/**
 * 娜美风像素美女 — 可自主移动 + 可拖拽
 * 放置在页面固定位置，会自己走来走去，也可以被用户拖动
 */
export function PixelCharacter() {
  const [mood, setMood] = useState<Mood>("idle");
  const [clickCount, setClickCount] = useState(0);
  const [pos, setPos] = useState({ x: 80, y: 70 }); // percentage-based
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const walkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerMood = useCallback((newMood: Mood) => {
    setMood(newMood);
    setTimeout(() => setMood("idle"), MOOD_CONFIG[newMood].duration);
  }, []);

  // 自主移动逻辑
  useEffect(() => {
    const startWalking = () => {
      if (isDragging) return;

      // 随机选择目标位置
      const targetX = Math.random() * 70 + 15; // 15% ~ 85%
      const targetY = Math.random() * 50 + 40; // 40% ~ 90%
      const dx = targetX - pos.x;

      setDirection(dx > 0 ? "right" : "left");
      setIsWalking(true);

      let currentX = pos.x;
      let currentY = pos.y;
      const stepX = dx / 60;
      const stepY = (targetY - pos.y) / 60;
      let steps = 0;

      moveTimer.current = setInterval(() => {
        if (isDragging) {
          if (moveTimer.current) clearInterval(moveTimer.current);
          return;
        }
        steps++;
        currentX += stepX;
        currentY += stepY;
        setPos({ x: currentX, y: currentY });

        if (steps >= 60) {
          if (moveTimer.current) clearInterval(moveTimer.current);
          setIsWalking(false);
          // 停一会再走
          setTimeout(startWalking, Math.random() * 4000 + 2000);
        }
      }, 50);
    };

    const initialDelay = setTimeout(startWalking, 2000);

    return () => {
      clearTimeout(initialDelay);
      if (moveTimer.current) clearInterval(moveTimer.current);
    };
  }, [isDragging]); // eslint-disable-line react-hooks/exhaustive-deps

  // 走路帧动画
  useEffect(() => {
    walkTimer.current = setInterval(() => {
      setWalkFrame((f) => (f + 1) % 4);
    }, 200);
    return () => {
      if (walkTimer.current) clearInterval(walkTimer.current);
    };
  }, []);

  // 拖拽处理
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsWalking(false);
    if (moveTimer.current) clearInterval(moveTimer.current);

    const rect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;

    dragOffset.current = {
      x: e.clientX - (pos.x / 100) * rect.width,
      y: e.clientY - (pos.y / 100) * rect.height,
    };

    const handleMove = (ev: PointerEvent) => {
      const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
      if (!parentRect) return;
      const newX = ((ev.clientX - dragOffset.current.x) / parentRect.width) * 100;
      const newY = ((ev.clientY - dragOffset.current.y) / parentRect.height) * 100;
      setPos({
        x: Math.max(5, Math.min(90, newX)),
        y: Math.max(10, Math.min(90, newY)),
      });
    };

    const handleUp = () => {
      setIsDragging(false);
      triggerMood("happy");
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  const handleClick = () => {
    if (isDragging) return;
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

  const moodInfo = MOOD_CONFIG[mood];
  const isActive = mood !== "idle";

  // 腿部偏移模拟走路
  const legOffset = isWalking ? [0, 2, 0, -2][walkFrame] : 0;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 cursor-grab active:cursor-grabbing select-none"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%, -50%) scaleX(${direction === "left" ? -1 : 1})`,
        transition: isDragging ? "none" : "transform 0.2s",
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="拖动或点击互动"
    >
      {/* Speech bubble */}
      {isActive && (
        <div
          className="absolute -top-10 left-1/2 whitespace-nowrap rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1 text-xs text-text-primary z-10"
          style={{ transform: `translateX(-50%) scaleX(${direction === "left" ? -1 : 1})` }}
        >
          <span className="mr-1">{moodInfo.emoji}</span>
          <span>{moodInfo.text}</span>
        </div>
      )}

      <svg
        viewBox="0 0 32 56"
        width="48"
        height="84"
        style={{ imageRendering: "pixelated" }}
      >
        {/* === HAIR (orange, long, flowing) === */}
        <rect x="9" y="0" width="14" height="3" fill="#FF6B00" />
        <rect x="7" y="2" width="18" height="3" fill="#FF8C00" />
        <rect x="6" y="4" width="20" height="4" fill="#FF6B00" />
        <rect x="5" y="5" width="3" height="18" fill="#FF8C00" />
        <rect x="24" y="5" width="3" height="18" fill="#FF8C00" />
        <rect x="4" y="10" width="2" height="12" fill="#FF6B00" />
        <rect x="26" y="10" width="2" height="12" fill="#FF6B00" />
        <rect x="9" y="5" width="4" height="3" fill="#FF8C00" />
        <rect x="19" y="5" width="4" height="3" fill="#FF8C00" />

        {/* === FACE === */}
        <rect x="9" y="7" width="14" height="12" fill="#FFE0BD" />

        {/* Eyes */}
        {mood === "wink" ? (
          <>
            <rect x="11" y="11" width="4" height="1" fill="#2d1b00" />
            <rect x="19" y="10" width="4" height="4" fill="#FFFFFF" />
            <rect x="20" y="11" width="2" height="2" fill="#4A2800" />
            <rect x="20" y="11" width="1" height="1" fill="#FFFFFF" />
          </>
        ) : mood === "happy" || mood === "cheer" ? (
          <>
            <rect x="11" y="12" width="4" height="1" fill="#2d1b00" />
            <rect x="12" y="11" width="2" height="1" fill="#2d1b00" />
            <rect x="19" y="12" width="4" height="1" fill="#2d1b00" />
            <rect x="20" y="11" width="2" height="1" fill="#2d1b00" />
          </>
        ) : mood === "blush" ? (
          <>
            <rect x="11" y="11" width="4" height="2" fill="#4A2800" />
            <rect x="12" y="11" width="1" height="1" fill="#FFFFFF" />
            <rect x="19" y="11" width="4" height="2" fill="#4A2800" />
            <rect x="20" y="11" width="1" height="1" fill="#FFFFFF" />
          </>
        ) : (
          <>
            <rect x="10" y="10" width="5" height="4" fill="#FFFFFF" />
            <rect x="11" y="11" width="3" height="2" fill="#4A2800" />
            <rect x="12" y="11" width="1" height="1" fill="#FFFFFF" />
            <rect x="19" y="10" width="5" height="4" fill="#FFFFFF" />
            <rect x="20" y="11" width="3" height="2" fill="#4A2800" />
            <rect x="21" y="11" width="1" height="1" fill="#FFFFFF" />
          </>
        )}

        {/* Blush */}
        {(mood === "blush" || mood === "happy") && (
          <>
            <rect x="9" y="14" width="3" height="2" fill="#FF9999" opacity="0.5" />
            <rect x="20" y="14" width="3" height="2" fill="#FF9999" opacity="0.5" />
          </>
        )}

        {/* Mouth */}
        {mood === "happy" || mood === "cheer" ? (
          <rect x="14" y="16" width="4" height="2" fill="#FF6B8A" />
        ) : (
          <rect x="14" y="16" width="4" height="1" fill="#FF6B8A" />
        )}

        {/* Neck */}
        <rect x="14" y="19" width="4" height="2" fill="#FFE0BD" />

        {/* Body — Bikini top */}
        <rect x="10" y="21" width="12" height="5" fill="#FFE0BD" />
        <rect x="11" y="21" width="4" height="4" fill="#2196F3" />
        <rect x="17" y="21" width="4" height="4" fill="#2196F3" />
        <rect x="11" y="22" width="4" height="1" fill="#1565C0" />
        <rect x="17" y="22" width="4" height="1" fill="#1565C0" />
        <rect x="14" y="20" width="1" height="2" fill="#2196F3" />
        <rect x="17" y="20" width="1" height="2" fill="#2196F3" />

        {/* Waist */}
        <rect x="12" y="26" width="8" height="3" fill="#FFE0BD" />
        <rect x="15" y="27" width="2" height="1" fill="#EDCBA0" />

        {/* Shorts */}
        <rect x="10" y="29" width="12" height="5" fill="#1565C0" />
        <rect x="10" y="29" width="12" height="1" fill="#795548" />
        <rect x="15" y="29" width="2" height="1" fill="#FFD700" />

        {/* Legs — walking animation */}
        <rect x={11 + legOffset} y="34" width="4" height="12" fill="#FFE0BD" />
        <rect x={17 - legOffset} y="34" width="4" height="12" fill="#FFE0BD" />

        {/* Sandals */}
        <rect x={10 + legOffset} y="46" width="5" height="2" fill="#FF6B00" />
        <rect x={17 - legOffset} y="46" width="5" height="2" fill="#FF6B00" />

        {/* Arms */}
        {mood === "cheer" ? (
          <>
            <rect x="6" y="16" width="3" height="8" fill="#FFE0BD" />
            <rect x="23" y="16" width="3" height="8" fill="#FFE0BD" />
            <rect x="6" y="14" width="3" height="3" fill="#FFE0BD" />
            <rect x="23" y="14" width="3" height="3" fill="#FFE0BD" />
          </>
        ) : isWalking ? (
          <>
            <rect x={7 - legOffset} y="22" width="3" height="9" fill="#FFE0BD" />
            <rect x={22 + legOffset} y="22" width="3" height="9" fill="#FFE0BD" />
          </>
        ) : (
          <>
            <rect x="7" y="22" width="3" height="9" fill="#FFE0BD" />
            <rect x="22" y="22" width="3" height="9" fill="#FFE0BD" />
          </>
        )}

        {/* Sparkles */}
        {isActive && (
          <>
            <rect x="1" y="3" width="2" height="2" fill="#FFD700" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.7s" repeatCount="indefinite" />
            </rect>
            <rect x="28" y="6" width="2" height="2" fill="#FF69B4" opacity="0.8">
              <animate attributeName="opacity" values="0.2;0.9;0.2" dur="0.8s" repeatCount="indefinite" />
            </rect>
          </>
        )}
      </svg>

      {/* Walking indicator */}
      {isWalking && !isDragging && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-text-tertiary"
              style={{ opacity: walkFrame === i ? 0.6 : 0.2 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
