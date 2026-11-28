"use strict";

const body = document.querySelector("body");
const hamburger = document.querySelector(".hamburger");
const navShadow = document.querySelector(".nav-shadow");
const bar1 = document.querySelector(".bar1");
const bar2 = document.querySelector(".bar2");
const bar3 = document.querySelector(".bar3");

const mobileNav = document.querySelector(".mobileNav");
const mobilelinks = document.querySelectorAll(".mobileNavLinks");

// For Adding functionality in Mobile Navbar
hamburger.addEventListener("click", () => {
  bar1.classList.toggle("animateBar1");
  bar2.classList.toggle("animateBar2");
  bar3.classList.toggle("animateBar3");
  mobileNav.classList.toggle("openDrawer");
  navShadow.classList.toggle("nav-shadow");
});

//NOTES 1 - Take notes from this section
mobilelinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    bar1.classList.remove("animateBar1");
    bar2.classList.remove("animateBar2");
    bar3.classList.remove("animateBar3");
    mobileNav.classList.remove("openDrawer");
  });
});

// //////////////////////////////////////////

const modal = document.querySelector(".modal");
const overlay = document.querySelector(".modal-overlay");
const btnCloseModal = document.querySelector(".close-modal");
const btnsOpenModal = document.querySelectorAll(".show-modal");

const openModal = function (e) {
  if (e) e.preventDefault();
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  body.classList.add("no-scroll");
  console.log("welcome");
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
  body.classList.remove("no-scroll");
};

for (let i = 0; i < btnsOpenModal.length; i++)
  btnsOpenModal[i].addEventListener("click", openModal);
btnCloseModal.addEventListener("click", closeModal);
overlay.addEventListener("click", closeModal);

document.addEventListener("keydown", function (e) {
  // console.log(e.key);
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

// LOGIC FOR PLAYING VIDEO IN A DIV
// VIDEO SYSTEM (FINAL VERSION)

// Select all video containers
const videoContainers = document.querySelectorAll(".section-video .video");

videoContainers.forEach((container) => {
  const video = container.querySelector("video");
  const playBtn = container.querySelector(".custom-play-btn");

  // Hide controls initially
  video.controls = false;

  //PLAY BUTTON CLICK
  playBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const sources = video.querySelectorAll("source");

    //Ensure video is loaded (important for lazy loading)
    if (video.readyState === 0) {
      sources.forEach((source) => {
        if (!source.src) {
          source.src = source.dataset.src;
        }
      });
      video.load();
    }

    //Pause all other videos (pro UX)
    document.querySelectorAll(".section-video video").forEach((v) => {
      if (v !== video) {
        v.pause();
        v.controls = false;

        const otherBtn = v.closest(".video").querySelector(".custom-play-btn");

        otherBtn.style.opacity = "1";
        otherBtn.style.pointerEvents = "auto";
      }
    });

    //Play current video safely
    video.play().catch((err) => {
      console.log("Play failed:", err);
    });

    video.controls = true;
    playBtn.style.opacity = "0";
    playBtn.style.pointerEvents = "none";
  });

  // CLICK ON VIDEO → Pause
  video.addEventListener("click", () => {
    if (!video.paused) {
      video.pause();
      video.controls = false;
      playBtn.style.opacity = "1";
      playBtn.style.pointerEvents = "auto";
    }
  });

  // WHEN VIDEO ENDS → Reset
  video.addEventListener("ended", () => {
    video.controls = false;
    playBtn.style.opacity = "1";
    playBtn.style.pointerEvents = "auto";
  });
});

///////////////////////////////////////////////////////////
// LAZY LOADING VIDEO

const videoTargets = document.querySelectorAll(".lazy-video");

const loadVideo = function (entries, observer) {
  const [entry] = entries;

  if (!entry.isIntersecting) return;

  const video = entry.target;
  const sources = video.querySelectorAll("source");

  // Load sources
  sources.forEach((source) => {
    if (!source.src) {
      source.src = source.dataset.src;
    }
  });

  video.load();

  observer.unobserve(video);
};

const videoObserver = new IntersectionObserver(loadVideo, {
  root: null,
  threshold: 0,
  rootMargin: "200px",
});

videoTargets.forEach((video) => videoObserver.observe(video));

/////////////////////////////////////////////////////////////
// Smooth scroll
document
  .querySelector(".updated-navbar")
  .addEventListener("click", function (e) {
    console.log(e.target);
    e.preventDefault();

    // Matching stratedy
    if (e.target.classList.contains("nav__link")) {
      const id = e.target.getAttribute("href");
      console.log(id);

      document.querySelector(id).scrollIntoView({
        behavior: "smooth",
      });
    }
  });

document.querySelector(".mobileNav").addEventListener("click", function (e) {
  if (e.target.classList.contains("nav__link")) {
    e.preventDefault();

    const id = e.target.getAttribute("href");

    document.querySelector(id).scrollIntoView({
      behavior: "smooth",
    });
  }
});

/////////////////////////////////////////////////////////////////
// Reveal sections
const allSection = document.querySelectorAll(".section");
const revealSection = function (entries, observer) {
  console.log(entries);
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.remove("section--hidden");
    observer.unobserve(entry.target);
  });
};

const sectionObserver = new IntersectionObserver(revealSection, {
  root: null,
  threshold: 0,
  rootMargin: "-50px",
});

allSection.forEach(function (section) {
  sectionObserver.observe(section);
  section.classList.add("section--hidden");
});

///////////////////////////////////////////////////////////
// Lazy loading images
const imgTagets = document.querySelectorAll("img[data-src]");
const loadImg = function (entries, observer) {
  const [entry] = entries;

  if (!entry.isIntersecting) return;

  // Replace src with data-src
  entry.target.src = entry.target.dataset.src;

  entry.target.addEventListener("load", function () {
    entry.target.classList.remove("lazy-img");
  });

  observer.unobserve(entry.target);
};

const imgObserver = new IntersectionObserver(loadImg, {
  root: null,
  threshold: 0,
  rootMargin: "200px",
});

imgTagets.forEach((img) => imgObserver.observe(img));

///////////////////////////////////////////////
/// Slider

const createSlider = function (
  containerSelector,
  slideSelector,
  gap = 0,
  effect = "slide",
) {
  const container = document.querySelector(containerSelector);

  const slides = container.querySelectorAll(slideSelector);
  const btnLeft = container.querySelector(".fa-chevron-left");
  const btnRight = container.querySelector(".fa-chevron-right");
  const dotContainer = container.querySelector(".dots");

  let curSlide = 0;
  const maxSlide = slides.length;

  const createDots = function () {
    slides.forEach((_, i) => {
      dotContainer.insertAdjacentHTML(
        "beforeend",
        `<button class="dots__dot" data-slide="${i}"></button>`,
      );
    });
  };

  const activateDot = function (slide) {
    dotContainer
      .querySelectorAll(".dots__dot")
      .forEach((dot) => dot.classList.remove("dots__dot--active"));

    if (dotContainer.querySelector(`.dots__dot[data-slide="${slide}"]`)) {
      dotContainer
        .querySelector(`.dots__dot[data-slide="${slide}"]`)
        .classList.add("dots__dot--active");
    }
  };

  // NEW: Function to handle the active class on the slides themselves
  const activateSlide = function (slide) {
    slides.forEach((s) => s.classList.remove("active"));
    if (slides[slide]) {
      slides[slide].classList.add("active");
    }
  };

  const goToSlide = function (slide) {
    slides.forEach((s, i) => {
      if (effect === "fade") {
        s.style.transform = "translateX(0)";
      } else {
        s.style.transform = `translateX(calc(${100 * (i - slide)}% + ${gap * (i - slide)}px))`;
      }
    });
  };

  const nextSlide = function () {
    curSlide = (curSlide + 1) % maxSlide;
    goToSlide(curSlide);
    activateDot(curSlide);
    activateSlide(curSlide); // Update slide class
  };

  const prevSlide = function () {
    curSlide = (curSlide - 1 + maxSlide) % maxSlide;
    goToSlide(curSlide);
    activateDot(curSlide);
    activateSlide(curSlide); // Update slide class
  };

  const init = function () {
    goToSlide(0);
    createDots();
    activateDot(0);
    activateSlide(0); // Set initial active slide
  };

  init();

  if (btnRight) btnRight.addEventListener("click", nextSlide);
  if (btnLeft) btnLeft.addEventListener("click", prevSlide);

  if (dotContainer) {
    dotContainer.addEventListener("click", function (e) {
      if (e.target.classList.contains("dots__dot")) {
        curSlide = Number(e.target.dataset.slide);
        goToSlide(curSlide);
        activateDot(curSlide);
        activateSlide(curSlide); // Update slide class
      }
    });
  }

  // Touch Event Variables for Swipe Support
  let startX = 0;
  let endX = 0;

  // Use clientX for better accuracy within the viewport
  container.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true },
  );

  container.addEventListener("touchend", (e) => {
    endX = e.changedTouches[0].clientX;
    handleSwipe();
  });

  const handleSwipe = function () {
    const threshold = 50; // Minimum pixel distance to trigger a swipe
    if (startX - endX > threshold) nextSlide(); // Swiped Left -> Next
    if (endX - startX > threshold) prevSlide(); // Swiped Right -> Previous
  };
};

// Initialize Hero slider
createSlider(".main-section", ".slides", 0, "fade");

// Initialize Feedback slider
const FEEDBACKS_ENDPOINT =
  "https://radha-rani-studio.onrender.com/api/v1/feedbacks";

function escapeFeedbackHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFeedbackSlideMarkup(item, index) {
  const rating = Math.min(5, Math.max(1, Number(item.rating) || 5));
  const starsHtml = Array.from({ length: 5 }, (_, i) =>
    i < rating
      ? '<i class="fa-solid fa-star"></i>'
      : '<i class="fa-regular fa-star"></i>',
  ).join("");
  const mainImages = [
    "images/image3.jpg",
    "images/image10.jpg",
    "images/image5.jpg",
    "images/image6.jpg",
    "images/image8.jpg",
  ];
  const mainImg = mainImages[index % mainImages.length];

  return `
    <div class="feed">
      <div class="feed-description">
        <div class="separator"><span>-</span>//<span>-</span></div>
        <p>${escapeFeedbackHtml(item.quote)}</p>
        <div class="stars">${starsHtml}</div>
        <h6 class="client-info">— ${escapeFeedbackHtml(item.clientName)}, ${escapeFeedbackHtml(item.locationLabel)}</h6>
      </div>
      <div class="main-image feed-image">
        <img src="${mainImg}" alt="Wedding photography by Radha Rani Studio" />
      </div>
      <div class="image3 feed-image"><img src="images/image3.jpg" alt="" /></div>
      <div class="image4 feed-image"><img src="images/image4.jpg" alt="" /></div>
      <div class="image10 feed-image"><img src="images/image10.jpg" alt="" /></div>
      <div class="image11 feed-image"><img src="images/image11.jpg" alt="" /></div>
      <div class="image6 feed-image"><img src="images/image6.jpg" alt="" /></div>
      <div class="image9 feed-image"><img src="images/image9.jpg" alt="" /></div>
    </div>
  `;
}

async function initDynamicFeedbackSection() {
  const track = document.querySelector(".feedbacks-track");
  const dots = document.querySelector(".feedbacks .dots");
  if (!track) return;

  try {
    const res = await fetch(FEEDBACKS_ENDPOINT);
    const payload = await res.json().catch(() => ({}));
    const list = payload?.data?.feedbacks;

    if (res.ok && Array.isArray(list) && list.length > 0) {
      if (dots) dots.innerHTML = "";
      track.innerHTML = list
        .map((item, index) => buildFeedbackSlideMarkup(item, index))
        .join("");
    }
  } catch (err) {
    console.warn("Falling back to default feedback slides:", err);
  }

  createSlider(".feedbacks", ".feed", 20);
}

initDynamicFeedbackSection();

const clientFeedbackForm = document.getElementById("client-feedback-form");
const feedbackSubmitStatus = document.getElementById("feedback-submit-status");

if (clientFeedbackForm) {
  clientFeedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (feedbackSubmitStatus) {
      feedbackSubmitStatus.textContent = "";
      feedbackSubmitStatus.className = "contact-form-feedback";
    }

    const submitBtn = clientFeedbackForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    try {
      const payload = {
        clientName: document
          .getElementById("feedback-client-name")
          .value.trim(),
        locationLabel: document
          .getElementById("feedback-location")
          .value.trim(),
        rating: Number(document.getElementById("feedback-rating").value),
        quote: document.getElementById("feedback-quote").value.trim(),
      };

      const res = await fetch(FEEDBACKS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Could not submit your feedback.");
      }

      clientFeedbackForm.reset();
      if (feedbackSubmitStatus) {
        feedbackSubmitStatus.textContent =
          data.message || "Thank you! Your feedback has been saved.";
        feedbackSubmitStatus.classList.add("is-visible", "is-success");
      }

      // Reload feedbacks from MongoDB so the new review appears immediately
      const track = document.querySelector(".feedbacks-track");
      const dots = document.querySelector(".feedbacks .dots");
      const refreshRes = await fetch(FEEDBACKS_ENDPOINT);
      const refreshData = await refreshRes.json().catch(() => ({}));
      const updatedList = refreshData?.data?.feedbacks;
      if (
        track &&
        refreshRes.ok &&
        Array.isArray(updatedList) &&
        updatedList.length > 0
      ) {
        if (dots) dots.innerHTML = "";
        track.innerHTML = updatedList
          .map((item, index) => buildFeedbackSlideMarkup(item, index))
          .join("");
        createSlider(".feedbacks", ".feed", 20);
      }
    } catch (err) {
      if (feedbackSubmitStatus) {
        feedbackSubmitStatus.textContent = err.message;
        feedbackSubmitStatus.classList.add("is-visible", "is-error");
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Feedback";
      }
    }
  });
}

// Initialize Tariff slider
// createSlider('.tariff', '.col', 0);

if (window.innerWidth <= 768) {
  createSlider(".tariff", ".col", 60);
}

// Active class for tariff section
const tariffCols = document.querySelectorAll(".tariff_wrapper .col");

tariffCols.forEach((col) => {
  col.addEventListener("click", () => {
    // 1. Remove active from all
    tariffCols.forEach((c) => c.classList.remove("active"));

    // 2. Add active to clicked one
    col.classList.add("active");
  });
});

////////////////////////////////////////////
// Contact form submission (Netlify) with inline feedback
const contactForm = document.querySelector(".contact-form form");
const contactFormFeedback = document.getElementById("contact-form-feedback");

function setContactFormFeedback(message, type = "") {
  if (!contactFormFeedback) return;
  contactFormFeedback.textContent = message;
  contactFormFeedback.classList.toggle("is-visible", Boolean(message));
  contactFormFeedback.classList.toggle("is-success", type === "success");
  contactFormFeedback.classList.toggle("is-error", type === "error");
}

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setContactFormFeedback("");

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton
      ? submitButton.textContent
      : "Submit";
    const formData = new FormData(contactForm);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "Sending...";
    }

    try {
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        // Netlify requires the form-name value to be included in the body.
        body: new URLSearchParams(formData).toString(),
      });

      if (!response.ok) {
        console.error("Contact form response status:", response.status);
        throw new Error("Contact form submission failed");
      }

      contactForm.reset();
      setContactFormFeedback(
        "Thank you for contacting us! Your message has been sent successfully.",
        "success",
      );
    } catch (error) {
      console.error("Contact form submission error:", error);
      setContactFormFeedback(
        "We couldn't send your message right now. Please check your connection and try again.",
        "error",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

////////////////////////////////////////////

// BACKEND AUTHENTICATION INTEGRATION

const API_BASE = "https://radha-rani-studio.onrender.com/api/v1/users";
const BOOKING_API_BASE = API_BASE.replace(/\/users\/?$/, "/bookings");
const AUTH_OTP_API_BASE = API_BASE.replace(/\/users\/?$/, "/auth");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterLink = document.getElementById("show-register");
const showLoginLink = document.getElementById("show-login");

const loginFeedback = document.getElementById("login-feedback");
const registerFeedback = document.getElementById("register-feedback");
const authSuccessOverlay = document.getElementById("auth-success-overlay");
const authSuccessTitle = document.getElementById("auth-success-title");
const authSuccessDescription = document.getElementById(
  "auth-success-description",
);
const authSuccessClose = document.getElementById("auth-success-close");
const authSuccessContinue = document.getElementById("auth-success-continue");

const desktopLoginButton = document.getElementById("desktop-login-button");
const desktopAccountTrigger = document.getElementById(
  "desktop-account-trigger",
);
const desktopAccountName = document.getElementById("desktop-account-name");
const desktopAccountMenu = document.getElementById("desktop-account-menu");
const mobileLoginLink = document.getElementById("mobile-login-link");
const mobileAccountLinks = document.getElementById("mobile-account-links");
const mobileAccountTrigger = document.getElementById("mobile-account-trigger");
const mobileAccountActions = document.getElementById("mobile-account-actions");
const mobileAccountName = document.getElementById("mobile-account-name");

function renderAccountNavigation() {
  const token = localStorage.getItem("token");
  const storedName = localStorage.getItem("userName");
  const name = (storedName || "Account").trim() || "Account";

  if (desktopAccountName) desktopAccountName.textContent = name;
  if (mobileAccountName) mobileAccountName.textContent = name;

  desktopLoginButton?.classList.toggle("hidden", Boolean(token));
  desktopAccountTrigger?.classList.toggle("hidden", !token);
  mobileLoginLink?.classList.toggle("hidden", Boolean(token));
  mobileAccountLinks?.classList.toggle("hidden", !token);
}

function closeAccountMenu() {
  desktopAccountMenu?.classList.add("hidden");
  desktopAccountTrigger?.setAttribute("aria-expanded", "false");
  mobileAccountActions?.classList.add("hidden");
  mobileAccountTrigger?.setAttribute("aria-expanded", "false");
}

renderAccountNavigation();

const switchAuthForm = (showRegister) => {
  loginForm.classList.toggle("hidden", showRegister);
  registerForm.classList.toggle("hidden", !showRegister);
  clearAuthFeedback();
};

function setAuthFeedback(element, message, type = "error") {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
  element.classList.toggle("is-visible", Boolean(message));
}

function clearAuthFeedback() {
  setAuthFeedback(loginFeedback, "");
  setAuthFeedback(registerFeedback, "");
  const duplicateEmailAction = document.getElementById(
    "duplicate-email-login-action",
  );
  if (duplicateEmailAction) duplicateEmailAction.classList.remove("is-visible");
  const passwordMessage = document.getElementById("password-match-message");
  if (passwordMessage) {
    passwordMessage.textContent = "";
    passwordMessage.classList.remove("is-error", "is-success");
  }
}

function showAuthSuccess(title, description) {
  if (!authSuccessOverlay) return;
  authSuccessTitle.textContent = title;
  authSuccessDescription.textContent = description;
  authSuccessOverlay.classList.remove("hidden");
  document.body.classList.add("no-scroll");
  authSuccessContinue?.focus();
}

function closeAuthSuccess() {
  authSuccessOverlay?.classList.add("hidden");
  if (
    modal?.classList.contains("hidden") &&
    overlay?.classList.contains("hidden")
  ) {
    document.body.classList.remove("no-scroll");
  }
}

showRegisterLink.addEventListener("click", (e) => {
  e.preventDefault();
  switchAuthForm(true);
});

showLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  switchAuthForm(false);
});

authSuccessClose?.addEventListener("click", closeAuthSuccess);
authSuccessContinue?.addEventListener("click", closeAuthSuccess);
authSuccessOverlay?.addEventListener("click", (e) => {
  if (e.target === authSuccessOverlay) closeAuthSuccess();
});

// DUAL-CHANNEL OTP (EMAIL + WHATSAPP) FOR REGISTRATION
const sendRegisterEmailOtpBtn = document.getElementById(
  "send-register-email-otp",
);
const sendRegisterWhatsappOtpBtn = document.getElementById(
  "send-register-whatsapp-otp",
);
const registerEmailOtpRow = document.getElementById("register-email-otp-row");
const registerWhatsappOtpRow = document.getElementById(
  "register-whatsapp-otp-row",
);
const registerEmailOtpInput = document.getElementById("register-email-otp");
const registerWhatsappOtpInput = document.getElementById(
  "register-whatsapp-otp",
);

const otpCooldownTimers = new Map();

function startOtpCooldown(button, seconds = 30) {
  if (!button) return;
  const existing = otpCooldownTimers.get(button);
  if (existing) clearInterval(existing);

  const originalLabel = button.dataset.label || button.textContent.trim();
  button.dataset.label = originalLabel;
  let remaining = seconds;
  button.disabled = true;
  button.textContent = `${remaining}s`;

  const timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(timer);
      otpCooldownTimers.delete(button);
      button.disabled = false;
      button.textContent = originalLabel;
    } else {
      button.textContent = `${remaining}s`;
    }
  }, 1000);

  otpCooldownTimers.set(button, timer);
}

sendRegisterEmailOtpBtn?.addEventListener("click", async () => {
  setAuthFeedback(registerFeedback, "");
  const email = document.getElementById("register-email").value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthFeedback(
      registerFeedback,
      "Please enter a valid email address before requesting an OTP.",
    );
    document.getElementById("register-email").focus();
    return;
  }

  sendRegisterEmailOtpBtn.disabled = true;
  sendRegisterEmailOtpBtn.textContent = "Sending...";

  try {
    const response = await fetch(`${AUTH_OTP_API_BASE}/send-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Failed to send email OTP.",
      );
    }

    registerEmailOtpRow?.classList.remove("hidden");
    registerEmailOtpInput?.focus();
    setAuthFeedback(
      registerFeedback,
      "Verification code sent to your email address.",
      "success",
    );
    startOtpCooldown(sendRegisterEmailOtpBtn, 30);
  } catch (error) {
    sendRegisterEmailOtpBtn.disabled = false;
    sendRegisterEmailOtpBtn.textContent = "Send OTP";
    setAuthFeedback(registerFeedback, error.message, "error");
  }
});

sendRegisterWhatsappOtpBtn?.addEventListener("click", async () => {
  setAuthFeedback(registerFeedback, "");
  const submittedPhoneNumber = document
    .getElementById("register-phone")
    .value.trim();
  const compactPhoneNumber = submittedPhoneNumber.replace(/[\s()-]/g, "");
  const indianMobileNumber = compactPhoneNumber.startsWith("+91")
    ? compactPhoneNumber.slice(3)
    : compactPhoneNumber;

  if (!/^[6-9]\d{9}$/.test(indianMobileNumber)) {
    setAuthFeedback(
      registerFeedback,
      "Please enter a valid 10-digit Indian WhatsApp number first.",
    );
    document.getElementById("register-phone").focus();
    return;
  }

  sendRegisterWhatsappOtpBtn.disabled = true;
  sendRegisterWhatsappOtpBtn.textContent = "Sending...";

  try {
    const response = await fetch(`${AUTH_OTP_API_BASE}/send-whatsapp-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: indianMobileNumber }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Failed to send WhatsApp OTP.",
      );
    }

    registerWhatsappOtpRow?.classList.remove("hidden");
    registerWhatsappOtpInput?.focus();
    setAuthFeedback(
      registerFeedback,
      "Verification code sent to your WhatsApp.",
      "success",
    );
    startOtpCooldown(sendRegisterWhatsappOtpBtn, 30);
  } catch (error) {
    sendRegisterWhatsappOtpBtn.disabled = false;
    sendRegisterWhatsappOtpBtn.textContent = "Send OTP";
    setAuthFeedback(registerFeedback, error.message, "error");
  }
});

// REGISTRATION
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthFeedback(registerFeedback, "");

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const submittedPhoneNumber = document
    .getElementById("register-phone")
    .value.trim();
  const compactPhoneNumber = submittedPhoneNumber.replace(/[\s()-]/g, "");
  const indianMobileNumber = compactPhoneNumber.startsWith("+91")
    ? compactPhoneNumber.slice(3)
    : compactPhoneNumber;
  const phoneNumber = `+91${indianMobileNumber}`;
  const emailOtp = String(registerEmailOtpInput?.value || "").trim();
  const whatsappOtp = String(registerWhatsappOtpInput?.value || "").trim();
  const password = document.getElementById("register-password").value;
  const passwordConfirm = document.getElementById(
    "register-password-confirm",
  ).value;
  const passwordMessage = document.getElementById("password-match-message");

  if (!/^[6-9]\d{9}$/.test(indianMobileNumber)) {
    setAuthFeedback(
      registerFeedback,
      "Please enter a valid 10-digit Indian mobile number. You may include +91.",
    );
    document.getElementById("register-phone").focus();
    return;
  }

  if (!/^\d{6}$/.test(emailOtp)) {
    registerEmailOtpRow?.classList.remove("hidden");
    setAuthFeedback(
      registerFeedback,
      "Click 'Send OTP' next to your email and enter the 6-digit code.",
    );
    registerEmailOtpInput?.focus();
    return;
  }

  if (!/^\d{6}$/.test(whatsappOtp)) {
    registerWhatsappOtpRow?.classList.remove("hidden");
    setAuthFeedback(
      registerFeedback,
      "Click 'Send OTP' next to your WhatsApp number and enter the 6-digit code.",
    );
    registerWhatsappOtpInput?.focus();
    return;
  }

  if (password !== passwordConfirm) {
    if (passwordMessage) {
      passwordMessage.textContent =
        "Passwords do not match. Please check both fields.";
      passwordMessage.classList.add("is-error", "is-visible");
      passwordMessage.classList.remove("is-success");
    }
    document.getElementById("register-password-confirm").focus();
    return;
  }

  if (passwordMessage) {
    passwordMessage.textContent = "";
    passwordMessage.classList.remove("is-error", "is-success", "is-visible");
  }

  const submitButton = registerForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
  }

  try {
    const otpVerifyResponse = await fetch(
      `${AUTH_OTP_API_BASE}/verify-dual-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: indianMobileNumber,
          emailOtp,
          whatsappOtp,
        }),
      },
    );

    const otpVerifyData = await otpVerifyResponse.json().catch(() => ({}));
    if (!otpVerifyResponse.ok) {
      setAuthFeedback(
        registerFeedback,
        otpVerifyData.error ||
          otpVerifyData.message ||
          "Email or WhatsApp OTP verification failed.",
      );
      return;
    }

    if (otpVerifyData.token) {
      localStorage.setItem("verifiedOtpToken", otpVerifyData.token);
    }

    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phoneNumber,
        password,
        passwordConfirm,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const backendMessage = String(data.message || "");
      const isDuplicateEmail =
        response.status === 409 ||
        /E11000|duplicate key|email_1 dup key|already exists/i.test(
          backendMessage,
        );

      if (isDuplicateEmail) {
        setAuthFeedback(
          registerFeedback,
          "An account with this email address already exists. Please log in to your existing account, or use a different email address to create a new account.",
        );

        let loginAction = document.getElementById(
          "duplicate-email-login-action",
        );
        if (!loginAction && registerFeedback) {
          loginAction = document.createElement("button");
          loginAction.type = "button";
          loginAction.id = "duplicate-email-login-action";
          loginAction.className = "inline-login-action";
          loginAction.textContent = "Go to Login";
          loginAction.addEventListener("click", () => {
            switchAuthForm(false);
            document.getElementById("email")?.focus();
          });
          registerFeedback.insertAdjacentElement("afterend", loginAction);
        }
        if (loginAction) loginAction.classList.add("is-visible");
      } else {
        setAuthFeedback(
          registerFeedback,
          data.message ||
            "We couldn't create your account. Please review your details and try again.",
        );
      }
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userRole", data.data.user.role);
    localStorage.setItem("userName", data.data.user.name || name);
    localStorage.setItem("userEmail", data.data.user.email || email);
    renderAccountNavigation();

    registerForm.reset();
    registerEmailOtpRow?.classList.add("hidden");
    registerWhatsappOtpRow?.classList.add("hidden");
    switchAuthForm(false);
    closeModal();
    showAuthSuccess(
      "Account created!",
      "Your email and WhatsApp are verified and your Radha Rani Studio account is ready.",
    );
  } catch (error) {
    console.error("Registration error:", error);
    setAuthFeedback(
      registerFeedback,
      "We couldn't connect to the server. Please check your connection and try again.",
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  }
});

// Account menu interactions. These actions do not change booking/payment code.
desktopAccountTrigger?.addEventListener("click", () => {
  const isOpen = !desktopAccountMenu?.classList.contains("hidden");
  desktopAccountMenu?.classList.toggle("hidden", isOpen);
  desktopAccountTrigger.setAttribute("aria-expanded", String(!isOpen));
});

mobileAccountTrigger?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  const isOpen = !mobileAccountActions?.classList.contains("hidden");
  mobileAccountActions?.classList.toggle("hidden", isOpen);
  mobileAccountTrigger.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#desktop-account-control")) closeAccountMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAccountMenu();
});

document.querySelectorAll('[data-account-action="gallery"]').forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeAccountMenu();
    mobileNav?.classList.remove("openDrawer");
    bar1?.classList.remove("animateBar1");
    bar2?.classList.remove("animateBar2");
    bar3?.classList.remove("animateBar3");

    const email = String(localStorage.getItem("userEmail") || "").trim();
    window.location.href = email
      ? `clientGallery.html?email=${encodeURIComponent(email)}`
      : "clientGallery.html";
  });
});

document.querySelectorAll('[data-account-action="logout"]').forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    closeAccountMenu();
    renderAccountNavigation();
    mobileNav?.classList.remove("openDrawer");
    bar1?.classList.remove("animateBar1");
    bar2?.classList.remove("animateBar2");
    bar3?.classList.remove("animateBar3");
  });
});

window.addEventListener("storage", (event) => {
  if (["token", "userName", "userRole", "userEmail"].includes(event.key)) {
    renderAccountNavigation();
  }
});

////////////////////////////////////////////
// LIVE RAZORPAY FRONTEND GATEWAY CHECKOUT

// Custom branded event-date calendar. Returns YYYY-MM-DD or null if cancelled.
const eventDateOverlay = document.getElementById("event-date-overlay");
const eventDateSelectedLabel = document.getElementById(
  "event-date-selected-label",
);
const eventDateMonth = document.getElementById("event-date-month");
const eventDateYear = document.getElementById("event-date-year");
const eventDateDays = document.getElementById("event-date-days");
let calendarViewDate = new Date();
let calendarSelectedDate = null;
let resolveEventDate = null;

const calendarMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const calendarToday = new Date();
calendarToday.setHours(0, 0, 0, 0);

function dateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateSelectedDateLabel() {
  eventDateSelectedLabel.textContent = calendarSelectedDate
    ? calendarSelectedDate.toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Select a date";
}

function renderEventCalendar() {
  if (!eventDateMonth || !eventDateYear || !eventDateDays) return;
  eventDateMonth.innerHTML = calendarMonthNames
    .map((name, index) => `<option value="${index}">${name}</option>`)
    .join("");
  const currentYear = calendarToday.getFullYear();
  const yearOptions = [];
  for (let year = currentYear; year <= currentYear + 10; year++) {
    yearOptions.push(`<option value="${year}">${year}</option>`);
  }
  eventDateYear.innerHTML = yearOptions.join("");
  eventDateMonth.value = String(calendarViewDate.getMonth());
  eventDateYear.value = String(calendarViewDate.getFullYear());

  eventDateDays.innerHTML = "";
  const firstWeekday = new Date(
    calendarViewDate.getFullYear(),
    calendarViewDate.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    calendarViewDate.getFullYear(),
    calendarViewDate.getMonth() + 1,
    0,
  ).getDate();

  for (let blank = 0; blank < firstWeekday; blank++) {
    const empty = document.createElement("span");
    empty.className = "event-date-empty";
    empty.setAttribute("aria-hidden", "true");
    eventDateDays.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(
      calendarViewDate.getFullYear(),
      calendarViewDate.getMonth(),
      day,
    );
    const button = document.createElement("button");
    button.type = "button";
    button.className = "event-date-day";
    button.textContent = String(day);
    button.setAttribute(
      "aria-label",
      date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
    if (date < calendarToday) {
      button.disabled = true;
      button.classList.add("is-past");
    }
    if (
      calendarSelectedDate &&
      dateToISO(date) === dateToISO(calendarSelectedDate)
    ) {
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
    }
    button.addEventListener("click", () => {
      calendarSelectedDate = date;
      updateSelectedDateLabel();
      renderEventCalendar();
    });
    eventDateDays.appendChild(button);
  }
  updateSelectedDateLabel();
}

function selectEventDate() {
  if (!eventDateOverlay) {
    // Fail safely if the calendar markup has not been added.
    return Promise.resolve(null);
  }
  calendarSelectedDate = null;
  calendarViewDate = new Date(Math.max(Date.now(), calendarToday.getTime()));
  calendarViewDate.setDate(1);
  renderEventCalendar();
  eventDateOverlay.classList.remove("hidden");
  eventDateOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");

  return new Promise((resolve) => {
    resolveEventDate = resolve;
  });
}

function closeEventDatePicker(value = null) {
  eventDateOverlay?.classList.add("hidden");
  eventDateOverlay?.setAttribute("aria-hidden", "true");
  if (
    typeof closeAuthSuccess === "function" &&
    authSuccessOverlay?.classList.contains("hidden") &&
    modal?.classList.contains("hidden") &&
    overlay?.classList.contains("hidden")
  ) {
    document.body.classList.remove("no-scroll");
  } else if (
    !authSuccessOverlay ||
    authSuccessOverlay.classList.contains("hidden")
  ) {
    document.body.classList.remove("no-scroll");
  }
  if (resolveEventDate) {
    resolveEventDate(value);
    resolveEventDate = null;
  }
}

eventDateMonth?.addEventListener("change", () => {
  calendarViewDate.setMonth(Number(eventDateMonth.value));
  renderEventCalendar();
});
eventDateYear?.addEventListener("change", () => {
  calendarViewDate.setFullYear(Number(eventDateYear.value));
  renderEventCalendar();
});
document.getElementById("event-date-prev")?.addEventListener("click", () => {
  const previous = new Date(
    calendarViewDate.getFullYear(),
    calendarViewDate.getMonth() - 1,
    1,
  );
  if (
    previous.getFullYear() < calendarToday.getFullYear() ||
    (previous.getFullYear() === calendarToday.getFullYear() &&
      previous.getMonth() < calendarToday.getMonth())
  )
    return;
  calendarViewDate = previous;
  renderEventCalendar();
});
document.getElementById("event-date-next")?.addEventListener("click", () => {
  if (
    calendarViewDate.getFullYear() >= calendarToday.getFullYear() + 10 &&
    calendarViewDate.getMonth() === 11
  )
    return;
  calendarViewDate = new Date(
    calendarViewDate.getFullYear(),
    calendarViewDate.getMonth() + 1,
    1,
  );
  renderEventCalendar();
});
document
  .getElementById("event-date-edit")
  ?.addEventListener("click", () => eventDateMonth?.focus());
document
  .getElementById("event-date-cancel")
  ?.addEventListener("click", () => closeEventDatePicker(null));
document.getElementById("event-date-confirm")?.addEventListener("click", () => {
  if (!calendarSelectedDate) {
    eventDateSelectedLabel.textContent = "Please select a date";
    return;
  }
  closeEventDatePicker(dateToISO(calendarSelectedDate));
});
eventDateOverlay?.addEventListener("click", (event) => {
  if (event.target === eventDateOverlay) closeEventDatePicker(null);
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    eventDateOverlay &&
    !eventDateOverlay.classList.contains("hidden")
  ) {
    closeEventDatePicker(null);
  }
});

// Booking flow with branded inline feedback. Payment/order API logic is preserved.
// Event venue address form. The address belongs to this booking, not the customer profile.
const PACKAGE_API_BASE = API_BASE.replace(/\/users\/?$/, "/packages");
const eventLocationOverlay = document.getElementById("event-location-overlay");
const eventLocationForm = document.getElementById("event-location-form");
const eventLocationFeedback = document.getElementById(
  "event-location-feedback",
);
const eventLocationSubmitBtn = document.getElementById("event-location-submit");
const travelStatusBox = document.getElementById("travel-status-box");
const travelBasePriceEl = document.getElementById("travel-base-price");
const travelCostValueEl = document.getElementById("travel-cost-value");
const travelTotalPriceEl = document.getElementById("travel-total-price");
const advanceChoiceNoteEl = document.getElementById(
  "payment-choice-advance-note",
);
const fullChoiceNoteEl = document.getElementById("payment-choice-full-note");

const travelExplanationEl = document.getElementById("travel-explanation");

let cachedPackages = null;
let activeBookingPackage = null;
let activeLocationCheck = null;
let locationCheckDebounceTimer = null;
let locationCheckSequence = 0;
let resolveEventLocation = null;

function formatInr(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

async function loadAvailablePackages() {
  if (Array.isArray(cachedPackages) && cachedPackages.length > 0) {
    return cachedPackages;
  }
  const pkgResponse = await fetch(PACKAGE_API_BASE);
  if (!pkgResponse.ok) {
    throw new Error(
      "We couldn't load the photography packages. Please try again shortly.",
    );
  }
  const pkgData = await pkgResponse.json();
  const packages = pkgData?.data?.packages;
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new Error(
      "Our packages are temporarily unavailable. Please try again later or contact us for assistance.",
    );
  }
  cachedPackages = packages;
  return packages;
}

function setTravelStatusUI(stateType, message) {
  if (!travelStatusBox) return;
  travelStatusBox.textContent = message;
  travelStatusBox.classList.remove(
    "is-loading",
    "is-free",
    "is-chargeable",
    "is-unavailable",
  );
  if (stateType) travelStatusBox.classList.add(`is-${stateType}`);
}

function updateTravelBreakdownUI(travelResult = null) {
  const basePrice = Number(activeBookingPackage?.price || 0);
  if (travelBasePriceEl)
    travelBasePriceEl.textContent = basePrice ? formatInr(basePrice) : "—";

  if (!travelResult) {
    if (travelCostValueEl) travelCostValueEl.textContent = "Enter PIN code";
    if (travelTotalPriceEl)
      travelTotalPriceEl.textContent = basePrice ? formatInr(basePrice) : "—";
    if (travelExplanationEl) {
      travelExplanationEl.textContent = "";
      travelExplanationEl.classList.add("hidden");
    }
    if (advanceChoiceNoteEl) {
      const baseAdv =
        Math.round((basePrice * 0.2 + Number.EPSILON) * 100) / 100;
      advanceChoiceNoteEl.textContent = basePrice
        ? `Pay ${formatInr(baseAdv)} now (20%) and the remaining 80% later.`
        : "Pay 20% now and the remaining 80% later.";
    }
    if (fullChoiceNoteEl) {
      fullChoiceNoteEl.textContent = basePrice
        ? `Pay ${formatInr(basePrice)} now (100%). No balance will remain after verification.`
        : "Pay 100% now. No balance will remain after successful verification.";
    }
    if (eventLocationSubmitBtn) {
      eventLocationSubmitBtn.disabled = false;
      eventLocationSubmitBtn.textContent = "Continue to payment";
    }
    return;
  }

  if (!travelResult.available) {
    if (travelCostValueEl) travelCostValueEl.textContent = "Unavailable";
    if (travelTotalPriceEl) travelTotalPriceEl.textContent = "—";
    if (travelExplanationEl) {
      travelExplanationEl.textContent = "";
      travelExplanationEl.classList.add("hidden");
    }
    if (eventLocationSubmitBtn) {
      eventLocationSubmitBtn.disabled = true;
      eventLocationSubmitBtn.textContent = "Location unavailable";
    }
    return;
  }

  const travelCharge = Number(travelResult.travelCharge || 0);
  const totalPrice = Number(
    travelResult.pricing?.totalPrice ?? basePrice + travelCharge,
  );
  const advanceAmount = Number(
    travelResult.pricing?.advanceAmount ??
      Math.round((totalPrice * 0.2 + Number.EPSILON) * 100) / 100,
  );

  if (travelCostValueEl) {
    travelCostValueEl.textContent =
      travelCharge > 0
        ? `${formatInr(travelCharge)} (${travelResult.distanceKm} km one-way)`
        : `₹0 (Free · ${travelResult.distanceKm} km)`;
  }
  if (travelTotalPriceEl)
    travelTotalPriceEl.textContent = formatInr(totalPrice);

  if (travelExplanationEl) {
    if (travelCharge > 0) {
      const freeKm = travelResult.freeRadiusKm ?? 25;
      const extraOneWay =
        travelResult.extraOneWayKm ??
        Math.round((travelResult.distanceKm - freeKm) * 10) / 10;
      const extraRoundTrip =
        travelResult.extraRoundTripKm ?? Math.round(extraOneWay * 2 * 10) / 10;
      const rateEachWay = travelResult.ratePerKmEachWay ?? 12.5;

      travelExplanationEl.textContent =
        `Why this extra charge? Travel within ${freeKm} km of our studio is free. ` +
        `Your venue is ~${travelResult.distanceKm} km away (${extraOneWay} km extra one-way = ${extraRoundTrip} km round-trip). ` +
        `At ₹${rateEachWay}/km each way, a traveling cost of ${formatInr(travelCharge)} is added to the base package price.`;
      travelExplanationEl.classList.remove("hidden");
    } else {
      travelExplanationEl.textContent = "";
      travelExplanationEl.classList.add("hidden");
    }
  }

  if (advanceChoiceNoteEl) {
    advanceChoiceNoteEl.textContent =
      travelCharge > 0
        ? `Pay ${formatInr(advanceAmount)} now (20% of package + travel) and ${formatInr(Math.max(totalPrice - advanceAmount, 0))} later.`
        : `Pay ${formatInr(advanceAmount)} now (20% of total) and ${formatInr(Math.max(totalPrice - advanceAmount, 0))} later.`;
  }
  if (fullChoiceNoteEl) {
    fullChoiceNoteEl.textContent =
      travelCharge > 0
        ? `Pay ${formatInr(totalPrice)} now (100% including ${formatInr(travelCharge)} travel cost). No balance will remain.`
        : `Pay ${formatInr(totalPrice)} now (100%). No balance will remain.`;
  }
  if (eventLocationSubmitBtn) {
    eventLocationSubmitBtn.disabled = false;
    eventLocationSubmitBtn.textContent = "Continue to payment";
  }
}

function getLocationFieldsFromForm() {
  const pinCode = String(
    document.getElementById("event-pincode")?.value || "",
  ).trim();
  const locality = String(
    document.getElementById("event-locality")?.value || "",
  ).trim();
  const district = String(
    document.getElementById("event-district")?.value || "",
  ).trim();
  const state = String(
    document.getElementById("event-state")?.value || "",
  ).trim();
  return { pinCode, locality, district, state };
}

async function runLocationCheck() {
  const { pinCode, locality, district, state } = getLocationFieldsFromForm();
  const hasValidPin = /^[1-9][0-9]{5}$/.test(pinCode);

  if (!hasValidPin) {
    activeLocationCheck = null;
    setTravelStatusUI(
      "",
      "Enter your 6-digit PIN code to check service availability. Travel within 25 km is free; beyond 25 km is ₹12.50/km each way (up to 200 km).",
    );
    updateTravelBreakdownUI(null);
    return null;
  }

  const seq = ++locationCheckSequence;
  setTravelStatusUI(
    "loading",
    "Checking service availability and travel distance…",
  );
  if (eventLocationSubmitBtn) {
    eventLocationSubmitBtn.disabled = true;
    eventLocationSubmitBtn.textContent = "Checking location…";
  }

  try {
    const response = await fetch(`${BOOKING_API_BASE}/check-location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: activeBookingPackage?._id,
        pinCode,
        locality,
        district,
        state,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (seq !== locationCheckSequence) return activeLocationCheck;

    if (!response.ok || !payload?.data) {
      throw new Error(
        payload?.message || "Unable to verify this location right now.",
      );
    }

    const result = payload.data;
    activeLocationCheck = {
      ...result,
      checkedKey: `${pinCode}|${locality}|${district}|${state}`,
    };

    if (!result.available) {
      setTravelStatusUI(
        "unavailable",
        result.message || "We are not currently available in this location.",
      );
    } else if (result.tier === "free") {
      setTravelStatusUI(
        "free",
        result.message ||
          "Within our 25 km free travel range. No travel cost applies.",
      );
    } else {
      setTravelStatusUI(
        "chargeable",
        result.message || "Travel charges apply for this location.",
      );
    }

    updateTravelBreakdownUI(result);
    if (eventLocationFeedback) eventLocationFeedback.textContent = "";
    return activeLocationCheck;
  } catch (error) {
    if (seq !== locationCheckSequence) return activeLocationCheck;
    activeLocationCheck = null;
    setTravelStatusUI(
      "unavailable",
      error.message || "Unable to check location right now. Please try again.",
    );
    if (eventLocationSubmitBtn) {
      eventLocationSubmitBtn.disabled = false;
      eventLocationSubmitBtn.textContent = "Continue to payment";
    }
    return null;
  }
}

function scheduleLocationCheck() {
  clearTimeout(locationCheckDebounceTimer);
  const { pinCode } = getLocationFieldsFromForm();
  if (!/^[1-9][0-9]{5}$/.test(pinCode)) {
    activeLocationCheck = null;
    setTravelStatusUI(
      "",
      "Enter your 6-digit PIN code to check service availability. Travel within 25 km is free; beyond 25 km is ₹12.50/km each way (up to 200 km).",
    );
    updateTravelBreakdownUI(null);
    return;
  }
  locationCheckDebounceTimer = window.setTimeout(() => {
    runLocationCheck();
  }, 450);
}

["event-pincode", "event-locality", "event-district", "event-state"].forEach(
  (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(
      id === "event-state" ? "change" : "input",
      scheduleLocationCheck,
    );
  },
);

function collectEventLocation(selectedPackage = null) {
  if (!eventLocationOverlay || !eventLocationForm) return Promise.resolve(null);
  activeBookingPackage = selectedPackage;
  activeLocationCheck = null;
  clearTimeout(locationCheckDebounceTimer);
  locationCheckSequence += 1;

  eventLocationForm.reset();
  if (eventLocationFeedback) eventLocationFeedback.textContent = "";
  setTravelStatusUI(
    "",
    "Enter your 6-digit PIN code to check service availability. Travel within 25 km is free; beyond 25 km is ₹12.50/km each way (up to 200 km).",
  );
  updateTravelBreakdownUI(null);

  eventLocationOverlay.classList.remove("hidden");
  eventLocationOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  document.getElementById("event-venue-name")?.focus();

  return new Promise((resolve) => {
    resolveEventLocation = resolve;
  });
}

function closeEventLocation(value = null) {
  clearTimeout(locationCheckDebounceTimer);
  eventLocationOverlay?.classList.add("hidden");
  eventLocationOverlay?.setAttribute("aria-hidden", "true");
  if (
    eventDateOverlay?.classList.contains("hidden") &&
    modal?.classList.contains("hidden") &&
    overlay?.classList.contains("hidden") &&
    (!authSuccessOverlay || authSuccessOverlay.classList.contains("hidden"))
  ) {
    document.body.classList.remove("no-scroll");
  }
  if (resolveEventLocation) {
    resolveEventLocation(value);
    resolveEventLocation = null;
  }
}

eventLocationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!eventLocationForm.reportValidity()) return;

  const formData = new FormData(eventLocationForm);
  const eventLocation = {
    venueName: String(formData.get("venueName") || "").trim(),
    addressLine: String(formData.get("addressLine") || "").trim(),
    locality: String(formData.get("locality") || "").trim(),
    district: String(formData.get("district") || "").trim(),
    state: String(formData.get("state") || "").trim(),
    pinCode: String(formData.get("pinCode") || "").trim(),
    landmark: String(formData.get("landmark") || "").trim(),
    country: "India",
    paymentChoice: String(formData.get("paymentChoice") || "advance"),
    advancePolicyAccepted: formData.get("advancePolicyAccepted") === "on",
  };

  if (!/^[1-9][0-9]{5}$/.test(eventLocation.pinCode)) {
    if (eventLocationFeedback)
      eventLocationFeedback.textContent =
        "Please enter a valid 6-digit Indian PIN code.";
    document.getElementById("event-pincode")?.focus();
    return;
  }

  const currentKey = `${eventLocation.pinCode}|${eventLocation.locality}|${eventLocation.district}|${eventLocation.state}`;
  let locationResult = activeLocationCheck;
  if (!locationResult || locationResult.checkedKey !== currentKey) {
    locationResult = await runLocationCheck();
  }

  if (!locationResult || !locationResult.available) {
    if (eventLocationFeedback) {
      eventLocationFeedback.textContent =
        locationResult?.message ||
        "We are not currently available in this location.";
    }
    return;
  }

  closeEventLocation(eventLocation);
});

document
  .getElementById("event-location-cancel")
  ?.addEventListener("click", () => closeEventLocation(null));
eventLocationOverlay?.addEventListener("click", (event) => {
  if (event.target === eventLocationOverlay) closeEventLocation(null);
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    eventLocationOverlay &&
    !eventLocationOverlay.classList.contains("hidden")
  ) {
    closeEventLocation(null);
  }
});

function formatEventLocation(location) {
  if (!location || typeof location !== "object") return "";
  return [
    location.venueName,
    location.addressLine,
    location.locality,
    location.district,
    location.state,
    location.pinCode ? `PIN ${location.pinCode}` : "",
    location.landmark ? `Landmark: ${location.landmark}` : "",
    location.country || "India",
  ]
    .filter(Boolean)
    .join(", ");
}

const bookingBtns = document.querySelectorAll(".booking-btn");
const bookingFeedback = document.getElementById("booking-feedback");

function setBookingFeedback(message, type = "") {
  if (!bookingFeedback) return;
  bookingFeedback.textContent = message;
  bookingFeedback.classList.toggle("is-visible", Boolean(message));
  bookingFeedback.classList.toggle("is-success", type === "success");
  bookingFeedback.classList.toggle("is-error", type === "error");
  bookingFeedback.classList.toggle("is-info", type === "info");

  if (message) {
    bookingFeedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

const receiptOverlay = document.getElementById("booking-receipt-overlay");
let currentReceiptText = "";
let currentReceiptBookingId = "";
let currentReceiptPdfPromise = null;

function formatReceiptDate(isoDate) {
  if (!isoDate) return "—";
  const parts = String(isoDate).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return String(isoDate);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

function setReceiptValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || "—";
}

async function fetchReceiptPdfBlob(bookingId) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Please sign in again to download your receipt.");
  const response = await fetch(
    `${BOOKING_API_BASE}/${encodeURIComponent(bookingId)}/receipt.pdf`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Unable to generate the PDF receipt.");
  }
  const blob = await response.blob();
  if (blob.type !== "application/pdf" && blob.size < 100) {
    throw new Error("The server did not return a valid PDF receipt.");
  }
  return blob;
}

function getCurrentReceiptPdf() {
  if (!currentReceiptBookingId)
    throw new Error("The booking reference is not available for this receipt.");
  if (!currentReceiptPdfPromise)
    currentReceiptPdfPromise = fetchReceiptPdfBlob(currentReceiptBookingId);
  return currentReceiptPdfPromise;
}

function downloadReceiptBlob(blob) {
  const fileName = `Radha-Rani-Studio-Receipt-${String(currentReceiptBookingId).slice(-12)}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function showBookingReceipt({
  booking,
  packageName,
  eventDate,
  amountPaise,
  paymentId,
  receiptEmail,
  receiptWhatsapp,
}) {
  currentReceiptBookingId = booking?._id || booking?.id || "";
  currentReceiptPdfPromise = currentReceiptBookingId
    ? fetchReceiptPdfBlob(currentReceiptBookingId)
    : null;
  if (currentReceiptPdfPromise)
    currentReceiptPdfPromise.catch(() => {
      currentReceiptPdfPromise = null;
    });
  const userName =
    localStorage.getItem("userName") || booking?.user?.name || "Customer";
  const userEmail =
    localStorage.getItem("userEmail") || booking?.user?.email || "Not provided";
  const receiptId =
    booking?._id || booking?.id || paymentId || `RRS-${Date.now()}`;
  const amount = Number.isFinite(Number(amountPaise))
    ? formatInr(Number(amountPaise) / 100)
    : "Amount unavailable";
  const issuedAt = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  setReceiptValue("receipt-amount", amount);
  setReceiptValue("receipt-number", String(receiptId));
  setReceiptValue("receipt-customer", userName);
  setReceiptValue("receipt-email", userEmail);
  setReceiptValue(
    "receipt-package",
    packageName || booking?.package?.name || "Photography package",
  );

  const packageTotal = Number(booking?.price || 0);
  const travelCharge = Number(booking?.travelCharge || 0);
  const hasTravelDistance =
    booking?.travelDistanceKm !== undefined &&
    booking?.travelDistanceKm !== null &&
    Number.isFinite(Number(booking.travelDistanceKm));
  const basePackagePrice =
    booking?.basePackagePrice !== undefined &&
    booking?.basePackagePrice !== null
      ? Number(booking.basePackagePrice)
      : Math.max(packageTotal - travelCharge, 0);

  const baseRow = document.getElementById("receipt-base-price-row");
  const travelRow = document.getElementById("receipt-travel-row");
  const showBreakdown = travelCharge > 0 || hasTravelDistance;
  baseRow?.classList.toggle("hidden", !showBreakdown);
  travelRow?.classList.toggle("hidden", !showBreakdown);
  if (showBreakdown) {
    setReceiptValue("receipt-base-price", formatInr(basePackagePrice));
    setReceiptValue(
      "receipt-travel-charge",
      travelCharge > 0
        ? `${formatInr(travelCharge)}${hasTravelDistance ? ` (${booking.travelDistanceKm} km one-way)` : ""}`
        : `₹0 (Free within 25 km${hasTravelDistance ? ` · ${booking.travelDistanceKm} km` : ""})`,
    );
  }

  const paidAmount = Number.isFinite(Number(amountPaise))
    ? Number(amountPaise) / 100
    : Number(booking?.amountPaid || booking?.advanceAmount || 0);
  const balanceDue = Number(
    booking?.balanceDue ?? Math.max(packageTotal - paidAmount, 0),
  );
  setReceiptValue(
    "receipt-package-total",
    packageTotal ? formatInr(packageTotal) : "—",
  );
  setReceiptValue("receipt-balance-due", formatInr(balanceDue));
  const paymentChoice =
    booking?.initialPaymentChoice || (balanceDue <= 0 ? "full" : "advance");
  const receiptPaymentLabel =
    paymentChoice === "full"
      ? "Full booking payment received"
      : "20% booking advance received";
  const receiptPaymentStatus =
    balanceDue <= 0 ? "FULLY PAID" : "20% ADVANCE PAID";
  setReceiptValue("receipt-amount-label", receiptPaymentLabel);
  setReceiptValue("receipt-payment-status", receiptPaymentStatus);
  setReceiptValue(
    "receipt-event-date",
    formatReceiptDate(booking?.eventDate || eventDate),
  );
  const venueDetails =
    formatEventLocation(booking?.eventLocation) ||
    booking?.venue ||
    "To be confirmed with the studio";
  setReceiptValue("receipt-venue", venueDetails);
  setReceiptValue(
    "receipt-payment-id",
    paymentId || booking?.razorpayPaymentId || "—",
  );
  setReceiptValue("receipt-issued-at", issuedAt);

  currentReceiptText = [
    "RADHA RANI STUDIO - PAYMENT RECEIPT",
    `Thank you, ${userName}, for choosing Radha Rani Studio. Your PDF receipt is ready.`,
    `Receipt number: ${receiptId}`,
    `Customer: ${userName}`,
    `Email: ${userEmail}`,
    `Package: ${packageName || booking?.package?.name || "Photography package"}`,
    ...(showBreakdown
      ? [
          `Base package price: ${formatInr(basePackagePrice)}`,
          `Travel cost: ${formatInr(travelCharge)}`,
        ]
      : []),
    `Total booking price: ${packageTotal ? formatInr(packageTotal) : "Amount unavailable"}`,
    `Event date: ${formatReceiptDate(booking?.eventDate || eventDate)}`,
    `Event venue: ${venueDetails}`,
    `${receiptPaymentLabel}: ${amount}`,
    `Remaining balance: ${formatInr(balanceDue)}`,
    `Payment ID: ${paymentId || booking?.razorpayPaymentId || "—"}`,
    `Payment status: ${receiptPaymentStatus}`,
    `Receipt issued: ${issuedAt}`,
    "Contact: +91 7458006822 | radharanistudio2026@gmail.com",
  ].join("\n");

  const emailFeedback = document.getElementById("receipt-email-feedback");
  if (emailFeedback) {
    let deliveryMessage = "";
    if (receiptEmail?.sent) {
      deliveryMessage = `A PDF receipt has been emailed to ${receiptEmail.email || userEmail}.`;
    } else if (receiptEmail?.reason === "no_customer_email") {
      deliveryMessage =
        "No email address is recorded for this account. You can still download or share the PDF.";
    } else if (receiptEmail && !receiptEmail.sent) {
      deliveryMessage =
        "Payment is confirmed. Email delivery could not be completed; please download or share the PDF, or contact the studio.";
    } else {
      deliveryMessage =
        "A PDF receipt will be emailed to your registered address when email delivery is configured.";
    }
    if (receiptWhatsapp?.sent) {
      deliveryMessage += " A copy has also been sent to your WhatsApp.";
    }
    emailFeedback.textContent = deliveryMessage;
  }

  if (receiptOverlay) {
    receiptOverlay.classList.remove("hidden");
    receiptOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    document.getElementById("booking-receipt-print")?.focus();
  }
}

function closeBookingReceipt() {
  receiptOverlay?.classList.add("hidden");
  receiptOverlay?.setAttribute("aria-hidden", "true");
  if (
    eventDateOverlay?.classList.contains("hidden") &&
    modal?.classList.contains("hidden") &&
    overlay?.classList.contains("hidden") &&
    authSuccessOverlay?.classList.contains("hidden")
  ) {
    document.body.classList.remove("no-scroll");
  }
}

document
  .getElementById("booking-receipt-close")
  ?.addEventListener("click", closeBookingReceipt);
receiptOverlay?.addEventListener("click", (event) => {
  if (event.target === receiptOverlay) closeBookingReceipt();
});
document
  .getElementById("booking-receipt-print")
  ?.addEventListener("click", () => window.print());
document
  .getElementById("booking-receipt-share")
  ?.addEventListener("click", async () => {
    const feedback = document.getElementById("receipt-share-feedback");
    const shareButton = document.getElementById("booking-receipt-share");
    try {
      if (feedback) feedback.textContent = "Preparing your PDF receipt…";
      if (shareButton) shareButton.disabled = true;
      const blob = await getCurrentReceiptPdf();
      const fileName = `Radha-Rani-Studio-Receipt-${String(currentReceiptBookingId).slice(-12)}.pdf`;

      if (typeof File !== "undefined") {
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: "Radha Rani Studio - Payment Receipt",
              text: "Thank you for choosing Radha Rani Studio. Please find your payment receipt attached.",
              files: [file],
            });
            if (feedback) feedback.textContent = "Your PDF receipt was shared.";
            return;
          } catch (shareError) {
            if (shareError?.name === "AbortError") return;
          }
        }
      }

      downloadReceiptBlob(blob);
      if (feedback)
        feedback.textContent =
          "Your PDF receipt has been downloaded. You can now attach it in WhatsApp, Gmail or another app.";
    } catch (error) {
      if (error?.name !== "AbortError" && feedback)
        feedback.textContent =
          error.message ||
          "Unable to share the PDF. Please use Print / Save PDF instead.";
    } finally {
      if (shareButton) shareButton.disabled = false;
    }
  });

document
  .getElementById("booking-receipt-download")
  ?.addEventListener("click", async () => {
    const feedback = document.getElementById("receipt-share-feedback");
    const downloadButton = document.getElementById("booking-receipt-download");
    try {
      if (downloadButton) downloadButton.disabled = true;
      const blob = await getCurrentReceiptPdf();
      downloadReceiptBlob(blob);
      if (feedback)
        feedback.textContent = "Your PDF receipt has been downloaded.";
    } catch (error) {
      if (feedback)
        feedback.textContent =
          error.message || "Unable to download the PDF receipt.";
    } finally {
      if (downloadButton) downloadButton.disabled = false;
    }
  });
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    receiptOverlay &&
    !receiptOverlay.classList.contains("hidden")
  )
    closeBookingReceipt();
});

function setBookingButtonBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent.trim();
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Please wait...";
  } else {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

bookingBtns.forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBookingFeedback("");

    const token = localStorage.getItem("token");
    if (!token) {
      setAuthFeedback(
        loginFeedback,
        "Please log in to continue with your booking. After signing in, select your package again.",
        "error",
      );
      switchAuthForm(false);
      openModal();
      document.getElementById("email")?.focus();
      return;
    }

    const eventDate = await selectEventDate();
    if (!eventDate) return;

    let selectedPackage;
    setBookingButtonBusy(btn, true);
    try {
      const packages = await loadAvailablePackages();
      selectedPackage = packages.find(
        (pkg) => pkg.name === btn.dataset.packageName,
      );
      if (!selectedPackage) {
        throw new Error(
          "We couldn't find the selected package. Please refresh the page and try again.",
        );
      }
    } catch (err) {
      setBookingFeedback(err.message, "error");
      setBookingButtonBusy(btn, false);
      return;
    }
    setBookingButtonBusy(btn, false);

    const eventLocationWithPolicy = await collectEventLocation(selectedPackage);
    if (!eventLocationWithPolicy) return;
    const { advancePolicyAccepted, paymentChoice, ...eventLocation } =
      eventLocationWithPolicy;

    setBookingButtonBusy(btn, true);
    setBookingFeedback("Preparing your booking. Please wait...", "info");
    let razorpayOpened = false;

    try {
      const activePackageId = selectedPackage._id;
      const orderResponse = await fetch(
        `${BOOKING_API_BASE}/create-order/${activePackageId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eventDate,
            eventLocation,
            advancePolicyAccepted,
            paymentChoice,
          }),
        },
      );

      const orderData = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        if (orderResponse.status === 401 || orderResponse.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userName");
          localStorage.removeItem("userEmail");
          renderAccountNavigation();
          setAuthFeedback(
            loginFeedback,
            "Your session may have expired. Please log in again to continue booking.",
            "error",
          );
          switchAuthForm(false);
          openModal();
          return;
        }
        throw new Error(
          orderData.message ||
            "We couldn't start your booking. Please try again.",
        );
      }

      const amountDueNow = Number(
        orderData.payment?.amountDueNow ?? orderData.order.amount / 100,
      );
      const travelSummary =
        Number(orderData.payment?.travelCharge || 0) > 0
          ? ` (includes ${formatInr(orderData.payment.travelCharge)} travel cost)`
          : "";
      const paymentChoiceLabel =
        paymentChoice === "full"
          ? "Full booking payment"
          : "20% booking advance";
      setBookingFeedback(
        `${paymentChoiceLabel}: ${formatInr(amountDueNow)}${travelSummary}. Complete payment within ${orderData.payment?.holdMinutes || 30} minutes to reserve this date.`,
        "info",
      );

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Radha Rani Studio",
        description: `${paymentChoice === "full" ? "Full booking payment" : "20% booking advance"} for ${selectedPackage.name}`,
        image: "images/favicon-transparent.png",
        order_id: orderData.order.id,
        handler: async function (response) {
          setBookingFeedback(
            "Payment received. Verifying your payment securely...",
            "info",
          );
          try {
            const verifyResponse = await fetch(`${BOOKING_API_BASE}/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json().catch(() => ({}));
            if (verifyResponse.ok) {
              const verifiedBooking =
                verifyData?.booking || orderData?.booking || {};
              setBookingFeedback(
                verifiedBooking?.balanceDue <= 0
                  ? "Full payment verified successfully. Your receipt is ready to view, print, or share."
                  : "20% booking advance verified successfully. Your receipt is ready to view, print, or share.",
                "success",
              );
              showBookingReceipt({
                booking: verifiedBooking,
                packageName: selectedPackage.name,
                eventDate,
                amountPaise: orderData?.order?.amount,
                paymentId: response.razorpay_payment_id,
                receiptEmail: verifyData?.receiptEmail,
                receiptWhatsapp: verifyData?.receiptWhatsapp,
              });
            } else {
              setBookingFeedback(
                verifiedBooking?.balanceDue <= 0
                  ? "Payment confirmed in full — your celebration date is reserved. Your official receipt is open and ready to view, print, or share."
                  : "20% booking advance confirmed — your celebration date is reserved. Your official receipt is open and ready to view, print, or share.",
                "success",
              );
            }
          } catch (err) {
            console.error("Verification Error:", err);
            setBookingFeedback(
              "We couldn't verify your payment right now. Please contact Radha Rani Studio before attempting another payment.",
              "error",
            );
          } finally {
            setBookingButtonBusy(btn, false);
          }
        },
        modal: {
          ondismiss: function () {
            setBookingFeedback(
              `The payment window was closed. No advance was verified. This temporary date hold will expire automatically within ${orderData.payment?.holdMinutes || 30} minutes.`,
              "info",
            );
            setBookingButtonBusy(btn, false);
          },
        },
        prefill: {
          name: localStorage.getItem("userName") || "",
          email: localStorage.getItem("userEmail") || "",
        },
        theme: {
          color: "#312418",
        },
      };

      const rzpWindow = new Razorpay(options);
      razorpayOpened = true;
      rzpWindow.open();
    } catch (err) {
      console.error("Checkout error flow capture:", err);
      setBookingFeedback(
        err.message ||
          "We couldn't start your booking. Please check your connection and try again.",
        "error",
      );
    } finally {
      if (!razorpayOpened) setBookingButtonBusy(btn, false);
    }
  });
});

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;
    const passwordInput = document.getElementById(targetId);

    if (!passwordInput) return;

    const isPasswordHidden = passwordInput.type === "password";

    // Toggle password visibility
    passwordInput.type = isPasswordHidden ? "text" : "password";

    // Update the eye icon
    const eyeIcon = button.querySelector("i");

    if (eyeIcon) {
      eyeIcon.classList.toggle("fa-eye", !isPasswordHidden);
      eyeIcon.classList.toggle("fa-eye-slash", isPasswordHidden);
    }

    // Update accessibility state
    button.setAttribute("aria-pressed", String(isPasswordHidden));
    button.setAttribute(
      "aria-label",
      isPasswordHidden ? "Hide password" : "Show password",
    );
  });
});
