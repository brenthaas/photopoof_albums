"use strict";
(() => {
  const modal   = document.getElementById("contact-modal");
  const form    = document.getElementById("contact-form");
  const success = document.getElementById("contact-success");
  const openBtn = document.getElementById("contact-open");
  const closeBtn = document.getElementById("contact-close");

  function open() {
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("cf-name").focus();
  }

  function close() {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector(".submit-btn");
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      const data = new FormData(form);
      await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() });
      form.reset();
      form.hidden = true;
      success.hidden = false;
    } catch {
      btn.disabled = false;
      btn.textContent = "Send";
      alert("Something went wrong. Please try again.");
    }
  });
})();
