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
  pulseSpeed: number;
  trailX: number;
  trailY: number;
}

interface CursorParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
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
    let cursorParticles: CursorParticle[] = [];
    let ripples: Ripple[] = [];
    let mouse = { x: -9999, y: -9999, active: false, prevX: -9999, prevY: -9999, speed: 0 };
    let globalHue = 0;

    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 64;
    const sctx = sprite.getContext('2d')!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, 'rgba(120, 220, 200, 0.4)');
    grad.addColorStop(0.65, 'rgba(23, 107, 91, 0.15)');
    grad.addColorStop(1, 'rgba(23, 107, 91, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);

    const smallSprite = document.createElement('canvas');
    smallSprite.width = 32;
    smallSprite.height = 32;
    const ssctx = smallSprite.getContext('2d')!;
    const sgrad = ssctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sgrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    sgrad.addColorStop(0.5, 'rgba(120, 220, 200, 0.2)');
    sgrad.addColorStop(1, 'rgba(23, 107, 91, 0)');
    ssctx.fillStyle = sgrad;
    ssctx.fillRect(0, 0, 32, 32);

    const noise = (x: number, y: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return n - Math.floor(n);
    };

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
      const count = Math.min(Math.floor((w * h) / 8000), 160);
      particles = Array.from({ length: count }, () => {
        const depth = Math.random();
        const x = Math.random() * w;
        const y = Math.random() * h;
        return {
          x,
          y,
          vx: 0,
          vy: 0,
          size: 0.8 + depth * 2.8,
          depth,
          phase: Math.random() * Math.PI * 2,
          baseX: x,
          baseY: y,
          hue: 150 + Math.random() * 70,
          pulseSpeed: 0.002 + Math.random() * 0.004,
          trailX: x,
          trailY: y,
        };
      });
    };

    const spawnCursorParticle = (x: number, y: number, speed: number) => {
      const count = Math.min(Math.floor(speed / 8), 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 1.5 + 0.3;
        cursorParticles.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1,
          maxLife: 40 + Math.random() * 30,
          size: 1 + Math.random() * 2.5,
          hue: 160 + Math.random() * 40,
        });
      }
    };

    const spawnRipple = (x: number, y: number) => {
      if (ripples.length > 4) return;
      ripples.push({ x, y, radius: 0, maxRadius: 60 + Math.random() * 40, life: 1 });
    };

    const onMove = (x: number, y: number) => {
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = x;
      mouse.y = y;
      mouse.speed = Math.hypot(x - mouse.prevX, y - mouse.prevY);
      mouse.active = true;

      if (mouse.speed > 15) {
        spawnCursorParticle(x, y, mouse.speed);
      }
      if (mouse.speed > 40) {
        spawnRipple(x, y);
      }
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
      const dt60 = dt * 60;
      const damp = Math.pow(0.96, dt60);

      for (const p of particles) {
        const nx = noise(p.x * 0.003, t * 0.0001) - 0.5;
        const ny = noise(p.y * 0.003, t * 0.0001 + 100) - 0.5;
        p.baseX += nx * 0.25 * dt60;
        p.baseY += ny * 0.25 * dt60;

        const timeWanderX = Math.sin(t * 0.00035 + p.phase) * 0.18 * dt60;
        const timeWanderY = Math.cos(t * 0.00028 + p.phase * 1.4) * 0.18 * dt60;
        p.baseX += timeWanderX;
        p.baseY += timeWanderY;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 350 && dist > 0.1) {
            const fall = 1 - dist / 350;
            const ease = fall * fall * (3 - 2 * fall);
            const pull = ease * 0.16 * dt60;
            const whirl = ease * 0.22 * dt60;
            p.vx += (dx / dist) * pull - (dy / dist) * whirl;
            p.vy += (dy / dist) * pull + (dx / dist) * whirl;
          }
        }

        p.vx += (p.baseX - p.x) * 0.006 * dt60;
        p.vy += (p.baseY - p.y) * 0.006 * dt60;
        p.vx *= damp;
        p.vy *= damp;

        p.trailX = p.x + (p.trailX - p.x) * 0.88;
        p.trailY = p.y + (p.trailY - p.y) * 0.88;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -80) p.x = w + 80;
        if (p.x > w + 80) p.x = -80;
        if (p.y < -80) p.y = h + 80;
        if (p.y > h + 80) p.y = -80;
      }

      for (let i = cursorParticles.length - 1; i >= 0; i--) {
        const cp = cursorParticles[i];
        cp.x += cp.vx;
        cp.y += cp.vy;
        cp.vy += 0.02 * dt60;
        cp.vx *= 0.99;
        cp.vy *= 0.99;
        cp.life -= dt60 / cp.maxLife;
        if (cp.life <= 0) cursorParticles.splice(i, 1);
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += (r.maxRadius / 40) * dt60;
        r.life -= dt60 / 40;
        if (r.life <= 0) ripples.splice(i, 1);
      }
    };

    const drawConnections = (glow: number) => {
      ctx.lineCap = 'round';
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = 95 + 55 * (a.depth + b.depth) * 0.5;

          if (dist < maxDist) {
            const t = 1 - dist / maxDist;
            const alpha = t * t * 0.3 * glow;
            const midH = (a.hue + b.hue) * 0.5 + globalHue * 0.3;
            ctx.beginPath();
            ctx.moveTo(a.trailX, a.trailY);
            const mx = (a.x + b.x) * 0.5;
            const my = (a.y + b.y) * 0.5 - t * 8;
            ctx.quadraticCurveTo(mx, my, b.trailX, b.trailY);
            ctx.strokeStyle = `hsla(${midH}, 50%, ${55 + t * 15}%, ${alpha})`;
            ctx.lineWidth = 0.4 + t * 0.8;
            ctx.stroke();
          }
        }
      }
    };

    const drawParticles = (glow: number, t: number) => {
      for (const p of particles) {
        const nearMouse = mouse.active
          ? Math.max(0, 1 - Math.hypot(mouse.x - p.x, mouse.y - p.y) / 280)
          : 0;
        const pulse = 0.85 + 0.15 * Math.sin(t * p.pulseSpeed + p.phase);
        const scale = (1 + nearMouse * 1.8) * pulse;
        const size = p.size * scale * 3.2;
        const alpha = (0.3 + p.depth * 0.55) * (1 + nearMouse * 0.9) * glow;

        const hue = p.hue + globalHue * 0.2;
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);

        if (nearMouse > 0.3) {
          const ringSize = size * (1.8 + nearMouse * 0.8);
          ctx.globalAlpha = nearMouse * 0.12 * glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, ringSize * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue}, 60%, 65%, ${nearMouse * 0.25})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    };

    const drawCursorParticles = () => {
      for (const cp of cursorParticles) {
        const alpha = cp.life * 0.7;
        const size = cp.size * cp.life * 3;
        ctx.globalAlpha = alpha;
        ctx.drawImage(smallSprite, cp.x - size / 2, cp.y - size / 2, size, size);
      }
    };

    const drawRipples = () => {
      for (const r of ripples) {
        ctx.globalAlpha = r.life * 0.15;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(175, 50%, 60%, ${r.life * 0.3})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    };

    const drawGlowField = () => {
      if (!mouse.active || mouse.speed < 5) return;
      const intensity = Math.min(mouse.speed / 60, 1);
      const fieldGrad = ctx.createRadialGradient(
        mouse.x, mouse.y, 0,
        mouse.x, mouse.y, 200 + intensity * 80
      );
      fieldGrad.addColorStop(0, `rgba(46, 196, 182, ${0.06 * intensity})`);
      fieldGrad.addColorStop(0.5, `rgba(23, 107, 91, ${0.025 * intensity})`);
      fieldGrad.addColorStop(1, 'rgba(23, 107, 91, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = fieldGrad;
      ctx.fillRect(mouse.x - 300, mouse.y - 300, 600, 600);
    };

    const draw = (t: number) => {
      const dt = Math.min((t - lastTime) / 1000, 0.05);
      lastTime = t;
      step(dt, t);

      globalHue = (globalHue + dt * 8) % 360;

      ctx.clearRect(0, 0, w, h);

      const glow = 0.7 + 0.3 * Math.sin(t * 0.001);

      drawGlowField();
      drawConnections(glow);
      drawParticles(glow, t);
      drawCursorParticles();
      drawRipples();

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
