// ./assets/js/main.js
if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
}

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("toggle");
    const nav = document.getElementById("main-nav");
    const menuBtn = document.getElementById("menu-toggle");
    const topBtn = document.getElementById("topBtn");

    // Theme toggle
    if (toggle) {
        toggle.addEventListener("click", () => {
            document.documentElement.classList.toggle("dark");
            localStorage.setItem("theme",
                document.documentElement.classList.contains("dark") ? "dark" : "light"
            );
        });
    }

    // Mobile menu
    const closeMenu = () => {
        if (nav) {
            nav.classList.remove("open");
            if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
            document.body.style.overflow = "";
        }
    };

    if (menuBtn && nav) {
        menuBtn.addEventListener("click", () => {
            const isOpen = nav.classList.toggle("open");
            menuBtn.setAttribute("aria-expanded", isOpen);
            document.body.style.overflow = isOpen ? "hidden" : "";
            
            if (isOpen) {
                const firstLink = nav.querySelector("a");
                if (firstLink) setTimeout(() => firstLink.focus(), 100);
            }
        });

        nav.addEventListener("click", (e) => {
            if (e.target.tagName === "A" && window.innerWidth <= 768) {
                closeMenu();
            }
        });
    }

    // Escape Key logic & Focus Trap
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav && nav.classList.contains("open")) {
            closeMenu();
            if (menuBtn) menuBtn.focus();
        }
        
        if (e.key === "Tab" && nav && nav.classList.contains("open") && window.innerWidth <= 768) {
            const focusable = nav.querySelectorAll("a[href], button");
            if (focusable.length === 0) return;
            
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768 && nav && nav.classList.contains("open")) {
            closeMenu();
        }
    });

    // Scroll to top button logic
    if (topBtn) {
        let isScrolling = false;
        window.addEventListener("scroll", () => {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    if (window.scrollY > 300) {
                        topBtn.classList.remove("hidden");
                    } else {
                        topBtn.classList.add("hidden");
                    }
                    isScrolling = false;
                });
                isScrolling = true;
            }
        }, { passive: true });

        topBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Smooth scroll for anchor links offset by header height
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function(e) {
            const targetId = this.getAttribute("href").slice(1);
            if (!targetId || this.classList.contains("skip-link")) return;
            
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                e.preventDefault();
                const offset = targetEl.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: offset, behavior: "smooth" });
            }
        });
    });
});
