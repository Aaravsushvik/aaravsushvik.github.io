(() => {
  try {
    const root = document.documentElement;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("theme");
    const saved = localStorage.getItem("theme");
    const theme =
      requested === "dark" || requested === "light"
        ? requested
        : saved === "dark" || saved === "light"
          ? saved
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    root.classList.remove("dark", "light");
    root.classList.add(theme, "js");
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#000000" : "#f5f5f7");
  } catch {
    document.documentElement.classList.add("js", "light");
  }
})();