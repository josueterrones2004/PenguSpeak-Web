(() => {
  'use strict';
  const story = document.getElementById('intro-story');
  if (!story) return;
  if (!('IntersectionObserver' in window)) {
    story.classList.add('is-active');
    document.getElementById('scene')?.classList.add('is-active');
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-active', entry.isIntersecting);
  }, {threshold: 0});
  observer.observe(story);
})();
