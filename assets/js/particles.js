const initParticlesEngine = () => {
  const canvas = document.getElementById("tech-particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let themeSettings = getThemeSettings();
  let particleColor = themeSettings.color;
  let connectionDistance = themeSettings.connectionDistance;
  let maxParticles = themeSettings.maxParticles;

  const mouse = {
    x: null,
    y: null,
    radius: 150,
  };

  function getThemeSettings() {
    const isDark = document.documentElement.classList.contains("dark");
    const rootStyle = getComputedStyle(document.documentElement);
    let color = rootStyle.getPropertyValue("--particle-color").trim();
    if (!color) {
      color = isDark ? "rgba(77, 178, 255, 0.35)" : "rgba(8, 145, 178, 0.52)";
    }

    return {
      color,
      isDark,
      lineOpacityBase: isDark ? 0.25 : 0.48,
      lineOpacityPacket: isDark ? 1.5 : 2.4,
      maxParticles: isDark ? 65 : 88,
      connectionDistance: isDark ? 110 : 140,
      binaryAlpha: isDark ? 0.28 : 0.55,
      crossArm: isDark ? 3 : 4.5,
      lineWidth: isDark ? 0.65 : 1,
      sizeMin: isDark ? 1 : 1.3,
      sizeRange: isDark ? 2 : 2.8,
      glow: !isDark,
    };
  }

  function applyThemeSettings() {
    themeSettings = getThemeSettings();
    particleColor = themeSettings.color;
    connectionDistance = themeSettings.connectionDistance;
    maxParticles = themeSettings.maxParticles;
  }

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size =
        Math.random() * themeSettings.sizeRange + themeSettings.sizeMin;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = (Math.random() - 0.5) * 0.4;
      this.type = Math.floor(Math.random() * 3);
      this.char = Math.random() > 0.5 ? "1" : "0";
      this.seed = Math.random() * 100;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          this.x += (dx / distance) * force * 0.4;
          this.y += (dy / distance) * force * 0.4;
        }
      }
    }

    draw() {
      ctx.fillStyle = particleColor;
      ctx.strokeStyle = particleColor;

      if (this.type === 0) {
        if (themeSettings.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = particleColor;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (this.type === 1) {
        const arm = themeSettings.crossArm;
        ctx.beginPath();
        ctx.moveTo(this.x - arm, this.y);
        ctx.lineTo(this.x + arm, this.y);
        ctx.moveTo(this.x, this.y - arm);
        ctx.lineTo(this.x, this.y + arm);
        ctx.lineWidth = themeSettings.lineWidth;
        ctx.stroke();
      } else {
        ctx.font = `${themeSettings.isDark ? 9 : 10}px var(--font-mono), monospace`;
        ctx.globalAlpha = themeSettings.binaryAlpha;
        ctx.fillText(this.char, this.x - 3, this.y + 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  function initParticles() {
    particles = [];
    const count = Math.min(
      maxParticles,
      Math.floor((canvas.width * canvas.height) / (themeSettings.isDark ? 25000 : 20000)),
    );
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function drawConnections() {
    const time = Date.now() * 0.001;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.hypot(dx, dy);

        if (distance < connectionDistance) {
          const opacity =
            (1 - distance / connectionDistance) * themeSettings.lineOpacityBase;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = particleColor;
          ctx.lineWidth = themeSettings.lineWidth;
          ctx.globalAlpha = opacity;
          ctx.stroke();
          ctx.globalAlpha = 1;

          const speedFactor = 0.5 + (particles[i].seed % 0.5);
          const progress = (time * speedFactor + particles[i].seed) % 1;

          const packetX = particles[i].x + (particles[j].x - particles[i].x) * progress;
          const packetY = particles[i].y + (particles[j].y - particles[i].y) * progress;

          ctx.fillStyle = particleColor;
          ctx.globalAlpha = opacity * themeSettings.lineOpacityPacket;
          if (themeSettings.glow) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = particleColor;
          }
          ctx.beginPath();
          ctx.arc(packetX, packetY, themeSettings.isDark ? 1.8 : 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }

  let animationId = null;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    drawConnections();
    animationId = requestAnimationFrame(animate);
  }

  function checkThemeAndToggle() {
    canvas.style.display = "block";
    applyThemeSettings();
    if (!animationId) {
      resizeCanvas();
      animate();
    } else {
      initParticles();
    }
  }

  const observer = new MutationObserver(() => {
    applyThemeSettings();
    initParticles();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-theme-mode", "class"],
  });

  window.addEventListener("resize", resizeCanvas);
  checkThemeAndToggle();

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    } else {
      checkThemeAndToggle();
    }
  });

  let scrollTimeout;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        if (window.scrollY > window.innerHeight * 1.5) {
          if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
          }
        } else if (!animationId) {
          checkThemeAndToggle();
        }
        scrollTimeout = null;
      }, 200);
    },
    { passive: true },
  );
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initParticlesEngine);
} else {
  initParticlesEngine();
}
