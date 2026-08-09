document.addEventListener('DOMContentLoaded', () => {
    const d = document, w = window, html = d.documentElement;
    const q = id => d.getElementById(id);
    const header = q('main-header'), themeToggle = q('theme-toggle');
    const sunIcon = q('sun-icon'), moonIcon = q('moon-icon');
    const menuToggle = q('menu-toggle'), nav = q('main-nav'), mainContent = q('main-content');
    const footerElement = d.querySelector('footer'), navLinks = d.querySelectorAll('.nav-link'), sections = d.querySelectorAll('section[id]');
    const topBtn = q('topBtn'), progressBar = q('scroll-progress');
    const contactForm = q('contact-form'), submitBtn = q('submit-btn'), formStatus = q('form-status');
    const metaThemeColor = q('meta-theme-color');

    const prefersReducedMotion = w.matchMedia('(prefers-reduced-motion: reduce)');
    const supportsInert = 'inert' in HTMLElement.prototype;
    const systemTheme = w.matchMedia('(prefers-color-scheme: dark)');

    // ==========================================================================
    // Theme Management (Deterministic state, aria-pressed, meta color fix)
    // ==========================================================================
    const updateMetaColor = (isDark) => {
        if(metaThemeColor) metaThemeColor.setAttribute('content', isDark ? '#1c1c1e' : '#fbfbfd');
    };

    const applyTheme = (isDark) => {
        html.classList.remove('light', 'dark');
        html.classList.add(isDark ? 'dark' : 'light');
        updateMetaColor(isDark);
        if(themeToggle && moonIcon && sunIcon) {
            moonIcon.classList.toggle('hidden', isDark);
            sunIcon.classList.toggle('hidden', !isDark);
            themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            themeToggle.setAttribute('aria-pressed', isDark.toString());
        }
    };

    let isDarkTheme = false;
    try {
        const savedTheme = localStorage.getItem('theme');
        isDarkTheme = savedTheme === 'dark' || (!savedTheme && systemTheme.matches);
    } catch(e) {
        isDarkTheme = systemTheme.matches;
    }
    applyTheme(isDarkTheme);

    const dispatchThemeUpdate = () => {
        const styles = w.getComputedStyle(d.body);
        d.dispatchEvent(new CustomEvent('themechange', {
            detail: {
                background: styles.getPropertyValue('--color-bg').trim(),
                particle: styles.getPropertyValue('--canvas-particle').trim(),
                line: styles.getPropertyValue('--canvas-line').trim()
            }
        }));
    };

    systemTheme.addEventListener('change', (e) => {
        try {
            if(!localStorage.getItem('theme')) {
                applyTheme(e.matches);
                requestAnimationFrame(dispatchThemeUpdate);
            }
        } catch(err) {}
    });

    if(themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newIsDark = !html.classList.contains('dark');
            applyTheme(newIsDark);
            try { localStorage.setItem('theme', newIsDark ? 'dark' : 'light'); } catch(err) {}
            requestAnimationFrame(dispatchThemeUpdate);
        });
    }

    // ==========================================================================
    // Canvas Engine (Untouched architecture with Position Clamping added)
    // ==========================================================================
    const canvas = q('hero-canvas'), heroSection = q('home');
    const QUALITY = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2 });
    const CONFIG = Object.freeze({
        mouseRadius: 150, mouseRadiusSq: 22500, physicsStep: 1000 / 60, alphaBuckets: 5,
        levels: { 0: { count: 25, connDistSq: 6400 }, 1: { count: 50, connDistSq: 10000 }, 2: { count: 80, connDistSq: 14400 } }
    });

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = connection && connection.saveData;

    if(canvas && heroSection && !prefersReducedMotion.matches && !saveData) {
        canvas.setAttribute('aria-hidden', 'true');
        const ctx = canvas.getContext('2d', { alpha: false });
        
        let engineRunning = false, heroVisible = true, animationFrameId = null, width = 0, height = 0, canvasRect = { left: 0, top: 0 };
        let lastTime = 0, accumulator = 0, emaFps = 60, lastQualityCheck = 0, lowFrames = 0, highFrames = 0;
        let maxHardwareQuality = QUALITY.MEDIUM, currentQuality = QUALITY.LOW;
        
        const particles = [], mouse = Object.seal({ x: null, y: null });
        let rawPointer = { x: null, y: null }, backgroundColor, particleColor, lineColor;

        const maxLines = (CONFIG.levels[2].count * (CONFIG.levels[2].count - 1)) / 2;
        const lineBuckets = Array.from({ length: 5 }, () => new Float32Array(maxLines * 4));
        const bucketCounts = new Int32Array(5);

        const assessHardware = () => {
            const cores = navigator.hardwareConcurrency || 4, networkType = connection ? connection.effectiveType : '4g';
            const isSlow = networkType === '2g' || networkType === 'slow-2g' || networkType === '3g';
            if(cores > 4 && !isSlow && w.innerWidth > 768) maxHardwareQuality = QUALITY.HIGH;
            else if(isSlow) maxHardwareQuality = QUALITY.LOW;
            else maxHardwareQuality = QUALITY.MEDIUM;
            currentQuality = maxHardwareQuality;
        };

        const themeHandler = (e) => { if(!e || !e.detail) return; backgroundColor = e.detail.background || backgroundColor; particleColor = e.detail.particle || particleColor; lineColor = e.detail.line || lineColor; };
        const initTheme = () => { const styles = w.getComputedStyle(d.body); backgroundColor = styles.getPropertyValue('--color-bg').trim(); particleColor = styles.getPropertyValue('--canvas-particle').trim(); lineColor = styles.getPropertyValue('--canvas-line').trim(); };
        const updateRect = () => { canvasRect = canvas.getBoundingClientRect(); };
        const pointerMoveHandler = (e) => { rawPointer.x = e.clientX; rawPointer.y = e.clientY; };
        const pointerLeaveHandler = () => { rawPointer.x = null; rawPointer.y = null; };

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * width; this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 1.5 + 0.5;
            }
            update(dt) {
                const timeScale = dt / CONFIG.physicsStep;
                this.x += this.vx * timeScale; this.y += this.vy * timeScale;

                if(this.x < 0 || this.x > width) this.vx = -this.vx;
                if(this.y < 0 || this.y > height) this.vy = -this.vy;

                if(mouse.x !== null) {
                    const dx = mouse.x - this.x, dy = mouse.y - this.y, distSq = dx * dx + dy * dy;
                    if(distSq > 0 && distSq < CONFIG.mouseRadiusSq) {
                        const distance = Math.sqrt(distSq), force = Math.max(0, (CONFIG.mouseRadius - distance) / CONFIG.mouseRadius);
                        this.x -= (dx / distance) * force * 1.5 * timeScale;
                        this.y -= (dy / distance) * force * 1.5 * timeScale;
                        
                        // Fix: Clamp particle positions after force is applied
                        if(this.x < 0) this.x = 0;
                        if(this.x > width) this.x = width;
                        if(this.y < 0) this.y = 0;
                        if(this.y > height) this.y = height;
                    }
                }
            }
            draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
        }

        const initCanvas = () => {
            const nw = canvas.parentElement.clientWidth, nh = canvas.parentElement.clientHeight;
            if(nw === 0 || nh === 0 || (nw === width && nh === height)) return;
            width = nw; height = nh; const dpr = w.devicePixelRatio || 1;
            canvas.width = width * dpr; canvas.height = height * dpr;
            canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); updateRect();
            
            const maxNeeded = CONFIG.levels[QUALITY.HIGH].count;
            while(particles.length < maxNeeded) particles.push(new Particle());
            for(let i = 0; i < maxNeeded; i++) particles[i].reset();
        };

        const startEngine = () => { if(engineRunning) return; engineRunning = true; lastTime = performance.now(); accumulator = 0; animateCanvas(lastTime); };
        const stopEngine = () => { engineRunning = false; if(animationFrameId !== null) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } };

        const animateCanvas = (time) => {
            if(!engineRunning) return; animationFrameId = requestAnimationFrame(animateCanvas);
            let dt = time - lastTime; if(dt > 100) dt = 100; lastTime = time;
            if(rawPointer.x !== null) { mouse.x = rawPointer.x - canvasRect.left; mouse.y = rawPointer.y - canvasRect.top; } else { mouse.x = null; mouse.y = null; }
            
            const currentFps = 1000 / (dt || 1); emaFps = emaFps * 0.9 + currentFps * 0.1;
            if(time - lastQualityCheck > 500) {
                lastQualityCheck = time;
                if(emaFps < 45) { lowFrames++; highFrames = 0; } else if(emaFps > 55) { highFrames++; lowFrames = 0; } else { lowFrames = 0; highFrames = 0; }
                if(lowFrames >= 3 && currentQuality > QUALITY.LOW) { currentQuality--; lowFrames = 0; }
                else if(highFrames >= 3 && currentQuality < maxHardwareQuality) { const oldTarget = CONFIG.levels[currentQuality].count; currentQuality++; const newTarget = CONFIG.levels[currentQuality].count; for(let i = oldTarget; i < newTarget; i++) particles[i].reset(); highFrames = 0; }
            }

            accumulator += dt; const activeCount = CONFIG.levels[currentQuality].count, currentConnDistSq = CONFIG.levels[currentQuality].connDistSq;
            let steps = 0;
            while(accumulator >= CONFIG.physicsStep && steps < 5) { for(let i = 0; i < activeCount; i++) particles[i].update(CONFIG.physicsStep); accumulator -= CONFIG.physicsStep; steps++; }

            ctx.fillStyle = backgroundColor; ctx.fillRect(0, 0, width, height); ctx.fillStyle = particleColor;
            for(let i = 0; i < activeCount; i++) particles[i].draw();

            bucketCounts.fill(0);
            for(let i = 0; i < activeCount; i++) {
                for(let j = i + 1; j < activeCount; j++) {
                    const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, distSq = dx * dx + dy * dy;
                    if(distSq < currentConnDistSq) {
                        const alpha = 1 - (distSq / currentConnDistSq); let bucketIdx = Math.floor(alpha * 5); if(bucketIdx >= 5) bucketIdx = 4;
                        const ptr = bucketCounts[bucketIdx] * 4, arr = lineBuckets[bucketIdx];
                        arr[ptr] = particles[i].x; arr[ptr+1] = particles[i].y; arr[ptr+2] = particles[j].x; arr[ptr+3] = particles[j].y; bucketCounts[bucketIdx]++;
                    }
                }
            }

            ctx.strokeStyle = lineColor;
            for(let b = 0; b < 5; b++) {
                if(bucketCounts[b] === 0) continue; ctx.beginPath(); ctx.globalAlpha = (b + 1) / 5;
                const count = bucketCounts[b], arr = lineBuckets[b];
                for(let i = 0; i < count; i++) { const ptr = i * 4; ctx.moveTo(arr[ptr], arr[ptr+1]); ctx.lineTo(arr[ptr+2], arr[ptr+3]); }
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        };

        canvas.addEventListener('pointermove', pointerMoveHandler, { passive: true });
        canvas.addEventListener('pointerleave', pointerLeaveHandler, { passive: true });
        canvas.addEventListener('pointercancel', pointerLeaveHandler, { passive: true });
        d.addEventListener('themechange', themeHandler);

        let resizePending = false;
        const resizeObserver = new ResizeObserver(() => { if(resizePending) return; resizePending = true; requestAnimationFrame(() => { initCanvas(); resizePending = false; }); });
        resizeObserver.observe(canvas.parentElement);

        const visibilityHandler = () => { if(d.hidden) stopEngine(); else if(heroVisible) startEngine(); };
        const scrollHandler = () => { updateRect(); };
        const pageShowHandler = () => { if(heroVisible && !d.hidden) startEngine(); };

        d.addEventListener('visibilitychange', visibilityHandler);
        w.addEventListener('pagehide', stopEngine);
        w.addEventListener('pageshow', pageShowHandler);
        w.addEventListener('scroll', scrollHandler, { passive: true });

        if(w.visualViewport) { w.visualViewport.addEventListener('resize', scrollHandler, { passive: true }); w.visualViewport.addEventListener('scroll', scrollHandler, { passive: true }); }

        let dprMedia;
        const dprHandler = () => { initCanvas(); watchDPR(); };
        const watchDPR = () => { if(dprMedia) dprMedia.removeEventListener('change', dprHandler); dprMedia = w.matchMedia(`(resolution: ${w.devicePixelRatio}dppx)`); dprMedia.addEventListener('change', dprHandler); };
        watchDPR();
        
        const motionHandler = (e) => { if(e.matches) stopEngine(); else if(heroVisible && !d.hidden) startEngine(); };
        prefersReducedMotion.addEventListener('change', motionHandler);

        initTheme(); assessHardware(); initCanvas(); startEngine(); 
    }

    // ==========================================================================
    // Mobile Navigation & Focus Trap (A11y improvements)
    // ==========================================================================
    const closeMenu = () => {
        if(!nav || !menuToggle || !nav.classList.contains('open')) return;
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        if(supportsInert) { if(mainContent) mainContent.inert = false; if(footerElement) footerElement.inert = false; }
        else { if(mainContent) mainContent.removeAttribute('aria-hidden'); if(footerElement) footerElement.removeAttribute('aria-hidden'); }
        menuToggle.focus(); // Returns focus to toggle after closing
    };

    if(menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', isOpen.toString());
            
            if(isOpen) {
                if(supportsInert) { if(mainContent) mainContent.inert = true; if(footerElement) footerElement.inert = true; }
                else { if(mainContent) mainContent.setAttribute('aria-hidden', 'true'); if(footerElement) footerElement.setAttribute('aria-hidden', 'true'); }
                const firstLink = nav.querySelector('a');
                if(firstLink) setTimeout(() => firstLink.focus(), 50);
            } else {
                if(supportsInert) { if(mainContent) mainContent.inert = false; if(footerElement) footerElement.inert = false; }
                else { if(mainContent) mainContent.removeAttribute('aria-hidden'); if(footerElement) footerElement.removeAttribute('aria-hidden'); }
            }
        });

        nav.addEventListener('click', (e) => { if(e.target.tagName === 'A' && w.innerWidth <= 768) closeMenu(); });

        d.addEventListener('keydown', (e) => {
            if(e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); }
            if(!supportsInert && e.key === 'Tab' && nav.classList.contains('open') && w.innerWidth <= 768) {
                const focusableElements = nav.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if(focusableElements.length === 0) return;
                const firstElement = focusableElements[0], lastElement = focusableElements[focusableElements.length - 1];
                if(e.shiftKey && d.activeElement === firstElement) { e.preventDefault(); lastElement.focus(); }
                else if(!e.shiftKey && d.activeElement === lastElement) { e.preventDefault(); firstElement.focus(); }
            }
        });
    }

    // ==========================================================================
    // Deferred UI Observers
    // ==========================================================================
    const initDeferredObservers = () => {
        if(navLinks.length > 0 && sections.length > 0) {
            const navObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if(entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        navLinks.forEach(link => { link.classList.toggle('active', link.getAttribute('href') === `#${id}`); });
                    }
                });
            }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
            sections.forEach(sec => navObserver.observe(sec));
        }

        if(!prefersReducedMotion.matches) {
            const reveals = d.querySelectorAll('.reveal');
            if(reveals.length > 0) {
                const revealObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
                }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });
                reveals.forEach(el => revealObserver.observe(el));
            }
        } else {
            d.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        }
    };

    const scheduleIdle = w.requestIdleCallback ?? ((cb) => setTimeout(cb, 1));
    scheduleIdle(initDeferredObservers);

    // ==========================================================================
    // Throttled Scroll Events & Back-to-Top Button
    // ==========================================================================
    let ticking = false;
    
    // Ensure topBtn is explicitly unfocusable when loaded at top of page
    if(topBtn && w.scrollY <= 400) {
        topBtn.setAttribute('tabindex', '-1');
        topBtn.setAttribute('aria-hidden', 'true');
    }

    w.addEventListener('scroll', () => {
        if(!ticking) {
            w.requestAnimationFrame(() => {
                const scrollTop = w.scrollY;
                if(header) { if(scrollTop > 10) header.classList.add('scrolled'); else header.classList.remove('scrolled'); }
                
                if(progressBar && !prefersReducedMotion.matches) {
                    const docHeight = d.documentElement.scrollHeight - w.innerHeight;
                    progressBar.style.transform = `scaleX(${docHeight > 0 ? (scrollTop / docHeight) : 0})`;
                }
                
                if(topBtn) {
                    if(scrollTop > 400) {
                        topBtn.classList.remove('hidden');
                        topBtn.removeAttribute('tabindex'); // Make focusable
                        topBtn.setAttribute('aria-hidden', 'false');
                    } else {
                        topBtn.classList.add('hidden');
                        topBtn.setAttribute('tabindex', '-1'); // Remove from tab flow
                        topBtn.setAttribute('aria-hidden', 'true');
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    if(topBtn) {
        topBtn.addEventListener('click', () => w.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' }));
    }

    d.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href'); if(!href || href === '#' || this.classList.contains('skip-link')) return;
            const target = d.getElementById(href.slice(1));
            if(target) { e.preventDefault(); w.scrollTo({ top: target.getBoundingClientRect().top + w.scrollY - 60, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' }); }
        });
    });

    // ==========================================================================
    // Form Submission (Formspree) - Success/Fail State Fixes
    // ==========================================================================
    if(contactForm && submitBtn && formStatus) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clean previous states for subsequent tries
            submitBtn.disabled = true;
            submitBtn.classList.remove('success');
            submitBtn.textContent = 'Sending...';
            
            formStatus.textContent = 'Sending your message...';
            formStatus.style.color = 'var(--color-text-secondary)';

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: new FormData(contactForm),
                    headers: { 'Accept': 'application/json' }
                });

                if(response.ok) {
                    contactForm.reset();
                    submitBtn.textContent = 'Message Sent';
                    submitBtn.classList.add('success');
                    
                    formStatus.textContent = 'Message sent successfully.';
                    formStatus.style.color = 'var(--color-success)';
                    
                    // Re-enable button after delay to allow another submission
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('success');
                        submitBtn.textContent = 'Send Another Message';
                    }, 5000);

                } else {
                    throw new Error('Network response was not ok.');
                }
            } catch (error) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('success');
                submitBtn.textContent = 'Send Message';
                
                formStatus.textContent = 'Something went wrong. Please try again.';
                formStatus.style.color = 'var(--color-error)';
            }
        });
    }
});
