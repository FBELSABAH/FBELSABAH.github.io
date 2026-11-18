// Visibility is native. Animations only run once an element is actually on screen.
const motionPreference = matchMedia('(prefers-reduced-motion: no-preference)');
const surfaces = document.querySelectorAll(
  '.shell .card, .project-hero, .shell .panel, .figure, .demo-shell, .project-film, ' +
  '.view .panel, main > .grid > .card, .course-card, .section-block, .intro, .stat'
);
if ('IntersectionObserver' in window && Element.prototype.animate) {
  const running = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (!motionPreference.matches || entry.target.contains(document.activeElement)) continue;
      const animation = entry.target.animate([
        { opacity: .65, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
      running.add(animation);
      animation.onfinish = animation.oncancel = () => running.delete(animation);
    }
  }, { threshold: 0.01 });
  surfaces.forEach(surface => observer.observe(surface));
  motionPreference.addEventListener('change', () => {
    if (!motionPreference.matches) running.forEach(animation => animation.cancel());
  });
}
