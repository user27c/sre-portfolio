const initParticlesEngine = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = document.getElementById("tech-particles");
  if (!canvas || reduceMotion.matches) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  let particles = [];
  let animationId = 0;
  let lastFrame = 0;
  let resizeId = 0;
  let settings;
  let width = 0;
  let height = 0;
  const mouse = { x: null, y: null, radius: 150 };

  const readSettings = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const cssColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--particle-color")
      .trim();

    return {
      isDark,
      color: cssColor || (isDark ? "rgba(77, 178, 255, 0.35)" : "rgba(8, 145, 178, 0.52)"),
      lineOpacityBase: isDark ? 0.25 : 0.48,
      lineOpacityPacket: isDark ? 1.5 : 2.4,
      maxParticles: isDark ? 65 : 88,
      connectionDistance: isDark ? 110 : 140,
      binaryAlpha: isDark ? 0.28 : 0.55,
      crossArm: isDark ? 3 : 4.5,
      lineWidth: isDark ? 0.65 : 1,
      sizeMin: isDark ? 1 : 1.3,
      sizeRange: isDark ? 2 : 2.8,
      densityDivisor: isDark ? 25000 : 20000,
      glow: !isDark,
    };
  };

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * settings.sizeRange + settings.sizeMin;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = (Math.random() - 0.5) * 0.4;
      this.type = Math.floor(Math.random() * 3);
      this.char = Math.random() > 0.5 ? "1" : "0";
      this.seed = Math.random() * 100;
    }

    update(deltaScale) {
      this.x += this.speedX * deltaScale;
      this.y += this.speedY * deltaScale;
      if (this.x < 0 || this.x > width) this.speedX *= -1;
      if (this.y < 0 || this.y > height) this.speedY *= -1;

      if (mouse.x === null || mouse.y === null) return;
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (!distance || distance >= mouse.radius) return;
      const force = ((mouse.radius - distance) / mouse.radius) * 0.4 * deltaScale;
      this.x += (dx / distance) * force;
      this.y += (dy / distance) * force;
    }

    draw() {
      context.fillStyle = settings.color;
      context.strokeStyle = settings.color;
      if (this.type === 0) {
        if (settings.glow) {
          context.shadowBlur = 8;
          context.shadowColor = settings.color;
        }
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      } else if (this.type === 1) {
        context.beginPath();
        context.moveTo(this.x - settings.crossArm, this.y);
        context.lineTo(this.x + settings.crossArm, this.y);
        context.moveTo(this.x, this.y - settings.crossArm);
        context.lineTo(this.x, this.y + settings.crossArm);
        context.lineWidth = settings.lineWidth;
        context.stroke();
      } else {
        context.globalAlpha = settings.binaryAlpha;
        context.font = `${settings.isDark ? 9 : 10}px var(--font-mono), monospace`;
        context.fillText(this.char, this.x - 3, this.y + 3);
        context.globalAlpha = 1;
      }
    }
  }

  const resetParticles = () => {
    const count = Math.min(
      settings.maxParticles,
      Math.floor((width * height) / settings.densityDivisor),
    );
    particles = Array.from({ length: count }, () => new Particle());
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    settings = readSettings();
    resetParticles();
  };

  const drawConnections = (timestamp) => {
    const time = timestamp * 0.001;
    for (let first = 0; first < particles.length; first += 1) {
      for (let second = first + 1; second < particles.length; second += 1) {
        const dx = particles[first].x - particles[second].x;
        const dy = particles[first].y - particles[second].y;
        const distanceSquared = dx * dx + dy * dy;
        const limitSquared = settings.connectionDistance ** 2;
        if (distanceSquared >= limitSquared) continue;

        const distance = Math.sqrt(distanceSquared);
        const opacity = (1 - distance / settings.connectionDistance) * settings.lineOpacityBase;
        context.globalAlpha = opacity;
        context.beginPath();
        context.moveTo(particles[first].x, particles[first].y);
        context.lineTo(particles[second].x, particles[second].y);
        context.lineWidth = settings.lineWidth;
        context.strokeStyle = settings.color;
        context.stroke();
        context.globalAlpha = 1;

        const speedFactor = 0.5 + (particles[first].seed % 0.5);
        const progress = (time * speedFactor + particles[first].seed) % 1;
        const packetX = particles[first].x + (particles[second].x - particles[first].x) * progress;
        const packetY = particles[first].y + (particles[second].y - particles[first].y) * progress;

        context.fillStyle = settings.color;
        context.globalAlpha = opacity * settings.lineOpacityPacket;
        if (settings.glow) {
          context.shadowBlur = 6;
          context.shadowColor = settings.color;
        }
        context.beginPath();
        context.arc(packetX, packetY, settings.isDark ? 1.8 : 2.2, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
      }
    }
  };

  const animate = (timestamp) => {
    animationId = window.requestAnimationFrame(animate);
    if (timestamp - lastFrame < 33) return;
    const deltaScale = lastFrame ? Math.min((timestamp - lastFrame) / 16.667, 3) : 1;
    lastFrame = timestamp;
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      particle.update(deltaScale);
      particle.draw();
    });
    drawConnections(timestamp);
  };

  const start = () => {
    if (animationId || document.hidden || reduceMotion.matches) return;
    animationId = window.requestAnimationFrame(animate);
  };

  const stop = () => {
    window.cancelAnimationFrame(animationId);
    animationId = 0;
  };

  resize();
  start();

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeId);
    resizeId = window.requestAnimationFrame(resize);
  });
  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }, { passive: true });
  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  reduceMotion.addEventListener("change", (event) => {
    if (event.matches) stop();
    else start();
  });
  new MutationObserver(() => {
    settings = readSettings();
    resetParticles();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initParticlesEngine, { once: true });
} else {
  initParticlesEngine();
}
