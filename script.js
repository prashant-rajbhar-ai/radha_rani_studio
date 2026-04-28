'use strict';

const body = document.querySelector('body');
const hamburger = document.querySelector('.hamburger');
const navShadow = document.querySelector('.nav-shadow');
const bar1 = document.querySelector('.bar1');
const bar2 = document.querySelector('.bar2');
const bar3 = document.querySelector('.bar3');

const mobileNav = document.querySelector('.mobileNav');
const mobilelinks = document.querySelectorAll('.mobileNavLinks');

// For Adding functionality in Mobile Navbar
hamburger.addEventListener('click', () => {
  bar1.classList.toggle('animateBar1');
  bar2.classList.toggle('animateBar2');
  bar3.classList.toggle('animateBar3');
  mobileNav.classList.toggle('openDrawer');
  navShadow.classList.toggle('nav-shadow');
});

//NOTES 1 - Take notes from this section
mobilelinks.forEach(link => {
  link.addEventListener('click', e => {
    bar1.classList.remove('animateBar1');
    bar2.classList.remove('animateBar2');
    bar3.classList.remove('animateBar3');
    mobileNav.classList.remove('openDrawer');
  });
});

// //////////////////////////////////////////

const modal = document.querySelector('.modal');
const overlay = document.querySelector('.modal-overlay');
const btnCloseModal = document.querySelector('.close-modal');
const btnsOpenModal = document.querySelectorAll('.show-modal');

const openModal = function (e) {
  if (e) e.preventDefault();
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  body.classList.add('no-scroll');
  console.log('welcome');
};

const closeModal = function () {
  modal.classList.add('hidden');
  overlay.classList.add('hidden');
  body.classList.remove('no-scroll');
};

for (let i = 0; i < btnsOpenModal.length; i++)
  btnsOpenModal[i].addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);

document.addEventListener('keydown', function (e) {
  // console.log(e.key);
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeModal();
  }
});

///////////////////////////////

// LOGIC FOR PLAYING VIDEO IN A DIV
// 1. Select all video containers
const videoContainers = document.querySelectorAll('.section-video .video');

videoContainers.forEach(container => {
  const video = container.querySelector('video');
  const playBtn = container.querySelector('.custom-play-btn');

  // Ensure controls are hidden on page load
  video.controls = false;

  // 1. CLICK ON BUTTON: Start video and show controls
  playBtn.addEventListener('click', e => {
    e.stopPropagation();
    video.play();
    video.controls = true; // This brings back the seek bar/volume
    playBtn.style.opacity = '0';
    playBtn.style.pointerEvents = 'none';
  });

  // 2. CLICK ON VIDEO: Pause and hide controls (optional)
  video.addEventListener('click', () => {
    if (!video.paused) {
      video.pause();
      video.controls = false; // Hide controls when paused
      playBtn.style.opacity = '1';
      playBtn.style.pointerEvents = 'auto';
    }
  });

  // 3. Reset when video ends
  video.addEventListener('ended', () => {
    video.controls = false;
    playBtn.style.opacity = '1';
    playBtn.style.pointerEvents = 'auto';
  });
});

/////////////////////////////////////////////////////////////

// script.js

// 1. Select the launch message and the EXISTING overlay
const launchModal = document.querySelector('.open-launch-modal');
const globalOverlay = document.querySelector('.modal-overlay'); // Using your existing overlay
const bookingBtns = document.querySelectorAll('.booking-btn');
const closeLaunchBtn = document.querySelector('.close-launch-modal');

// 2. Open both when "Book Now" is clicked
bookingBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    launchModal.classList.remove('hidden');
    globalOverlay.classList.remove('hidden'); // Reusing existing overlay
    body.classList.add('no-scroll');
  });
});

// 3. Close both when "Got it!" is clicked
closeLaunchBtn.addEventListener('click', () => {
  launchModal.classList.add('hidden');
  globalOverlay.classList.add('hidden'); // Reusing existing overlay
  body.classList.remove('no-scroll');
});

////////////////////////////////////////// SMOOTH SCROLLING

// Smooth scroll

document
  .querySelector('.updated-navbar')
  .addEventListener('click', function (e) {
    console.log(e.target);
    e.preventDefault();

    // Matching stratedy
    if (e.target.classList.contains('nav__link')) {
      const id = e.target.getAttribute('href');
      console.log(id);

      document.querySelector(id).scrollIntoView({
        behavior: 'smooth',
      });
    }
  });

document.querySelector('.mobileNav').addEventListener('click', function (e) {
  if (e.target.classList.contains('nav__link')) {
    e.preventDefault();

    const id = e.target.getAttribute('href');

    document.querySelector(id).scrollIntoView({
      behavior: 'smooth',
    });
  }
});

/////////////////////////////////////////////////////////////////
// Reveal sections
const allSection = document.querySelectorAll('.section');
const revealSection = function (entries, observer) {
  console.log(entries);
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.remove('section--hidden');
    observer.unobserve(entry.target);
  });
};

const sectionObserver = new IntersectionObserver(revealSection, {
  root: null,
  threshold: 0,
  rootMargin: '-50px',
});

allSection.forEach(function (section) {
  sectionObserver.observe(section);
  section.classList.add('section--hidden');
});

///////////////////////////////////////////////////////////
// Lazy loading images
const imgTagets = document.querySelectorAll('img[data-src]');
const loadImg = function (entries, observer) {
  const [entry] = entries;

  if (!entry.isIntersecting) return;

  // Replace src with data-src
  entry.target.src = entry.target.dataset.src;

  entry.target.addEventListener('load', function () {
    entry.target.classList.remove('lazy-img');
  });

  observer.unobserve(entry.target);
};

const imgObserver = new IntersectionObserver(loadImg, {
  root: null,
  threshold: 0,
  rootMargin: '200px',
});

imgTagets.forEach(img => imgObserver.observe(img));

///////////////////////////////////////////////
/// Slider

const createSlider = function (containerSelector, slideSelector, gap = 0) {
  const container = document.querySelector(containerSelector);

  const slides = container.querySelectorAll(slideSelector);
  const btnLeft = container.querySelector('.fa-chevron-left');
  const btnRight = container.querySelector('.fa-chevron-right');
  const dotContainer = container.querySelector('.dots');

  let curSlide = 0;
  const maxSlide = slides.length;

  const createDots = function () {
    slides.forEach((_, i) => {
      dotContainer.insertAdjacentHTML(
        'beforeend',
        `<button class="dots__dot" data-slide="${i}"></button>`,
      );
    });
  };

  const activateDot = function (slide) {
    dotContainer
      .querySelectorAll('.dots__dot')
      .forEach(dot => dot.classList.remove('dots__dot--active'));

    if (dotContainer.querySelector(`.dots__dot[data-slide="${slide}"]`)) {
      dotContainer
        .querySelector(`.dots__dot[data-slide="${slide}"]`)
        .classList.add('dots__dot--active');
    }
  };

  // NEW: Function to handle the active class on the slides themselves
  const activateSlide = function (slide) {
    slides.forEach(s => s.classList.remove('active'));
    if (slides[slide]) {
      slides[slide].classList.add('active');
    }
  };

  const goToSlide = function (slide) {
    slides.forEach((s, i) => {
      s.style.transform = `translateX(calc(${100 * (i - slide)}% + ${gap * (i - slide)}px))`;
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

  if (btnRight) btnRight.addEventListener('click', nextSlide);
  if (btnLeft) btnLeft.addEventListener('click', prevSlide);

  if (dotContainer) {
    dotContainer.addEventListener('click', function (e) {
      if (e.target.classList.contains('dots__dot')) {
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
    'touchstart',
    e => {
      startX = e.touches[0].clientX;
    },
    { passive: true },
  );

  container.addEventListener('touchend', e => {
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
createSlider('.main-section', '.slides');

// Initialize Feedback slider
createSlider('.feedbacks', '.feed', 20);

// Initialize Tariff slider
// createSlider('.tariff', '.col', 0);

if (window.innerWidth <= 768) {
  createSlider('.tariff', '.col', 0);
}



// Active class for tariff section
const tariffCols = document.querySelectorAll('.tariff_wrapper .col');

tariffCols.forEach(col => {
  col.addEventListener('click', () => {
    // 1. Remove active from all
    tariffCols.forEach(c => c.classList.remove('active'));

    // 2. Add active to clicked one
    col.classList.add('active');
  });
});
