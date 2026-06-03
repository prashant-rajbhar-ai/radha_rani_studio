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

///////////////////////////////

// LOGIC FOR PLAYING VIDEO IN A DIV
///////////////////////////////
// VIDEO SYSTEM (FINAL VERSION)

// Select all video containers
const videoContainers = document.querySelectorAll(".section-video .video");

videoContainers.forEach((container) => {
  const video = container.querySelector("video");
  const playBtn = container.querySelector(".custom-play-btn");

  // Hide controls initially
  video.controls = false;

  // PLAY BUTTON CLICK
  playBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const sources = video.querySelectorAll("source");

    // 🔥 Ensure video is loaded (important for lazy loading)
    if (video.readyState === 0) {
      sources.forEach((source) => {
        if (!source.src) {
          source.src = source.dataset.src;
        }
      });
      video.load();
    }

    // 🔥 Pause all other videos (pro UX)
    document.querySelectorAll(".section-video video").forEach((v) => {
      if (v !== video) {
        v.pause();
        v.controls = false;

        const otherBtn = v.closest(".video").querySelector(".custom-play-btn");

        otherBtn.style.opacity = "1";
        otherBtn.style.pointerEvents = "auto";
      }
    });

    // 🔥 Play current video safely
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

// script.js

// 1. Select the launch message and the EXISTING overlay
// const launchModal = document.querySelector(".open-launch-modal");
// const globalOverlay = document.querySelector(".modal-overlay"); // Using your existing overlay
// const bookingBtns = document.querySelectorAll(".booking-btn");
// const closeLaunchBtn = document.querySelector(".close-launch-modal");

// // 2. Open both when "Book Now" is clicked
// bookingBtns.forEach((btn) => {
//   btn.addEventListener("click", (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     launchModal.classList.remove("hidden");
//     globalOverlay.classList.remove("hidden"); // Reusing existing overlay
//     body.classList.add("no-scroll");
//   });
// });

// // 3. Close both when "Got it!" is clicked
// closeLaunchBtn.addEventListener("click", () => {
//   launchModal.classList.add("hidden");
//   globalOverlay.classList.add("hidden"); // Reusing existing overlay
//   body.classList.remove("no-scroll");
// });

////////////////////////////////////////// SMOOTH SCROLLING

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
// Form submission
////////////////////////////////////////////
// Form submission (Fixed for Netlify)
const contactForm = document.querySelector(".contact-form form");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // Important: Netlify needs the form-name included in the body
      body: new URLSearchParams(formData).toString(),
    })
      .then((response) => {
        if (response.ok) {
          alert("Message sent successfully!");
          contactForm.reset();
        } else {
          // Log status to help debug
          console.error("Server response:", response.status);
          throw new Error("Form submission failed");
        }
      })
      .catch((error) => alert("Error: " + error));
  });
}

////////////////////////////////////////////
// BACKEND AUTHENTICATION INTEGRATION
////////////////////////////////////////////

const loginForm = document.querySelector(".modal-form form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevents the page from reloading on form submission

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      // Send a POST request to your local Node backend endpoint
      const response = await fetch("http://localhost:3000/api/v1/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Login successful! Welcome to Radha Rani Studio.");

        // 1. Store the secret JWT token securely inside the browser storage
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", data.data.user.role);

        // 2. Clear input fields and close the modal automatically
        loginForm.reset();
        closeModal();

        // 3. Update navbar UI based on login status if necessary
        console.log("Logged in user token:", data.token);
      } else {
        // Displays error messages generated from your backend errorController
        alert(data.message || "Incorrect email or password.");
      }
    } catch (err) {
      alert(
        "Cannot connect to the authentication server. Ensure backend is running.",
      );
      console.error("Login Error:", err);
    }
  });
}

////////////////////////////////////////////
// LIVE RAZORPAY FRONTEND GATEWAY CHECKOUT
////////////////////////////////////////////

const bookingBtns = document.querySelectorAll('.booking-btn');

bookingBtns.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Enforce that a user session must be authenticated to check out
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in first via the Client Gallery to initiate a studio booking.');
      openModal(); // Triggers your built-in sliding login window panel
      return;
    }

    // 2. Request targeted shoot date parameter
    const eventDate = prompt('Please enter your event date (YYYY-MM-DD):');
    if (!eventDate) return; 

    try {
      // 3. Programmatically capture your live package from your active database collection catalog
      const pkgResponse = await fetch('http://localhost:3000/api/v1/packages');
      const pkgData = await pkgResponse.json();
      
      if (!pkgData.data.packages || pkgData.data.packages.length === 0) {
        alert('No photography services found in database. Create a service via Postman admin first.');
        return;
      }
      
      // Auto-targets the live package you generated inside MongoDB Atlas
      const activePackageId = pkgData.data.packages[0]._id;

      // 4. Contact your local Node application port to mint an order token code
      const orderResponse = await fetch(`http://localhost:3000/api/v1/bookings/create-order/${activePackageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventDate })
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.message || 'Failed to establish database transaction session.');
      }

      // 5. Build official Razorpay modal display configuration window
      const options = {
        key: orderData.key_id, // Safely delivered from environment config
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Radha Rani Studio',
        description: 'Professional Wedding Photography & Videography Booking',
        image: 'images/favicon-transparent.png',
        order_id: orderData.order.id, // Links transaction UI container directly to backend record
        handler: async function (response) {
          // This loop auto-fires when authorization completes on screen
          try {
            const verifyResponse = await fetch('http://localhost:3000/api/v1/bookings/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok) {
              alert('Payment Successful! Your photoshoot event date has been locked in for Radha Rani Studio.');
              window.location.reload(); 
            } else {
              alert(verifyData.message || 'Signature encryption mismatch error.');
            }
          } catch (err) {
            console.error('Verification Error:', err);
            alert('Internal server authentication failure during receipt validation.');
          }
        },
        prefill: {
          name: 'Client Name',
          email: 'client@example.com'
        },
        theme: {
          color: '#312418' // Matches your exact brand dark luxury theme hex token custom property
        }
      };

      // 6. Launch the official secure overlay payment overlay container interface
      const rzpWindow = new Razorpay(options);
      rzpWindow.open();

    } catch (err) {
      console.error('Checkout error flow capture:', err);
      alert(err.message || 'Failed to launch transaction gateway check connection ports.');
    }
  });
});
