const GALLERIES_API_URL =
  "https://radha-rani-studio.onrender.com/api/v1/galleries/client";

let allGalleries = [];
let activeGalleryIndex = 0;
let activeMediaFilter = "all";
let visibleItems = [];
let lightboxIndex = 0;

const lookupCard = document.getElementById("gallery-lookup-card");
const lookupForm = document.getElementById("gallery-lookup-form");
const lookupEmailInput = document.getElementById("gallery-lookup-email");
const statusBanner = document.getElementById("gallery-status-banner");
const controlsSection = document.getElementById("gallery-controls");
const mediaGrid = document.getElementById("gallery-media-grid");
const clientBadge = document.getElementById("gallery-client-badge");

function showStatus(message, type = "info") {
  statusBanner.textContent = message;
  statusBanner.className = `booking-feedback is-visible is-${type}`;
}

function clearStatus() {
  statusBanner.textContent = "";
  statusBanner.className = "booking-feedback";
}

function detectSignedInClientEmail() {
  const params = new URLSearchParams(window.location.search);
  const queryEmail = params.get("email");
  if (queryEmail) return queryEmail.trim().toLowerCase();

  const storageKeys = ["user", "currentUser", "clientUser", "radhaRaniUser"];
  for (const store of [localStorage, sessionStorage]) {
    for (const key of storageKeys) {
      const raw = store.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const email =
          parsed?.email || parsed?.user?.email || parsed?.data?.user?.email;
        if (email) return String(email).trim().toLowerCase();
      } catch (_) {
        if (raw.includes("@")) return raw.trim().toLowerCase();
      }
    }
  }
  return "";
}

function formatExpiryInfo(expiresAt, retentionMonths) {
  const expiryDate = new Date(expiresAt);
  const diffMs = expiryDate.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const formattedDate = expiryDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return {
    daysLeft,
    label: `${retentionMonths}-Month Plan • Available until ${formattedDate} (${daysLeft} days left)`,
  };
}

function renderAlbumSwitcher() {
  const switcher = document.getElementById("gallery-album-switcher");
  if (allGalleries.length <= 1) {
    switcher.innerHTML = "";
    return;
  }
  switcher.innerHTML = allGalleries
    .map(
      (gal, idx) => `
        <button
          type="button"
          class="album-pill ${idx === activeGalleryIndex ? "is-active" : ""}"
          data-album-index="${idx}"
        >
          ${gal.title}
        </button>
      `,
    )
    .join("");

  switcher.querySelectorAll(".album-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeGalleryIndex = Number(btn.dataset.albumIndex);
      renderActiveGallery();
    });
  });
}

function renderActiveGallery() {
  const gallery = allGalleries[activeGalleryIndex];
  if (!gallery) return;

  controlsSection.classList.remove("hidden");
  document.getElementById("active-gallery-title").textContent = gallery.title;
  document.getElementById("active-gallery-meta").textContent =
    `${gallery.items.length} media file${gallery.items.length === 1 ? "" : "s"}` +
    (gallery.clientName ? ` • Prepared for ${gallery.clientName}` : "");

  const expiry = formatExpiryInfo(gallery.expiresAt, gallery.retentionMonths);
  const retentionPill = document.getElementById("active-gallery-retention");
  document.getElementById("active-gallery-expiry-text").textContent =
    expiry.label;
  retentionPill.classList.toggle("is-expiring-soon", expiry.daysLeft <= 14);

  renderAlbumSwitcher();

  visibleItems = (gallery.items || []).filter((item) =>
    activeMediaFilter === "all" ? true : item.mediaType === activeMediaFilter,
  );

  if (visibleItems.length === 0) {
    mediaGrid.innerHTML = "";
    showStatus("No photos or videos match this filter yet.", "info");
    return;
  }

  clearStatus();
  mediaGrid.innerHTML = visibleItems
    .map(
      (item, idx) => `
        <article class="media-card">
          <button type="button" class="media-thumb-btn" data-item-index="${idx}">
            ${
              item.mediaType === "video"
                ? `<video src="${item.signedUrl}" preload="metadata" muted></video>
                   <span class="media-video-badge"><i class="fa-solid fa-play"></i> Video</span>`
                : `<img src="${item.signedUrl}" alt="${item.fileName}" loading="lazy" />`
            }
          </button>
          <div class="media-card-footer">
            <span class="media-filename" title="${item.fileName}">${item.fileName}</span>
            <a
              href="${item.signedUrl}"
              download="${item.fileName}"
              target="_blank"
              rel="noopener noreferrer"
              class="media-download-link"
              title="Download ${item.fileName}"
            >
              <i class="fa-solid fa-download"></i>
            </a>
          </div>
        </article>
      `,
    )
    .join("");

  mediaGrid.querySelectorAll(".media-thumb-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      openLightbox(Number(btn.dataset.itemIndex)),
    );
  });
}

async function loadGalleriesForEmail(email) {
  if (!email) {
    lookupCard.classList.remove("hidden");
    return;
  }

  clientBadge.textContent = email;
  clientBadge.classList.remove("hidden");
  lookupEmailInput.value = email;
  showStatus("Loading your cloud gallery...", "info");

  try {
    const res = await fetch(
      `${GALLERIES_API_URL}?email=${encodeURIComponent(email)}`,
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.message || "Could not load your gallery.");
    }

    allGalleries = payload?.data?.galleries || [];
    if (allGalleries.length === 0) {
      controlsSection.classList.add("hidden");
      mediaGrid.innerHTML = "";
      lookupCard.classList.remove("hidden");
      showStatus(
        "No active gallery was found for this email, or its 3-to-6-month retention period has ended.",
        "info",
      );
      return;
    }

    lookupCard.classList.add("hidden");
    activeGalleryIndex = 0;
    renderActiveGallery();
  } catch (err) {
    lookupCard.classList.remove("hidden");
    showStatus(err.message, "error");
  }
}

/* Lightbox Controls */
const lightbox = document.getElementById("gallery-lightbox");
const lightboxWrapper = document.getElementById("lightbox-media-wrapper");

function openLightbox(index) {
  lightboxIndex = index;
  renderLightboxItem();
  lightbox.classList.remove("hidden");
  document.body.classList.add("no-scroll");
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxWrapper.innerHTML = "";
  document.body.classList.remove("no-scroll");
}

function renderLightboxItem() {
  const item = visibleItems[lightboxIndex];
  if (!item) return;

  lightboxWrapper.innerHTML =
    item.mediaType === "video"
      ? `<video src="${item.signedUrl}" controls autoplay playsinline></video>`
      : `<img src="${item.signedUrl}" alt="${item.fileName}" />`;

  document.getElementById("lightbox-filename").textContent = item.fileName;
  const dl = document.getElementById("lightbox-download");
  dl.href = item.signedUrl;
  dl.setAttribute("download", item.fileName);
}

document
  .getElementById("lightbox-close")
  .addEventListener("click", closeLightbox);
document.getElementById("lightbox-prev").addEventListener("click", () => {
  lightboxIndex =
    (lightboxIndex - 1 + visibleItems.length) % visibleItems.length;
  renderLightboxItem();
});
document.getElementById("lightbox-next").addEventListener("click", () => {
  lightboxIndex = (lightboxIndex + 1) % visibleItems.length;
  renderLightboxItem();
});
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (lightbox.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") document.getElementById("lightbox-prev").click();
  if (e.key === "ArrowRight") document.getElementById("lightbox-next").click();
});

/* Filter Tabs & Lookup Submit */
document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-tab")
      .forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    activeMediaFilter = tab.dataset.filter;
    renderActiveGallery();
  });
});

lookupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loadGalleriesForEmail(lookupEmailInput.value.trim().toLowerCase());
});

/* Boot */
loadGalleriesForEmail(detectSignedInClientEmail());
