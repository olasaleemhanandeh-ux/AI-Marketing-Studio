/* ==========================================================================
   AI Marketing Studio — frontend logic
   - Theme toggle (persisted)
   - POST /generate and render the backend response
   - Copy / Regenerate / Download / counters
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Element references ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");

  const form = document.getElementById("generateForm");
  const generateBtn = document.getElementById("generateBtn");
  const formError = document.getElementById("formError");

  const productName = document.getElementById("productName");
  const description = document.getElementById("description");
  const platform = document.getElementById("platform");
  const tone = document.getElementById("tone");

  const emptyState = document.getElementById("emptyState");
  const outputText = document.getElementById("outputText");
  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");

  const copyBtn = document.getElementById("copyBtn");
  const regenBtn = document.getElementById("regenBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  /* Keep the last payload so "Regenerate" can re-run the same request */
  let lastPayload = null;

  /* ---------- Theme handling ---------- */
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("tulip-theme", theme);
    } catch (e) {
      /* ignore storage errors */
    }
  }

  (function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem("tulip-theme");
    } catch (e) {
      /* ignore */
    }
    if (stored) {
      applyTheme(stored);
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      applyTheme("dark");
    }
  })();

  themeToggle.addEventListener("click", function () {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  /* ---------- Button ripple effect ---------- */
  generateBtn.addEventListener("click", function (e) {
    if (generateBtn.disabled) return;
    const rect = generateBtn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = e.clientX - rect.left - size / 2 + "px";
    ripple.style.top = e.clientY - rect.top - size / 2 + "px";
    generateBtn.appendChild(ripple);
    setTimeout(function () {
      ripple.remove();
    }, 600);
  });

  /* ---------- Helpers ---------- */
  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.classList.toggle("loading", isLoading);
    generateBtn.setAttribute("aria-busy", String(isLoading));
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = !message;
  }

  function updateCounters(text) {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    wordCount.textContent = words;
    charCount.textContent = text.length;
  }

  function setToolbarEnabled(enabled) {
    copyBtn.disabled = !enabled;
    regenBtn.disabled = !enabled;
    downloadBtn.disabled = !enabled;
  }

  function renderContent(text) {
    emptyState.hidden = true;
    outputText.hidden = false;
    outputText.textContent = text;
    /* restart fade animation */
    outputText.style.animation = "none";
    void outputText.offsetWidth;
    outputText.style.animation = "";
    updateCounters(text);
    setToolbarEnabled(true);
  }

  /* ---------- Core request ---------- */
  async function generate(payload) {
    setLoading(true);
    showError("");

    try {
      const response = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Something went wrong. Please try again.";
        try {
          const errData = await response.json();
          if (errData && errData.error) message = errData.error;
        } catch (e) {
          /* non-JSON error response */
        }
        throw new Error(message);
      }

      const data = await response.json();
      const content = data && data.content ? data.content : "";

      if (!content) {
        throw new Error("The server returned an empty response.");
      }

      renderContent(content);
    } catch (err) {
      showError(err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Form submit ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = productName.value.trim();
    const desc = description.value.trim();

    if (!name || !desc) {
      showError("Please enter a product name and description.");
      return;
    }

    lastPayload = {
      product_name: name,
      description: desc,
      platform: platform.value,
      tone: tone.value,
    };

    generate(lastPayload);
  });

  /* ---------- Toolbar actions ---------- */
  regenBtn.addEventListener("click", function () {
    if (lastPayload) generate(lastPayload);
  });

  copyBtn.addEventListener("click", async function () {
    const text = outputText.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = copyBtn.innerHTML;
      copyBtn.innerHTML = "<span>✓</span> Copied";
      setTimeout(function () {
        copyBtn.innerHTML = original;
      }, 1600);
    } catch (e) {
      showError("Unable to copy to clipboard.");
    }
  });

  downloadBtn.addEventListener("click", function () {
    const text = outputText.textContent;
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const product = (lastPayload && lastPayload.product_name) || "content";
    a.href = url;
    a.download =
      "tulip-" + product.toLowerCase().replace(/\s+/g, "-") + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
})();
