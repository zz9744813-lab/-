"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * 动态 Canvas 背景 — 每个页面不同的动画主题
 * 全部用代码生成，不依赖外部资源
 */

export function PixelBackground() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const routeKey = (() => {
    if (pathname.startsWith("/schedule")) return "ocean";
    if (pathname.startsWith("/dashboard")) return "galaxy";
    if (pathname.startsWith("/goals")) return "mountain";
    if (pathname.startsWith("/journal")) return "sakura";
    if (pathname.startsWith("/finance")) return "city";
    if (pathname.startsWith("/inbox")) return "aurora";
    return "galaxy";
  })();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let t = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // ===== 海洋波浪 =====
    const drawOcean = () => {
      const w = canvas.width, h = canvas.height;
      // 天空渐变
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, "#0a0a2a");
      sky.addColorStop(0.5, "#1a1040");
      sky.addColorStop(1, "#0d2847");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.6);
      // 海面
      const sea = ctx.createLinearGradient(0, h * 0.5, 0, h);
      sea.addColorStop(0, "#0a3055");
      sea.addColorStop(0.5, "#062040");
      sea.addColorStop(1, "#030d1a");
      ctx.fillStyle = sea;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);
      // 月亮
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.15, 40, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 250, 230, 0.9)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.75 + 10, h * 0.15 - 5, 35, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a2a";
      ctx.fill();
      // 波浪
      for (let layer = 0; layer < 5; layer++) {
        const yBase = h * 0.5 + layer * 30;
        const alpha = 0.15 - layer * 0.02;
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= w; x += 5) {
          const y = yBase + Math.sin((x * 0.005) + t * 0.02 + layer * 0.8) * (15 - layer * 2)
            + Math.sin((x * 0.01) + t * 0.03 + layer) * (8 - layer);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = `rgba(20, 120, 200, ${alpha})`;
        ctx.fill();
      }
      // 月光倒影
      for (let i = 0; i < 20; i++) {
        const rx = w * 0.75 + Math.sin(t * 0.01 + i) * (10 + i * 3);
        const ry = h * 0.55 + i * 15 + Math.sin(t * 0.02 + i * 0.5) * 3;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 20 - i * 0.5, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 250, 220, ${0.15 - i * 0.006})`;
        ctx.fill();
      }
      // 星星
      for (let i = 0; i < 80; i++) {
        const sx = (i * 137.5 + 50) % w;
        const sy = (i * 97.3 + 20) % (h * 0.45);
        const sa = 0.3 + Math.sin(t * 0.01 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8 + (i % 3) * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${sa})`;
        ctx.fill();
      }
    };

    // ===== 银河星空 =====
    const drawGalaxy = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, w, h);
      // 星云
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.3 + i * 0.2) + Math.sin(t * 0.005 + i) * 50;
        const cy = h * (0.3 + i * 0.15) + Math.cos(t * 0.004 + i) * 30;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200 + i * 50);
        const colors = [["120,80,200", "80,40,150"], ["40,100,180", "20,60,120"], ["150,50,100", "100,20,80"]];
        grad.addColorStop(0, `rgba(${colors[i][0]}, 0.15)`);
        grad.addColorStop(0.5, `rgba(${colors[i][1]}, 0.05)`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
      // 银河带
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(0.3);
      const milky = ctx.createLinearGradient(-w, -50, w, 50);
      milky.addColorStop(0, "transparent");
      milky.addColorStop(0.3, "rgba(100, 80, 160, 0.06)");
      milky.addColorStop(0.5, "rgba(120, 100, 180, 0.08)");
      milky.addColorStop(0.7, "rgba(100, 80, 160, 0.06)");
      milky.addColorStop(1, "transparent");
      ctx.fillStyle = milky;
      ctx.fillRect(-w, -80, w * 2, 160);
      ctx.restore();
      // 星星（多层）
      for (let i = 0; i < 200; i++) {
        const sx = (i * 173.7 + 30) % w;
        const sy = (i * 131.1 + 10) % h;
        const sa = 0.2 + Math.sin(t * 0.008 + i * 0.7) * 0.4;
        const sr = 0.4 + (i % 5) * 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = i % 7 === 0 ? `rgba(180,200,255,${sa})` : i % 11 === 0 ? `rgba(255,200,150,${sa})` : `rgba(255,255,255,${sa})`;
        ctx.fill();
      }
      // 流星
      if (Math.sin(t * 0.005) > 0.95) {
        const mx = (t * 3) % w;
        const my = (t * 1.5) % (h * 0.5);
        const grad2 = ctx.createLinearGradient(mx, my, mx - 80, my - 40);
        grad2.addColorStop(0, "rgba(255,255,255,0.8)");
        grad2.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - 80, my - 40);
        ctx.strokeStyle = grad2;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    // ===== 山峰云海 =====
    const drawMountain = () => {
      const w = canvas.width, h = canvas.height;
      // 天空
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1a0a30");
      sky.addColorStop(0.3, "#2d1b4e");
      sky.addColorStop(0.5, "#4a2060");
      sky.addColorStop(0.7, "#d4556a");
      sky.addColorStop(1, "#0a0a15");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // 山脉
      for (let layer = 0; layer < 4; layer++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 3) {
          const baseY = h * (0.5 + layer * 0.12);
          const y = baseY - Math.abs(Math.sin(x * 0.003 + layer * 2)) * (120 - layer * 25)
            - Math.abs(Math.sin(x * 0.007 + layer)) * (50 - layer * 10);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const darkness = 0.15 + layer * 0.08;
        ctx.fillStyle = `rgba(10, 10, 25, ${darkness + 0.3})`;
        ctx.fill();
      }
      // 云
      for (let i = 0; i < 8; i++) {
        const cx = (i * 200 + t * 0.3 + i * 50) % (w + 200) - 100;
        const cy = h * 0.45 + i * 20 + Math.sin(t * 0.003 + i) * 10;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 80 + i * 10, 20 + i * 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + Math.sin(t * 0.005 + i) * 0.015})`;
        ctx.fill();
      }
      // 星星
      for (let i = 0; i < 60; i++) {
        const sx = (i * 157.3) % w;
        const sy = (i * 89.7) % (h * 0.4);
        const sa = 0.3 + Math.sin(t * 0.01 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7 + (i % 3) * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${sa})`;
        ctx.fill();
      }
    };

    // ===== 樱花飘落 =====
    const sakuraParticles: { x: number; y: number; r: number; rot: number; vx: number; vy: number; vr: number }[] = [];
    for (let i = 0; i < 50; i++) {
      sakuraParticles.push({
        x: Math.random() * 2000, y: Math.random() * 1200 - 200,
        r: Math.random() * 6 + 3, rot: Math.random() * Math.PI * 2,
        vx: Math.random() * 0.5 - 0.1, vy: Math.random() * 1 + 0.3,
        vr: (Math.random() - 0.5) * 0.02,
      });
    }
    const drawSakura = () => {
      const w = canvas.width, h = canvas.height;
      // 夜空
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0d0520");
      sky.addColorStop(0.5, "#1a0a30");
      sky.addColorStop(1, "#0a0515");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // 月亮
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.2, 50, 0, Math.PI * 2);
      const moonGrad = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, 80);
      moonGrad.addColorStop(0, "rgba(255, 250, 240, 0.9)");
      moonGrad.addColorStop(0.6, "rgba(255, 240, 220, 0.3)");
      moonGrad.addColorStop(1, "transparent");
      ctx.fillStyle = moonGrad;
      ctx.fill();
      // 树枝轮廓
      ctx.strokeStyle = "rgba(30, 10, 20, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.3);
      ctx.quadraticCurveTo(w * 0.15, h * 0.25, w * 0.3, h * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w, h * 0.15);
      ctx.quadraticCurveTo(w * 0.8, h * 0.2, w * 0.65, h * 0.25);
      ctx.stroke();
      // 花瓣飘落
      for (const p of sakuraParticles) {
        p.x += p.vx + Math.sin(t * 0.01 + p.y * 0.01) * 0.3;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        if (p.x > w + 20) p.x = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${180 + Math.random() * 40}, ${200 + Math.random() * 30}, 0.7)`;
        ctx.fill();
        ctx.restore();
      }
    };

    // ===== 城市霓虹 =====
    const drawCity = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#050508";
      ctx.fillRect(0, 0, w, h);
      // 建筑轮廓
      for (let i = 0; i < 30; i++) {
        const bx = i * (w / 30);
        const bw = w / 30 - 2;
        const bh = 80 + Math.abs(Math.sin(i * 1.3)) * 200;
        ctx.fillStyle = `rgba(15, 15, 25, 0.9)`;
        ctx.fillRect(bx, h - bh, bw, bh);
        // 窗户
        for (let wy = h - bh + 10; wy < h - 10; wy += 15) {
          for (let wx = bx + 3; wx < bx + bw - 3; wx += 8) {
            const lit = Math.sin(wx * 0.1 + wy * 0.05 + t * 0.002) > 0.3;
            if (lit) {
              ctx.fillStyle = `rgba(255, ${200 + Math.random() * 55}, ${50 + Math.random() * 100}, 0.6)`;
              ctx.fillRect(wx, wy, 4, 8);
            }
          }
        }
      }
      // 霓虹光
      for (let i = 0; i < 5; i++) {
        const nx = (i * w / 5) + Math.sin(t * 0.01 + i) * 20;
        const ny = h * 0.3 + Math.cos(t * 0.008 + i) * 30;
        const nGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, 100);
        const colors = ["255,50,100", "50,100,255", "255,200,0", "0,255,200", "200,50,255"];
        nGrad.addColorStop(0, `rgba(${colors[i]}, 0.15)`);
        nGrad.addColorStop(1, "transparent");
        ctx.fillStyle = nGrad;
        ctx.fillRect(0, 0, w, h);
      }
    };

    // ===== 极光 =====
    const drawAurora = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, w, h);
      // 极光带
      for (let band = 0; band < 4; band++) {
        ctx.beginPath();
        ctx.moveTo(0, h * 0.2 + band * 40);
        for (let x = 0; x <= w; x += 3) {
          const y = h * 0.2 + band * 40
            + Math.sin(x * 0.003 + t * 0.008 + band) * 40
            + Math.sin(x * 0.007 + t * 0.012 + band * 2) * 20;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h * 0.6 + band * 30);
        for (let x = w; x >= 0; x -= 3) {
          const y = h * 0.4 + band * 30
            + Math.sin(x * 0.004 + t * 0.01 + band + 1) * 30;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        const colors = ["0,255,150", "0,200,255", "100,50,255", "0,255,200"];
        ctx.fillStyle = `rgba(${colors[band]}, ${0.06 + Math.sin(t * 0.005 + band) * 0.03})`;
        ctx.fill();
      }
      // 星星
      for (let i = 0; i < 120; i++) {
        const sx = (i * 163.7) % w;
        const sy = (i * 97.1) % h;
        const sa = 0.2 + Math.sin(t * 0.01 + i * 0.5) * 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6 + (i % 4) * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${sa})`;
        ctx.fill();
      }
      // 地面雪景
      ctx.fillStyle = "rgba(10, 15, 25, 0.9)";
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 5) {
        ctx.lineTo(x, h * 0.85 + Math.sin(x * 0.01) * 10);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    };

    const drawFrame = () => {
      t++;
      switch (routeKey) {
        case "ocean": drawOcean(); break;
        case "galaxy": drawGalaxy(); break;
        case "mountain": drawMountain(); break;
        case "sakura": drawSakura(); break;
        case "city": drawCity(); break;
        case "aurora": drawAurora(); break;
        default: drawGalaxy(); break;
      }
      animId = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [routeKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", width: "100vw", height: "100vh" }}
      aria-hidden="true"
    />
  );
}
