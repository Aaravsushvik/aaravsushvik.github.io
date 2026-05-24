const btn = document.getElementById("toggle");
const metaTheme = document.querySelector('meta[name="theme-color"]');

function updateTheme() {
    const dark = document.documentElement.classList.contains("dark");
    metaTheme.setAttribute("content", dark ? "#0f0f0f" : "#ffffff");
    btn.textContent = dark ? "☀️" : "🌙";
}

btn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme",
        document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
    updateTheme();
});

updateTheme();

const menu = document.getElementById("menu-toggle");
const nav = document.getElementById("main-nav");

menu.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", open);
});

const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", () => {
    topBtn.classList.toggle("visible", window.scrollY > 300);
}, { passive: true });

topBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
        const el = document.getElementById(a.getAttribute("href").slice(1));
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
    });
});