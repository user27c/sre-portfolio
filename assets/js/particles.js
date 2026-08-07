const initParticlesEngine = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactScreen = window.matchMedia("(max-width: 640px)");
  const canvas = document.getElementById("tech-particles");
  if (!canvas || reduceMotion.matches || compactScreen.matches) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  let particles = [];
  let animationId = 0;
  let lastFrame = 0;
  let resizeId = 0;
  let settings;
  let width = 0;
  let height = 0;
  const mouse = { x: null, y: null, radius: 120 };

  const readSettings = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const cssColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--particle-color")
      .trim();

    return {
      isDark,
      color: cssColor || (isDark ? "rgba(77, 178, 255, 0.32)" : "rgba(14, 116, 144, 0.35)"),
      maxParticles: isDark ? 42 : 50,
      connectionDistance: isDark ? 105 : 115,
      lineOpacity: isDark ? 0.2 : 0.24,
      binaryAlpha: isDark ? 0.24 : 0.32,
    };
  };

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 1.6 + 0.8;
      this.speedX = (Math.random() - 0.5) * 0.25;
      this.speedY = (Math.random() - 0.5) * 0.25;
      this.type = Math.floor(Math.random() * 3);
      this.char = Math.random() > 0.5 ? "1" : "0";
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > width) this.speedX *= -1;
      if (this.y < 0 || this.y > height) this.speedY *= -1;

      if (mouse.x === null || mouse.y === null) return;
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (!distance || distance >= mouse.radius) return;
      const force = ((mouse.radius - distance) / mouse.radius) * 0.25;
      this.x += (dx / distance) * force;
      this.y += (dy / distance) * force;
    }

    draw() {
      context.fillStyle = settings.color;
      context.strokeStyle = settings.color;
      if (this.type === 0) {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
      } else if (this.type === 1) {
        context.beginPath();
        context.moveTo(this.x - 2.5, this.y);
        context.lineTo(this.x + 2.5, this.y);
        context.moveTo(this.x, this.y - 2.5);
        context.lineTo(this.x, this.y + 2.5);
        context.lineWidth = 0.7;
        context.stroke();
      } else {
        context.globalAlpha = settings.binaryAlpha;
        context.font = "9px var(--font-mono), monospace";
        context.fillText(this.char, this.x - 3, this.y + 3);
        context.globalAlpha = 1;
      }
    }
  }

  const resetParticles = () => {
    const count = Math.min(
      settings.maxParticles,
      Math.floor((width * height) / 26000),
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

  const drawConnections = () => {
    for (let first = 0; first < particles.length; first += 1) {
      for (let second = first + 1; second < particles.length; second += 1) {
        const dx = particles[first].x - particles[second].x;
        const dy = particles[first].y - particles[second].y;
        const distanceSquared = dx * dx + dy * dy;
        const limitSquared = settings.connectionDistance ** 2;
        if (distanceSquared >= limitSquared) continue;

        const distance = Math.sqrt(distanceSquared);
        context.globalAlpha = (1 - distance / settings.connectionDistance) * settings.lineOpacity;
        context.beginPath();
        context.moveTo(particles[first].x, particles[first].y);
        context.lineTo(particles[second].x, particles[second].y);
        context.lineWidth = 0.65;
        context.strokeStyle = settings.color;
        context.stroke();
        context.globalAlpha = 1;
      }
    }
  };

  const animate = (timestamp) => {
    animationId = window.requestAnimationFrame(animate);
    if (timestamp - lastFrame < 33) return;
    lastFrame = timestamp;
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      particle.update();
      particle.draw();
    });
    drawConnections();
  };

  const start = () => {
    if (animationId || document.hidden || reduceMotion.matches || compactScreen.matches) return;
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
  compactScreen.addEventListener("change", (event) => {
    if (event.matches) stop();
    else {
      resize();
      start();
    }
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
