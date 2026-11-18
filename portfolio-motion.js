/* Each ridge uses the dashboard’s observed hourly load for one study day. */
const dayControl = document.querySelector('#sample-day');
if (dayControl) {
  const traces = Array.from(document.querySelectorAll('.ridge'));
  const activeTrace = document.querySelector('.active-trace');
  const dateLabel = document.querySelector('#sample-date');
  const peakLabel = document.querySelector('#sample-peak');
  const hourLabel = document.querySelector('#sample-hour');
  const dateFormat = new Intl.DateTimeFormat('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  });
  function showStudyDay() {
    const trace = traces[dayControl.valueAsNumber];
    const { day, peak, hour } = trace.dataset;
    const date = dateFormat.format(new Date(day + 'T12:00:00Z'));
    activeTrace.setAttribute('d', trace.getAttribute('d'));
    peakLabel.firstChild.textContent = peak + ' ';
    dateLabel.dateTime = day;
    dateLabel.textContent = date;
    hourLabel.textContent = hour + ' Atlantic';
    dayControl.setAttribute('aria-valuetext', date + ', peak ' + peak + ' megawatts at ' + hour);
  }
  dayControl.closest('label').hidden = false;
  dayControl.addEventListener('input', showStudyDay);
  showStudyDay();
}

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
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.shell .card').forEach(card => {
        observer.unobserve(card);
        if (!card.hidden) observer.observe(card);
      });
    });
  });
  motionPreference.addEventListener('change', () => {
    if (!motionPreference.matches) running.forEach(animation => animation.cancel());
  });
}

// Pair each gallery title with its destination for native cross-page transitions.
if (motionPreference.matches && CSS.supports('view-transition-name', 'project-grid')) {
  for (const card of document.querySelectorAll('.shell .card')) {
    const slug = card.querySelector('.card-cover')?.pathname.match(/^\/([a-z]+)\.html$/)?.[1];
    if (slug) card.querySelector('h3').style.viewTransitionName = 'project-' + slug;
  }
  const project = location.pathname.match(/^\/([a-z]+)\.html$/)?.[1];
  const title = document.querySelector('.project-hero h1, .intro h1, main > h1, #dashboard-view h1');
  if (title && project && project !== 'index') title.style.viewTransitionName = 'project-' + project;
}
