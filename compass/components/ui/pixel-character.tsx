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
 * 娜美风像素美女 — 全局浮动，自主移动 + 可拖拽
 */
export function PixelCharacter() {
  const [mood, setMood] = useState<Mood>("idle");
  const [clickCount, setClickCount] = useState(0);
  const posRef = useRef({ x: 75, y: 65 });
  const [renderPos, setRenderPos] = useState({ x: 75, y: 65 });
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const isDraggingRef = useRef(false);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const walkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerMood = useCallback((newMood: Mood) => {
    setMood(newMood);
    setTimeout(() => setMood("idle"), MOOD_CONFIG[newMood].duration);
  }, []);

  // Walk frame animation
  useEffect(() => {
    frameIntervalRef.current = setInterval(() => {
      setWalkFrame((f) => (f + 1) % 4);
    }, 200);
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, []);

  // Autonomous movement
  useEffect(() => {
    const walkToRandomSpot = () => {
      if (isDraggingRef.current) {
        walkTimeoutRef.current = setTimeout(walkToRandomSpot, 2000);
        return;
      }

      const targetX = Math.random() * 60 + 20; // 20% ~ 80%
      const targetY = Math.random() * 40 + 45; // 45% ~ 85%
      const startX = posRef.current.x;
      const startY = posRef.current.y;
      const dx = targetX - startX;
      const dy = targetY - startY;
      const totalSteps = Math.max(40, Math.floor(Math.sqrt(dx * dx + dy * dy) * 2));
      let step = 0;

      setDirection(dx > 0 ? "right" : "left");
      setIsWalking(true);

      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);

      moveIntervalRef.current = setInterval(() => {
        if (isDraggingRef.current) {
          if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
          setIsWalking(false);
          return;
        }

        step++;
        const progress = step / totalSteps;
        // Ease in-out
        const ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newX = startX + dx * ease;
        const newY = startY + dy * ease;
        posRef.current = { x: newX, y: newY };
        setRenderPos({ x: newX, y: newY });

        if (step >= totalSteps) {
          if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
          setIsWalking(false);
          // Wait 2-5 seconds then walk again
          const delay = Math.random() * 3000 + 2000;
          walkTimeoutRef.current = setTimeout(walkToRandomSpot, delay);
        }
      }, 50);
    };

    // Start after 1.5s
    walkTimeoutRef.current = setTimeout(walkToRandomSpot, 1500);

    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
    };
  }, []);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsWalking(false);

    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPosX = posRef.current.x;
    const startPosY = posRef.current.y;

    const handleMove = (ev: PointerEvent) => {
      const deltaX = ((ev.clientX - startMouseX) / window.innerWidth) * 100;
      const deltaY = ((ev.clientY - startMouseY) / window.innerHeight) * 100;
      const newX = Math.max(5, Math.min(95, startPosX + deltaX));
      const newY = Math.max(10, Math.min(90, startPosY + deltaY));
      posRef.current = { x: newX, y: newY };
      setRenderPos({ x: newX, y: newY });
      setDirection(ev.clientX - startMouseX > 0 ? "right" : "left");
    };

    const handleUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      triggerMood("happy");
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);

      // Resume walking after 2s
      walkTimeoutRef.current = setTimeout(() => {
        if (!isDraggingRef.current) {
          const walkToRandomSpot = () => {
            if (isDraggingRef.current) return;
            const targetX = Math.random() * 60 + 20;
            const targetY = Math.random() * 40 + 45;
            const startX = posRef.current.x;
            const startY = posRef.current.y;
            const dx = targetX - startX;
            const dy = targetY - startY;
            const totalSteps = Math.max(40, Math.floor(Math.sqrt(dx * dx + dy * dy) * 2));
            let step = 0;

            setDirection(dx > 0 ? "right" : "left");
            setIsWalking(true);

            moveIntervalRef.current = setInterval(() => {
              if (isDraggingRef.current) {
                if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
                setIsWalking(false);
                return;
              }
              step++;
              const progress = step / totalSteps;
              const ease = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              const newX = startX + dx * ease;
              const newY = startY + dy * ease;
              posRef.current = { x: newX, y: newY };
              setRenderPos({ x: newX, y: newY });

              if (step >= totalSteps) {
                if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
                setIsWalking(false);
                walkTimeoutRef.current = setTimeout(walkToRandomSpot, Math.random() * 3000 + 2000);
              }
            }, 50);
          };
          walkToRandomSpot();
        }
      }, 2000);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  }, [triggerMood]);

  const handleClick = useCallback(() => {
    if (isDraggingRef.current) return;
    const count = clickCount + 1;
    setClickCount(count);
    if (count % 5 === 0) {
      triggerMood("blush");
    } else if (count % 3 === 0) {
      triggerMood("wink");
    } else {
      const moods: Mood[] = ["happy", "cheer"];
      triggerMood(moods[Math.floor(Math.random() * moods.length)]);
    }
  }, [clickCount, triggerMood]);

  const moodInfo = MOOD_CONFIG[mood];
  const isActive = mood !== "idle";
  const legOffset = isWalking ? [0, 2, 0, -2][walkFrame] : 0;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 select-none touch-none"
      style={{
        left: `${renderPos.x}%`,
        top: `${renderPos.y}%`,
        transform: `translate(-50%, -50%) scaleX(${direction === "left" ? -1 : 1})`,
        cursor: isDragging ? "grabbing" : "grab",
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
          className="absolute -top-10 left-1/2 whitespace-nowrap rounded-lg bg-white/90 dark:bg-black/80 backdrop-blur-sm border border-gray-200 dark:border-white/20 px-2.5 py-1 text-xs text-gray-800 dark:text-white shadow-lg"
          style={{ transform: `translateX(-50%) scaleX(${direction === "left" ? -1 : 1})`, animation: "fadeIn 0.2s ease" }}
        >
          <span className="mr-1">{moodInfo.emoji}</span>
          <span>{moodInfo.text}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-white/90 dark:bg-black/80 border-r border-b border-gray-200 dark:border-white/20" />
        </div>
      )}

      {/* Character SVG */}
      <svg
        viewBox="0 0 32 52"
        width="56"
        height="91"
        style={{ imageRendering: "pixelated", filter: isDragging ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
      >
        {/* Hair (orange, long) */}
        <rect x="9" y="0" width="14" height="3" fill="#FF6B00" />
        <rect x="7" y="2" width="18" height="3" fill="#FF8C00" />
        <rect x="6" y="4" width="20" height="4" fill="#FF6B00" />
        <rect x="5" y="5" width="3" height="16" fill="#FF8C00" />
        <rect x="24" y="5" width="3" height="16" fill="#FF8C00" />
        <rect x="4" y="10" width="2" height="10" fill="#FF6B00" />
        <rect x="26" y="10" width="2" height="10" fill="#FF6B00" />

        {/* Face */}
        <rect x="9" y="7" width="14" height="12" fill="#FFE0BD" />

        {/* Eyes - mood dependent */}
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
            <rect x="11" y="10" width="4" height="3" fill="#4A2800" />
            <rect x="12" y="10" width="1" height="1" fill="#FFFFFF" />
            <rect x="19" y="10" width="4" height="3" fill="#4A2800" />
            <rect x="20" y="10" width="1" height="1" fill="#FFFFFF" />
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

        {/* Blush cheeks */}
        {(mood === "blush" || mood === "happy") && (
          <>
            <rect x="9" y="14" width="3" height="2" fill="#FF9999" opacity="0.6" />
            <rect x="20" y="14" width="3" height="2" fill="#FF9999" opacity="0.6" />
          </>
        )}

        {/* Mouth */}
        {mood === "happy" || mood === "cheer" ? (
          <rect x="14" y="16" width="4" height="2" fill="#FF6B8A" />
        ) : mood === "blush" ? (
          <>
            <rect x="14" y="16" width="4" height="1" fill="#FF6B8A" />
            <rect x="15" y="17" width="2" height="1" fill="#FF6B8A" />
          </>
        ) : (
          <rect x="14" y="16" width="4" height="1" fill="#FF6B8A" />
        )}

        {/* Neck */}
        <rect x="14" y="19" width="4" height="2" fill="#FFE0BD" />

        {/* Bikini top */}
        <rect x="10" y="21" width="12" height="5" fill="#FFE0BD" />
        <rect x="11" y="21" width="4" height="4" fill="#2196F3" />
        <rect x="17" y="21" width="4" height="4" fill="#2196F3" />
        <rect x="15" y="21" width="2" height="1" fill="#1565C0" />

        {/* Waist */}
        <rect x="12" y="26" width="8" height="3" fill="#FFE0BD" />

        {/* Shorts */}
        <rect x="10" y="29" width="12" height="5" fill="#1565C0" />
        <rect x="10" y="29" width="12" height="1" fill="#795548" />
        <rect x="15" y="29" width="2" height="1" fill="#FFD700" />

        {/* Legs with walk animation */}
        <rect x={11 + legOffset} y="34" width="4" height="10" fill="#FFE0BD" />
        <rect x={17 - legOffset} y="34" width="4" height="10" fill="#FFE0BD" />

        {/* Sandals */}
        <rect x={10 + legOffset} y="44" width="5" height="2" fill="#FF6B00" />
        <rect x={17 - legOffset} y="44" width="5" height="2" fill="#FF6B00" />

        {/* Arms */}
        {mood === "cheer" ? (
          <>
            <rect x="6" y="15" width="3" height="8" fill="#FFE0BD" />
            <rect x="23" y="15" width="3" height="8" fill="#FFE0BD" />
          </>
        ) : isWalking ? (
          <>
            <rect x={7 - legOffset} y="22" width="3" height="8" fill="#FFE0BD" />
            <rect x={22 + legOffset} y="22" width="3" height="8" fill="#FFE0BD" />
          </>
        ) : (
          <>
            <rect x="7" y="22" width="3" height="8" fill="#FFE0BD" />
            <rect x="22" y="22" width="3" height="8" fill="#FFE0BD" />
          </>
        )}

        {/* Sparkle effects when active */}
        {isActive && (
          <>
            <rect x="2" y="2" width="2" height="2" fill="#FFD700">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />
            </rect>
            <rect x="28" y="4" width="2" height="2" fill="#FF69B4">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="0.7s" repeatCount="indefinite" />
            </rect>
            <rect x="3" y="40" width="2" height="2" fill="#00BCD4">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
            </rect>
          </>
        )}
      </svg>

      {/* Walking dots indicator */}
      {isWalking && !isDragging && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{
                backgroundColor: "var(--text-tertiary, #888)",
                opacity: walkFrame % 3 === i ? 0.8 : 0.2,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
