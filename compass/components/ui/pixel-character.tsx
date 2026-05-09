"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Mood = "idle" | "happy" | "cheer" | "wink" | "blush";

const MOOD_CONFIG: Record<Mood, { emoji: string; text: string; duration: number }> = {
  idle: { emoji: "", text: "", duration: 0 },
  happy: { emoji: "✨", text: "がんばって!", duration: 2500 },
  cheer: { emoji: "🎉", text: "すごい!", duration: 2500 },
  wink: { emoji: "💕", text: "いい感じ~", duration: 2500 },
  blush: { emoji: "🌸", text: "えへへ…", duration: 3000 },
};

/**
 * 娜美风精细像素美女 — 全局浮动，自主移动+拖拽+丰富表情动画
 * 使用单一 RAF 循环，无定时器泄漏
 */
export function PixelCharacter() {
  const [mood, setMood] = useState<Mood>("idle");
  const [clickCount, setClickCount] = useState(0);
  const [renderPos, setRenderPos] = useState({ x: 75, y: 65 });
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [frame, setFrame] = useState(0);
  const [blinkFrame, setBlinkFrame] = useState(0); // 0=open, 1-3=blinking

  const stateRef = useRef({
    pos: { x: 75, y: 65 },
    target: null as { x: number; y: number } | null,
    isDragging: false,
    pauseUntil: 0,
    frameCount: 0,
    blinkTimer: 0,
    nextBlink: 120 + Math.random() * 180,
  });

  const triggerMood = useCallback((newMood: Mood) => {
    setMood(newMood);
    setTimeout(() => setMood("idle"), MOOD_CONFIG[newMood].duration);
  }, []);

  // Single RAF loop
  useEffect(() => {
    let rafId: number;
    const state = stateRef.current;
    state.pauseUntil = Date.now() + 1500;

    const tick = () => {
      state.frameCount++;

      // Walk frame (every 10 frames = ~166ms at 60fps)
      if (state.frameCount % 10 === 0) {
        setFrame((f) => (f + 1) % 4);
      }

      // Auto blink (every ~3-5 seconds)
      state.blinkTimer++;
      if (state.blinkTimer >= state.nextBlink) {
        setBlinkFrame(1);
        setTimeout(() => setBlinkFrame(2), 80);
        setTimeout(() => setBlinkFrame(3), 160);
        setTimeout(() => setBlinkFrame(0), 240);
        state.blinkTimer = 0;
        state.nextBlink = 120 + Math.random() * 180;
      }

      // Movement
      if (!state.isDragging) {
        if (state.target) {
          const dx = state.target.x - state.pos.x;
          const dy = state.target.y - state.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.5) {
            state.target = null;
            state.pauseUntil = Date.now() + 2000 + Math.random() * 3000;
            setIsWalking(false);
          } else {
            const speed = Math.min(0.6, dist * 0.025);
            state.pos.x += (dx / dist) * speed;
            state.pos.y += (dy / dist) * speed;
            setRenderPos({ x: state.pos.x, y: state.pos.y });
            setIsWalking(true);
          }
        } else if (Date.now() > state.pauseUntil) {
          state.target = {
            x: Math.random() * 55 + 20,
            y: Math.random() * 25 + 55,
          };
          const dx = state.target.x - state.pos.x;
          setDirection(dx > 0 ? "right" : "left");
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = stateRef.current;
    state.isDragging = true;
    state.target = null;
    setIsDragging(true);
    setIsWalking(false);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = state.pos.x;
    const startPosY = state.pos.y;

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / window.innerWidth) * 100;
      const dy = ((ev.clientY - startY) / window.innerHeight) * 100;
      state.pos.x = Math.max(5, Math.min(95, startPosX + dx));
      state.pos.y = Math.max(10, Math.min(90, startPosY + dy));
      setRenderPos({ x: state.pos.x, y: state.pos.y });
    };

    const onUp = () => {
      state.isDragging = false;
      state.pauseUntil = Date.now() + 2500;
      setIsDragging(false);
      triggerMood("happy");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [triggerMood]);

  const handleClick = useCallback(() => {
    if (stateRef.current.isDragging) return;
    const count = clickCount + 1;
    setClickCount(count);
    if (count % 7 === 0) triggerMood("blush");
    else if (count % 4 === 0) triggerMood("wink");
    else if (count % 3 === 0) triggerMood("cheer");
    else triggerMood("happy");
  }, [clickCount, triggerMood]);

  const moodInfo = MOOD_CONFIG[mood];
  const isActive = mood !== "idle";
  const legAnim = isWalking ? [0, 2, 0, -2][frame] : 0;
  const armAnim = isWalking ? [1, -1, -1, 1][frame] : 0;
  const breathe = !isWalking ? Math.sin(frame * 0.8) * 0.3 : 0;
  const isBlinking = blinkFrame > 0 && mood === "idle";

  return (
    <div
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
          className="absolute -top-14 left-1/2 whitespace-nowrap rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-pink-200 dark:border-pink-500/30 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-white shadow-xl"
          style={{
            transform: `translateX(-50%) scaleX(${direction === "left" ? -1 : 1})`,
            animation: "bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
          }}
        >
          <span className="mr-1">{moodInfo.emoji}</span>
          <span>{moodInfo.text}</span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white/95 dark:bg-gray-900/95 border-r border-b border-pink-200 dark:border-pink-500/30" />
        </div>
      )}

      {/* Nami pixel art - 64x100 viewBox for maximum detail */}
      <svg
        viewBox="0 0 64 100"
        width="80"
        height="125"
        style={{
          imageRendering: "pixelated",
          filter: isDragging
            ? "drop-shadow(0 8px 16px rgba(255,107,0,0.5))"
            : "drop-shadow(0 3px 8px rgba(0,0,0,0.3))",
          transform: `translateY(${breathe}px)`,
        }}
      >
        {/* ===== HAIR TOP ===== */}
        <rect x="20" y="0" width="24" height="2" fill="#FF8C00" />
        <rect x="17" y="2" width="30" height="2" fill="#FF7B00" />
        <rect x="15" y="4" width="34" height="3" fill="#FF6B00" />
        <rect x="14" y="7" width="36" height="3" fill="#FF7B00" />
        {/* Hair volume/shine */}
        <rect x="22" y="2" width="6" height="2" fill="#FFAA40" opacity="0.6" />
        <rect x="32" y="4" width="8" height="2" fill="#FFAA40" opacity="0.4" />
        {/* Bangs */}
        <rect x="16" y="10" width="6" height="4" fill="#FF6B00" />
        <rect x="20" y="10" width="4" height="3" fill="#FF7B00" />
        <rect x="38" y="10" width="4" height="3" fill="#FF7B00" />
        <rect x="40" y="10" width="6" height="4" fill="#FF6B00" />

        {/* ===== SIDE HAIR (flowing) ===== */}
        <rect x="10" y="8" width="5" height="26" fill="#FF8C00" />
        <rect x="8" y="14" width="4" height="22" fill="#FF6B00" />
        <rect x="6" y="20" width="3" height="18" fill="#FF7B00" />
        <rect x="5" y="28" width="2" height="12" fill="#FF6B00" />
        <rect x="49" y="8" width="5" height="26" fill="#FF8C00" />
        <rect x="52" y="14" width="4" height="22" fill="#FF6B00" />
        <rect x="55" y="20" width="3" height="18" fill="#FF7B00" />
        <rect x="57" y="28" width="2" height="12" fill="#FF6B00" />

        {/* ===== FACE ===== */}
        <rect x="18" y="10" width="28" height="20" fill="#FFE8D0" />
        {/* Face contour/shadow */}
        <rect x="18" y="26" width="28" height="2" fill="#FFD4B0" />
        <rect x="20" y="28" width="24" height="2" fill="#FFD4B0" />

        {/* ===== EYES ===== */}
        {isBlinking ? (
          <>
            {/* Blink animation */}
            <rect x="21" y="18" width="8" height="1" fill="#4A2800" />
            <rect x="35" y="18" width="8" height="1" fill="#4A2800" />
          </>
        ) : mood === "wink" ? (
          <>
            {/* Left eye wink */}
            <rect x="22" y="18" width="7" height="1" fill="#4A2800" />
            <rect x="23" y="17" width="5" height="1" fill="#4A2800" />
            {/* Right eye open */}
            <rect x="35" y="15" width="9" height="7" fill="#FFFFFF" />
            <rect x="37" y="16" width="6" height="5" fill="#6B3A00" />
            <rect x="38" y="17" width="4" height="3" fill="#1A0800" />
            <rect x="39" y="17" width="2" height="1" fill="#FFFFFF" />
            <rect x="35" y="14" width="3" height="1" fill="#4A2800" />
            <rect x="42" y="14" width="3" height="1" fill="#4A2800" />
          </>
        ) : mood === "happy" || mood === "cheer" ? (
          <>
            {/* Happy closed eyes (arcs) */}
            <rect x="22" y="18" width="8" height="1" fill="#4A2800" />
            <rect x="23" y="17" width="6" height="1" fill="#4A2800" />
            <rect x="24" y="16" width="4" height="1" fill="#4A2800" />
            <rect x="35" y="18" width="8" height="1" fill="#4A2800" />
            <rect x="36" y="17" width="6" height="1" fill="#4A2800" />
            <rect x="37" y="16" width="4" height="1" fill="#4A2800" />
          </>
        ) : mood === "blush" ? (
          <>
            {/* Shy half-closed */}
            <rect x="21" y="16" width="9" height="5" fill="#FFFFFF" />
            <rect x="23" y="17" width="5" height="3" fill="#6B3A00" />
            <rect x="24" y="18" width="3" height="2" fill="#1A0800" />
            <rect x="21" y="16" width="9" height="2" fill="#FFE8D0" />
            <rect x="35" y="16" width="9" height="5" fill="#FFFFFF" />
            <rect x="37" y="17" width="5" height="3" fill="#6B3A00" />
            <rect x="38" y="18" width="3" height="2" fill="#1A0800" />
            <rect x="35" y="16" width="9" height="2" fill="#FFE8D0" />
          </>
        ) : (
          <>
            {/* Normal big eyes */}
            <rect x="20" y="15" width="10" height="7" fill="#FFFFFF" />
            <rect x="22" y="16" width="7" height="5" fill="#6B3A00" />
            <rect x="24" y="17" width="4" height="3" fill="#1A0800" />
            <rect x="24" y="16" width="2" height="1" fill="#FFFFFF" />
            <rect x="34" y="15" width="10" height="7" fill="#FFFFFF" />
            <rect x="36" y="16" width="7" height="5" fill="#6B3A00" />
            <rect x="38" y="17" width="4" height="3" fill="#1A0800" />
            <rect x="38" y="16" width="2" height="1" fill="#FFFFFF" />
            {/* Eyelashes */}
            <rect x="19" y="14" width="3" height="1" fill="#4A2800" />
            <rect x="28" y="14" width="3" height="1" fill="#4A2800" />
            <rect x="33" y="14" width="3" height="1" fill="#4A2800" />
            <rect x="42" y="14" width="3" height="1" fill="#4A2800" />
            {/* Lower lash */}
            <rect x="21" y="22" width="2" height="1" fill="#4A2800" opacity="0.4" />
            <rect x="41" y="22" width="2" height="1" fill="#4A2800" opacity="0.4" />
          </>
        )}

        {/* Blush cheeks */}
        {(mood === "blush" || mood === "happy" || mood === "wink") && (
          <>
            <rect x="19" y="22" width="5" height="3" fill="#FF8888" opacity="0.4" />
            <rect x="40" y="22" width="5" height="3" fill="#FF8888" opacity="0.4" />
          </>
        )}

        {/* Nose */}
        <rect x="31" y="22" width="2" height="2" fill="#FFDAB0" />

        {/* Mouth */}
        {mood === "happy" || mood === "cheer" ? (
          <>
            <rect x="27" y="26" width="10" height="3" fill="#FF5C7A" />
            <rect x="28" y="29" width="8" height="1" fill="#FF5C7A" />
            <rect x="29" y="27" width="6" height="1" fill="#FF8A9E" />
          </>
        ) : mood === "blush" ? (
          <>
            <rect x="29" y="26" width="6" height="2" fill="#FF5C7A" />
            <rect x="30" y="28" width="4" height="1" fill="#FF5C7A" />
          </>
        ) : mood === "wink" ? (
          <>
            <rect x="28" y="26" width="8" height="2" fill="#FF5C7A" />
            <rect x="30" y="25" width="1" height="1" fill="#FF5C7A" />
          </>
        ) : (
          <rect x="29" y="26" width="6" height="1" fill="#FF5C7A" />
        )}

        {/* ===== NECK ===== */}
        <rect x="28" y="30" width="8" height="4" fill="#FFE8D0" />

        {/* ===== BIKINI TOP ===== */}
        <rect x="19" y="34" width="26" height="10" fill="#FFE8D0" />
        {/* Left cup */}
        <rect x="20" y="35" width="10" height="8" fill="#1E88E5" />
        <rect x="21" y="36" width="8" height="6" fill="#2196F3" />
        <rect x="22" y="37" width="3" height="2" fill="#64B5F6" opacity="0.5" />
        {/* Right cup */}
        <rect x="34" y="35" width="10" height="8" fill="#1E88E5" />
        <rect x="35" y="36" width="8" height="6" fill="#2196F3" />
        <rect x="36" y="37" width="3" height="2" fill="#64B5F6" opacity="0.5" />
        {/* Center string */}
        <rect x="30" y="36" width="4" height="2" fill="#1565C0" />
        {/* Straps */}
        <rect x="24" y="33" width="2" height="2" fill="#1565C0" />
        <rect x="38" y="33" width="2" height="2" fill="#1565C0" />

        {/* ===== WAIST ===== */}
        <rect x="22" y="44" width="20" height="5" fill="#FFE8D0" />
        <rect x="31" y="45" width="2" height="2" fill="#FFDAB0" />

        {/* ===== JEANS SHORTS ===== */}
        <rect x="19" y="49" width="26" height="9" fill="#1976D2" />
        <rect x="20" y="50" width="24" height="7" fill="#1E88E5" />
        {/* Belt */}
        <rect x="19" y="49" width="26" height="2" fill="#5D4037" />
        <rect x="30" y="49" width="4" height="2" fill="#FFD700" />
        {/* Pockets */}
        <rect x="22" y="53" width="4" height="3" fill="#1565C0" />
        <rect x="38" y="53" width="4" height="3" fill="#1565C0" />
        {/* Shorts hem */}
        <rect x="19" y="56" width="12" height="2" fill="#1565C0" />
        <rect x="33" y="56" width="12" height="2" fill="#1565C0" />

        {/* ===== LEGS ===== */}
        <rect x={22 + legAnim} y="58" width="7" height="18" fill="#FFE8D0" />
        <rect x={35 - legAnim} y="58" width="7" height="18" fill="#FFE8D0" />
        {/* Knee shine */}
        <rect x={23 + legAnim} y="66" width="3" height="2" fill="#FFF0DC" opacity="0.4" />
        <rect x={36 - legAnim} y="66" width="3" height="2" fill="#FFF0DC" opacity="0.4" />
        {/* Ankle */}
        <rect x={23 + legAnim} y="74" width="5" height="2" fill="#FFDAB0" />
        <rect x={36 - legAnim} y="74" width="5" height="2" fill="#FFDAB0" />

        {/* ===== HEELED SANDALS ===== */}
        <rect x={20 + legAnim} y="76" width="10" height="3" fill="#FF8C00" />
        <rect x={21 + legAnim} y="76" width="3" height="1" fill="#FFB74D" />
        <rect x={22 + legAnim} y="79" width="3" height="2" fill="#E65100" />
        <rect x={33 - legAnim} y="76" width="10" height="3" fill="#FF8C00" />
        <rect x={34 - legAnim} y="76" width="3" height="1" fill="#FFB74D" />
        <rect x={38 - legAnim} y="79" width="3" height="2" fill="#E65100" />

        {/* ===== ARMS ===== */}
        {mood === "cheer" ? (
          <>
            {/* Arms raised celebration */}
            <rect x="10" y="26" width="5" height="12" fill="#FFE8D0" />
            <rect x="9" y="20" width="5" height="7" fill="#FFE8D0" />
            <rect x="8" y="17" width="4" height="4" fill="#FFE8D0" />
            <rect x="49" y="26" width="5" height="12" fill="#FFE8D0" />
            <rect x="50" y="20" width="5" height="7" fill="#FFE8D0" />
            <rect x="52" y="17" width="4" height="4" fill="#FFE8D0" />
            {/* Hands */}
            <rect x="7" y="15" width="5" height="3" fill="#FFDAB0" />
            <rect x="52" y="15" width="5" height="3" fill="#FFDAB0" />
          </>
        ) : (
          <>
            {/* Normal arms with walk swing */}
            <rect x={12 + armAnim} y="36" width="5" height="14" fill="#FFE8D0" />
            <rect x={47 - armAnim} y="36" width="5" height="14" fill="#FFE8D0" />
            {/* Hands */}
            <rect x={12 + armAnim} y="50" width="5" height="4" fill="#FFDAB0" />
            <rect x={47 - armAnim} y="50" width="5" height="4" fill="#FFDAB0" />
          </>
        )}

        {/* ===== SPARKLES ===== */}
        {isActive && (
          <>
            <rect x="2" y="5" width="3" height="3" fill="#FFD700">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.4s" repeatCount="indefinite" />
            </rect>
            <rect x="58" y="8" width="3" height="3" fill="#FF69B4">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="0.5s" repeatCount="indefinite" />
            </rect>
            <rect x="4" y="70" width="2" height="2" fill="#00E5FF">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite" />
            </rect>
            <rect x="56" y="65" width="2" height="2" fill="#FF69B4">
              <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
            </rect>
            <rect x="30" y="2" width="4" height="1" fill="#FFD700">
              <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" />
            </rect>
          </>
        )}
      </svg>

      {/* Dust when walking */}
      {isWalking && !isDragging && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-orange-400/50"
              style={{
                opacity: frame % 3 === i ? 0.9 : 0.1,
                transform: `translateY(${frame % 3 === i ? -3 : 0}px) scale(${frame % 3 === i ? 1.3 : 0.8})`,
                transition: "all 0.15s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-orange-400/80 font-medium">
          ✦ ✦ ✦
        </div>
      )}
    </div>
  );
}
