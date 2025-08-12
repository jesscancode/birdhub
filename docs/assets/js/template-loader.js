async function loadTemplate(id, file) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(file);
  if (res.ok) {
    el.innerHTML = await res.text();
  } else {
    console.error(`Failed to load ${file}`);
  }
}

async function loadHeadTemplate(file) {
  try {
    const res = await fetch(file);
    if (res.ok) {
      const html = await res.text();
      // Insert shared head tags (css, meta, icons, etc.)
      document.head.insertAdjacentHTML('afterbegin', html);
    } else {
      console.error(`Failed to load head ${file}`);
    }
  } catch (e) {
    console.error(e);
  }
}

// Kick off head load ASAP (doesn't need DOMContentLoaded)
loadHeadTemplate('./partials/head.html');

// Load header & footer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadTemplate('site-header', './partials/header.html');
  loadTemplate('site-footer', './partials/footer.html');
});
