const PRODUCTS = [
  { id: "after-the-rain", title: "After the Rain", year: "2026", image: "downloads/after-the-rain.svg" },
  { id: "lunar-tide", title: "Lunar Tide", year: "2026", image: "downloads/lunar-tide.svg" },
  { id: "quiet-hours", title: "Quiet Hours", year: "2026", image: "downloads/quiet-hours.svg" }
];

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

document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#art-grid").innerHTML = PRODUCTS.map((product, index) => `
  <button class="art-card" type="button" data-product="${product.id}" aria-label="Download ${product.title}">
    <span class="art-frame"><img src="${product.image}" alt="${product.title}, digital artwork" /></span>
    <span class="art-meta"><strong>${product.title}</strong><span>0${index + 1} · ${product.year}</span></span>
  </button>
`).join("");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 5000);
}

function chooseAmount(value) {
  document.querySelectorAll(".amounts button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.amount === String(value));
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
  link.download = `${title.toLowerCase().replaceAll(" ", "-")}.svg`;
  document.body.append(link);
  link.click();
  link.remove();
}

document.querySelector("#art-grid").addEventListener("click", (event) => {
  const card = event.target.closest(".art-card");
  if (!card) return;
  selectedProduct = PRODUCTS.find((product) => product.id === card.dataset.product);
  document.querySelector("#dialog-title").textContent = selectedProduct.title;
  document.querySelector("#dialog-art").style.backgroundImage = `url(${selectedProduct.image})`;
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
    showToast("Your download has started. Thank you for enjoying the work.");
    return;
  }
  if (!Number.isInteger(amount) || amount < 100 || amount > 50000) {
    status.textContent = "Please choose an amount between £1 and £500.";
    return;
  }
  if (!apiBaseUrl) {
    status.textContent = "Payments are not connected yet. Add the backend URL in config.js.";
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
    showToast("Payment confirmed — thank you. Your download has started.");
    history.replaceState({}, "", window.location.pathname);
  } catch (error) {
    showToast(error.message || "We could not confirm the payment. Refresh to try again.");
  }
}

handleCheckoutReturn();
