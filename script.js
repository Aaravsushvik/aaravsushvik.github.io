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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const supportsInert = 'inert' in HTMLElement.prototype;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

    // ==========================================================================
    // Theme Management (Sync with OS & Local Storage)
    // ==========================================================================
    const updateMetaColor = (isDark) => {
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isDark ? '#1c1c1e' : '#fbfbfd');
        }
    };

    // Ensure JS aligns correctly on first paint if Local Storage exists
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        html.classList.remove('light', 'dark');
        html.classList.add(savedTheme);
    }
    updateMetaColor(html.classList.contains('dark'));

    const updateThemeIcon = () => {
        const isDark = html.classList.contains('dark') || 
            (!html.classList.contains('light') && systemTheme.matches);
            
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

    updateThemeIcon();

    // OS Theme Change Listener
    systemTheme.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            html.classList.remove('light', 'dark');
            html.classList.add(e.matches ? 'dark' : 'light');
            updateThemeIcon();
            updateMetaColor(e.matches);
        }
    });

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentlyDark = html.classList.contains('dark') || 
                (!html.classList.contains('light') && systemTheme.matches);
            
            if (currentlyDark) {
                html.classList.remove('dark');
                html.classList.add('light');
                localStorage.setItem('theme', 'light');
                updateMetaColor(false);
            } else {
                html.classList.remove('light');
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                updateMetaColor(true);
            }
            updateThemeIcon();
        });
    }

    // ==========================================================================
    // Mobile Navigation & True Focus Trap (via HTML5 inert + Legacy Fallback)
    // ==========================================================================
    const closeMenu = () => {
        if (!nav.classList.contains('open')) return;
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

            // Legacy Fallback Focus Trap
            if (!supportsInert && e.key === 'Tab' && nav.classList.contains('open') && window.innerWidth <= 768) {
                const focusableElements = nav.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    // ==========================================================================
    // Intersection Observers (Active Nav & Scroll Reveal)
    // ==========================================================================
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

    if (!prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); 
                }
            });
        }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    } else {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }

    // ==========================================================================
    // Throttled Scroll Events: Progress Bar, Top Button & Header Shrink
    // ==========================================================================
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                
                // Header shrink
                if (scrollTop > 10) header.classList.add('scrolled');
                else header.classList.remove('scrolled');

                // Progress Bar
                if (progressBar && !prefersReducedMotion) {
                    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) : 0;
                    progressBar.style.transform = `scaleX(${scrollPercent})`;
                }

                // Top Button
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
        topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));
    }

    // ==========================================================================
    // Smooth Anchor Scrolling with Offset
    // ==========================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const id = this.getAttribute('href').slice(1);
            if (!id || this.classList.contains('skip-link')) return;
            const target = document.getElementById(id);
            
            if (target) {
                e.preventDefault();
                const offset = target.getBoundingClientRect().top + window.scrollY - 60; 
                window.scrollTo({ top: offset, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }
        });
    });

    // ==========================================================================
    // Form Submission Handler (Prevents Redirect, Manages State & ARIA)
    // ==========================================================================
    if (contactForm && submitBtn) {
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
