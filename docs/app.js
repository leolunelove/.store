import { PRODUCTS } from "./catalog.js?v=5";

const apiBaseUrl = String(window.LEO_LUNE_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
const dialog = document.querySelector("#purchase-dialog");
const form = document.querySelector("#purchase-form");
const customLabel = document.querySelector(".custom-amount");
const customInput = document.querySelector("#custom-amount");
const checkoutButton = document.querySelector("#checkout-button");
const status = document.querySelector("#form-status");
const toast = document.querySelector("#toast");
let selectedProduct = null;
let selectedAmount = 0;

// Keep the free path clear while the optional payment backend is unconfigured.
if (!apiBaseUrl) {
  document.querySelectorAll('.amounts button:not([data-amount="0"])').forEach(button => { button.disabled = true; });
  document.querySelector('#purchase-form legend').textContent = 'Free download';
  document.querySelector('#support-copy').textContent = 'Optional support is coming soon. The download is yours either way.';
}

document.querySelector("#year").textContent = new Date().getFullYear();
let saved;
try { saved = new Set(JSON.parse(localStorage.getItem("leo-lune-saved") || "[]")); } catch { saved = new Set(); }
let filter = "all", orientation = "all", savedOnly = false;
const editions = PRODUCTS.map(p => ({...p, type: "digital", key: `${p.id}-digital`}));
function renderCollection() {
  let visible = editions.filter(p => (filter === "all" || p.type === filter) && (orientation === "all" || p.orientation === orientation) && (!savedOnly || saved.has(p.key)) && p.title.toLowerCase().includes(document.querySelector("#search").value.trim().toLowerCase()));
  if (document.querySelector("#sort").value === "title") visible.sort((a,b) => a.title.localeCompare(b.title));
  document.querySelector("#collection-heading").innerHTML = `${savedOnly ? "Saved work" : filter === "framed" ? "Framed editions · coming soon" : filter === "digital" ? "Digital downloads" : "All work"} <span>${String(visible.length).padStart(2,"0")}</span>`;
  document.querySelector("#saved-count").textContent = String(editions.filter(p => saved.has(p.key)).length).padStart(2,"0");
  document.querySelector("#empty-state").hidden = visible.length > 0;
  document.querySelector("#empty-state").textContent = filter === "framed" ? "No framed pieces yet." : savedOnly ? "Nothing saved yet. Hit + on a piece to keep it here." : "No matches. Try another filter.";
  document.querySelector("#art-grid").innerHTML = visible.map(p => `
    <article class="art-card">
      <button class="save-art" data-save="${p.key}" aria-label="${saved.has(p.key) ? "Unsave" : "Save"} ${p.title} ${p.type} edition" aria-pressed="${saved.has(p.key)}">${saved.has(p.key) ? "−" : "+"}</button>
      <button class="art-open" data-product="${p.id}" data-type="${p.type}" aria-label="View ${p.title} ${p.type} edition">
        <span class="art-stage ${p.type} ${p.orientation}"><span class="edition">${p.number} / digital</span><img src="${p.image}" alt="${p.title}, digital artwork" loading="lazy" width="1080" height="1440"><span class="art-type">▣ &nbsp; DIGITAL DOWNLOAD</span></span>
        <span class="art-meta"><span><strong>${p.title}</strong><small>1080 × 1440 px · PNG</small></span><span class="price"><strong>Free download <span aria-hidden="true">↙</span></strong><small>${apiBaseUrl ? 'Pay what you want' : 'No sign-up'}</small></span></span>
      </button>
    </article>`).join("");
}
renderCollection();
document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  filter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(b => { b.classList.toggle("active",b === button); b.setAttribute("aria-pressed",String(b === button)); }); renderCollection();
}));
document.querySelector("#search").addEventListener("input",renderCollection);
document.querySelector("#sort").addEventListener("change",renderCollection);
document.querySelectorAll("[name=orientation]").forEach(input => input.addEventListener("change",() => {orientation = input.value; renderCollection();}));
document.querySelector("#saved-toggle").addEventListener("click",event => {savedOnly = !savedOnly; event.currentTarget.setAttribute("aria-pressed",String(savedOnly)); renderCollection();});
document.querySelectorAll("[data-columns]").forEach(button => button.addEventListener("click", () => {
  document.querySelector("#art-grid").classList.toggle("two-columns",button.dataset.columns === "2");
  document.querySelectorAll("[data-columns]").forEach(b => b.setAttribute("aria-pressed",String(b === button)));
}));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 5000);
}

function chooseAmount(value) {
  document.querySelectorAll(".amounts button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.amount === String(value));
    button.setAttribute("aria-pressed", String(button.dataset.amount === String(value)));
  });
  customLabel.hidden = value !== "custom";
  selectedAmount = value === "custom" ? null : Number(value);
  status.textContent = "";
  updateButton();
  if (value === "custom") customInput.focus();
}

function updateButton() {
  const pennies = selectedAmount ?? Math.round(Number(customInput.value || 0) * 100);
  checkoutButton.textContent = pennies === 0 ? "Download for free" : `Pay £${(pennies / 100).toFixed(pennies % 100 ? 2 : 0)} & download`;
}

function triggerDownload(path, title) {
  const link = document.createElement("a");
  link.href = path;
  link.download = decodeURIComponent(path.split("/").pop());
  document.body.append(link);
  link.click();
  link.remove();
}

document.querySelector("#art-grid").addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save]");
  if (saveButton) {
    const key = saveButton.dataset.save;
    saved.has(key) ? saved.delete(key) : saved.add(key);
    try { localStorage.setItem("leo-lune-saved",JSON.stringify([...saved])); } catch {}
    renderCollection(); return;
  }
  const card = event.target.closest(".art-open");
  if (!card) return;
  selectedProduct = PRODUCTS.find((product) => product.id === card.dataset.product);
  document.querySelector("#dialog-title").textContent = selectedProduct.title;
  document.querySelector("#dialog-art").style.backgroundImage = `url(${selectedProduct.image})`;
  const isFramed = card.dataset.type === "framed";
  document.querySelector("#dialog-type").textContent = isFramed ? "FRAMED EDITION · COMING SOON" : "DIGITAL DOWNLOAD";
  document.querySelector("#dialog-note").textContent = isFramed ? "Frame mockup · sample edition" : "1080 × 1440 px · original PNG · personal use";
  document.querySelector("#framed-note").hidden = !isFramed;
  form.hidden = isFramed;
  checkoutButton.disabled = false;
  form.reset();
  chooseAmount(0);
  dialog.showModal();
});

document.querySelector(".close-button").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
document.querySelectorAll(".amounts button[data-amount]").forEach((button) => {
  button.addEventListener("click", () => chooseAmount(button.dataset.amount));
});
customInput.addEventListener("input", updateButton);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "";
  const amount = selectedAmount ?? Math.round(Number(customInput.value || 0) * 100);

  if (amount === 0) {
    triggerDownload(selectedProduct.image, selectedProduct.title);
    dialog.close();
    showToast("Downloading. Enjoy it.");
    return;
  }
  if (!Number.isInteger(amount) || amount < 100 || amount > 50000) {
    status.textContent = "Please choose an amount between £1 and £500.";
    return;
  }
  if (!apiBaseUrl) {
    status.textContent = "Payments aren't connected yet. Choose Free to download.";
    return;
  }

  checkoutButton.disabled = true;
  checkoutButton.textContent = "Opening secure checkout…";
  try {
    const response = await fetch(`${apiBaseUrl}/api/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProduct.id, amount })
    });
    const data = await response.json();
    if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not be started");
    window.location.assign(data.url);
  } catch (error) {
    status.textContent = error.message || "Checkout could not be started. Please try again.";
    checkoutButton.disabled = false;
    updateButton();
  }
});

async function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get("checkout");
  if (state === "cancelled") {
    showToast("Checkout cancelled — nothing was charged.");
    history.replaceState({}, "", window.location.pathname);
    return;
  }
  const sessionId = params.get("session_id");
  if (state !== "success" || !sessionId || !apiBaseUrl) return;

  showToast("Confirming your payment…");
  try {
    const response = await fetch(`${apiBaseUrl}/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();
    if (!response.ok || !data.paid) throw new Error(data.error || "Payment could not be confirmed");
    const product = PRODUCTS.find((item) => item.id === data.productId);
    if (!product) throw new Error("Artwork could not be found");
    triggerDownload(product.image, product.title);
    showToast("Thanks for the support. Downloading now.");
    history.replaceState({}, "", window.location.pathname);
  } catch (error) {
    showToast(error.message || "We could not confirm the payment. Refresh to try again.");
  }
}

handleCheckoutReturn();
