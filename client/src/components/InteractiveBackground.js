import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

const InteractiveBackground = ({ children, onInteraction }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  // Particle class
  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8;
      this.radius = Math.random() * 3 + 2;
      this.opacity = Math.random() * 0.6 + 0.4;
      this.baseOpacity = this.opacity;
      this.color = `rgba(${255}, ${255}, ${255}, ${this.opacity})`;
    }

    update(mouseX, mouseY, isInteracting) {
      // Move particle
      this.x += this.vx;
      this.y += this.vy;

      // Get canvas dimensions (use display size, not internal canvas size)
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const maxX = rect.width || window.innerWidth;
      const maxY = rect.height || window.innerHeight;

      // Bounce off edges
      if (this.x < 0 || this.x > maxX) {
        this.vx *= -1;
        this.x = Math.max(0, Math.min(maxX, this.x));
      }
      if (this.y < 0 || this.y > maxY) {
        this.vy *= -1;
        this.y = Math.max(0, Math.min(maxY, this.y));
      }

      // Keep in bounds
      this.x = Math.max(0, Math.min(maxX, this.x));
      this.y = Math.max(0, Math.min(maxY, this.y));

      // React to mouse proximity
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 150;

      if (distance < maxDistance && isInteracting) {
        const force = (maxDistance - distance) / maxDistance;
        this.x -= (dx / distance) * force * 2;
        this.y -= (dy / distance) * force * 2;
        this.opacity = Math.min(1, this.baseOpacity + force * 0.5);
      } else {
        this.opacity = this.baseOpacity;
      }
    }

    draw(ctx) {
      // Draw glow effect
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius * 2
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw core particle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.opacity + 0.3)})`;
      ctx.fill();
    }
  }

  // Initialize particles
  const initParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    const particleCount = Math.floor((width * height) / 8000);
    particlesRef.current = [];

    console.log('Initializing particles:', particleCount, 'for canvas size:', width, height);

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(
        new Particle(
          Math.random() * width,
          Math.random() * height
        )
      );
    }
  };

  // Draw connections between nearby particles
  const drawConnections = (ctx, particles) => {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 120;

        if (distance < maxDistance) {
          const opacity = (1 - distance / maxDistance) * 0.5;
          const gradient = ctx.createLinearGradient(
            particles[i].x, particles[i].y,
            particles[j].x, particles[j].y
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.5})`);
          
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      console.warn('Canvas or context not available');
      return;
    }

    // Get display dimensions
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || window.innerWidth;
    const displayHeight = rect.height || window.innerHeight;

    // Clear canvas (use internal canvas size)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    if (particlesRef.current.length === 0) {
      console.warn('No particles to animate');
    }

    particlesRef.current.forEach(particle => {
      particle.update(mouseRef.current.x, mouseRef.current.y, isInteracting);
      particle.draw(ctx);
    });

    // Draw connections
    drawConnections(ctx, particlesRef.current);

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setIsInteracting(true);
    
    if (onInteraction) {
      onInteraction('mousemove', { x: mouseRef.current.x, y: mouseRef.current.y });
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsInteracting(false);
  };

  // Handle click - create ripple effect
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Push particles away from click point
    particlesRef.current.forEach(particle => {
      const dx = particle.x - clickX;
      const dy = particle.y - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 100;

      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        particle.vx += (dx / distance) * force * 3;
        particle.vy += (dy / distance) * force * 3;
      }
    });

    if (onInteraction) {
      onInteraction('click', { x: clickX, y: clickY });
    }
  };

  // Handle scroll - create wave effect
  const handleScroll = () => {
    const scrollY = window.scrollY;
    particlesRef.current.forEach(particle => {
      particle.vy += Math.sin(scrollY * 0.01) * 0.1;
    });

    if (onInteraction) {
      onInteraction('scroll', { scrollY });
    }
  };

  // Handle input focus - create pulse effect
  const handleInputFocus = (e) => {
    const input = e.target;
    const rect = input.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = centerX - canvasRect.left;
    const y = centerY - canvasRect.top;

    particlesRef.current.forEach(particle => {
      const dx = particle.x - x;
      const dy = particle.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 200;

      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        const angle = Math.atan2(dy, dx);
        particle.vx += Math.cos(angle) * force * 2;
        particle.vy += Math.sin(angle) * force * 2;
      }
    });

    if (onInteraction) {
      onInteraction('input', { x, y });
    }
  };

  // Handle button clicks - create ripple
  const handleButtonClick = (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = centerX - canvasRect.left;
    const y = centerY - canvasRect.top;

    particlesRef.current.forEach(particle => {
      const dx = particle.x - x;
      const dy = particle.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 150;

      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        const angle = Math.atan2(dy, dx);
        particle.vx += Math.cos(angle) * force * 4;
        particle.vy += Math.sin(angle) * force * 4;
      }
    });
  };

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('Canvas ref not available');
      return;
    }

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      
      // Set internal canvas size (for high DPI)
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      // Set display size
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      console.log('Canvas resized:', width, height, 'dpr:', dpr);
      initParticles();
    };

    // Initial setup
    resizeCanvas();
    
    // Event listeners
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Listen for input focus events (with delay to ensure DOM is ready)
    const setupInputListeners = () => {
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        input.addEventListener('focus', handleInputFocus);
        input.addEventListener('input', handleInputFocus);
      });

      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick);
      });
    };

    // Setup listeners after a short delay
    setTimeout(setupInputListeners, 100);
    
    // Also setup on DOM mutations
    const observer = new MutationObserver(setupInputListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'auto',
          display: 'block !important',
          backgroundColor: 'transparent',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default InteractiveBackground;

