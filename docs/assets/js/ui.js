// ui.js
window.BirdHub = window.BirdHub || {};
(function(){
  const g = () => window.BirdHub.github;
  const p = () => window.BirdHub.parser;
  const s = () => window.BirdHub.species;

  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

  async function initHome(){
    const CFG = await g().loadConfig();
    // Prefill body blocks matching the Issue template
    const bodyText = [
      '### Common name\n',
      '### Pet Name\n',
      '### Date & time\n',
      '### Count\n',
      '### Sex\n',
      '### Age\n',
      '### Behaviour\n',
      '### Habitat\n',
      '### Call type\n',
      '### Confidence\n',
      '### First time ever seen?\n',
      '### Location mode (Home or Field)\n',
      '### Place label (if Home)\n' + (CFG.home_place_label || '') + '\n',
      '### Latitude (if Field)\n',
      '### Longitude (if Field)\n',
      '### Precision (exact/~100m/~1km)\n',
      '### Notes\n',
      '\n_Attach photos/videos below in the GitHub editor._\n'
    ].join('\n');
    // const params = {
    //   title: 'Sighting: ',
    //   labels: `${CFG.labels.sighting},${CFG.labels.bird}`,
    //   body: bodyText
    // };
    
    // Recent sightings
    try{
      const issues = await g().getIssues();
      const recent = document.getElementById('recent');
      const top = issues.slice(0, 6);
      for (const it of top) {
        const rec = p().parseIssue(it);
        let sp = null;
        try { sp = await s().enrichSpecies(rec.common_name); } catch (_) { sp = null; }
        recent.appendChild(renderSightingCard(rec, sp));
      }
    } catch(e){
      console.warn(e);
    }
  }

// --- in docs/assets/js/ui.js ---
// Replace your current renderSightingCard with this:
function renderSightingCard(rec, sp) {
  // Image: use your photo -> iNat default -> site icon
  const fallbackIcon = './assets/images/logo.png';
  const thumb = (rec.images && rec.images[0]) || (sp && sp.default_image) || fallbackIcon;

  // Names
  const commonName = rec.common_name || (sp && sp.preferred_common_name) || 'Unknown';
  const scientificName = (sp && sp.scientific_name) ? sp.scientific_name : '';

  // Order & family
  const orderCommon  = sp && sp.order  ? sp.order.common  : '';
  const orderSci     = sp && sp.order  ? sp.order.scientific : '';
  const familyCommon = sp && sp.family ? sp.family.common : '';
  const familySci    = sp && sp.family ? sp.family.scientific : '';

  // Conservation status
  const status = (sp && sp.status) ? sp.status : { code: 'LC', label: 'Least Concern' };

  // Confidence + first-ever + pet name
  const confidence = rec.confidence || '';
  const firstEver  = rec.first_ever ? '<span class="badge first-ever">First ever</span>' : '';
  const petName    = rec.pet_name ? `<span class="badge pet-name">${rec.pet_name}</span>` : '';

  // Behaviour chips
  const behaviours = (rec.behaviour || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
    .map(b => `<span class="chip mini">${b}</span>`)
    .join(' ');

  // iNat “More Info” link (if we have it)
  const moreInfo = (sp && sp.url)
    ? `<a class="btn-outline more-info" href="${sp.url}" target="_blank" rel="noopener">More info</a>`
    : '';

  // Date / time
  const when = formatDateTime(rec.observed_at);

  // Card HTML
  return el(`
    <div class="card sighting-card">
      <img class="thumb small" src="${thumb}" alt="">
      
      <div class="card-header">
        <h3 class="common-name">
          <a href="${rec.url}" target="_blank" rel="noopener">${commonName}</a>
        </h3>
        ${confidence ? `<span class="badge confidence">${confidence}</span>` : ''}
      </div>

      ${scientificName ? `<em class="sci-name">${scientificName}</em>` : ''}

      ${(orderCommon || orderSci) ? `
        <div class="order-info">${orderCommon ? `${orderCommon} ` : ''}${orderSci ? `<em>(${orderSci})</em>` : ''}</div>
      ` : ''}

      ${(familyCommon || familySci) ? `
        <div class="family-info">${familyCommon ? `${familyCommon} ` : ''}${familySci ? `<em>(${familySci})</em>` : ''}</div>
      ` : ''}

      <div class="status-row">
        <span class="badge status status-${status.code.toLowerCase()}">${status.label}</span>
        ${firstEver}
      </div>

      <div class="small when">${when}</div>

      ${behaviours ? `<div class="behaviours">${behaviours}</div>` : ''}

      <div class="card-footer">
        ${moreInfo}
        ${petName}
      </div>
    </div>
  `);
}




  async function initSightings(){
    try{
      const issues = await g().getIssues();
      const list = document.getElementById('list');
      for (const it of issues) {
        const rec = p().parseIssue(it);
        let sp = null;
        try { sp = await s().enrichSpecies(rec.common_name); } catch (_) { sp = null; }
        list.appendChild(renderSightingCard(rec, sp));
      }
    }catch(e){ console.warn(e); }
  }

  async function initSpecies(){
    try{
      const issues = await g().getIssues();
      const map = new Map();
      for (const it of issues){
        const rec = p().parseIssue(it);
        const key = (rec.common_name || '').toLowerCase();
        if (!key) continue;
        if (!map.has(key)) map.set(key, { name: rec.common_name, count:0 });
        map.get(key).count++;
      }
      const species = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
      const container = document.getElementById('speciesList');
      species.forEach(sp => {
        const card = el(`<div class="card"><h3>${sp.name}</h3><div class="small">${sp.count} sighting(s)</div></div>`);
        container.appendChild(card);
      });
    }catch(e){ console.warn(e); }
  }

  async function initStats(){
    try{
      const issues = await g().getIssues();
      const parsed = issues.map(it => p().parseIssue(it));
      const set = new Set(parsed.map(r => (r.common_name || '').toLowerCase()).filter(Boolean));
      document.getElementById('statLifeList').textContent = `${set.size} species`;
      const now = new Date(); const ym = now.toISOString().slice(0,7);
      const monthCount = parsed.filter(r => (r.observed_at||'').slice(0,7) === ym).length;
      document.getElementById('statMonth').textContent = `${monthCount} sightings`;
      const byDay = new Map();
      parsed.forEach(r=>{
        const d = (r.observed_at||'').slice(0,10);
        const key = `${d}|${(r.common_name||'').toLowerCase()}`;
        byDay.set(key, true);
      });
      const dayCounts = {};
      for (const k of byDay.keys()){
        const d = k.split('|')[0];
        dayCounts[d] = (dayCounts[d]||0)+1;
      }
      const big = Object.entries(dayCounts).sort((a,b)=>b[1]-a[1])[0];
      document.getElementById('statBigDay').textContent = big ? `${big[0]} · ${big[1]} species` : '—';
    }catch(e){ console.warn(e); }
  }

  window.BirdHub.initHome = initHome;
  window.BirdHub.initSightings = initSightings;
  window.BirdHub.initSpecies = initSpecies;
  window.BirdHub.initStats = initStats;
})();

// Helper function to format datetime
function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${datePart} — ${timePart}`;
}
