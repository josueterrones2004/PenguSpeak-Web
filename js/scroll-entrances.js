(() => {
  'use strict';
  const selector = '.story-kicker,.story-head h2,.story-head p,.voice-kicker,.voice-intro h2,.voice-intro p,.story-stage,.voice-player,.final-cta-kicker,.final-cta h2,.final-cta-copy,.final-cta-actions,.final-cta-beta,.final-center-avatar';
  const elements = document.querySelectorAll(selector);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // No ocultamos los elementos antes de observarlos: el contenido es
  // legible incluso si el usuario salta rápidamente entre secciones.
  if (reduced || !('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('motion-in'));
    document.querySelector('.final-cta')?.classList.add('is-in-view');
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('motion-in');
      entry.target.closest('.final-cta')?.classList.add('is-in-view');
      observer.unobserve(entry.target);
    }
  }, { threshold:0.04, rootMargin:'0px 0px -3% 0px' });
  elements.forEach(el => observer.observe(el));
  // Also start the ambient animation if the CTA section itself is reached.
  const finalSection = document.querySelector('.final-cta');
  if (finalSection) {
    const sectionObserver = new IntersectionObserver(entries => {
      finalSection.classList.toggle('is-in-view', entries[0].isIntersecting);
    }, {threshold:0});
    sectionObserver.observe(finalSection);
  }
})();
