"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * 娜美桌宠 — 海贼王风格像素角色
 * 特征：橙色长发、绿色比基尼上衣、蓝色牛仔裤、天候棒
 * 动画状态：idle、走路、跳跃、挥手、思考、睡觉
 * 交互：点击触发不同反应
 */

type AnimState = "idle" | "walk" | "jump" | "wave" | "think" | "sleep" | "happy";

export function PixelCharacter({ className = "" }: { className?: string }) {
  const [frame, setFrame] = useState(0);
  const [state, setState] = useState<AnimState>("idle");
  const [isHovered, setIsHovered] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");

  // 自动切换动画状态
  useEffect(() => {
    const stateTimer = setInterval(() => {
      if (state === "sleep") return;
      const rand = Math.random();
      if (rand < 0.3) setState("idle");
      else if (rand < 0.5) setState("walk");
      else if (rand < 0.65) setState("wave");
      else if (rand < 0.8) setState("think");
      else if (rand < 0.9) setState("jump");
      else setState("happy");
    }, 4000);
    return () => clearInterval(stateTimer);
  }, [state]);

  // 帧动画
  useEffect(() => {
    const speed = state === "walk" ? 250 : state === "jump" ? 200 : 400;
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, speed);
    return () => clearInterval(timer);
  }, [state]);

  // 长时间不互动进入睡眠
  useEffect(() => {
    const sleepTimer = setTimeout(() => {
      setState("sleep");
    }, 30000);
    return () => clearTimeout(sleepTimer);
  }, [clickCount, isHovered]);

  // 点击交互
  const handleClick = useCallback(() => {
    setClickCount((c) => c + 1);
    if (state === "sleep") {
      setState("idle");
      setBubbleText("嗯...我醒了！");
    } else {
      const reactions = [
        { state: "happy" as AnimState, text: "嘿嘿~" },
        { state: "wave" as AnimState, text: "你好呀！" },
        { state: "jump" as AnimState, text: "要出海吗？" },
        { state: "think" as AnimState, text: "钱钱钱..." },
        { state: "happy" as AnimState, text: "航海士娜美！" },
        { state: "wave" as AnimState, text: "别碰我！要收费的！" },
      ];
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      setState(reaction.state);
      setBubbleText(reaction.text);
    }
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), 2500);
  }, [state]);

  // 娜美的颜色
  const colors = {
    hair: "#FF8C42",
    hairDark: "#E06B20",
    skin: "#FFDAB9",
    skinDark: "#F0C090",
    eyes: "#5C3317",
    top: "#2ECC71",
    topDark: "#27AE60",
    pants: "#3498DB",
    pantsDark: "#2980B9",
    shoes: "#FF7F50",
    staff: "#4ECDC4",
    staffOrb: "#FFD700",
  };

  const getBodyOffset = () => {
    if (state === "jump") return frame < 2 ? -3 : 0;
    if (state === "idle") return frame % 2 === 0 ? 0 : -0.5;
    return 0;
  };

  const getArmAngle = () => {
    if (state === "wave") return frame % 2 === 0 ? -30 : -50;
    if (state === "happy") return frame % 2 === 0 ? -20 : -40;
    return 0;
  };

  const getLegOffset = () => {
    if (state === "walk") return frame % 2 === 0 ? 1 : -1;
    return 0;
  };

  const bodyY = getBodyOffset();
  const armAngle = getArmAngle();
  const legOffset = getLegOffset();

  return (
    <div
      className={`nami-pet ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: "pointer", position: "relative", userSelect: "none" }}
    >
      {showBubble && (
        <div className="nami-bubble">
          {bubbleText}
        </div>
      )}

      <svg
        viewBox="0 0 32 48"
        width="64"
        height="96"
        style={{ imageRendering: "pixelated", overflow: "visible" }}
      >
        {isHovered && (
          <circle cx="16" cy="24" r="20" fill="rgba(255,140,66,0.1)" className="nami-glow" />
        )}

        <g transform={`translate(0, ${bodyY})`}>
          {/* 头发后层 - 长发垂下 */}
          <rect x="8" y="2" width="3" height="18" rx="1" fill={colors.hairDark} opacity="0.8" />
          <rect x="21" y="2" width="3" height="18" rx="1" fill={colors.hairDark} opacity="0.8" />

          {/* 头部 */}
          <rect x="10" y="1" width="12" height="12" rx="2" fill={colors.skin} />

          {/* 头发前层 */}
          <rect x="9" y="0" width="14" height="5" rx="2" fill={colors.hair} />
          <rect x="9" y="1" width="3" height="8" rx="1" fill={colors.hair} />
          <rect x="20" y="1" width="3" height="7" rx="1" fill={colors.hair} />
          <rect x="11" y="3" width="2" height="3" rx="1" fill={colors.hair} opacity="0.9" />

          {/* 眼睛 */}
          {state === "sleep" ? (
            <>
              <rect x="12" y="6" width="3" height="1" fill={colors.eyes} />
              <rect x="18" y="6" width="3" height="1" fill={colors.eyes} />
            </>
          ) : (
            <>
              <rect x="12" y="5" width="3" height="3" rx="1" fill={colors.eyes} />
              <rect x="18" y="5" width="3" height="3" rx="1" fill={colors.eyes} />
              <rect x="13" y="5" width="1" height="1" fill="#FFF" opacity="0.8" />
              <rect x="19" y="5" width="1" height="1" fill="#FFF" opacity="0.8" />
            </>
          )}

          {/* 嘴巴 */}
          {state === "happy" || state === "wave" ? (
            <path d="M14 10 Q16 12 18 10" stroke={colors.eyes} strokeWidth="0.8" fill="none" />
          ) : state === "sleep" ? (
            <text x="14" y="11" fontSize="3" fill={colors.eyes}>z</text>
          ) : state === "think" ? (
            <rect x="14" y="10" width="4" height="1.5" rx="0.5" fill={colors.skinDark} />
          ) : (
            <rect x="15" y="10" width="2" height="1" rx="0.5" fill="#E88" />
          )}

          {/* 身体 - 绿色比基尼上衣 */}
          <rect x="11" y="13" width="10" height="7" rx="1" fill={colors.top} />
          <rect x="12" y="13" width="8" height="2" fill={colors.topDark} />

          {/* 左臂 */}
          <g transform={`rotate(${state === "wave" || state === "happy" ? armAngle : 0}, 11, 14)`}>
            <rect x="8" y="14" width="3" height="7" rx="1" fill={colors.skin} />
          </g>

          {/* 右臂 + 天候棒 */}
          <g transform={`rotate(${state === "think" ? -10 : 0}, 21, 14)`}>
            <rect x="21" y="14" width="3" height="7" rx="1" fill={colors.skin} />
            {(state === "idle" || state === "think" || state === "walk") && (
              <>
                <rect x="23" y="10" width="1.5" height="14" rx="0.5" fill={colors.staff} />
                <circle cx="23.75" cy="9" r="1.5" fill={colors.staffOrb} />
              </>
            )}
          </g>

          {/* 裤子 */}
          <rect x="11" y="20" width="10" height="8" rx="1" fill={colors.pants} />
          <rect x="11" y="20" width="10" height="1" fill={colors.pantsDark} />

          {/* 腿 */}
          <rect x={`${12 + legOffset}`} y="28" width="4" height="8" rx="1" fill={colors.pants} />
          <rect x={`${17 - legOffset}`} y="28" width="4" height="8" rx="1" fill={colors.pants} />

          {/* 鞋子 */}
          <rect x={`${11 + legOffset}`} y="36" width="5" height="2" rx="1" fill={colors.shoes} />
          <rect x={`${16 - legOffset}`} y="36" width="5" height="2" rx="1" fill={colors.shoes} />
        </g>

        {/* 睡觉 ZZZ */}
        {state === "sleep" && (
          <g className="nami-zzz">
            <text x="24" y="4" fontSize="4" fill="var(--text-tertiary)" opacity="0.7">Z</text>
            <text x="26" y="0" fontSize="3" fill="var(--text-tertiary)" opacity="0.5">z</text>
            <text x="28" y="-2" fontSize="2" fill="var(--text-tertiary)" opacity="0.3">z</text>
          </g>
        )}

        {/* 开心星星 */}
        {state === "happy" && frame % 2 === 0 && (
          <>
            <text x="4" y="6" fontSize="3" fill="#FFD700">&#x2726;</text>
            <text x="26" y="10" fontSize="2.5" fill="#FFD700">&#x2726;</text>
          </>
        )}
      </svg>

      <style jsx>{`
        .nami-pet {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.2s ease;
        }
        .nami-pet:hover {
          transform: scale(1.05);
        }
        .nami-pet:active {
          transform: scale(0.95);
        }
        .nami-bubble {
          position: absolute;
          top: -32px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 4px 10px;
          font-size: 11px;
          color: var(--text-primary);
          white-space: nowrap;
          animation: bubble-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 10;
        }
        .nami-bubble::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background: var(--bg-elevated);
          border-right: 1px solid var(--border-default);
          border-bottom: 1px solid var(--border-default);
        }
        @keyframes bubble-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.8); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .nami-glow {
          animation: glow-pulse 1.5s ease-in-out infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.25; }
        }
        .nami-zzz {
          animation: zzz-float 2s ease-in-out infinite;
        }
        @keyframes zzz-float {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
