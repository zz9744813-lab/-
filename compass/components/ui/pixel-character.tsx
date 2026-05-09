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
 * 用 requestAnimationFrame 驱动移动，避免多定时器冲突
 */
export function PixelCharacter() {
  const [mood, setMood] = useState<Mood>("idle");
  const [clickCount, setClickCount] = useState(0);
  const [renderPos, setRenderPos] = useState({ x: 75, y: 65 });
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);

  // All mutable state in a single ref to avoid stale closures
  const stateRef = useRef({
    pos: { x: 75, y: 65 },
    target: null as { x: number; y: number } | null,
    isDragging: false,
    isMoving: false,
    pauseUntil: 0, // timestamp when to start next walk
    lastFrameTime: 0,
    walkFrameTime: 0,
  });

  const triggerMood = useCallback((newMood: Mood) => {
    setMood(newMood);
    setTimeout(() => setMood("idle"), MOOD_CONFIG[newMood].duration);
  }, []);

  // Single RAF loop for all movement
  useEffect(() => {
    let rafId: number;
    const state = stateRef.current;
    state.pauseUntil = Date.now() + 1500; // initial delay

    const pickTarget = () => {
      state.target = {
        x: Math.random() * 55 + 20, // 20-75%
        y: Math.random() * 30 + 50, // 50-80%
      };
    };

    const tick = (now: number) => {
      // Walk frame animation (every 200ms)
      if (now - state.walkFrameTime > 200) {
        state.walkFrameTime = now;
        setWalkFrame((f) => (f + 1) % 4);
      }

      if (!state.isDragging) {
        if (state.target) {
          // Moving towards target
          const dx = state.target.x - state.pos.x;
          const dy = state.target.y - state.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.5) {
            // Arrived
            state.target = null;
            state.isMoving = false;
            state.pauseUntil = now + 2000 + Math.random() * 3000;
            setIsWalking(false);
          } else {
            // Move at constant speed (~1.2% per frame at 60fps)
            const speed = Math.min(0.8, dist * 0.03);
            const vx = (dx / dist) * speed;
            const vy = (dy / dist) * speed;
            state.pos.x += vx;
            state.pos.y += vy;
            setRenderPos({ x: state.pos.x, y: state.pos.y });

            if (!state.isMoving) {
              state.isMoving = true;
              setIsWalking(true);
              setDirection(dx > 0 ? "right" : "left");
            }
          }
        } else if (now > state.pauseUntil) {
          // Pick new target
          pickTarget();
          const dx = state.target!.x - state.pos.x;
          setDirection(dx > 0 ? "right" : "left");
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = stateRef.current;
    state.isDragging = true;
    state.target = null;
    state.isMoving = false;
    setIsDragging(true);
    setIsWalking(false);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPosX = state.pos.x;
    const startPosY = state.pos.y;

    const handleMove = (ev: PointerEvent) => {
      const deltaX = ((ev.clientX - startMouseX) / window.innerWidth) * 100;
      const deltaY = ((ev.clientY - startMouseY) / window.innerHeight) * 100;
      const newX = Math.max(5, Math.min(95, startPosX + deltaX));
      const newY = Math.max(10, Math.min(90, startPosY + deltaY));
      state.pos.x = newX;
      state.pos.y = newY;
      setRenderPos({ x: newX, y: newY });
    };

    const handleUp = () => {
      state.isDragging = false;
      state.pauseUntil = Date.now() + 2000; // pause 2s after drop
      setIsDragging(false);
      triggerMood("happy");
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  }, [triggerMood]);

  const handleClick = useCallback(() => {
    if (stateRef.current.isDragging) return;
    const count = clickCount + 1;
    setClickCount(count);
    if (count % 5 === 0) triggerMood("blush");
    else if (count % 3 === 0) triggerMood("wink");
    else triggerMood(["happy", "cheer"][Math.floor(Math.random() * 2)] as Mood);
  }, [clickCount, triggerMood]);

  const moodInfo = MOOD_CONFIG[mood];
  const isActive = mood !== "idle";
  const frame = walkFrame;
  // Leg animation: smooth 4-frame walk cycle
  const legAnim = isWalking ? [0, 3, 0, -3][frame] : 0;
  const armAnim = isWalking ? [0, -2, 0, 2][frame] : 0;

  return (
    <div
      className="fixed z-50 select-none touch-none"
      style={{
        left: `${renderPos.x}%`,
        top: `${renderPos.y}%`,
        transform: `translate(-50%, -50%) scaleX(${direction === "left" ? -1 : 1})`,
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "transform 0.15s ease",
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
          className="absolute -top-12 left-1/2 whitespace-nowrap rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-pink-200 dark:border-pink-500/30 px-3 py-1.5 text-xs font-medium text-gray-800 dark:text-white shadow-xl"
          style={{ transform: `translateX(-50%) scaleX(${direction === "left" ? -1 : 1})`, animation: "fadeIn 0.2s ease" }}
        >
          <span className="mr-1">{moodInfo.emoji}</span>
          <span>{moodInfo.text}</span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white/95 dark:bg-gray-900/95 border-r border-b border-pink-200 dark:border-pink-500/30" />
        </div>
      )}

      {/* High-detail Nami-style pixel character - 48x80 viewBox */}
      <svg
        viewBox="0 0 48 80"
        width="72"
        height="120"
        style={{ imageRendering: "pixelated", filter: isDragging ? "drop-shadow(0 6px 12px rgba(255,107,0,0.4))" : "drop-shadow(0 3px 6px rgba(0,0,0,0.25))" }}
      >
        {/* === HAIR === */}
        {/* Top hair volume */}
        <rect x="14" y="0" width="20" height="2" fill="#FF7B00" />
        <rect x="12" y="2" width="24" height="2" fill="#FF8C00" />
        <rect x="11" y="4" width="26" height="3" fill="#FF6B00" />
        <rect x="10" y="7" width="28" height="2" fill="#FF7B00" />
        {/* Side hair flowing down */}
        <rect x="8" y="7" width="4" height="22" fill="#FF8C00" />
        <rect x="6" y="12" width="3" height="18" fill="#FF6B00" />
        <rect x="5" y="18" width="2" height="14" fill="#FF7B00" />
        <rect x="36" y="7" width="4" height="22" fill="#FF8C00" />
        <rect x="39" y="12" width="3" height="18" fill="#FF6B00" />
        <rect x="41" y="18" width="2" height="14" fill="#FF7B00" />
        {/* Hair highlights */}
        <rect x="16" y="2" width="3" height="2" fill="#FFAA33" opacity="0.7" />
        <rect x="26" y="4" width="4" height="2" fill="#FFAA33" opacity="0.5" />

        {/* === FACE === */}
        <rect x="13" y="9" width="22" height="16" fill="#FFE4C4" />
        {/* Forehead highlight */}
        <rect x="16" y="9" width="6" height="2" fill="#FFF0DC" opacity="0.5" />

        {/* === EYES === */}
        {mood === "wink" ? (
          <>
            {/* Left eye winking (closed arc) */}
            <rect x="15" y="16" width="6" height="1" fill="#3D2200" />
            <rect x="16" y="15" width="4" height="1" fill="#3D2200" />
            {/* Right eye open */}
            <rect x="27" y="14" width="7" height="5" fill="#FFFFFF" />
            <rect x="28" y="14" width="5" height="5" fill="#FFFFFF" />
            <rect x="29" y="15" width="4" height="3" fill="#5D3A00" />
            <rect x="30" y="15" width="2" height="2" fill="#1A0A00" />
            <rect x="30" y="15" width="1" height="1" fill="#FFFFFF" />
            {/* Eyelashes */}
            <rect x="27" y="13" width="2" height="1" fill="#3D2200" />
            <rect x="33" y="13" width="2" height="1" fill="#3D2200" />
          </>
        ) : mood === "happy" || mood === "cheer" ? (
          <>
            {/* Happy closed eyes (upward arcs) */}
            <rect x="15" y="16" width="7" height="1" fill="#3D2200" />
            <rect x="16" y="15" width="5" height="1" fill="#3D2200" />
            <rect x="17" y="14" width="3" height="1" fill="#3D2200" />
            <rect x="27" y="16" width="7" height="1" fill="#3D2200" />
            <rect x="28" y="15" width="5" height="1" fill="#3D2200" />
            <rect x="29" y="14" width="3" height="1" fill="#3D2200" />
          </>
        ) : mood === "blush" ? (
          <>
            {/* Shy downcast eyes */}
            <rect x="15" y="14" width="7" height="5" fill="#FFFFFF" />
            <rect x="17" y="15" width="4" height="3" fill="#5D3A00" />
            <rect x="18" y="16" width="2" height="2" fill="#1A0A00" />
            <rect x="27" y="14" width="7" height="5" fill="#FFFFFF" />
            <rect x="29" y="15" width="4" height="3" fill="#5D3A00" />
            <rect x="30" y="16" width="2" height="2" fill="#1A0A00" />
          </>
        ) : (
          <>
            {/* Normal big eyes */}
            <rect x="14" y="13" width="8" height="6" fill="#FFFFFF" />
            <rect x="16" y="14" width="5" height="4" fill="#5D3A00" />
            <rect x="17" y="15" width="3" height="2" fill="#1A0A00" />
            <rect x="17" y="14" width="2" height="1" fill="#FFFFFF" />
            <rect x="26" y="13" width="8" height="6" fill="#FFFFFF" />
            <rect x="28" y="14" width="5" height="4" fill="#5D3A00" />
            <rect x="29" y="15" width="3" height="2" fill="#1A0A00" />
            <rect x="29" y="14" width="2" height="1" fill="#FFFFFF" />
            {/* Eyelashes */}
            <rect x="14" y="12" width="2" height="1" fill="#3D2200" />
            <rect x="20" y="12" width="2" height="1" fill="#3D2200" />
            <rect x="26" y="12" width="2" height="1" fill="#3D2200" />
            <rect x="32" y="12" width="2" height="1" fill="#3D2200" />
          </>
        )}

        {/* Blush */}
        {(mood === "blush" || mood === "happy") && (
          <>
            <rect x="13" y="19" width="4" height="2" fill="#FF8888" opacity="0.5" />
            <rect x="31" y="19" width="4" height="2" fill="#FF8888" opacity="0.5" />
          </>
        )}

        {/* Nose */}
        <rect x="23" y="18" width="2" height="2" fill="#FFCDA8" />

        {/* Mouth */}
        {mood === "happy" || mood === "cheer" ? (
          <>
            <rect x="20" y="22" width="8" height="2" fill="#FF5C7A" />
            <rect x="21" y="24" width="6" height="1" fill="#FF5C7A" />
          </>
        ) : mood === "blush" ? (
          <>
            <rect x="21" y="22" width="6" height="1" fill="#FF5C7A" />
            <rect x="22" y="23" width="4" height="1" fill="#FF5C7A" />
          </>
        ) : (
          <rect x="21" y="22" width="6" height="1" fill="#FF5C7A" />
        )}

        {/* === NECK === */}
        <rect x="21" y="25" width="6" height="3" fill="#FFE4C4" />

        {/* === BIKINI TOP === */}
        <rect x="14" y="28" width="20" height="8" fill="#FFE4C4" />
        {/* Left cup */}
        <rect x="15" y="29" width="7" height="6" fill="#1E88E5" />
        <rect x="16" y="30" width="5" height="4" fill="#2196F3" />
        <rect x="17" y="31" width="2" height="1" fill="#64B5F6" opacity="0.6" />
        {/* Right cup */}
        <rect x="26" y="29" width="7" height="6" fill="#1E88E5" />
        <rect x="27" y="30" width="5" height="4" fill="#2196F3" />
        <rect x="28" y="31" width="2" height="1" fill="#64B5F6" opacity="0.6" />
        {/* Center strap */}
        <rect x="22" y="29" width="4" height="2" fill="#1565C0" />
        {/* Shoulder straps */}
        <rect x="17" y="27" width="2" height="2" fill="#1565C0" />
        <rect x="29" y="27" width="2" height="2" fill="#1565C0" />

        {/* === WAIST === */}
        <rect x="16" y="36" width="16" height="4" fill="#FFE4C4" />
        {/* Navel */}
        <rect x="23" y="37" width="2" height="2" fill="#FFCDA8" />

        {/* === JEANS SHORTS === */}
        <rect x="14" y="40" width="20" height="7" fill="#1565C0" />
        <rect x="15" y="41" width="18" height="5" fill="#1976D2" />
        {/* Belt */}
        <rect x="14" y="40" width="20" height="2" fill="#5D4037" />
        <rect x="22" y="40" width="4" height="2" fill="#FFD700" />
        {/* Pocket detail */}
        <rect x="16" y="43" width="3" height="2" fill="#1565C0" />
        <rect x="29" y="43" width="3" height="2" fill="#1565C0" />

        {/* === LEGS (animated) === */}
        {/* Left leg */}
        <rect x={17 + legAnim} y="47" width="5" height="14" fill="#FFE4C4" />
        <rect x={17 + legAnim} y="47" width="5" height="2" fill="#FFDAB0" />
        {/* Right leg */}
        <rect x={26 - legAnim} y="47" width="5" height="14" fill="#FFE4C4" />
        <rect x={26 - legAnim} y="47" width="5" height="2" fill="#FFDAB0" />
        {/* Knee highlights */}
        <rect x={18 + legAnim} y="54" width="3" height="1" fill="#FFDAB0" />
        <rect x={27 - legAnim} y="54" width="3" height="1" fill="#FFDAB0" />

        {/* === SANDALS === */}
        <rect x={16 + legAnim} y="61" width="7" height="3" fill="#FF8C00" />
        <rect x={17 + legAnim} y="61" width="2" height="1" fill="#FFB74D" />
        <rect x={25 - legAnim} y="61" width="7" height="3" fill="#FF8C00" />
        <rect x={26 - legAnim} y="61" width="2" height="1" fill="#FFB74D" />
        {/* Heel */}
        <rect x={16 + legAnim} y="64" width="7" height="2" fill="#E65100" />
        <rect x={25 - legAnim} y="64" width="7" height="2" fill="#E65100" />

        {/* === ARMS (animated) === */}
        {mood === "cheer" ? (
          <>
            {/* Arms raised */}
            <rect x="8" y="20" width="5" height="10" fill="#FFE4C4" />
            <rect x="7" y="16" width="4" height="5" fill="#FFE4C4" />
            <rect x="35" y="20" width="5" height="10" fill="#FFE4C4" />
            <rect x="37" y="16" width="4" height="5" fill="#FFE4C4" />
          </>
        ) : (
          <>
            {/* Normal/walking arms */}
            <rect x={9 + armAnim} y="29" width="4" height="12" fill="#FFE4C4" />
            <rect x={35 - armAnim} y="29" width="4" height="12" fill="#FFE4C4" />
            {/* Hands */}
            <rect x={9 + armAnim} y="41" width="4" height="3" fill="#FFDAB0" />
            <rect x={35 - armAnim} y="41" width="4" height="3" fill="#FFDAB0" />
          </>
        )}

        {/* === SPARKLE EFFECTS === */}
        {isActive && (
          <>
            <rect x="3" y="5" width="3" height="3" fill="#FFD700">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite" />
            </rect>
            <rect x="42" y="8" width="3" height="3" fill="#FF69B4">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="0.6s" repeatCount="indefinite" />
            </rect>
            <rect x="5" y="55" width="2" height="2" fill="#00E5FF">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.4s" repeatCount="indefinite" />
            </rect>
            <rect x="40" y="50" width="2" height="2" fill="#FF69B4">
              <animate attributeName="opacity" values="1;0.3;1" dur="0.7s" repeatCount="indefinite" />
            </rect>
          </>
        )}

        {/* Idle breathing animation (subtle body bob) */}
        {!isWalking && !isDragging && (
          <rect x="20" y="36" width="8" height="1" fill="#FFE4C4" opacity="0.5">
            <animate attributeName="y" values="36;35;36" dur="2s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>

      {/* Walking dust particles */}
      {isWalking && !isDragging && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-orange-300/60"
              style={{
                opacity: frame % 3 === i ? 0.8 : 0.15,
                transform: `translateY(${frame % 3 === i ? -2 : 0}px)`,
                transition: "all 0.15s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
