// ============================================================
// KINGDOM TOURNAMENT CINEMATIC BACKGROUND PARTICLES
// ============================================================

(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'cinematic-particles';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  canvas.style.display = 'block';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles = [];
  const maxParticles = 65;

  class Particle {
    constructor() {
      this.reset();
      this.y = Math.random() * height; // initial distribution
    }

    reset() {
      this.x = Math.random() * width;
      this.y = height + Math.random() * 50;
      this.size = Math.random() * 2.5 + 0.8;
      this.speedY = -(Math.random() * 0.7 + 0.3);
      this.speedX = Math.random() * 0.4 - 0.2;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.fade = Math.random() * 0.003 + 0.001;
      this.wobble = Math.random() * Math.PI;
      this.wobbleSpeed = Math.random() * 0.02 + 0.005;
    }

    update() {
      this.y += this.speedY;
      this.wobble += this.wobbleSpeed;
      this.x += this.speedX + Math.sin(this.wobble) * 0.25;
      this.alpha -= this.fade;

      if (this.alpha <= 0 || this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      // Cinematic gold ember color
      ctx.fillStyle = `rgba(212, 175, 55, ${this.alpha})`;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Initialize
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }

  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animate);
  }

  // Window resize handler
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  animate();
})();
