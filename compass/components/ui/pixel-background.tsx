"use client";

import { useEffect, useRef } from "react";

/**
 * 像素风动画背景 — 大量明显可见的浮动像素粒子
 * 全局 canvas，确保在所有页面可见
 */
export function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
      phase: number;
      phaseSpeed: number;
    };

    type Floater = {
      x: number;
      y: number;
      speedX: number;
      speedY: number;
      shape: number; // 0-3
      size: number;
      opacity: number;
      angle: number;
      angleSpeed: number;
    };

    const darkColors = ["#FF6B00", "#00BCD4", "#FF69B4", "#FFD700", "#9C27B0", "#4CAF50", "#2196F3", "#E91E63"];
    const lightColors = ["#E65100", "#00838F", "#C2185B", "#F57F17", "#6A1B9A", "#2E7D32", "#1565C0", "#AD1457"];

    let particles: Particle[] = [];
    let floaters: Floater[] = [];

    const isDark = () => !document.documentElement.getAttribute("data-theme")?.includes("light");
    const getColors = () => isDark() ? darkColors : lightColors;

    const createParticle = (randomY = true): Particle => {
      const colors = getColors();
      return {
        x: Math.random() * canvas.width,
        y: randomY ? Math.random() * canvas.height : canvas.height + Math.random() * 50,
        size: Math.random() * 6 + 4, // 4-10px — BIG pixels
        speedY: -(Math.random() * 0.5 + 0.2), // float up
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.4, // 0.4-0.9 — VERY visible
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.04 + 0.02,
      };
    };

    const createFloater = (): Floater => {
      const fromLeft = Math.random() > 0.5;
      return {
        x: fromLeft ? -40 : canvas.width + 40,
        y: Math.random() * canvas.height * 0.7 + canvas.height * 0.1,
        speedX: (Math.random() * 1.0 + 0.4) * (fromLeft ? 1 : -1),
        speedY: (Math.random() - 0.5) * 0.4,
        shape: Math.floor(Math.random() * 4),
        size: Math.random() * 8 + 6, // 6-14px — big shapes
        opacity: Math.random() * 0.5 + 0.4,
        angle: 0,
        angleSpeed: (Math.random() - 0.5) * 0.04,
      };
    };

    // LOTS of particles — 80-150
    const count = Math.max(80, Math.floor((canvas.width * canvas.height) / 8000));
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(true));
    }

    // Start with some floaters already on screen
    for (let i = 0; i < 4; i++) {
      const f = createFloater();
      f.x = Math.random() * canvas.width;
      floaters.push(f);
    }

    let frame = 0;

    const drawPixelShape = (x: number, y: number, shape: number, size: number) => {
      const s = Math.floor(size / 2);
      switch (shape) {
        case 0: // cross/star
          ctx.fillRect(x - s * 2, y - s / 2, s * 4, s);
          ctx.fillRect(x - s / 2, y - s * 2, s, s * 4);
          ctx.fillRect(x - s, y - s, s * 2, s * 2);
          break;
        case 1: // heart
          ctx.fillRect(x - s * 2, y - s, s, s * 2);
          ctx.fillRect(x - s, y - s * 2, s, s);
          ctx.fillRect(x - s, y - s, s, s * 3);
          ctx.fillRect(x, y - s * 2, s, s);
          ctx.fillRect(x, y - s, s, s * 3);
          ctx.fillRect(x + s, y - s, s, s * 2);
          ctx.fillRect(x - s, y + s, s * 2, s);
          break;
        case 2: // diamond
          ctx.fillRect(x - s / 2, y - s * 2, s, s);
          ctx.fillRect(x - s, y - s, s * 2, s);
          ctx.fillRect(x - s * 1.5, y, s * 3, s);
          ctx.fillRect(x - s, y + s, s * 2, s);
          ctx.fillRect(x - s / 2, y + s * 2, s, s);
          break;
        case 3: // sakura/flower
          ctx.fillRect(x, y - s * 2, s, s);
          ctx.fillRect(x - s * 2, y, s, s);
          ctx.fillRect(x + s, y, s, s);
          ctx.fillRect(x, y + s, s, s);
          ctx.fillRect(x - s, y - s, s * 2, s * 2);
          break;
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += p.phaseSpeed;

        // Pulsing glow
        const pulse = 0.6 + Math.sin(p.phase) * 0.4;
        ctx.globalAlpha = p.opacity * pulse;
        ctx.fillStyle = p.color;

        // Snap to pixel grid for that retro feel
        const px = Math.round(p.x / p.size) * p.size;
        const py = Math.round(p.y / p.size) * p.size;
        ctx.fillRect(px, py, p.size, p.size);

        // Also draw a smaller highlight pixel for glow effect
        ctx.globalAlpha = p.opacity * pulse * 0.3;
        ctx.fillRect(px - 1, py - 1, p.size + 2, p.size + 2);

        // Reset if off screen
        if (p.y < -30) {
          particles[i] = createParticle(false);
        }
        if (p.x < -30) p.x = canvas.width + 20;
        if (p.x > canvas.width + 30) p.x = -20;
      }

      // Spawn floaters
      if (frame % 90 === 0 && floaters.length < 8) {
        floaters.push(createFloater());
      }

      // Draw floaters
      const shapeColors = isDark()
        ? ["#FFD700", "#FF69B4", "#00BCD4", "#FFB7C5"]
        : ["#F57F17", "#C2185B", "#00838F", "#E91E63"];

      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.x += f.speedX;
        f.y += f.speedY;
        f.angle += f.angleSpeed;

        ctx.globalAlpha = f.opacity;
        ctx.fillStyle = shapeColors[f.shape];

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        drawPixelShape(0, 0, f.shape, f.size);
        ctx.restore();

        if (f.x < -80 || f.x > canvas.width + 80 || f.y < -80 || f.y > canvas.height + 80) {
          floaters.splice(i, 1);
        }
      }

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[3] pointer-events-none"
      aria-hidden="true"
    />
  );
}
