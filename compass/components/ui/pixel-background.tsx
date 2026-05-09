"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Theme = "starfield" | "matrix" | "aurora" | "cyber" | "sakura" | "particles";

const ROUTE_THEMES: Record<string, Theme> = {
  "/goals": "starfield",
  "/schedule": "matrix",
  "/habits": "aurora",
  "/japan": "cyber",
  "/": "sakura",
  "/journal": "particles",
  "/knowledge": "cyber",
  "/reviews": "aurora",
  "/settings": "particles",
};

/**
 * 每个页面不同的震撼背景动画
 */
export function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const theme = ROUTE_THEMES[pathname] || "particles";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let running = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const isDark = () => {
      const t = document.documentElement.getAttribute("data-theme");
      return !t || !t.includes("light");
    };

    // ============ STARFIELD (Goals) ============
    const starfield = () => {
      type Star = { x: number; y: number; z: number; pz: number };
      const stars: Star[] = [];
      const count = 400;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (let i = 0; i < count; i++) {
        stars.push({
          x: (Math.random() - 0.5) * canvas.width * 2,
          y: (Math.random() - 0.5) * canvas.height * 2,
          z: Math.random() * canvas.width,
          pz: 0,
        });
      }

      // Shooting stars
      type Meteor = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };
      const meteors: Meteor[] = [];
      let meteorTimer = 0;

      const tick = () => {
        if (!running) return;
        const dark = isDark();
        ctx.fillStyle = dark ? "rgba(5, 5, 15, 0.2)" : "rgba(240, 242, 255, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        for (const star of stars) {
          star.pz = star.z;
          star.z -= 3;
          if (star.z < 1) {
            star.x = (Math.random() - 0.5) * canvas.width * 2;
            star.y = (Math.random() - 0.5) * canvas.height * 2;
            star.z = canvas.width;
            star.pz = star.z;
          }

          const sx = (star.x / star.z) * cx + cx;
          const sy = (star.y / star.z) * cy + cy;
          const px = (star.x / star.pz) * cx + cx;
          const py = (star.y / star.pz) * cy + cy;
          const size = Math.max(0.5, (1 - star.z / canvas.width) * 3);
          const alpha = Math.min(1, (1 - star.z / canvas.width) * 1.5);

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.strokeStyle = dark
            ? `rgba(200, 220, 255, ${alpha})`
            : `rgba(100, 120, 200, ${alpha * 0.6})`;
          ctx.lineWidth = size;
          ctx.stroke();
        }

        // Meteors
        meteorTimer++;
        if (meteorTimer > 120 && Math.random() < 0.02) {
          meteorTimer = 0;
          meteors.push({
            x: Math.random() * canvas.width,
            y: 0,
            vx: (Math.random() - 0.3) * 8,
            vy: Math.random() * 6 + 4,
            life: 0,
            maxLife: 40 + Math.random() * 30,
          });
        }

        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx;
          m.y += m.vy;
          m.life++;
          const alpha = 1 - m.life / m.maxLife;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * 5, m.y - m.vy * 5);
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 5, m.y - m.vy * 5);
          grad.addColorStop(0, dark ? `rgba(255, 200, 100, ${alpha})` : `rgba(200, 150, 50, ${alpha * 0.7})`);
          grad.addColorStop(1, "rgba(255, 200, 100, 0)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.stroke();
          if (m.life >= m.maxLife) meteors.splice(i, 1);
        }

        animId = requestAnimationFrame(tick);
      };
      tick();
    };

    // ============ MATRIX RAIN (Schedule) ============
    const matrix = () => {
      const fontSize = 14;
      const cols = Math.floor(canvas.width / fontSize);
      const drops: number[] = new Array(cols).fill(0).map(() => Math.random() * -100);
      const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";

      const tick = () => {
        if (!running) return;
        const dark = isDark();
        ctx.fillStyle = dark ? "rgba(5, 5, 15, 0.05)" : "rgba(245, 248, 255, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < cols; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          // Head character (bright)
          ctx.fillStyle = dark ? "rgba(0, 255, 100, 0.9)" : "rgba(0, 180, 80, 0.7)";
          ctx.fillText(char, x, y);

          // Trail
          if (Math.random() < 0.3) {
            const trailChar = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillStyle = dark ? "rgba(0, 200, 80, 0.3)" : "rgba(0, 150, 60, 0.2)";
            ctx.fillText(trailChar, x, y - fontSize * 2);
          }

          drops[i]++;
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
        }

        animId = requestAnimationFrame(tick);
      };
      tick();
    };

    // ============ AURORA (Habits/Reviews) ============
    const aurora = () => {
      let time = 0;
      const waves = Array.from({ length: 5 }, (_, i) => ({
        amplitude: 30 + Math.random() * 40,
        frequency: 0.002 + Math.random() * 0.003,
        speed: 0.01 + Math.random() * 0.02,
        offset: Math.random() * Math.PI * 2,
        y: canvas.height * (0.3 + i * 0.08),
        hue: [140, 180, 260, 300, 200][i],
      }));

      const tick = () => {
        if (!running) return;
        const dark = isDark();
        ctx.fillStyle = dark ? "rgba(5, 5, 20, 0.03)" : "rgba(245, 248, 255, 0.03)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        time++;

        for (const wave of waves) {
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);

          for (let x = 0; x <= canvas.width; x += 3) {
            const y = wave.y +
              Math.sin(x * wave.frequency + time * wave.speed + wave.offset) * wave.amplitude +
              Math.sin(x * wave.frequency * 2.5 + time * wave.speed * 1.5) * wave.amplitude * 0.3;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(canvas.width, canvas.height);
          ctx.closePath();

          const alpha = dark ? 0.08 : 0.05;
          ctx.fillStyle = `hsla(${wave.hue}, 80%, ${dark ? 60 : 40}%, ${alpha})`;
          ctx.fill();
        }

        animId = requestAnimationFrame(tick);
      };
      tick();
    };

    // ============ CYBER CIRCUIT (Japan/Knowledge) ============
    const cyber = () => {
      type Node = { x: number; y: number; connections: number[]; pulse: number; active: boolean };
      const nodes: Node[] = [];
      const gridSize = 80;
      const cols = Math.ceil(canvas.width / gridSize) + 1;
      const rows = Math.ceil(canvas.height / gridSize) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.4) {
            nodes.push({
              x: c * gridSize + (Math.random() - 0.5) * 20,
              y: r * gridSize + (Math.random() - 0.5) * 20,
              connections: [],
              pulse: Math.random() * Math.PI * 2,
              active: Math.random() < 0.3,
            });
          }
        }
      }

      // Connect nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < gridSize * 1.5 && Math.random() < 0.3) {
            nodes[i].connections.push(j);
          }
        }
      }

      type Packet = { from: number; to: number; progress: number; speed: number };
      const packets: Packet[] = [];
      let time = 0;

      const tick = () => {
        if (!running) return;
        const dark = isDark();
        ctx.fillStyle = dark ? "rgba(5, 5, 20, 0.06)" : "rgba(245, 248, 255, 0.06)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        time++;

        // Draw connections
        for (const node of nodes) {
          for (const ci of node.connections) {
            const target = nodes[ci];
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = dark ? "rgba(0, 200, 255, 0.1)" : "rgba(0, 150, 200, 0.08)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw nodes
        for (const node of nodes) {
          node.pulse += 0.03;
          const glow = node.active ? 0.5 + Math.sin(node.pulse) * 0.3 : 0.15;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = dark
            ? `rgba(0, 220, 255, ${glow})`
            : `rgba(0, 150, 200, ${glow * 0.7})`;
          ctx.fill();
        }

        // Spawn packets
        if (time % 30 === 0) {
          const activeNodes = nodes.filter(n => n.connections.length > 0);
          if (activeNodes.length > 0) {
            const idx = nodes.indexOf(activeNodes[Math.floor(Math.random() * activeNodes.length)]);
            const node = nodes[idx];
            if (node.connections.length > 0) {
              packets.push({
                from: idx,
                to: node.connections[Math.floor(Math.random() * node.connections.length)],
                progress: 0,
                speed: 0.02 + Math.random() * 0.03,
              });
            }
          }
        }

        // Draw packets
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          p.progress += p.speed;
          if (p.progress >= 1) {
            packets.splice(i, 1);
            continue;
          }
          const from = nodes[p.from];
          const to = nodes[p.to];
          const x = from.x + (to.x - from.x) * p.progress;
          const y = from.y + (to.y - from.y) * p.progress;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = dark ? "rgba(255, 100, 200, 0.8)" : "rgba(200, 50, 150, 0.6)";
          ctx.fill();
          // Glow
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = dark ? "rgba(255, 100, 200, 0.2)" : "rgba(200, 50, 150, 0.1)";
          ctx.fill();
        }

        animId = requestAnimationFrame(tick);
      };
      tick();
    };

    // ============ SAKURA (Overview) ============
    const sakura = () => {
      type Petal = { x: number; y: number; size: number; rotation: number; rotSpeed: number; speedX: number; speedY: number; wobble: number; wobbleSpeed: number; opacity: number };
      const petals: Petal[] = [];
      const count = 50;

      const createPetal = (randomY = true): Petal => ({
        x: Math.random() * canvas.width,
        y: randomY ? Math.random() * canvas.height : -20,
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        speedX: Math.random() * 1 - 0.3,
        speedY: Math.random() * 1.5 + 0.5,
        wobble: 0,
        wobbleSpeed: Math.random() * 0.05 + 0.02,
        opacity: Math.random() * 0.4 + 0.3,
      });

      for (let i = 0; i < count; i++) petals.push(createPetal());

      const drawPetal = (p: Petal) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        const dark = isDark();
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "#FFB7C5" : "#FF9CAD";
        ctx.fill();

        // Petal detail
        ctx.beginPath();
        ctx.ellipse(p.size * 0.3, 0, p.size * 0.4, p.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "#FFC8D6" : "#FFAABB";
        ctx.fill();

        ctx.restore();
      };

      const tick = () => {
        if (!running) return;
        const dark = isDark();
        ctx.fillStyle = dark ? "rgba(5, 5, 15, 0.03)" : "rgba(255, 250, 252, 0.03)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = 1;
        for (let i = 0; i < petals.length; i++) {
          const p = petals[i];
          p.wobble += p.wobbleSpeed;
          p.x += p.speedX + Math.sin(p.wobble) * 0.8;
          p.y += p.speedY;
          p.rotation += p.rotSpeed;

          drawPetal(p);

          if (p.y > canvas.height + 20 || p.x > canvas.width + 20) {
            petals[i] = createPetal(false);
            petals[i].x = Math.random() * canvas.width;
          }
        }

        animId = requestAnimationFrame(tick);
      };
      tick();
    };

    // ============ PARTICLES (Default) ============
    const particles = () => {
      type P = { x: number; y: number; vx: number; vy: number; size: number; hue: number; life: number; maxLife: number };
      const ps: P[] = [];
      const count = 60;

      const spawn = (): P => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 4 + 2,
        hue: Math.random() * 360,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      });

      for (let i = 0; i < count; i++) ps.push(spawn());

      const tick = () => {
        if (!running) return;
        const dark = isDark();
        ctx.fillStyle = dark ? "rgba(5, 5, 15, 0.04)" : "rgba(248, 249, 252, 0.04)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < ps.length; i++) {
          const p = ps[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          p.hue += 0.5;

          if (p.life > p.maxLife || p.x < -20 || p.x > canvas.width + 20 || p.y < -20 || p.y > canvas.height + 20) {
            ps[i] = spawn();
            continue;
          }

          const alpha = Math.min(1, Math.min(p.life / 30, (p.maxLife - p.life) / 30)) * 0.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 70%, ${dark ? 60 : 40}%, ${alpha})`;
          ctx.fill();
        }

        // Connect nearby particles
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const dx = ps[i].x - ps[j].x;
            const dy = ps[i].y - ps[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
              ctx.beginPath();
              ctx.moveTo(ps[i].x, ps[i].y);
              ctx.lineTo(ps[j].x, ps[j].y);
              ctx.strokeStyle = dark
                ? `rgba(100, 200, 255, ${(1 - dist / 100) * 0.15})`
                : `rgba(50, 100, 200, ${(1 - dist / 100) * 0.1})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        animId = requestAnimationFrame(tick);
      };
      tick();
    };

    // Start the appropriate animation
    switch (theme) {
      case "starfield": starfield(); break;
      case "matrix": matrix(); break;
      case "aurora": aurora(); break;
      case "cyber": cyber(); break;
      case "sakura": sakura(); break;
      case "particles": particles(); break;
    }

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    />
  );
}
