// Valeur Studio — Interactions & Tracking

// --- GTM dataLayer (safe to initialize even without GTM) ---
window.dataLayer = window.dataLayer || [];

function gtmEvent(eventName, eventData) {
  window.dataLayer.push({
    event: eventName,
    ...eventData
  });
}

// --- Meta Pixel helper (safe when pixel not loaded) ---
function metaTrack(eventName, params) {
  if (typeof fbq !== 'undefined') {
    if (params) {
      fbq('track', eventName, params);
    } else {
      fbq('track', eventName);
    }
  }
}

function metaTrackCustom(eventName, params) {
  if (typeof fbq !== 'undefined') {
    fbq('trackCustom', eventName, params || {});
  }
}

(function () {
  'use strict';

  // --- Scroll-triggered nav ---
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function onScroll() {
    const y = window.scrollY;
    if (y > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // --- Mobile menu ---
  const toggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  toggle.addEventListener('click', function () {
    toggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  });

  // Close mobile menu on link click
  document.querySelectorAll('.mobile-link, .mobile-cta').forEach(function (link) {
    link.addEventListener('click', function () {
      toggle.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // --- Scroll reveal ---
  var reveals = document.querySelectorAll('.reveal');

  function checkReveal() {
    var windowHeight = window.innerHeight;
    reveals.forEach(function (el, i) {
      var top = el.getBoundingClientRect().top;
      var threshold = windowHeight * 0.88;
      if (top < threshold) {
        // Stagger siblings
        var parent = el.parentElement;
        var siblings = parent.querySelectorAll(':scope > .reveal');
        var index = Array.prototype.indexOf.call(siblings, el);
        setTimeout(function () {
          el.classList.add('visible');
        }, index * 80);
      }
    });
  }

  window.addEventListener('scroll', checkReveal, { passive: true });
  window.addEventListener('load', checkReveal);
  // Initial check
  setTimeout(checkReveal, 100);

  // --- FAQ accordion ---
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(function (faq) {
        faq.classList.remove('active');
        faq.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      // Open clicked (if wasn't active)
      if (!isActive) {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        var offset = 80;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // =============================================
  // TRACKING & ANALYTICS EVENTS
  // =============================================

  // --- CTA click tracking ---
  document.querySelectorAll('.btn-primary').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var section = btn.closest('section');
      var sectionId = section ? section.id || section.className.split(' ')[0] : 'nav';
      var ctaText = btn.textContent.trim();

      gtmEvent('cta_click', {
        cta_text: ctaText,
        cta_location: sectionId
      });

      metaTrack('Lead', {
        content_name: ctaText,
        content_category: sectionId
      });
    });
  });

  // --- Portfolio click tracking ---
  document.querySelectorAll('.work-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var title = card.querySelector('.work-title');
      var tag = card.querySelector('.work-tag');

      gtmEvent('portfolio_click', {
        project_name: title ? title.textContent : 'unknown',
        project_category: tag ? tag.textContent : 'unknown'
      });

      metaTrack('ViewContent', {
        content_name: title ? title.textContent : 'unknown',
        content_category: 'Portfolio'
      });
    });
  });

  // --- FAQ interaction tracking ---
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var questionText = btn.querySelector('span');
      gtmEvent('faq_expand', {
        question: questionText ? questionText.textContent : 'unknown'
      });

      metaTrackCustom('FAQExpand', {
        question: questionText ? questionText.textContent : 'unknown'
      });
    });
  });

  // --- Scroll depth tracking ---
  var scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

  function trackScrollDepth() {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var scrollPercent = Math.round((window.scrollY / docHeight) * 100);

    [25, 50, 75, 100].forEach(function (milestone) {
      if (scrollPercent >= milestone && !scrollMilestones[milestone]) {
        scrollMilestones[milestone] = true;
        gtmEvent('scroll_depth', { percent: milestone });
        metaTrackCustom('ScrollDepth', { percent: milestone });
      }
    });
  }

  window.addEventListener('scroll', trackScrollDepth, { passive: true });

  // --- Section visibility tracking ---
  if ('IntersectionObserver' in window) {
    var trackedSections = {};
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          if (id && !trackedSections[id]) {
            trackedSections[id] = true;
            gtmEvent('section_view', { section: id });
            metaTrackCustom('SectionView', { section: id });
          }
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('section[id]').forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  // --- Service card interest tracking ---
  document.querySelectorAll('.service-card .text-link').forEach(function (link) {
    link.addEventListener('click', function () {
      var card = link.closest('.service-card');
      var title = card ? card.querySelector('.service-title') : null;

      gtmEvent('service_interest', {
        service_name: title ? title.textContent : 'unknown'
      });

      metaTrack('ViewContent', {
        content_name: title ? title.textContent : 'unknown',
        content_category: 'Service'
      });
    });
  });

  // --- Time on page tracking (engagement signal) ---
  var engagementIntervals = [30, 60, 120, 300]; // seconds
  engagementIntervals.forEach(function (seconds) {
    setTimeout(function () {
      gtmEvent('time_on_page', { seconds: seconds });
    }, seconds * 1000);
  });

  // =============================================
  // CONTACT MODAL & FORM
  // =============================================

  var modal = document.getElementById('contactModal');
  var modalBackdrop = document.getElementById('modalBackdrop');
  var modalCloseBtn = document.getElementById('modalClose');
  var contactForm = document.getElementById('contactForm');
  var formSuccess = document.getElementById('formSuccess');
  var formError = document.getElementById('formError');
  var formSubmitBtn = document.getElementById('formSubmit');
  var successCloseBtn = document.getElementById('successClose');
  var errorRetryBtn = document.getElementById('errorRetry');

  // Open modal
  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset to form state
    contactForm.style.display = '';
    formSuccess.style.display = 'none';
    formError.style.display = 'none';

    // Track
    gtmEvent('modal_open', { modal: 'contact' });
    metaTrackCustom('ContactModalOpen');
  }

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';

  }

  // Bind all "Start a Project" buttons
  document.querySelectorAll('.open-contact-modal').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  });

  // Close triggers
  modalCloseBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  successCloseBtn.addEventListener('click', closeModal);

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Error retry
  errorRetryBtn.addEventListener('click', function () {
    contactForm.style.display = '';
    formError.style.display = 'none';
  });

  // --- Validation ---
  function showError(fieldId, message) {
    var errorEl = document.getElementById('error-' + fieldId);
    var inputEl = document.getElementById('field-' + fieldId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
    if (inputEl) {
      inputEl.classList.add('error');
    }
  }

  function hideError(fieldId) {
    var errorEl = document.getElementById('error-' + fieldId);
    var inputEl = document.getElementById('field-' + fieldId);
    if (errorEl) {
      errorEl.classList.remove('show');
    }
    if (inputEl) {
      inputEl.classList.remove('error');
    }
  }

  // Clear errors on input
  ['name', 'email', 'description'].forEach(function (fieldId) {
    var input = document.getElementById('field-' + fieldId);
    if (input) {
      input.addEventListener('input', function () {
        hideError(fieldId);
      });
    }
  });

  function validateForm() {
    var valid = true;
    var name = document.getElementById('field-name').value.trim();
    var email = document.getElementById('field-email').value.trim();
    var description = document.getElementById('field-description').value.trim();

    if (!name) {
      showError('name', 'Please enter your name.');
      valid = false;
    } else {
      hideError('name');
    }

    if (!email) {
      showError('email', 'Please enter your email.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('email', 'Please enter a valid email address.');
      valid = false;
    } else {
      hideError('email');
    }

    if (!description) {
      showError('description', 'Please tell us about your project.');
      valid = false;
    } else if (description.length < 10) {
      showError('description', 'Please provide a bit more detail (at least 10 characters).');
      valid = false;
    } else {
      hideError('description');
    }

    return valid;
  }

  // --- Form submission ---
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validateForm()) return;

    // Disable button, show loading
    formSubmitBtn.disabled = true;
    formSubmitBtn.querySelector('.submit-text').style.display = 'none';
    formSubmitBtn.querySelector('.submit-loading').style.display = '';

    var formData = {
      name: document.getElementById('field-name').value.trim(),
      email: document.getElementById('field-email').value.trim(),
      business: document.getElementById('field-business').value.trim(),
      service: document.getElementById('field-service').value,
      description: document.getElementById('field-description').value.trim(),
    };

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    })
    .then(function (result) {
      if (result.ok) {
        // Success
        contactForm.style.display = 'none';
        formSuccess.style.display = '';

        // Track conversion
        gtmEvent('form_submit', { form: 'contact', service: formData.service });
        metaTrack('Contact', {
          content_name: 'Project Inquiry',
          content_category: formData.service || 'general'
        });

        // Reset form for next time
        contactForm.reset();
      } else {
        // Server returned error
        contactForm.style.display = 'none';
        formError.style.display = '';
        var errorMsg = document.getElementById('errorMessage');
        if (result.data && result.data.details) {
          errorMsg.textContent = result.data.details;
        }
      }
    })
    .catch(function () {
      contactForm.style.display = 'none';
      formError.style.display = '';
    })
    .finally(function () {
      formSubmitBtn.disabled = false;
      formSubmitBtn.querySelector('.submit-text').style.display = '';
      formSubmitBtn.querySelector('.submit-loading').style.display = 'none';
    });
  });

})();
