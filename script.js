// Theme initialisation — runs immediately on defer parse
// Prevents flash of wrong theme before DOMContentLoaded
if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
}

document.addEventListener("DOMContentLoaded", () => {
    const toggle  = document.getElementById("toggle");
    const nav     = document.getElementById("main-nav");
    const menuBtn = document.getElementById("menu-toggle");
    const topBtn  = document.getElementById("topBtn");

    // ── Theme ────────────────────────────────────────────────────
    function updateToggleIcon() {
        if (!toggle) return;
        const dark = document.documentElement.classList.contains("dark");
        toggle.textContent = dark ? "☀️" : "🌙";
        toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }

    // Set correct icon immediately on load
    updateToggleIcon();

    if (toggle) {
        toggle.addEventListener("click", () => {
            document.documentElement.classList.toggle("dark");
            localStorage.setItem("theme",
                document.documentElement.classList.contains("dark") ? "dark" : "light"
            );
            updateToggleIcon();
        });
    }

    // ── Mobile menu ───────────────────────────────────────────────
    const closeMenu = () => {
        if (!nav || !menuBtn) return;
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.setAttribute("aria-label", "Open navigation");
        document.body.style.overflow = "";
    };

    if (menuBtn && nav) {
        menuBtn.addEventListener("click", () => {
            const isOpen = nav.classList.toggle("open");
            menuBtn.setAttribute("aria-expanded", isOpen);
            menuBtn.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
            document.body.style.overflow = isOpen ? "hidden" : "";

            if (isOpen) {
                const firstLink = nav.querySelector("a");
                if (firstLink) setTimeout(() => firstLink.focus(), 50);
            }
        });

        // Close when a nav link is tapped on mobile
        nav.addEventListener("click", (e) => {
            if (e.target.tagName === "A" && window.innerWidth <= 768) {
                closeMenu();
            }
        });
    }

    // Escape key closes menu and returns focus
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav && nav.classList.contains("open")) {
            closeMenu();
            if (menuBtn) menuBtn.focus();
        }

        // Focus trap inside open menu
        if (e.key === "Tab" && nav && nav.classList.contains("open") && window.innerWidth <= 768) {
            const focusable = nav.querySelectorAll("a[href], button");
            if (!focusable.length) return;
            const first = focusable[0];
            const last  = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        }
    });

    // Close menu on resize to desktop
    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) closeMenu();
    });

    // ── Scroll-to-top ─────────────────────────────────────────────
    if (topBtn) {
        window.addEventListener("scroll", () => {
            topBtn.classList.toggle("hidden", window.scrollY <= 300);
        }, { passive: true });

        topBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // ── Smooth scroll with header offset ─────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const id = this.getAttribute("href").slice(1);
            if (!id || this.classList.contains("skip-link")) return;
            const target = document.getElementById(id);
            if (!target) return;
            e.preventDefault();
            const offset = target.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: offset, behavior: "smooth" });
        });
    });
});

