"use client";

import { useEffect, useRef } from "react";

/**
 * 像素风动画背景 — 浮动的像素粒子 + 偶尔飘过的像素元素
 * 轻量 canvas 实现，不影响性能
 */
export function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let floaters: Floater[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Pixel particle
    type Particle = {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
      life: number;
      maxLife: number;
    };

    // Floating pixel shapes (stars, hearts, diamonds)
    type Floater = {
      x: number;
      y: number;
      speedX: number;
      speedY: number;
      type: "star" | "heart" | "diamond" | "sakura";
      size: number;
      opacity: number;
      rotation: number;
      rotSpeed: number;
    };

    const colors = [
      "rgba(255, 107, 0, 0.3)",   // orange (nami hair)
      "rgba(33, 150, 243, 0.25)", // blue
      "rgba(255, 215, 0, 0.2)",   // gold
      "rgba(255, 105, 180, 0.2)", // pink
      "rgba(0, 188, 212, 0.2)",   // cyan
      "rgba(156, 39, 176, 0.15)", // purple
    ];

    // Initialize particles
    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 25000);
      for (let i = 0; i < count; i++) {
        particles.push(createParticle());
      }
    };

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 2,
      speedY: -(Math.random() * 0.3 + 0.1),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: Math.random() * 300 + 200,
    });

    const createFloater = (): Floater => ({
      x: Math.random() > 0.5 ? -20 : canvas.width + 20,
      y: Math.random() * canvas.height * 0.7,
      speedX: (Math.random() * 0.5 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
      speedY: Math.random() * 0.3 - 0.15,
      type: (["star", "heart", "diamond", "sakura"] as const)[Math.floor(Math.random() * 4)],
      size: Math.random() * 4 + 3,
      opacity: Math.random() * 0.3 + 0.1,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.02,
    });

    // Draw pixel shapes
    const drawPixelStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const s = Math.floor(size);
      ctx.fillRect(x - s, y, s * 2, s);
      ctx.fillRect(x - Math.floor(s / 2), y - s, s, s * 3);
      ctx.fillRect(x - Math.floor(s * 1.5), y - Math.floor(s / 2), s, s);
      ctx.fillRect(x + Math.floor(s / 2), y - Math.floor(s / 2), s, s);
    };

    const drawPixelHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const s = Math.floor(size);
      ctx.fillRect(x - s, y - s, s, s);
      ctx.fillRect(x, y - s, s, s);
      ctx.fillRect(x - s * 2, y, s, s);
      ctx.fillRect(x - s, y, s, s);
      ctx.fillRect(x, y, s, s);
      ctx.fillRect(x + s, y, s, s);
      ctx.fillRect(x - s, y + s, s, s);
      ctx.fillRect(x, y + s, s, s);
    };

    const drawPixelDiamond = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const s = Math.floor(size);
      ctx.fillRect(x, y - s * 2, s, s);
      ctx.fillRect(x - s, y - s, s * 3, s);
      ctx.fillRect(x - s * 2, y, s * 5, s);
      ctx.fillRect(x - s, y + s, s * 3, s);
      ctx.fillRect(x, y + s * 2, s, s);
    };

    const drawPixelSakura = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const s = Math.floor(size);
      ctx.fillRect(x, y - s, s, s);
      ctx.fillRect(x - s, y, s, s);
      ctx.fillRect(x + s, y, s, s);
      ctx.fillRect(x, y + s, s, s);
      ctx.fillRect(x, y, s, s);
    };

    initParticles();

    // Spawn floaters periodically
    let floaterTimer = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((p, i) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.life++;

        // Fade in/out
        const lifeRatio = p.life / p.maxLife;
        const alpha = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;

        ctx.globalAlpha = p.opacity * alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(
          Math.floor(p.x / p.size) * p.size,
          Math.floor(p.y / p.size) * p.size,
          p.size,
          p.size
        );

        // Reset dead particles
        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = createParticle();
          particles[i].y = canvas.height + 10;
        }
      });

      // Update and draw floaters
      floaterTimer++;
      if (floaterTimer % 180 === 0 && floaters.length < 5) {
        floaters.push(createFloater());
      }

      floaters = floaters.filter((f) => {
        f.x += f.speedX;
        f.y += f.speedY;
        f.rotation += f.rotSpeed;

        ctx.globalAlpha = f.opacity;
        ctx.fillStyle = f.type === "heart" ? "rgba(255, 105, 180, 0.4)"
          : f.type === "sakura" ? "rgba(255, 183, 197, 0.4)"
          : f.type === "diamond" ? "rgba(0, 188, 212, 0.3)"
          : "rgba(255, 215, 0, 0.35)";

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        switch (f.type) {
          case "star": drawPixelStar(ctx, 0, 0, f.size); break;
          case "heart": drawPixelHeart(ctx, 0, 0, f.size); break;
          case "diamond": drawPixelDiamond(ctx, 0, 0, f.size); break;
          case "sakura": drawPixelSakura(ctx, 0, 0, f.size); break;
        }

        ctx.restore();

        // Remove if off screen
        return f.x > -50 && f.x < canvas.width + 50 && f.y > -50 && f.y < canvas.height + 50;
      });

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
      className="fixed inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    />
  );
}
