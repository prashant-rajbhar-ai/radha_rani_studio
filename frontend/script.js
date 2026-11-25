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
createSlider(".feedbacks", ".feed", 20);

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
    const originalButtonText = submitButton ? submitButton.textContent : "Submit";
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

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterLink = document.getElementById("show-register");
const showLoginLink = document.getElementById("show-login");

const loginFeedback = document.getElementById("login-feedback");
const registerFeedback = document.getElementById("register-feedback");
const authSuccessOverlay = document.getElementById("auth-success-overlay");
const authSuccessTitle = document.getElementById("auth-success-title");
const authSuccessDescription = document.getElementById("auth-success-description");
const authSuccessClose = document.getElementById("auth-success-close");
const authSuccessContinue = document.getElementById("auth-success-continue");

const desktopLoginButton = document.getElementById("desktop-login-button");
const desktopAccountTrigger = document.getElementById("desktop-account-trigger");
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
  const duplicateEmailAction = document.getElementById("duplicate-email-login-action");
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
  if (modal?.classList.contains("hidden") && overlay?.classList.contains("hidden")) {
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && authSuccessOverlay && !authSuccessOverlay.classList.contains("hidden")) {
    closeAuthSuccess();
  }
});

// LOGIN
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthFeedback(loginFeedback, "");

  const submitButton = loginForm.querySelector('button[type="submit"]');
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setAuthFeedback(
        loginFeedback,
        data.message || "We couldn't sign you in. Check your email and password, then try again.",
      );
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userRole", data.data.user.role);
    localStorage.setItem("userName", data.data.user.name || "Customer");
    localStorage.setItem("userEmail", data.data.user.email || email);
    renderAccountNavigation();

    loginForm.reset();
    switchAuthForm(false);
    closeModal();
    showAuthSuccess("Welcome back!", "You have successfully logged in to Radha Rani Studio.");
  } catch (error) {
    console.error("Login error:", error);
    setAuthFeedback(loginFeedback, "We couldn't connect to the server. Please check your connection and try again.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  }
});

// REGISTRATION
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthFeedback(registerFeedback, "");

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const passwordConfirm = document.getElementById("register-password-confirm").value;
  const passwordMessage = document.getElementById("password-match-message");

  if (password !== passwordConfirm) {
    if (passwordMessage) {
      passwordMessage.textContent = "Passwords do not match. Please check both fields.";
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
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, passwordConfirm }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Convert technical backend errors into clear, user-friendly messages.
      const backendMessage = String(data.message || "");
      const isDuplicateEmail =
        response.status === 409 ||
        /E11000|duplicate key|email_1 dup key|already exists/i.test(backendMessage);

      if (isDuplicateEmail) {
        setAuthFeedback(
          registerFeedback,
          "An account with this email address already exists. Please log in to your existing account, or use a different email address to create a new account.",
        );

        // Offer a direct path to the login form without showing a browser alert.
        let loginAction = document.getElementById("duplicate-email-login-action");
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
    switchAuthForm(false);
    closeModal();
    showAuthSuccess("Account created!", "Your Radha Rani Studio account is ready. You are now logged in.");
  } catch (error) {
    console.error("Registration error:", error);
    setAuthFeedback(registerFeedback, "We couldn't connect to the server. Please check your connection and try again.");
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
    // Keep this as a placeholder hash link until the separate gallery page is built.
    // Stop the mobile drawer's delegated navigation handler from treating "#" as a section ID.
    event.stopPropagation();
    mobileNav?.classList.remove("openDrawer");
    bar1?.classList.remove("animateBar1");
    bar2?.classList.remove("animateBar2");
    bar3?.classList.remove("animateBar3");
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
const eventDateSelectedLabel = document.getElementById("event-date-selected-label");
const eventDateMonth = document.getElementById("event-date-month");
const eventDateYear = document.getElementById("event-date-year");
const eventDateDays = document.getElementById("event-date-days");
let calendarViewDate = new Date();
let calendarSelectedDate = null;
let resolveEventDate = null;

const calendarMonthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
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
        weekday: "short", month: "short", day: "numeric"
      })
    : "Select a date";
}

function renderEventCalendar() {
  if (!eventDateMonth || !eventDateYear || !eventDateDays) return;
  eventDateMonth.innerHTML = calendarMonthNames.map((name, index) =>
    `<option value="${index}">${name}</option>`
  ).join("");
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
    calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1
  ).getDay();
  const daysInMonth = new Date(
    calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0
  ).getDate();

  for (let blank = 0; blank < firstWeekday; blank++) {
    const empty = document.createElement("span");
    empty.className = "event-date-empty";
    empty.setAttribute("aria-hidden", "true");
    eventDateDays.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(
      calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day
    );
    const button = document.createElement("button");
    button.type = "button";
    button.className = "event-date-day";
    button.textContent = String(day);
    button.setAttribute("aria-label", date.toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    }));
    if (date < calendarToday) {
      button.disabled = true;
      button.classList.add("is-past");
    }
    if (calendarSelectedDate && dateToISO(date) === dateToISO(calendarSelectedDate)) {
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
  if (typeof closeAuthSuccess === "function" &&
      authSuccessOverlay?.classList.contains("hidden") &&
      modal?.classList.contains("hidden") && overlay?.classList.contains("hidden")) {
    document.body.classList.remove("no-scroll");
  } else if (!authSuccessOverlay || authSuccessOverlay.classList.contains("hidden")) {
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
  const previous = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
  if (previous.getFullYear() < calendarToday.getFullYear() ||
      (previous.getFullYear() === calendarToday.getFullYear() && previous.getMonth() < calendarToday.getMonth())) return;
  calendarViewDate = previous;
  renderEventCalendar();
});
document.getElementById("event-date-next")?.addEventListener("click", () => {
  if (calendarViewDate.getFullYear() >= calendarToday.getFullYear() + 10 &&
      calendarViewDate.getMonth() === 11) return;
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
  renderEventCalendar();
});
document.getElementById("event-date-edit")?.addEventListener("click", () => eventDateMonth?.focus());
document.getElementById("event-date-cancel")?.addEventListener("click", () => closeEventDatePicker(null));
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
  if (event.key === "Escape" && eventDateOverlay && !eventDateOverlay.classList.contains("hidden")) {
    closeEventDatePicker(null);
  }
});


// Booking flow with branded inline feedback. Payment/order API logic is preserved.
const bookingBtns = document.querySelectorAll(".booking-btn");
const bookingFeedback = document.getElementById("booking-feedback");

function setBookingFeedback(message, type = "") {
  if (!bookingFeedback) return;
  bookingFeedback.textContent = message;
  bookingFeedback.classList.toggle("is-visible", Boolean(message));
  bookingFeedback.classList.toggle("is-success", type === "success");
  bookingFeedback.classList.toggle("is-error", type === "error");
  bookingFeedback.classList.toggle("is-info", type === "info");
}

const receiptOverlay = document.getElementById("booking-receipt-overlay");
let currentReceiptText = "";

function formatReceiptDate(isoDate) {
  if (!isoDate) return "—";
  const parts = String(isoDate).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return String(isoDate);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });
}

function setReceiptValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || "—";
}

function showBookingReceipt({ booking, packageName, eventDate, amountPaise, paymentId }) {
  const userName = localStorage.getItem("userName") || booking?.user?.name || "Customer";
  const userEmail = localStorage.getItem("userEmail") || booking?.user?.email || "Not provided";
  const receiptId = booking?._id || booking?.id || paymentId || `RRS-${Date.now()}`;
  const amount = Number.isFinite(Number(amountPaise))
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(amountPaise) / 100)
    : "Amount unavailable";
  const issuedAt = new Date().toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
  });

  setReceiptValue("receipt-amount", amount);
  setReceiptValue("receipt-number", String(receiptId));
  setReceiptValue("receipt-customer", userName);
  setReceiptValue("receipt-email", userEmail);
  setReceiptValue("receipt-package", packageName || booking?.package?.name || "Photography package");
  setReceiptValue("receipt-event-date", formatReceiptDate(booking?.eventDate || eventDate));
  setReceiptValue("receipt-venue", booking?.venue || "To be confirmed with the studio");
  setReceiptValue("receipt-payment-id", paymentId || booking?.razorpayPaymentId || "—");
  setReceiptValue("receipt-issued-at", issuedAt);

  currentReceiptText = [
    "RADHA RANI STUDIO — PAYMENT RECEIPT",
    `Receipt number: ${receiptId}`,
    `Customer: ${userName}`,
    `Email: ${userEmail}`,
    `Package: ${packageName || booking?.package?.name || "Photography package"}`,
    `Event date: ${formatReceiptDate(booking?.eventDate || eventDate)}`,
    `Venue: ${booking?.venue || "To be confirmed with the studio"}`,
    `Amount paid: ${amount}`,
    `Payment ID: ${paymentId || booking?.razorpayPaymentId || "—"}`,
    "Payment status: PAID",
    `Receipt issued: ${issuedAt}`,
    "Contact: +91 7458006822 | radharanistudio2026@gmail.com"
  ].join("\n");

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
  if (eventDateOverlay?.classList.contains("hidden") && modal?.classList.contains("hidden") && overlay?.classList.contains("hidden") && authSuccessOverlay?.classList.contains("hidden")) {
    document.body.classList.remove("no-scroll");
  }
}

document.getElementById("booking-receipt-close")?.addEventListener("click", closeBookingReceipt);
receiptOverlay?.addEventListener("click", (event) => {
  if (event.target === receiptOverlay) closeBookingReceipt();
});
document.getElementById("booking-receipt-print")?.addEventListener("click", () => window.print());
document.getElementById("booking-receipt-share")?.addEventListener("click", async () => {
  const feedback = document.getElementById("receipt-share-feedback");
  try {
    if (navigator.share) {
      await navigator.share({ title: "Radha Rani Studio — Payment Receipt", text: currentReceiptText });
      if (feedback) feedback.textContent = "Receipt shared.";
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(currentReceiptText);
      if (feedback) feedback.textContent = "Receipt details copied. You can paste them into WhatsApp or another app.";
    } else {
      if (feedback) feedback.textContent = "Use Print / Save PDF to save a copy of your receipt.";
    }
  } catch (error) {
    if (error?.name !== "AbortError" && feedback) feedback.textContent = "Sharing was unavailable. Use Print / Save PDF to save your receipt.";
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && receiptOverlay && !receiptOverlay.classList.contains("hidden")) closeBookingReceipt();
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

    setBookingButtonBusy(btn, true);
    setBookingFeedback("Preparing your booking. Please wait...", "info");

    try {
      const pkgResponse = await fetch(
        "https://radha-rani-studio.onrender.com/api/v1/packages",
      );
      if (!pkgResponse.ok) {
        throw new Error("We couldn't load the photography packages. Please try again shortly.");
      }
      const pkgData = await pkgResponse.json();
      const packages = pkgData?.data?.packages;

      if (!Array.isArray(packages) || packages.length === 0) {
        setBookingFeedback(
          "Our packages are temporarily unavailable. Please try again later or contact us for assistance.",
          "error",
        );
        return;
      }

      const selectedPackage = packages.find(
        (pkg) => pkg.name === btn.dataset.packageName,
      );

      if (!selectedPackage) {
        throw new Error("We couldn't find the selected package. Please refresh the page and try again.");
      }

      const activePackageId = selectedPackage._id;
      const orderResponse = await fetch(
        `https://radha-rani-studio.onrender.com/api/v1/bookings/create-order/${activePackageId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ eventDate }),
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
          orderData.message || "We couldn't start your booking. Please try again.",
        );
      }

      setBookingFeedback(
        "Your booking is ready. Complete the payment window to submit your booking.",
        "info",
      );

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Radha Rani Studio",
        description: "Professional Wedding Photography & Videography Booking",
        image: "images/favicon-transparent.png",
        order_id: orderData.order.id,
        handler: async function (response) {
          setBookingFeedback("Payment received. Verifying your payment securely...", "info");
          try {
            const verifyResponse = await fetch(
              "https://radha-rani-studio.onrender.com/api/v1/bookings/verify",
              {
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
              },
            );

            const verifyData = await verifyResponse.json().catch(() => ({}));
            if (verifyResponse.ok) {
              const verifiedBooking = verifyData?.booking || orderData?.booking || {};
              setBookingFeedback(
                "Payment verified successfully. Your receipt is ready to view, print, or share.",
                "success",
              );
              showBookingReceipt({
                booking: verifiedBooking,
                packageName: selectedPackage.name,
                eventDate,
                amountPaise: orderData?.order?.amount,
                paymentId: response.razorpay_payment_id,
              });
            } else {
              setBookingFeedback(
                verifyData.message || "We received your payment response but couldn't verify it yet. Please contact us before trying to pay again.",
                "error",
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
              "The payment window was closed. Your booking is not confirmed. You can select Book Now to try again.",
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
      rzpWindow.open();
    } catch (err) {
      console.error("Checkout error flow capture:", err);
      setBookingFeedback(
        err.message || "We couldn't start your booking. Please check your connection and try again.",
        "error",
      );
    } finally {
      // Razorpay can remain open after order creation; its callbacks re-enable the button.
      if (!window.Razorpay) setBookingButtonBusy(btn, false);
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
