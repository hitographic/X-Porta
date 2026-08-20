import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  angle: number;
  speed: number;
  orbit: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let nodes: Node[] = [];
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseActive = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createNodes = () => {
      const count = Math.floor((canvas.width * canvas.height) / 12000);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.5 + 0.15,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.005 + 0.002,
        orbit: Math.random() * 30 + 10,
      }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseActive = true;
    };

    const handleMouseLeave = () => {
      mouseActive = false;
    };

    const drawWeb = (
      x1: number, y1: number, x2: number, y2: number,
      dist: number, maxDist: number, alpha: number
    ) => {
      const t = 1 - dist / maxDist;
      const segments = 5;
      const sag = t * 15;

      ctx.beginPath();
      ctx.moveTo(x1, y1);

      for (let s = 1; s < segments; s++) {
        const frac = s / segments;
        const mx = x1 + (x2 - x1) * frac;
        const my = y1 + (y2 - y1) * frac + sag * Math.sin(frac * Math.PI);
        ctx.lineTo(mx, my);
      }

      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(23, 107, 91, ${alpha * t})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((n) => {
        n.angle += n.speed;

        const orbitX = Math.cos(n.angle) * n.orbit;
        const orbitY = Math.sin(n.angle) * n.orbit;

        n.x += n.vx;
        n.y += n.vy;

        if (mouseActive) {
          const dx = mouseX - n.x;
          const dy = mouseY - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 200 && dist > 0) {
            const force = (200 - dist) / 200;
            n.vx += (dx / dist) * force * 0.08;
            n.vy += (dy / dist) * force * 0.08;
          }
        }

        n.vx *= 0.98;
        n.vy *= 0.98;

        if (n.x < -50) n.x = canvas.width + 50;
        if (n.x > canvas.width + 50) n.x = -50;
        if (n.y < -50) n.y = canvas.height + 50;
        if (n.y > canvas.height + 50) n.y = -50;

        const drawX = n.x + orbitX;
        const drawY = n.y + orbitY;

        ctx.beginPath();
        ctx.arc(drawX, drawY, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(23, 107, 91, ${n.opacity})`;
        ctx.fill();
      });

      // Draw web connections between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 100;

          if (dist < maxDist) {
            drawWeb(n1.x, n1.y, n2.x, n2.y, dist, maxDist, 0.12);
          }
        }
      }

      // Draw web to mouse
      if (mouseActive) {
        nodes.forEach((n) => {
          const dx = mouseX - n.x;
          const dy = mouseY - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.25;
            drawWeb(n.x, n.y, mouseX, mouseY, dist, 180, alpha);
          }
        });

      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    createNodes();
    draw();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', () => {
      resize();
      createNodes();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
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
        zIndex: 0,
      }}
    />
  );
}
