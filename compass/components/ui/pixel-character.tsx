"use client";

import { useEffect } from "react";

/**
 * Live2D 桌宠 - 自托管版本，不依赖外部CDN
 */
export function PixelCharacter() {
  useEffect(() => {
    if (document.getElementById("live2d-widget-init")) return;
    const marker = document.createElement("meta");
    marker.id = "live2d-widget-init";
    document.head.appendChild(marker);

    const live2d_path = "/live2d/";

    // 加载资源
    function loadResource(url: string, type: "css" | "js"): Promise<void> {
      return new Promise((resolve, reject) => {
        if (type === "css") {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = url;
          link.onload = () => resolve();
          link.onerror = () => reject();
          document.head.appendChild(link);
        } else {
          const script = document.createElement("script");
          script.src = url;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        }
      });
    }

    // 不限制屏幕宽度，全部加载
    Promise.all([
      loadResource(live2d_path + "waifu.css", "css"),
      loadResource(live2d_path + "live2d.min.js", "js"),
      loadResource(live2d_path + "waifu-tips.js", "js"),
    ]).then(() => {
      // @ts-ignore
      if (typeof initWidget === "function") {
        // @ts-ignore
        initWidget({
          waifuPath: live2d_path + "waifu-tips.json",
          cdnPath: "https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/",
          tools: ["hitokoto", "asteroids", "switch-model", "switch-texture", "photo", "info", "quit"],
        });
      }
      // 注入拖拽
      waitAndInjectDrag();
    }).catch((err) => {
      console.error("Live2D 加载失败:", err);
    });

    function waitAndInjectDrag() {
      const check = setInterval(() => {
        const el = document.getElementById("waifu");
        const canvas = document.getElementById("live2d");
        if (el && canvas) {
          clearInterval(check);
          setTimeout(() => setupDrag(el, canvas), 800);
        }
      }, 300);
      setTimeout(() => clearInterval(check), 30000);
    }

    function setupDrag(element: HTMLElement, canvas: HTMLElement) {
      const initLeft = window.innerWidth - element.offsetWidth - 10;
      const initTop = window.innerHeight - element.offsetHeight;
      element.style.cssText += "; left: " + initLeft + "px !important; top: " + initTop + "px !important; right: auto !important; bottom: auto !important; position: fixed !important;";

      let winW = window.innerWidth;
      let winH = window.innerHeight;

      element.addEventListener("mousedown", (e: MouseEvent) => {
        if (e.button !== 0) return;
        if (e.target !== canvas) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const elRect = element.getBoundingClientRect();
        const startLeft = elRect.left;
        const startTop = elRect.top;

        const onMove = (ev: MouseEvent) => {
          let left = startLeft + (ev.clientX - startX);
          let top = startTop + (ev.clientY - startY);
          left = Math.max(0, Math.min(left, winW - element.offsetWidth));
          top = Math.max(0, Math.min(top, winH - element.offsetHeight));
          element.style.cssText += "; left: " + left + "px !important; top: " + top + "px !important; right: auto !important; bottom: auto !important;";
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      // 触摸拖拽
      element.addEventListener("touchstart", (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.id !== "live2d") return;
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        const elRect = element.getBoundingClientRect();
        const startLeft = elRect.left;
        const startTop = elRect.top;

        const onMove = (ev: TouchEvent) => {
          const t = ev.touches[0];
          let left = startLeft + (t.clientX - startX);
          let top = startTop + (t.clientY - startY);
          left = Math.max(0, Math.min(left, winW - element.offsetWidth));
          top = Math.max(0, Math.min(top, winH - element.offsetHeight));
          element.style.cssText += "; left: " + left + "px !important; top: " + top + "px !important; right: auto !important; bottom: auto !important;";
        };
        const onEnd = () => {
          document.removeEventListener("touchmove", onMove as any);
          document.removeEventListener("touchend", onEnd);
        };
        document.addEventListener("touchmove", onMove as any);
        document.addEventListener("touchend", onEnd);
      });

      window.addEventListener("resize", () => { winW = window.innerWidth; winH = window.innerHeight; });
    }
  }, []);

  return (
    <style>{
      `#waifu {
        z-index: 9999 !important;
        pointer-events: auto !important;
        cursor: grab !important;
        transition: none !important;
        display: block !important;
      }
      #waifu:active { cursor: grabbing !important; }
      #waifu-tips {
        background: rgba(20, 20, 35, 0.9) !important;
        border: 1px solid rgba(255,255,255,0.12) !important;
        border-radius: 12px !important;
        color: #f0f2f5 !important;
        font-size: 13px !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
      }
      #waifu-tool { opacity: 0.6; }
      #waifu-tool:hover { opacity: 1; }
      `
    }</style>
  );
}
