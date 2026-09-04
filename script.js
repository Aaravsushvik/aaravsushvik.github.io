const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  lang: "en",
  paletteOpen: false,
  palettePreviousFocus: null
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
    const val = t(el.dataset.i18n);
    if (val !== undefined) {
      el.textContent = val;
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

  $("#lang-announcer").textContent =
    lang === "te"
      ? "భాష తెలుగుకు మార్చబడింది"
      : lang === "hi"
        ? "भाषा हिंदी में बदल दी गई है"
        : "Language changed to English";

  updateThemeUI();
  updateMenuLabel();
}

function updateThemeUI() {
  const dark =
    document.documentElement.classList.contains("dark");

  const btn = $("#theme-toggle");

  if (!btn) return;

  btn.setAttribute(
    "aria-checked",
    String(dark)
  );

  btn.setAttribute(
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

function setTheme(dark, persist = true) {
  const root = document.documentElement;

  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);

  if (persist) {
    try {
      localStorage.setItem(
        "theme",
        dark ? "dark" : "light"
      );
    } catch {}
  }

  const meta = document.querySelector(
    'meta[name="theme-color"]'
  );

  if (meta) {
    meta.setAttribute(
      "content",
      dark ? "#000000" : "#f5f5f7"
    );
  }

  updateThemeUI();
}

function initTheme() {
  updateThemeUI();

  const btn = $("#theme-toggle");

  btn?.addEventListener("click", () => {
    const dark =
      document.documentElement.classList.contains("dark");

    setTheme(!dark, true);
  });

  const media = window.matchMedia(
    "(prefers-color-scheme: dark)"
  );

  media.addEventListener?.("change", (e) => {
    let saved = null;

    try {
      saved = localStorage.getItem("theme");
    } catch {}

    if (!saved) {
      setTheme(e.matches, false);
    }
  });
}

function initLanguage() {
  let saved = null;

  try {
    saved = localStorage.getItem("lang");
  } catch {}

  const params = new URLSearchParams(
    window.location.search
  );

  const requested = params.get("lang");

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
      (e) => {
        const selected = e.target.value;

        applyTranslations(selected);

        const url = new URL(
          window.location.href
        );

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
  const btn = $("#menu-toggle");

  if (!btn) return;

  const open =
    $("#main-nav")?.classList.contains("open");

  btn.setAttribute(
    "aria-label",
    open
      ? t("menu.close")
      : t("menu.open")
  );
}

function closeMenu() {
  const nav = $("#main-nav");
  const btn = $("#menu-toggle");

  nav?.classList.remove("open");

  btn?.setAttribute(
    "aria-expanded",
    "false"
  );

  updateMenuLabel();
}

function initMenu() {
  const nav = $("#main-nav");
  const btn = $("#menu-toggle");

  if (!nav || !btn) return;

  btn.addEventListener("click", () => {
    const open =
      nav.classList.toggle("open");

    btn.setAttribute(
      "aria-expanded",
      String(open)
    );

    updateMenuLabel();
  });

  $$(".nav-link").forEach((link) => {
    link.addEventListener(
      "click",
      () => closeMenu()
    );
  });
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
      top.hidden = window.scrollY < 500;
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
        link.getAttribute("href")?.slice(1);

      link.classList.toggle(
        "active",
        id === active
      );
    });
  };

  window.addEventListener(
    "scroll",
    update,
    { passive: true }
  );

  update();

  top?.addEventListener(
    "click",
    () => {
      window.scrollTo({
        top: 0,
        behavior:
          window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches
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
    $$(".reveal").forEach((el) =>
      el.classList.add("is-visible")
    );

    return;
  }

  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(
              "is-visible"
            );

            observer.unobserve(
              entry.target
            );
          }
        });
      },
      {
        threshold: 0.12
      }
    );

  $$(".reveal").forEach((el) =>
    observer.observe(el)
  );
}

function initCanvas() {
  const canvas = $("#hero-canvas");

  if (!canvas) return;

  if (
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    return;
  }

  if (navigator.connection?.saveData) {
    return;
  }

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  let raf = 0;
  let running = true;
  let points = [];

  function resize() {
    const rect =
      canvas.getBoundingClientRect();

    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    canvas.width =
      rect.width * dpr;

    canvas.height =
      rect.height * dpr;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    const count =
      Math.min(
        48,
        Math.max(
          18,
          Math.floor(
            rect.width / 28
          )
        )
      );

    points =
      Array.from(
        { length: count },
        () => ({
          x:
            Math.random() *
            rect.width,

          y:
            Math.random() *
            rect.height,

          vx:
            (Math.random() - 0.5) *
            0.18,

          vy:
            (Math.random() - 0.5) *
            0.18
        })
      );
  }

  function draw() {
    if (!running) {
      raf = 0;
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    ctx.clearRect(
      0,
      0,
      rect.width,
      rect.height
    );

    const dark =
      document.documentElement.classList.contains(
        "dark"
      );

    ctx.fillStyle =
      dark
        ? "rgba(41,151,255,.35)"
        : "rgba(0,113,227,.22)";

    points.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (
        p.x < 0 ||
        p.x > rect.width
      ) {
        p.vx *= -1;
      }

      if (
        p.y < 0 ||
        p.y > rect.height
      ) {
        p.vy *= -1;
      }

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
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

  resize();
  draw();

  window.addEventListener(
    "resize",
    resize,
    { passive: true }
  );

  const observer =
    new IntersectionObserver(
      ([entry]) => {
        running =
          entry.isIntersecting;

        if (running && !raf) {
          draw();
        }

        if (!running) {
          window.cancelAnimationFrame(
            raf
          );

          raf = 0;
        }
      }
    );

  observer.observe($("#home"));
}

function initShare() {
  const btn = $("#share-btn");

  if (!btn) return;

  btn.addEventListener(
    "click",
    async () => {
      const data = {
        title: document.title,
        text:
          "Gadiparthi Sai Sushvik — Portfolio",
        url: window.location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(data);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(
            window.location.href
          );
        }
      } catch {}
    }
  );
}

function initSpeech() {
  const btn = $("#listen-btn");

  if (!btn) return;

  btn.addEventListener(
    "click",
    () => {
      if (
        !("speechSynthesis" in window)
      ) {
        return;
      }

      window.speechSynthesis.cancel();

      const main = $("#main-content");

      const text =
        [
          ...main.querySelectorAll(
            "h1,h2,h3,p,li"
          )
        ]
          .map((el) =>
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

function showError(id, key) {
  const el = $("#" + id);

  if (!el) return;

  el.textContent = t(key);
  el.hidden = false;
}

function clearErrors() {
  $$(".field-error").forEach((el) => {
    el.hidden = true;
    el.textContent = "";
  });
}

async function initForm() {
  const form = $("#contact-form");

  if (!form) return;

  const status = $("#form-status");
  const submit = $("#submit-btn");

  form.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();

      clearErrors();
      status.textContent = "";

      const name = $("#name");
      const email = $("#email");
      const message = $("#form-message");

      let valid = true;

      if (!name.value.trim()) {
        showError(
          "name-err",
          "form.name.error"
        );

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

        valid = false;
      }

      if (!message.value.trim()) {
        showError(
          "form-message-err",
          "form.message.error"
        );

        valid = false;
      }

      if (!valid) return;

      const honeypot =
        form.querySelector(
          "[name='_gotcha']"
        );

      if (honeypot?.value) return;

      submit.disabled = true;

      status.textContent =
        t("form.sending");

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => controller.abort(),
          15000
        );

      try {
        const response =
          await fetch(
            form.action,
            {
              method: "POST",
              body: new FormData(form),
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

        status.textContent =
          t("form.success");
      } catch (err) {
        status.textContent =
          t("form.failure");
      } finally {
        clearTimeout(timeout);
        submit.disabled = false;
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
      ([name, id], index) => {
        const li =
          document.createElement("li");

        li.setAttribute(
          "role",
          "option"
        );

        li.id =
          `command-option-${index}`;

        li.tabIndex = -1;
        li.textContent = name;

        li.addEventListener(
          "click",
          () => {
            closePalette();

            document
              .querySelector(id)
              ?.scrollIntoView({
                behavior:
                  window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                  ).matches
                    ? "auto"
                    : "smooth"
              });
          }
        );

        list.appendChild(li);
      }
    );

    activeIndex =
      results.length > 0
        ? 0
        : -1;

    updateActiveDescendant();
  }

  function updateActiveDescendant() {
    const items =
      list.querySelectorAll("li");

    items.forEach(
      (item, index) => {
        item.classList.toggle(
          "is-active",
          index === activeIndex
        );

        item.setAttribute(
          "aria-selected",
          index === activeIndex
            ? "true"
            : "false"
        );
      }
    );

    if (activeIndex >= 0) {
      input.setAttribute(
        "aria-activedescendant",
        items[activeIndex].id
      );
    } else {
      input.setAttribute(
        "aria-activedescendant",
        ""
      );
    }
  }

  function openPalette() {
    state.palettePreviousFocus =
      document.activeElement;

    palette.hidden = false;
    state.paletteOpen = true;

    input.value = "";

    render();
    input.focus();
  }

  function closePalette() {
    palette.hidden = true;
    state.paletteOpen = false;

    input.setAttribute(
      "aria-activedescendant",
      ""
    );

    if (
      state.palettePreviousFocus &&
      typeof state.palettePreviousFocus.focus ===
        "function"
    ) {
      state.palettePreviousFocus.focus();
    }
  }

  input.addEventListener(
    "input",
    render
  );

  input.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();

        if (results.length > 0) {
          activeIndex =
            (activeIndex + 1) %
            results.length;

          updateActiveDescendant();
        }
      } else if (
        e.key === "ArrowUp"
      ) {
        e.preventDefault();

        if (results.length > 0) {
          activeIndex =
            (activeIndex -
              1 +
              results.length) %
            results.length;

          updateActiveDescendant();
        }
      } else if (
        e.key === "Enter"
      ) {
        e.preventDefault();

        if (activeIndex >= 0) {
          const [, id] =
            results[activeIndex];

          closePalette();

          document
            .querySelector(id)
            ?.scrollIntoView({
              behavior:
                window.matchMedia(
                  "(prefers-reduced-motion: reduce)"
                ).matches
                  ? "auto"
                  : "smooth"
            });
        }
      } else if (
        e.key === "Escape"
      ) {
        e.preventDefault();
        closePalette();
      } else if (
        e.key === "Tab"
      ) {
        e.preventDefault();
        input.focus();
      }
    }
  );

  palette.addEventListener(
    "click",
    (e) => {
      if (
        e.target.matches(
          "[data-close-palette]"
        )
      ) {
        closePalette();
      }
    }
  );

  window.addEventListener(
    "keydown",
    (e) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();

        if (state.paletteOpen) {
          closePalette();
        } else {
          openPalette();
        }

        return;
      }

      if (
        e.key === "Escape" &&
        state.paletteOpen
      ) {
        e.preventDefault();
        closePalette();
      }
    }
  );
}

function registerServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(
          (err) =>
            console.warn(
              "SW registration failed:",
              err
            )
        );
    }
  );
}

function init() {
  initLanguage();
  initTheme();
  initMenu();
  initScroll();
  initReveal();
  initCanvas();
  initShare();
  initSpeech();
  initForm();
  initPalette();
  registerServiceWorker();
}

document.addEventListener(
  "DOMContentLoaded",
  init
);