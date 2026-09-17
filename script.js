const $ = (selector, root = document) =>
  root.querySelector(selector);
const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];
const state = {
  lang: "en",
  paletteOpen: false,
  palettePreviousFocus: null,
  scrollFrame: 0
};
function getPath(object, path) {
  return path.split(".").reduce(
    (value, key) => value && value[key],
    object
  );
}
function t(key) {
  return (
    getPath(window.TRANSLATIONS?.[state.lang], key) ??
    getPath(window.TRANSLATIONS?.en, key) ??
    key
  );
}
function applyTranslations(lang) {
  if (!window.TRANSLATIONS?.[lang]) return;
  state.lang = lang;
  const langCode =
    lang === "te"
      ? "te-IN"
      : lang === "hi"
        ? "hi-IN"
        : "en-IN";
  document.documentElement.lang = langCode;
  try {
    localStorage.setItem("lang", lang);
  } catch {}
  $$("[data-i18n]").forEach((el) => {
    const value = t(el.dataset.i18n);
    if (value !== undefined) {
      el.textContent = value;
    }
  });
  $$("[data-i18n-aria]").forEach((el) => {
    el.setAttribute(
      "aria-label",
      t(el.dataset.i18nAria)
    );
  });
  $$("[data-i18n-alt]").forEach((el) => {
    el.setAttribute(
      "alt",
      t(el.dataset.i18nAlt)
    );
  });
  $$("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute(
      "placeholder",
      t(el.dataset.i18nPlaceholder)
    );
  });
  document.title = t("page.title");
  const announcer = $("#lang-announcer");
  if (announcer) {
    announcer.textContent =
      lang === "te"
        ? "భాష తెలుగుకు మార్చబడింది"
        : lang === "hi"
          ? "भाषा हिंदी में बदल दी गई है"
          : "Language changed to English";
  }
  updateThemeUI();
  updateMenuLabel();
}
function updateThemeUI() {
  const dark =
    document.documentElement.classList.contains("dark");
  const button = $("#theme-toggle");
  if (!button) return;
  button.setAttribute(
    "aria-checked",
    String(dark)
  );
  button.setAttribute(
    "aria-label",
    dark
      ? t("theme.toLight")
      : t("theme.toDark")
  );
  const icon = $("#theme-icon");
  if (icon) {
    icon.textContent = dark ? "☀" : "☾";
  }
}
function updateThemeColor(dark) {
  const meta =
    document.querySelector(
      'meta[name="theme-color"]'
    );
  if (meta) {
    meta.setAttribute(
      "content",
      dark ? "#000000" : "#f5f5f7"
    );
  }
}
function applyTheme(dark, persist = true) {
  const root = document.documentElement;
  root.classList.remove(dark ? "light" : "dark");
  root.classList.add(dark ? "dark" : "light");
  root.style.colorScheme =
    dark ? "dark" : "light";
  if (persist) {
    try {
      localStorage.setItem(
        "theme",
        dark ? "dark" : "light"
      );
    } catch {}
  }
  updateThemeColor(dark);
  updateThemeUI();
}

// Optimized for flawless execution across Safari & iPadOS
function setTheme(dark, persist = true) {
  applyTheme(dark, persist);
}

function initTheme() {
  updateThemeUI();
  const button = $("#theme-toggle");
  button?.addEventListener("click", () => {
    const dark =
      document.documentElement.classList.contains(
        "dark"
      );
    setTheme(!dark, true);
  });
  const media =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
  media.addEventListener?.(
    "change",
    (event) => {
      let saved = null;
      try {
        saved = localStorage.getItem("theme");
      } catch {}
      if (!saved) {
        setTheme(event.matches, false);
      }
    }
  );
}
function initLanguage() {
  if (!window.TRANSLATIONS) return;
  let saved = null;
  try {
    saved = localStorage.getItem("lang");
  } catch {}
  const params =
    new URLSearchParams(
      window.location.search
    );
  const requested =
    params.get("lang");
  const lang =
    window.TRANSLATIONS[requested]
      ? requested
      : window.TRANSLATIONS[saved]
        ? saved
        : "en";
  const selector = $("#lang-select");
  if (selector) {
    selector.value = lang;
    selector.addEventListener(
      "change",
      (event) => {
        const selected =
          event.target.value;
        applyTranslations(selected);
        const url =
          new URL(window.location.href);
        url.searchParams.set(
          "lang",
          selected
        );
        window.history.replaceState(
          null,
          "",
          url
        );
      }
    );
  }
  applyTranslations(lang);
}
function updateMenuLabel() {
  const button = $("#menu-toggle");
  if (!button) return;
  const open =
    $("#main-nav")?.classList.contains("open");
  button.setAttribute(
    "aria-label",
    open
      ? t("menu.close")
      : t("menu.open")
  );
}
function closeMenu() {
  const nav = $("#main-nav");
  const button = $("#menu-toggle");
  nav?.classList.remove("open");
  button?.setAttribute(
    "aria-expanded",
    "false"
  );
  updateMenuLabel();
}
function initMenu() {
  const nav = $("#main-nav");
  const button = $("#menu-toggle");
  if (!nav || !button) return;
  button.addEventListener(
    "click",
    () => {
      const open =
        nav.classList.toggle("open");
      button.setAttribute(
        "aria-expanded",
        String(open)
      );
      updateMenuLabel();
    }
  );
  $$(".nav-link").forEach((link) => {
    link.addEventListener(
      "click",
      closeMenu
    );
  });
  document.addEventListener(
    "click",
    (event) => {
      if (
        window.innerWidth > 700 ||
        !nav.classList.contains("open")
      ) {
        return;
      }
      if (
        !nav.contains(event.target) &&
        !button.contains(event.target)
      ) {
        closeMenu();
      }
    }
  );
}
function initScroll() {
  const progress = $("#scroll-progress");
  const top = $("#topBtn");
  const sections = $$(".nav-link")
    .map((link) =>
      document.getElementById(
        link.getAttribute("href")?.slice(1)
      )
    )
    .filter(Boolean);
  const update = () => {
    state.scrollFrame = 0;
    const max =
      document.documentElement.scrollHeight -
      window.innerHeight;
    if (progress) {
      progress.style.width =
        `${max > 0
          ? Math.min(
              100,
              (window.scrollY / max) * 100
            )
          : 0}%`;
    }
    if (top) {
      top.hidden =
        window.scrollY < 500;
    }
    let active = null;
    for (const section of sections) {
      const rect =
        section.getBoundingClientRect();
      if (
        rect.top <= 140 &&
        rect.bottom > 140
      ) {
        active = section.id;
      }
    }
    $$(".nav-link").forEach((link) => {
      const id =
        link.getAttribute("href")
          ?.slice(1);
      link.classList.toggle(
        "active",
        id === active
      );
    });
  };
  const requestUpdate = () => {
    if (state.scrollFrame) return;
    state.scrollFrame =
      window.requestAnimationFrame(update);
  };
  window.addEventListener(
    "scroll",
    requestUpdate,
    { passive: true }
  );
  window.addEventListener(
    "resize",
    requestUpdate,
    { passive: true }
  );
  window.addEventListener(
    "orientationchange",
    requestUpdate,
    { passive: true }
  );
  update();
  top?.addEventListener(
    "click",
    () => {
      const reduced =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
      window.scrollTo({
        top: 0,
        behavior: reduced
          ? "auto"
          : "smooth"
      });
    }
  );
}
function initReveal() {
  const reduced =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  if (
    reduced ||
    !("IntersectionObserver" in window)
  ) {
    $$(".reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
    return;
  }
  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(
            "is-visible"
          );
          observer.unobserve(
            entry.target
          );
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -5% 0px"
      }
    );
  $$(".reveal").forEach((el) =>
    observer.observe(el)
  );
}
function initCanvas() {
  const canvas = $("#hero-canvas");
  if (!canvas) return;
  const reduceMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
  if (reduceMotion.matches) return;
  if (navigator.connection?.saveData) {
    return;
  }
  const ctx =
    canvas.getContext("2d", {
      alpha: true,
      desynchronized: true
    });
  if (!ctx) return;
  let raf = 0;
  let running = false;
  let lastTime = 0;
  let resizeTimer = 0;
  let width = 0;
  let height = 0;
  let points = [];
  const MAX_DPR = 2;
  function createPoints() {
    const count =
      Math.min(
        48,
        Math.max(
          18,
          Math.floor(width / 28)
        )
      );
    points =
      Array.from(
        { length: count },
        () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx:
            (Math.random() - 0.5) *
            0.18,
          vy:
            (Math.random() - 0.5) *
            0.18
        })
      );
  }
  function resize() {
    const rect =
      canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        MAX_DPR
      );
    canvas.width =
      Math.max(
        1,
        Math.round(width * dpr)
      );
    canvas.height =
      Math.max(
        1,
        Math.round(height * dpr)
      );
    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
    createPoints();
  }
  function scheduleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer =
      window.setTimeout(
        resize,
        150
      );
  }
  function draw(time) {
    if (!running) {
      raf = 0;
      lastTime = 0;
      return;
    }
    if (!lastTime) {
      lastTime = time;
    }
    const dt =
      Math.min(
        (time - lastTime) / 16.6667,
        2
      );
    lastTime = time;
    ctx.clearRect(
      0,
      0,
      width,
      height
    );
    const dark =
      document.documentElement
        .classList
        .contains("dark");
    ctx.fillStyle =
      dark
        ? "rgba(41,151,255,.35)"
        : "rgba(0,113,227,.22)";
    points.forEach((point) => {
      point.x += point.vx * dt;
      point.y += point.vy * dt;
      if (
        point.x < 0 ||
        point.x > width
      ) {
        point.vx *= -1;
        point.x =
          Math.max(
            0,
            Math.min(
              width,
              point.x
            )
          );
      }
      if (
        point.y < 0 ||
        point.y > height
      ) {
        point.vy *= -1;
        point.y =
          Math.max(
            0,
            Math.min(
              height,
              point.y
            )
          );
      }
      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    raf =
      window.requestAnimationFrame(
        draw
      );
  }
  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    if (!raf) {
      raf =
        window.requestAnimationFrame(
          draw
        );
    }
  }
  function stop() {
    running = false;
    lastTime = 0;
    if (raf) {
      window.cancelAnimationFrame(
        raf
      );
      raf = 0;
    }
  }
  resize();
  if ("ResizeObserver" in window) {
    const resizeObserver =
      new ResizeObserver(
        scheduleResize
      );
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener(
      "resize",
      scheduleResize,
      { passive: true }
    );
  }
  const home =
    document.getElementById("home");
  if (
    home &&
    "IntersectionObserver" in window
  ) {
    const visibilityObserver =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            start();
          } else {
            stop();
          }
        },
        {
          threshold: 0.01
        }
      );
    visibilityObserver.observe(home);
  } else {
    start();
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        stop();
      } else if (
        home?.getBoundingClientRect()
          .bottom > 0 &&
        home?.getBoundingClientRect()
          .top <
          window.innerHeight
      ) {
        start();
      }
    }
  );
  reduceMotion.addEventListener?.(
    "change",
    (event) => {
      if (event.matches) {
        stop();
        canvas.style.display = "none";
      } else {
        canvas.style.display = "";
        start();
      }
    }
  );
}
function initCanvasDeferred() {
  const start = () =>
    initCanvas();
  if (
    "requestIdleCallback" in
    window
  ) {
    window.requestIdleCallback(
      start,
      { timeout: 2500 }
    );
  } else {
    window.setTimeout(
      start,
      1800
    );
  }
}
function initShare() {
  const button = $("#share-btn");
  if (!button) return;
  button.addEventListener(
    "click",
    async () => {
      const data = {
        title: document.title,
        text:
          "Gadiparthi Sai Sushvik — Portfolio",
        url:
          window.location.href
      };
      try {
        if (
          typeof navigator.share ===
          "function"
        ) {
          await navigator.share(data);
        } else if (
          navigator.clipboard
        ) {
          await navigator.clipboard.writeText(
            window.location.href
          );
        }
      } catch {}
    }
  );
}
function initSpeech() {
  const button = $("#listen-btn");
  if (!button) return;
  if (
    !("speechSynthesis" in window)
  ) {
    button.hidden = true;
    return;
  }
  button.addEventListener(
    "click",
    () => {
      window.speechSynthesis.cancel();
      const main =
        $("#main-content");
      if (!main) return;
      const text =
        [
          ...main.querySelectorAll(
            "h1,h2,h3,p,li,strong,small"
          )
        ]
          .map(
            (el) =>
              el.textContent.trim()
          )
          .filter(Boolean)
          .join(". ");
      const utterance =
        new SpeechSynthesisUtterance(
          text
        );
      utterance.lang =
        document.documentElement.lang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(
        utterance
      );
    }
  );
}
function initEmailLink() {
  const link = $("#email-link");
  if (!link) return;
  const user =
    "saisushvik.pnt";
  const domain =
    "gmail.com";
  link.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      window.location.href =
        `mailto:${user}@${domain}`;
    }
  );
}
function initCopyrightYear() {
  const element =
    $("#copyright-year");
  if (element) {
    element.textContent =
      String(
        new Date().getFullYear()
      );
  }
}
function showError(id, key) {
  const element =
    $("#" + id);
  if (!element) return;
  element.textContent = t(key);
  element.hidden = false;
  const input =
    element
      .closest(".form-group")
      ?.querySelector(
        "input, textarea"
      );
  if (!input) return;
  input.setAttribute(
    "aria-invalid",
    "true"
  );
  const describedBy =
    input.getAttribute(
      "aria-describedby"
    );
  const ids =
    new Set(
      (describedBy || "")
        .split(/\s+/)
        .filter(Boolean)
    );
  ids.add(id);
  input.setAttribute(
    "aria-describedby",
    [...ids].join(" ")
  );
}
function clearErrors() {
  $$(".field-error").forEach(
    (element) => {
      element.hidden = true;
      element.textContent = "";
      const input =
        element
          .closest(".form-group")
          ?.querySelector(
            "input, textarea"
          );
      if (!input) return;
      input.removeAttribute(
        "aria-invalid"
      );
      const describedBy =
        input.getAttribute(
          "aria-describedby"
        );
      if (!describedBy) return;
      const ids =
        describedBy
          .split(/\s+/)
          .filter(
            (id) => id !== element.id
          );
      if (ids.length) {
        input.setAttribute(
          "aria-describedby",
          ids.join(" ")
        );
      } else {
        input.removeAttribute(
          "aria-describedby"
        );
      }
    }
  );
}
async function initForm() {
  const form = $("#contact-form");
  if (!form) return;
  const status =
    $("#form-status");
  const submit =
    $("#submit-btn");
  let submitting = false;
  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      if (submitting) return;
      clearErrors();
      if (status) {
        status.textContent = "";
      }
      const name = $("#name");
      const email = $("#email");
      const message =
        $("#form-message");
      let valid = true;
      let firstInvalid = null;
      if (!name.value.trim()) {
        showError(
          "name-err",
          "form.name.error"
        );
        firstInvalid ??= name;
        valid = false;
      }
      if (
        !email.value.trim() ||
        !email.validity.valid
      ) {
        showError(
          "email-err",
          "form.email.error"
        );
        firstInvalid ??= email;
        valid = false;
      }
      if (!message.value.trim()) {
        showError(
          "form-message-err",
          "form.message.error"
        );
        firstInvalid ??= message;
        valid = false;
      }
      if (!valid) {
        firstInvalid?.focus();
        return;
      }
      const honeypot =
        form.querySelector(
          "[name='_gotcha']"
        );
      if (honeypot?.value) return;
      submitting = true;
      if (submit) {
        submit.disabled = true;
      }
      if (status) {
        status.textContent =
          t("form.sending");
      }
      const controller =
        new AbortController();
      const timeout =
        window.setTimeout(
          () => controller.abort(),
          15000
        );
      try {
        const response =
          await fetch(
            form.action,
            {
              method: "POST",
              body:
                new FormData(form),
              headers: {
                Accept:
                  "application/json"
              },
              signal:
                controller.signal
            }
          );
        if (!response.ok) {
          throw new Error(
            "Request failed"
          );
        }
        form.reset();
        if (status) {
          status.textContent =
            t("form.success");
        }
      } catch {
        if (status) {
          status.textContent =
            t("form.failure");
        }
      } finally {
        window.clearTimeout(
          timeout
        );
        submitting = false;
        if (submit) {
          submit.disabled = false;
        }
      }
    }
  );
}
const commands = [
  ["Home", "#home"],
  ["About", "#about"],
  ["Projects", "#projects"],
  ["Learning", "#learning"],
  ["Skills", "#skills"],
  ["Certifications", "#certifications"],
  ["Results", "#results"],
  ["Favorites", "#favorites"],
  ["Contact", "#contact"]
];
function initPalette() {
  const palette =
    $("#command-palette");
  const input =
    $("#command-input");
  const list =
    $("#command-results");
  if (!palette || !input || !list) {
    return;
  }
  let activeIndex = -1;
  let results = [];
  function updateActiveDescendant() {
    const items =
      list.querySelectorAll("li");
    items.forEach(
      (item, index) => {
        const active =
          index === activeIndex;
        item.classList.toggle(
          "is-active",
          active
        );
        item.setAttribute(
          "aria-selected",
          String(active)
        );
      }
    );
    if (
      activeIndex >= 0 &&
      items[activeIndex]
    ) {
      input.setAttribute(
        "aria-activedescendant",
        items[activeIndex].id
      );
    } else {
      input.removeAttribute(
        "aria-activedescendant"
      );
    }
  }
  function navigateTo(
    selector
  ) {
    const target =
      document.querySelector(
        selector
      );
    if (!target) return;
    const reduced =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    target.scrollIntoView({
      behavior:
        reduced
          ? "auto"
          : "smooth"
    });
  }
  function render() {
    const query =
      input.value
        .toLowerCase()
        .trim();
    results =
      commands.filter(
        ([name]) =>
          name
            .toLowerCase()
            .includes(query)
      );
    list.textContent = "";
    results.forEach(
      ([name, selector], index) => {
        const item =
          document.createElement("li");
        item.setAttribute(
          "role",
          "option"
        );
        item.id =
          `command-option-${index}`;
        item.tabIndex = -1;
        item.textContent = name;
        item.addEventListener(
          "click",
          () => {
            closePalette();
            navigateTo(selector);
          }
        );
        list.appendChild(item);
      }
    );
    activeIndex =
      results.length
        ? 0
        : -1;
    updateActiveDescendant();
  }
  function openPalette() {
    if (palette.open) return;
    state.palettePreviousFocus =
      document.activeElement;
    input.value = "";
    render();
    try {
      palette.showModal();
      state.paletteOpen = true;
      requestAnimationFrame(
        () => input.focus()
      );
    } catch {
      state.paletteOpen = false;
    }
  }
  function closePalette() {
    if (!palette.open) {
      state.paletteOpen = false;
      return;
    }
    state.paletteOpen = false;
    input.removeAttribute(
      "aria-activedescendant"
    );
    palette.close();
  }
  palette.addEventListener(
    "close",
    () => {
      state.paletteOpen = false;
      input.removeAttribute(
        "aria-activedescendant"
      );
      const previous =
        state.palettePreviousFocus;
      state.palettePreviousFocus =
        null;
      if (
        previous &&
        typeof previous.focus ===
          "function" &&
        document.contains(previous)
      ) {
        requestAnimationFrame(
          () => previous.focus()
        );
      }
    }
  );
  palette.addEventListener(
    "click",
    (event) => {
      if (
        event.target === palette
      ) {
        closePalette();
      }
    }
  );
  input.addEventListener(
    "input",
    render
  );
  input.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "ArrowDown"
      ) {
        event.preventDefault();
        if (!results.length) return;
        activeIndex =
          (activeIndex + 1) %
          results.length;
        updateActiveDescendant();
      }
      if (
        event.key ===
        "ArrowUp"
      ) {
        event.preventDefault();
        if (!results.length) return;
        activeIndex =
          (activeIndex -
            1 +
            results.length) %
          results.length;
        updateActiveDescendant();
      }
      if (
        event.key ===
        "Enter"
      ) {
        event.preventDefault();
        if (
          activeIndex >= 0 &&
          results[activeIndex]
        ) {
          const [
            ,
            selector
          ] =
            results[activeIndex];
          closePalette();
          navigateTo(selector);
        }
      }
    }
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (
        (event.metaKey ||
          event.ctrlKey) &&
        event.key.toLowerCase() ===
          "k"
      ) {
        event.preventDefault();
        if (palette.open) {
          closePalette();
        } else {
          openPalette();
        }
      }
    }
  );
}
function registerServiceWorker() {
  if (
    !("serviceWorker" in
      navigator)
  ) {
    return;
  }
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/"
        })
        .catch((error) => {
          console.warn(
            "SW registration failed:",
            error
          );
        });
    }
  );
}
function init() {
  initTheme();
  initLanguage();
  initMenu();
  initScroll();
  initReveal();
  initCanvasDeferred();
  initShare();
  initSpeech();
  initForm();
  initPalette();
  initEmailLink();
  initCopyrightYear();
  registerServiceWorker();
}
document.addEventListener(
  "DOMContentLoaded",
  init,
  { once: true }
);
