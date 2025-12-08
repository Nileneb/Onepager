/**
 * ============================================
 * MAU CAT CAMPAIGN - INTERACTIVE EXPERIENCE
 * ============================================
 * Features:
 * - WebGL Shader Background
 * - Particle System
 * - Cursor Glow Effect
 * - Scroll Reveal Animations
 * - 3D Tilt Cards
 * - GitHub Repo Stats
 * - Smooth Scroll & Navigation
 * ============================================
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        particleCount: 50,
        shaderEnabled: true,
        tiltIntensity: 15,
        scrollRevealThreshold: 0.1,
        repoFetchTimeout: 5000,
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);
    const lerp = (start, end, factor) => start + (end - start) * factor;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    // ============================================
    // YEAR UPDATE
    // ============================================

    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ============================================
    // WEBGL SHADER BACKGROUND
    // ============================================

    class ShaderBackground {
        constructor(canvas) {
            this.canvas = canvas;
            this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!this.gl) {
                console.warn('WebGL not supported');
                return;
            }

            this.time = 0;
            this.mouse = { x: 0.5, y: 0.5 };
            this.init();
        }

        init() {
            const gl = this.gl;

            // Vertex Shader
            const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

            // Fragment Shader - Mesmerizing gradient with noise
            const fragmentShaderSource = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_mouse;
        
        // Simplex noise functions
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                              -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 mouseInfluence = (u_mouse - 0.5) * 0.3;
          
          // Create flowing noise
          float noise1 = snoise(uv * 2.0 + u_time * 0.1 + mouseInfluence);
          float noise2 = snoise(uv * 4.0 - u_time * 0.15 - mouseInfluence);
          float noise3 = snoise(uv * 8.0 + u_time * 0.05);
          
          float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
          
          // Color palette
          vec3 color1 = vec3(0.02, 0.02, 0.03);  // Deep black
          vec3 color2 = vec3(0.15, 0.03, 0.05);  // Dark red
          vec3 color3 = vec3(0.03, 0.08, 0.15);  // Dark blue
          vec3 color4 = vec3(0.08, 0.02, 0.12);  // Dark purple
          
          // Mix colors based on noise and position
          float t1 = smoothstep(-0.5, 0.5, combinedNoise);
          float t2 = smoothstep(0.0, 1.0, uv.y + sin(u_time * 0.2) * 0.1);
          
          vec3 colorA = mix(color1, color2, t1);
          vec3 colorB = mix(color3, color4, t1);
          vec3 finalColor = mix(colorA, colorB, t2);
          
          // Add subtle glow near mouse
          float mouseDist = distance(uv, u_mouse);
          float mouseGlow = smoothstep(0.5, 0.0, mouseDist) * 0.15;
          finalColor += vec3(1.0, 0.4, 0.4) * mouseGlow;
          
          // Vignette
          float vignette = 1.0 - distance(uv, vec2(0.5)) * 0.8;
          finalColor *= vignette;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `;

            // Create shaders
            const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

            if (!vertexShader || !fragmentShader) return;

            // Create program
            this.program = gl.createProgram();
            gl.attachShader(this.program, vertexShader);
            gl.attachShader(this.program, fragmentShader);
            gl.linkProgram(this.program);

            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                console.error('Program link error:', gl.getProgramInfoLog(this.program));
                return;
            }

            // Set up geometry
            const positions = new Float32Array([
                -1, -1, 1, -1, -1, 1,
                -1, 1, 1, -1, 1, 1
            ]);

            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            // Get locations
            this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
            this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
            this.timeLocation = gl.getUniformLocation(this.program, 'u_time');
            this.mouseLocation = gl.getUniformLocation(this.program, 'u_mouse');

            // Mouse tracking
            document.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX / window.innerWidth;
                this.mouse.y = 1.0 - e.clientY / window.innerHeight;
            });

            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.render();
        }

        createShader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        resize() {
            const dpr = Math.min(window.devicePixelRatio, 2);
            this.canvas.width = window.innerWidth * dpr;
            this.canvas.height = window.innerHeight * dpr;
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.height = window.innerHeight + 'px';
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }

        render() {
            const gl = this.gl;

            gl.useProgram(this.program);
            gl.enableVertexAttribArray(this.positionLocation);
            gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

            gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
            gl.uniform1f(this.timeLocation, this.time);
            gl.uniform2f(this.mouseLocation, this.mouse.x, this.mouse.y);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            this.time += 0.016;
            requestAnimationFrame(() => this.render());
        }
    }

    // Initialize WebGL background
    const bgCanvas = $('#bg-canvas');
    if (bgCanvas && CONFIG.shaderEnabled) {
        new ShaderBackground(bgCanvas);
    }

    // ============================================
    // PARTICLE SYSTEM
    // ============================================

    class ParticleSystem {
        constructor(container) {
            this.container = container;
            this.particles = [];
            this.init();
        }

        init() {
            for (let i = 0; i < CONFIG.particleCount; i++) {
                this.createParticle(i);
            }
        }

        createParticle(index) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const size = Math.random() * 4 + 2;
            const x = Math.random() * 100;
            const delay = Math.random() * 15;
            const duration = Math.random() * 10 + 10;

            // Random colors from palette
            const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            particle.style.cssText = `
        left: ${x}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        box-shadow: 0 0 ${size * 2}px ${color};
      `;

            this.container.appendChild(particle);
            this.particles.push(particle);
        }
    }

    // Initialize particles
    const particlesContainer = $('#particles');
    if (particlesContainer) {
        new ParticleSystem(particlesContainer);
    }

    // ============================================
    // CURSOR GLOW EFFECT
    // ============================================

    const cursorGlow = $('#cursor-glow');
    let cursorX = 0, cursorY = 0;
    let glowX = 0, glowY = 0;

    if (cursorGlow) {
        document.addEventListener('mousemove', (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;
        });

        function animateCursor() {
            glowX = lerp(glowX, cursorX, 0.1);
            glowY = lerp(glowY, cursorY, 0.1);
            cursorGlow.style.left = glowX + 'px';
            cursorGlow.style.top = glowY + 'px';
            requestAnimationFrame(animateCursor);
        }
        animateCursor();
    }

    // ============================================
    // SCROLL REVEAL ANIMATIONS
    // ============================================

    const revealElements = $$('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 100);
            }
        });
    }, {
        threshold: CONFIG.scrollRevealThreshold,
        rootMargin: '-50px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ============================================
    // 3D TILT EFFECT
    // ============================================

    const tiltCards = $$('.tilt-card');

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / centerY * -CONFIG.tiltIntensity;
            const rotateY = (x - centerX) / centerX * CONFIG.tiltIntensity;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });

    // ============================================
    // MOBILE NAVIGATION
    // ============================================

    const menuToggle = $('.menu-toggle');
    const mobileNav = $('.mobile-nav');

    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });

        // Close menu on link click
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mobileNav.classList.remove('active');
            });
        });
    }

    // ============================================
    // SMOOTH SCROLL
    // ============================================

    $$('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = $(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll to top button
    const scrollTopBtn = $('#scroll-top');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Show/hide based on scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollTopBtn.style.opacity = '1';
                scrollTopBtn.style.pointerEvents = 'auto';
            } else {
                scrollTopBtn.style.opacity = '0';
                scrollTopBtn.style.pointerEvents = 'none';
            }
        });
    }

    // ============================================
    // QR FLOW INTERACTION
    // ============================================

    const flowSteps = $$('.flow-step');

    function showStep(stepId) {
        flowSteps.forEach(step => {
            step.classList.toggle('active', step.dataset.step === stepId);
        });
    }

    $$('[data-next]').forEach(btn => {
        btn.addEventListener('click', () => {
            showStep(btn.getAttribute('data-next'));
        });
    });

    // ============================================
    // GITHUB REPO STATS
    // ============================================

    async function fetchRepoStats() {
        const repoCards = $$('.repo-card[data-repo]');

        for (const card of repoCards) {
            const repoPath = card.dataset.repo;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.repoFetchTimeout);

                const response = await fetch(`https://api.github.com/repos/${repoPath}`, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) throw new Error('API error');

                const data = await response.json();

                // Update card with data
                const descEl = card.querySelector('.repo-desc');
                if (descEl && data.description) {
                    descEl.textContent = data.description;
                }

                const starsEl = card.querySelector('[data-stat="stars"]');
                if (starsEl) starsEl.textContent = data.stargazers_count ?? 0;

                const forksEl = card.querySelector('[data-stat="forks"]');
                if (forksEl) forksEl.textContent = data.forks_count ?? 0;

                const watchersEl = card.querySelector('[data-stat="watchers"]');
                if (watchersEl) watchersEl.textContent = data.watchers_count ?? 0;

                const langEl = card.querySelector('[data-stat="language"]');
                if (langEl) langEl.textContent = data.language ?? 'N/A';

                const langDot = card.querySelector('.lang-dot');
                if (langDot && data.language) {
                    const langColors = {
                        'JavaScript': '#f1e05a',
                        'TypeScript': '#3178c6',
                        'Python': '#3572A5',
                        'HTML': '#e34c26',
                        'CSS': '#563d7c',
                        'C++': '#f34b7d',
                        'C': '#555555',
                        'Go': '#00ADD8',
                        'Rust': '#dea584',
                        'Java': '#b07219',
                        'Shell': '#89e051',
                    };
                    langDot.style.background = langColors[data.language] || '#48dbfb';
                }

                const updatedEl = card.querySelector('[data-stat="updated"]');
                if (updatedEl && data.pushed_at) {
                    const date = new Date(data.pushed_at);
                    updatedEl.textContent = 'Updated: ' + date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }

            } catch (error) {
                console.warn(`Could not fetch ${repoPath}:`, error.message);
                // Keep default values from HTML
            }
        }
    }

    // Fetch repo stats on load
    fetchRepoStats();

    // ============================================
    // MAGNETIC BUTTON EFFECT
    // ============================================

    const magneticBtns = $$('.magnetic');

    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });

    // ============================================
    // NAVBAR SCROLL EFFECT
    // ============================================

    const nav = $('header.glass-nav');
    let lastScroll = 0;

    if (nav) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;

            if (currentScroll > 100) {
                nav.style.background = 'rgba(10, 10, 11, 0.95)';
                nav.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
            } else {
                nav.style.background = 'rgba(15, 15, 18, 0.7)';
                nav.style.boxShadow = 'none';
            }

            // Hide/show nav on scroll direction
            if (currentScroll > lastScroll && currentScroll > 200) {
                nav.style.transform = 'translateY(-100%)';
            } else {
                nav.style.transform = 'translateY(0)';
            }

            lastScroll = currentScroll;
        });
    }

    // ============================================
    // EASTER EGG: Konami Code
    // ============================================

    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                activateEasterEgg();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    function activateEasterEgg() {
        document.body.style.animation = 'rainbow-bg 2s ease';

        // Create confetti
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: hsl(${Math.random() * 360}, 100%, 50%);
        left: ${Math.random() * 100}vw;
        top: -20px;
        z-index: 10000;
        pointer-events: none;
        animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
      `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }

        // Add confetti animation
        const style = document.createElement('style');
        style.textContent = `
      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(${Math.random() * 720}deg);
          opacity: 0;
        }
      }
      @keyframes rainbow-bg {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
    `;
        document.head.appendChild(style);

        console.log('🐱 Meow! You found the secret! 🐱');
    }

    // ============================================
    // PERFORMANCE: Reduce motion for accessibility
    // ============================================

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (prefersReducedMotion.matches) {
        document.documentElement.style.setProperty('--transition-fast', '0s');
        document.documentElement.style.setProperty('--transition-normal', '0s');
        document.documentElement.style.setProperty('--transition-slow', '0s');

        // Disable animations
        $$('.particle').forEach(p => p.style.animation = 'none');
        if (cursorGlow) cursorGlow.style.display = 'none';
    }

    console.log('%c🐾 Mau says hi!', 'font-size: 24px; font-weight: bold; color: #ff6b6b;');
    console.log('%cBuilt with ❤️ by nileneb', 'font-size: 12px; color: #a0a0b0;');

    // ============================================
    // MAU MEMORY GAME
    // ============================================

    class MauMemoryGame {
        constructor() {
            this.grid = $('#memory-grid');
            this.startScreen = $('#memory-start');
            this.playingScreen = $('#memory-playing');
            this.winScreen = $('#memory-win');
            this.startBtn = $('#memory-start-btn');
            this.restartBtn = $('#memory-restart-btn');
            this.movesDisplay = $('#memory-moves');
            this.timeDisplay = $('#memory-time');
            this.pairsDisplay = $('#memory-pairs');
            this.finalMoves = $('#final-moves');
            this.finalTime = $('#final-time');

            if (!this.grid) return;

            this.cards = [];
            this.flippedCards = [];
            this.matchedPairs = 0;
            this.moves = 0;
            this.timer = null;
            this.seconds = 0;
            this.isLocked = false;
            this.totalPairs = 0;

            // Cat images from the folder (select best ones)
            this.catImages = [
                '/images/cat/20231105_001500.jpg',
                '/images/cat/20231114_233701.jpg',
                '/images/cat/20231126_163755.jpg',
                '/images/cat/20231205_175638.jpg',
                '/images/cat/20231209_201837.jpg',
                '/images/cat/20231222_172837.jpg',
                '/images/cat/20240117_112755.jpg',
                '/images/cat/20240124_163823.jpg',
                '/images/cat/20240222_192036.jpg',
                '/images/cat/20240304_144949.jpg',
                '/images/cat/20240316_103329.jpg',
                '/images/cat/20240414_120132.jpg',
                '/images/cat/20240519_192033.jpg',
                '/images/cat/20240613_234035.jpg',
                '/images/cat/20250620_154207.jpg',
                '/images/cat/20250729_152016.jpg',
                '/images/cat/20250831_172119.jpg',
                '/images/cat/20250921_194715.jpg',
                '/images/cat/20250928_120219.jpg',
                '/images/cat/20251005_125008.jpg',
                '/images/cat/20251019_050808.jpg',
                '/images/cat/20251112_130320.jpg',
                '/images/cat/20251124_233511.jpg',
                '/images/cat/20251202_210139.jpg',
            ];

            // Special icon cards
            this.specialCards = [
                { type: 'icon', content: '🙅', id: 'no-touch' },
                { type: 'icon', content: '💻', id: 'website' },
            ];

            this.init();
        }

        init() {
            if (this.startBtn) {
                this.startBtn.addEventListener('click', () => this.startGame());
            }
            if (this.restartBtn) {
                this.restartBtn.addEventListener('click', () => this.restartGame());
            }
        }

        isMobile() {
            return window.innerWidth < 600;
        }

        getPairCount() {
            // Mobile: 6 pairs (3x4 = 12 cards), Desktop: 8 pairs (4x4 = 16 cards)
            return this.isMobile() ? 6 : 8;
        }

        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }

        generateCards() {
            const pairCount = this.getPairCount();
            this.totalPairs = pairCount;

            // Shuffle and pick random cat images
            const shuffledImages = this.shuffleArray(this.catImages);
            const selectedImages = shuffledImages.slice(0, pairCount - 1); // Leave room for 1 special card

            // Create card data
            let cardData = [];

            // Add cat image pairs
            selectedImages.forEach((img, index) => {
                cardData.push({ type: 'image', content: img, pairId: `cat-${index}` });
                cardData.push({ type: 'image', content: img, pairId: `cat-${index}` });
            });

            // Add one special "no touch" pair
            cardData.push({ type: 'icon', content: '🙅', pairId: 'no-touch' });
            cardData.push({ type: 'icon', content: '🙅', pairId: 'no-touch' });

            // Shuffle all cards
            return this.shuffleArray(cardData);
        }

        createCardElement(cardData, index) {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.index = index;
            card.dataset.pairId = cardData.pairId;

            const inner = document.createElement('div');
            inner.className = 'memory-card-inner';

            const back = document.createElement('div');
            back.className = 'memory-card-face memory-card-back';

            const front = document.createElement('div');
            front.className = 'memory-card-face memory-card-front';

            if (cardData.type === 'image') {
                const img = document.createElement('img');
                img.src = cardData.content;
                img.alt = 'Mau the cat';
                img.loading = 'lazy';
                front.appendChild(img);
            } else {
                front.classList.add('icon-card');
                front.textContent = cardData.content;
            }

            inner.appendChild(back);
            inner.appendChild(front);
            card.appendChild(inner);

            card.addEventListener('click', () => this.flipCard(card));

            return card;
        }

        startGame() {
            this.resetGame();
            this.showScreen('playing');

            // Generate and render cards
            const cardData = this.generateCards();
            this.grid.innerHTML = '';

            cardData.forEach((data, index) => {
                const cardEl = this.createCardElement(data, index);
                this.cards.push(cardEl);
                this.grid.appendChild(cardEl);
            });

            // Update pairs display
            this.updateDisplay();

            // Optional: Show all cards briefly
            this.previewCards();
        }

        previewCards() {
            this.isLocked = true;

            // Flip all cards face up
            this.cards.forEach(card => card.classList.add('flipped'));

            // Flip them back after 1.5 seconds
            setTimeout(() => {
                this.cards.forEach(card => card.classList.remove('flipped'));
                this.isLocked = false;
                this.startTimer();
            }, 1500);
        }

        flipCard(card) {
            if (this.isLocked) return;
            if (card.classList.contains('flipped')) return;
            if (card.classList.contains('matched')) return;
            if (this.flippedCards.length >= 2) return;

            card.classList.add('flipped');
            this.flippedCards.push(card);

            if (this.flippedCards.length === 2) {
                this.moves++;
                this.updateDisplay();
                this.checkMatch();
            }
        }

        checkMatch() {
            const [card1, card2] = this.flippedCards;
            const isMatch = card1.dataset.pairId === card2.dataset.pairId;

            if (isMatch) {
                this.handleMatch(card1, card2);
            } else {
                this.handleMismatch(card1, card2);
            }
        }

        handleMatch(card1, card2) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            this.matchedPairs++;
            this.flippedCards = [];
            this.updateDisplay();

            // Check for win
            if (this.matchedPairs === this.totalPairs) {
                setTimeout(() => this.handleWin(), 500);
            }
        }

        handleMismatch(card1, card2) {
            this.isLocked = true;

            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                this.flippedCards = [];
                this.isLocked = false;
            }, 800);
        }

        startTimer() {
            this.timer = setInterval(() => {
                this.seconds++;
                this.updateDisplay();
            }, 1000);
        }

        stopTimer() {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }

        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        updateDisplay() {
            if (this.movesDisplay) this.movesDisplay.textContent = this.moves;
            if (this.timeDisplay) this.timeDisplay.textContent = this.formatTime(this.seconds);
            if (this.pairsDisplay) this.pairsDisplay.textContent = `${this.matchedPairs}/${this.totalPairs}`;
        }

        handleWin() {
            this.stopTimer();

            if (this.finalMoves) this.finalMoves.textContent = this.moves;
            if (this.finalTime) this.finalTime.textContent = this.formatTime(this.seconds);

            this.showScreen('win');
            this.createConfetti();
        }

        createConfetti() {
            const container = $('#confetti');
            if (!container) return;

            container.innerHTML = '';
            const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'];

            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.cssText = `
                    left: ${Math.random() * 100}%;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    animation-delay: ${Math.random() * 0.5}s;
                    animation-duration: ${2 + Math.random() * 2}s;
                `;
                container.appendChild(confetti);

                // Trigger animation
                setTimeout(() => confetti.classList.add('active'), 10);
            }
        }

        showScreen(screen) {
            [this.startScreen, this.playingScreen, this.winScreen].forEach(s => {
                if (s) s.classList.remove('active');
            });

            const targetScreen = {
                'start': this.startScreen,
                'playing': this.playingScreen,
                'win': this.winScreen
            }[screen];

            if (targetScreen) targetScreen.classList.add('active');
        }

        resetGame() {
            this.cards = [];
            this.flippedCards = [];
            this.matchedPairs = 0;
            this.moves = 0;
            this.seconds = 0;
            this.isLocked = false;
            this.stopTimer();
        }

        restartGame() {
            this.showScreen('start');
        }
    }

    // Initialize Memory Game
    new MauMemoryGame();

})();
