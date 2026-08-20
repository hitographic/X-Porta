import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number;
  phase: number;
  baseX: number;
  baseY: number;
  hue: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let lastTime = performance.now();
    let particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 64;
    const sctx = sprite.getContext('2d')!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.35, 'rgba(120, 220, 200, 0.35)');
    grad.addColorStop(0.7, 'rgba(23, 107, 91, 0.12)');
    grad.addColorStop(1, 'rgba(23, 107, 91, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);

    const palette = [196, 168, 215, 150, 240];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles();
    };

    const createParticles = () => {
      const count = Math.min(Math.floor((w * h) / 9000), 150);
      particles = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 0,
          vy: 0,
          size: 1 + depth * 2.6,
          depth,
          phase: Math.random() * Math.PI * 2,
          baseX: Math.random() * w,
          baseY: Math.random() * h,
          hue: palette[Math.floor(Math.random() * palette.length)],
        };
      });
    };

    const onMove = (x: number, y: number) => {
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };
    const onMouseLeave = () => {
      mouse.active = false;
    };

    const step = (dt: number, t: number) => {
      const damp = Math.pow(0.965, dt * 60);

      for (const p of particles) {
        p.baseX += Math.sin(t * 0.0004 + p.phase) * 0.12 * dt * 60;
        p.baseY += Math.cos(t * 0.00033 + p.phase * 1.3) * 0.12 * dt * 60;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 320 && dist > 0.001) {
            const fall = 1 - dist / 320;
            const pull = fall * 0.14 * dt * 60;
            const whirl = fall * 0.16 * dt * 60;
            p.vx += (dx / dist) * pull - (dy / dist) * whirl;
            p.vy += (dy / dist) * pull + (dx / dist) * whirl;
          }
        }

        p.vx += (p.baseX - p.x) * 0.008 * dt * 60;
        p.vy += (p.baseY - p.y) * 0.008 * dt * 60;

        p.vx *= damp;
        p.vy *= damp;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -60) p.x = w + 60;
        if (p.x > w + 60) p.x = -60;
        if (p.y < -60) p.y = h + 60;
        if (p.y > h + 60) p.y = -60;
      }
    };

    const draw = (t: number) => {
      const dt = Math.min((t - lastTime) / 1000, 0.05);
      lastTime = t;
      step(dt, t);

      ctx.clearRect(0, 0, w, h);

      const glow = 0.75 + 0.25 * Math.sin(t * 0.0012);

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = 90 + 60 * (a.depth + b.depth) * 0.5;

          if (dist < maxDist) {
            const t = 1 - dist / maxDist;
            const alpha = t * t * 0.28 * glow;
            const midDepth = (a.depth + b.depth) * 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${midDepth * 60 + 150}, 45%, ${60 - midDepth * 15}%, ${alpha})`;
            ctx.lineWidth = 0.3 + midDepth * 0.7;
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const nearMouse =
          mouse.active
            ? Math.max(0, 1 - Math.hypot(mouse.x - p.x, mouse.y - p.y) / 260)
            : 0;
        const scale = 1 + nearMouse * 1.6;
        const size = p.size * scale * 3;
        ctx.globalAlpha = (0.35 + p.depth * 0.5) * (1 + nearMouse * 0.8) * glow;
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    resize();
    raf = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onMouseLeave);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
