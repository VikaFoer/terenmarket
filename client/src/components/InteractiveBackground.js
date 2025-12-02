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
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 2 + 1;
      this.opacity = Math.random() * 0.5 + 0.2;
      this.baseOpacity = this.opacity;
    }

    update(mouseX, mouseY, isInteracting) {
      // Move particle
      this.x += this.vx;
      this.y += this.vy;

      // Bounce off edges
      if (this.x < 0 || this.x > canvasRef.current.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvasRef.current.height) this.vy *= -1;

      // Keep in bounds
      this.x = Math.max(0, Math.min(canvasRef.current.width, this.x));
      this.y = Math.max(0, Math.min(canvasRef.current.height, this.y));

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
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  // Initialize particles
  const initParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
    particlesRef.current = [];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(
        new Particle(
          Math.random() * canvas.width,
          Math.random() * canvas.height
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
          const opacity = (1 - distance / maxDistance) * 0.3;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
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
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Listen for input focus events
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', handleInputFocus);
      input.addEventListener('input', handleInputFocus);
    });

    // Listen for button clicks
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.addEventListener('click', handleButtonClick);
    });

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      inputs.forEach(input => {
        input.removeEventListener('focus', handleInputFocus);
        input.removeEventListener('input', handleInputFocus);
      });
      buttons.forEach(button => {
        button.removeEventListener('click', handleButtonClick);
      });
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
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
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

