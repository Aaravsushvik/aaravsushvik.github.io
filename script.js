document.addEventListener('DOMContentLoaded', () => {
    const html = document.documentElement;
    const header = document.getElementById('main-header');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('main-nav');
    const mainContent = document.getElementById('main-content');
    const footerElement = document.querySelector('footer');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    const topBtn = document.getElementById('topBtn');
    const progressBar = document.getElementById('scroll-progress');
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formStatus = document.getElementById('form-status');
    const metaThemeColor = document.getElementById('meta-theme-color');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const supportsInert = 'inert' in HTMLElement.prototype;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

    // ==========================================================================
    // Theme Management
    // ==========================================================================
    const updateMetaColor = (isDark) => {
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isDark ? '#1c1c1e' : '#fbfbfd');
        }
    };

    const updateThemeIcon = () => {
        if (!moonIcon || !sunIcon || !themeToggle) return;
        const isDark = html.classList.contains('dark') || (!html.classList.contains('light') && systemTheme.matches);
        if (isDark) {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
            themeToggle.setAttribute('aria-label', 'Switch to light mode');
        } else {
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
            themeToggle.setAttribute('aria-label', 'Switch to dark mode');
        }
    };
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        html.classList.remove('light', 'dark');
        html.classList.add(savedTheme);
    }
    updateMetaColor(html.classList.contains('dark'));
    updateThemeIcon();

    const dispatchThemeUpdate = () => {
        const styles = getComputedStyle(document.body);
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: {
                background: styles.getPropertyValue('--color-bg').trim(),
                particle: styles.getPropertyValue('--canvas-particle').trim(),
                line: styles.getPropertyValue('--canvas-line').trim()
            }
        }));
    };

    systemTheme.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            html.classList.remove('light', 'dark');
            html.classList.add(e.matches ? 'dark' : 'light');
            updateThemeIcon();
            updateMetaColor(e.matches);
            requestAnimationFrame(dispatchThemeUpdate);
        }
    });

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentlyDark = html.classList.contains('dark') || (!html.classList.contains('light') && systemTheme.matches);
            html.classList.remove(currentlyDark ? 'dark' : 'light');
            html.classList.add(currentlyDark ? 'light' : 'dark');
            localStorage.setItem('theme', currentlyDark ? 'light' : 'dark');
            
            updateMetaColor(!currentlyDark);
            updateThemeIcon();
            requestAnimationFrame(dispatchThemeUpdate);
        });
    }

    // ==========================================================================
    // Canvas Engine 
    // ==========================================================================
    const canvas = document.getElementById('hero-canvas');
    const heroSection = document.getElementById('home');
    const QUALITY = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2 });
    const CONFIG = Object.freeze({
        mouseRadius: 150,
        mouseRadiusSq: 22500,
        physicsStep: 1000 / 60,
        alphaBuckets: 5,
        levels: {
            [QUALITY.LOW]: { count: 25, connDistSq: 6400 },
            [QUALITY.MEDIUM]: { count: 50, connDistSq: 10000 },
            [QUALITY.HIGH]: { count: 80, connDistSq: 14400 }
        }
    });

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = connection && connection.saveData;

    if (canvas && heroSection && !prefersReducedMotion.matches && !saveData) {
        canvas.setAttribute('aria-hidden', 'true');
        const ctx = canvas.getContext('2d', { alpha: false });
        
        let engineRunning = false;
        let heroVisible = true; 
        let animationFrameId = null;
        let width = 0, height = 0;
        let canvasRect = { left: 0, top: 0 };
        
        let lastTime = 0, accumulator = 0;
        let emaFps = 60, lastQualityCheck = 0;
        let lowFrames = 0, highFrames = 0;
        let maxHardwareQuality = QUALITY.MEDIUM;
        let currentQuality = QUALITY.LOW;
        
        const particles = [];
        let rawPointer = { x: null, y: null };
        const mouse = Object.seal({ x: null, y: null });
        let backgroundColor, particleColor, lineColor;

        const maxLines = (CONFIG.levels[QUALITY.HIGH].count * (CONFIG.levels[QUALITY.HIGH].count - 1)) / 2;
        const lineBuckets = Array.from({ length: CONFIG.alphaBuckets }, () => new Float32Array(maxLines * 4));
        const bucketCounts = new Int32Array(CONFIG.alphaBuckets);

        const assessHardware = () => {
            const cores = navigator.hardwareConcurrency || 4;
            const networkType = connection ? connection.effectiveType : '4g';
            const isSlowNetwork = networkType === '2g' || networkType === 'slow-2g' || networkType === '3g';
            
            if (cores > 4 && !isSlowNetwork && window.innerWidth > 768) {
                maxHardwareQuality = QUALITY.HIGH;
            } else if (isSlowNetwork) {
                maxHardwareQuality = QUALITY.LOW;
            } else {
                maxHardwareQuality = QUALITY.MEDIUM;
            }
            currentQuality = maxHardwareQuality;
        };

        const themeHandler = (e) => {
            if (!e || !e.detail) return;
            backgroundColor = e.detail.background || backgroundColor;
            particleColor = e.detail.particle || particleColor;
            lineColor = e.detail.line || lineColor;
        };

        const initTheme = () => {
            const styles = getComputedStyle(document.body);
            backgroundColor = styles.getPropertyValue('--color-bg').trim();
            particleColor = styles.getPropertyValue('--canvas-particle').trim();
            lineColor = styles.getPropertyValue('--canvas-line').trim();
        };

        const updateRect = () => { canvasRect = canvas.getBoundingClientRect(); };
        const pointerMoveHandler = (e) => { rawPointer.x = e.clientX; rawPointer.y = e.clientY; };
        const pointerLeaveHandler = () => { rawPointer.x = null; rawPointer.y = null; };

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 1.5 + 0.5;
            }
            update(dt) {
                const timeScale = dt / CONFIG.physicsStep;
                this.x += this.vx * timeScale;
                this.y += this.vy * timeScale;

                if (this.x < 0 || this.x > width) this.vx = -this.vx;
                if (this.y < 0 || this.y > height) this.vy = -this.vy;

                if (mouse.x !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > 0 && distSq < CONFIG.mouseRadiusSq) {
                        const distance = Math.sqrt(distSq);
                        const force = Math.max(0, (CONFIG.mouseRadius - distance) / CONFIG.mouseRadius);
                        this.x -= (dx / distance) * force * 1.5 * timeScale;
                        this.y -= (dy / distance) * force * 1.5 * timeScale;
                    }
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const initCanvas = () => {
            const newWidth = canvas.parentElement.clientWidth;
            const newHeight = canvas.parentElement.clientHeight;
            if (newWidth === 0 || newHeight === 0 || (newWidth === width && newHeight === height)) return;
            
            width = newWidth; height = newHeight;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr; canvas.height = height * dpr;
            canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            updateRect();
            
            const maxNeeded = CONFIG.levels[QUALITY.HIGH].count;
            while (particles.length < maxNeeded) particles.push(new Particle());
            for (let i = 0; i < maxNeeded; i++) particles[i].reset();
        };

        const startEngine = () => {
            if (engineRunning) return;
            engineRunning = true;
            lastTime = performance.now();
            accumulator = 0;
            animateCanvas(lastTime);
        };

        const stopEngine = () => {
            engineRunning = false;
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };

        const animateCanvas = (time) => {
            if (!engineRunning) return;
            animationFrameId = requestAnimationFrame(animateCanvas);

            let dt = time - lastTime;
            if (dt > 100) dt = 100;
            lastTime = time;

            if (rawPointer.x !== null) {
                mouse.x = rawPointer.x - canvasRect.left;
                mouse.y = rawPointer.y - canvasRect.top;
            } else {
                mouse.x = null; mouse.y = null;
            }

            const currentFps = 1000 / (dt || 1);
            emaFps = emaFps * 0.9 + currentFps * 0.1;

            if (time - lastQualityCheck > 500) {
                lastQualityCheck = time;
                if (emaFps < 45) { lowFrames++; highFrames = 0; } 
                else if (emaFps > 55) { highFrames++; lowFrames = 0; } 
                else { lowFrames = 0; highFrames = 0; }

                if (lowFrames >= 3 && currentQuality > QUALITY.LOW) {
                    currentQuality--; lowFrames = 0; 
                } else if (highFrames >= 3 && currentQuality < maxHardwareQuality) {
                    const oldTarget = CONFIG.levels[currentQuality].count;
                    currentQuality++;
                    const newTarget = CONFIG.levels[currentQuality].count;
                    for (let i = oldTarget; i < newTarget; i++) particles[i].reset();
                    highFrames = 0; 
                }
            }

            accumulator += dt;
            const activeCount = CONFIG.levels[currentQuality].count;
            const currentConnDistSq = CONFIG.levels[currentQuality].connDistSq;

            let steps = 0;
            while (accumulator >= CONFIG.physicsStep && steps < 5) {
                for (let i = 0; i < activeCount; i++) particles[i].update(CONFIG.physicsStep);
                accumulator -= CONFIG.physicsStep;
                steps++;
            }

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = particleColor;
            for (let i = 0; i < activeCount; i++) particles[i].draw();

            bucketCounts.fill(0);
            for (let i = 0; i < activeCount; i++) {
                for (let j = i + 1; j < activeCount; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < currentConnDistSq) {
                        const alpha = 1 - (distSq / currentConnDistSq);
                        let bucketIdx = Math.floor(alpha * CONFIG.alphaBuckets);
                        if (bucketIdx >= CONFIG.alphaBuckets) bucketIdx = CONFIG.alphaBuckets - 1;
                        
                        const ptr = bucketCounts[bucketIdx] * 4;
                        const arr = lineBuckets[bucketIdx];
                        arr[ptr] = particles[i].x; arr[ptr+1] = particles[i].y;
                        arr[ptr+2] = particles[j].x; arr[ptr+3] = particles[j].y;
                        bucketCounts[bucketIdx]++;
                    }
                }
            }

            ctx.strokeStyle = lineColor;
            for (let b = 0; b < CONFIG.alphaBuckets; b++) {
                if (bucketCounts[b] === 0) continue;
                ctx.beginPath();
                ctx.globalAlpha = (b + 1) / CONFIG.alphaBuckets;
                const count = bucketCounts[b];
                const arr = lineBuckets[b];
                for (let i = 0; i < count; i++) {
                    const ptr = i * 4;
                    ctx.moveTo(arr[ptr], arr[ptr+1]);
                    ctx.lineTo(arr[ptr+2], arr[ptr+3]);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        };

        canvas.addEventListener('pointermove', pointerMoveHandler, { passive: true });
        canvas.addEventListener('pointerleave', pointerLeaveHandler, { passive: true });
        canvas.addEventListener('pointercancel', pointerLeaveHandler, { passive: true });
        document.addEventListener('themechange', themeHandler);

        let resizePending = false;
        const resizeObserver = new ResizeObserver(() => {
            if (resizePending) return;
            resizePending = true;
            requestAnimationFrame(() => { initCanvas(); resizePending = false; });
        });
        resizeObserver.observe(canvas.parentElement);

        const visibilityHandler = () => {
            if (document.hidden) stopEngine();
            else if (heroVisible) startEngine();
        };
        const scrollHandler = () => updateRect();
        const pageShowHandler = () => { if (heroVisible && !document.hidden) startEngine(); };

        document.addEventListener('visibilitychange', visibilityHandler);
        window.addEventListener('pagehide', stopEngine);
        window.addEventListener('pageshow', pageShowHandler);
        window.addEventListener('scroll', scrollHandler, { passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', scrollHandler, { passive: true });
            window.visualViewport.addEventListener('scroll', scrollHandler, { passive: true });
        }

        let dprMedia;
        const dprHandler = () => { initCanvas(); watchDPR(); };
        const watchDPR = () => {
            if (dprMedia) dprMedia.removeEventListener('change', dprHandler);
            dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            dprMedia.addEventListener('change', dprHandler);
        };
        watchDPR();
        
        const motionHandler = (e) => {
            if (e.matches) stopEngine();
            else if (heroVisible && !document.hidden) startEngine();
        };
        prefersReducedMotion.addEventListener('change', motionHandler);

        window.destroyCanvasEngine = () => {
            stopEngine();
            
            observer.disconnect();
            resizeObserver.disconnect();
            
            canvas.removeEventListener('pointermove', pointerMoveHandler);
            canvas.removeEventListener('pointerleave', pointerLeaveHandler);
            canvas.removeEventListener('pointercancel', pointerLeaveHandler);
            document.removeEventListener('themechange', themeHandler);
            
            document.removeEventListener('visibilitychange', visibilityHandler);
            window.removeEventListener('pagehide', stopEngine);
            window.removeEventListener('pageshow', pageShowHandler); 
            window.removeEventListener('scroll', scrollHandler);
            
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', scrollHandler);
                window.visualViewport.removeEventListener('scroll', scrollHandler);
            }
            
            if (dprMedia) dprMedia.removeEventListener('change', dprHandler);
            prefersReducedMotion.removeEventListener('change', motionHandler);
            
            particles.length = 0; 
        };

        initTheme();
        assessHardware();
        initCanvas();
        
        // Start immediately since hero relies on fast rendering
        startEngine(); 
    }

    // ==========================================================================
    // Mobile Navigation & Focus Trap 
    // ==========================================================================
    const closeMenu = () => {
        if (!nav || !menuToggle || !nav.classList.contains('open')) return;
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        
        if (supportsInert) {
            if (mainContent) mainContent.inert = false;
            if (footerElement) footerElement.inert = false;
        } else {
            if (mainContent) mainContent.removeAttribute('aria-hidden');
            if (footerElement) footerElement.removeAttribute('aria-hidden');
        }
    };

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', isOpen);
            
            if (isOpen) {
                if (supportsInert) {
                    if (mainContent) mainContent.inert = true;
                    if (footerElement) footerElement.inert = true;
                } else {
                    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
                    if (footerElement) footerElement.setAttribute('aria-hidden', 'true');
                }
                const firstLink = nav.querySelector('a');
                if (firstLink) setTimeout(() => firstLink.focus(), 50);
            } else {
                if (supportsInert) {
                    if (mainContent) mainContent.inert = false;
                    if (footerElement) footerElement.inert = false;
                } else {
                    if (mainContent) mainContent.removeAttribute('aria-hidden');
                    if (footerElement) footerElement.removeAttribute('aria-hidden');
                }
            }
        });

        nav.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && window.innerWidth <= 768) closeMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('open')) {
                closeMenu();
                menuToggle.focus();
            }

            if (!supportsInert && e.key === 'Tab' && nav.classList.contains('open') && window.innerWidth <= 768) {
                const focusableElements = nav.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault(); lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault(); firstElement.focus();
                }
            }
        });
    }

    // ==========================================================================
    // Deferred UI Observers (Run in idle time to unblock rendering)
    // ==========================================================================
    const initDeferredObservers = () => {
        if (navLinks.length > 0 && sections.length > 0) {
            const navObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        navLinks.forEach(link => {
                            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                        });
                    }
                });
            }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
            sections.forEach(sec => navObserver.observe(sec));
        }

        if (!prefersReducedMotion.matches) {
            const reveals = document.querySelectorAll('.reveal');
            if (reveals.length > 0) {
                const revealObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            observer.unobserve(entry.target); 
                        }
                    });
                }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });
                reveals.forEach(el => revealObserver.observe(el));
            }
        } else {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        }
    };

    // Safari Fallback for requestIdleCallback
    const scheduleIdle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1));
    scheduleIdle(initDeferredObservers);

    // ==========================================================================
    // Throttled Scroll Events
    // ==========================================================================
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                if (header) {
                    if (scrollTop > 10) header.classList.add('scrolled');
                    else header.classList.remove('scrolled');
                }
                if (progressBar && !prefersReducedMotion.matches) {
                    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) : 0;
                    progressBar.style.transform = `scaleX(${scrollPercent})`;
                }
                if (topBtn) {
                    if (scrollTop > 400) topBtn.classList.remove('hidden');
                    else topBtn.classList.add('hidden');
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    if (topBtn) {
        topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' }));
    }

    // ==========================================================================
    // Smooth Anchor Scrolling
    // ==========================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || this.classList.contains('skip-link')) return;
            const id = href.slice(1);
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                const offset = target.getBoundingClientRect().top + window.scrollY - 60; 
                window.scrollTo({ top: offset, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
            }
        });
    });

    // ==========================================================================
    // Form Submission (Formspree)
    // ==========================================================================
    if (contactForm && submitBtn && formStatus) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            formStatus.textContent = 'Sending your message...';
            formStatus.style.color = 'var(--color-text-secondary)';

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: new FormData(contactForm),
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    contactForm.reset();
                    submitBtn.textContent = 'Message Sent';
                    submitBtn.classList.add('success');
                    formStatus.textContent = 'Message sent successfully.';
                    formStatus.style.color = 'var(--color-success)';
                } else {
                    throw new Error('Network response was not ok.');
                }
            } catch (error) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
                formStatus.textContent = 'Something went wrong. Please try again.';
                formStatus.style.color = 'var(--color-error)';
            }
        });
    }
});
