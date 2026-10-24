// Progressive enhancement: all sections and research stages remain readable without JS.
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#primary-nav');
const mobile = matchMedia('(max-width: 1100px)');
function closeMenu(returnFocus = false) {
  menu.setAttribute('aria-expanded', 'false');
  nav.hidden = mobile.matches;
  if (returnFocus) menu.focus();
}
function adaptMenu() {
  menu.hidden = !mobile.matches;
  closeMenu();
}
adaptMenu();
mobile.addEventListener('change', adaptMenu);
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!expanded));
  nav.hidden = expanded;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
nav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !mobile.matches) return;
  closeMenu();
  const target = new URL(link.href, location.href);
  if (target.pathname !== location.pathname || !target.hash) return;
  const section = document.getElementById(target.hash.slice(1));
  if (section) { section.setAttribute('tabindex', '-1'); section.focus({ preventScroll: true }); }
});
// Research stages are ordinary visible sections: searchable and usable without JS.

// Preserve section URLs shared before the site was split into pages.
function followLegacySection() {
  if (document.body.dataset.page !== 'home') return;
  const id = location.hash.slice(1);
  let page = ({research:'research',projects:'projects',students:'students',events:'events',people:'faculty',faculty:'faculty',leadership:'faculty',engage:'engage'})[id];
  if (id.startsWith('project-')) page='projects';
  if (id.startsWith('person-')) page='faculty';
  if (id.startsWith('panel-')) page='research';
  if (id.startsWith('event-')) page='events';
  if (page) location.replace(new URL(document.body.dataset.home + page + '/' + location.hash, location.href).href);
}
followLegacySection();
window.addEventListener('hashchange', followLegacySection);

