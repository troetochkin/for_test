const paths = {
  play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  restart: '<path d="M5 5v14M19 6l-9 6 9 6"/>',
  previous: '<path d="M6 5v14M18 6l-8 6 8 6"/>',
  next: '<path d="M18 5v14M6 6l8 6-8 6"/>',
  loop: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  arrow: '<path d="M5 19 19 5M5 5h14v14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/>',
  remove: '<path d="M9 4h6M4 7h16M6 7l1 14h10l1-14M10 10v7M14 10v7"/>',
  fit: '<path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>',
};
export const icon = (name, className = '') => `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.arrow}</svg>`;
