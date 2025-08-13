// ui.js
window.BirdHub = window.BirdHub || {};
(function(){
  const g = () => window.BirdHub.github;
  const p = () => window.BirdHub.parser;
  const s = () => window.BirdHub.species;

  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

  // async function initHome(){
  //   const CFG = await g().loadConfig();
  //   // Prefill body blocks matching the Issue template
  //   const bodyText = [
  //     '### Common name\n',
  //     '### Pet Name\n',
  //     '### Date & time\n',
  //     '### Count\n',
  //     '### Sex\n',
  //     '### Age\n',
  //     '### Behaviour\n',
  //     '### Habitat\n',
  //     '### Call type\n',
  //     '### Confidence\n',
  //     '### First time ever seen?\n',
  //     '### Location mode (Home or Field)\n',
  //     '### Place label (if Home)\n' + (CFG.home_place_label || '') + '\n',
  //     '### Latitude (if Field)\n',
  //     '### Longitude (if Field)\n',
  //     '### Precision (exact/~100m/~1km)\n',
  //     '### Notes\n',
  //     '\n_Attach photos/videos below in the GitHub editor._\n'
  //   ].join('\n');
  //   // const params = {
  //   //   title: 'Sighting: ',
  //   //   labels: `${CFG.labels.sighting},${CFG.labels.bird}`,
  //   //   body: bodyText
  //   // };
    
  //   // Recent sightings
  //   try{
  //     const issues = await g().getIssues();
  //     const recent = document.getElementById('recent');
  //     const top = issues.slice(0, 6);
  //     for (const it of top) {
  //       const rec = p().parseIssue(it);
  //       let sp = null;
  //       try { sp = await s().enrichSpecies(rec.common_name); } catch (_) { sp = null; }
  //       recent.appendChild(renderSightingCard(rec, sp));
  //     }
  //   } catch(e){
  //     console.warn(e);
  //   }
  // }


async function initHome(){
  try {
    await g().loadConfig();                 // ensure repo config is ready
    const issues = await g().getIssues();   // may throw on network/rate-limit
    const recent = document.getElementById('recent');
    if (!recent) return;

    const top = (issues || []).slice(0, 6);
    for (const it of top){
      const rec = p().parseIssue(it);

      // iNat enrichment must never block rendering
      let sp = null;
      try { sp = await s().enrichSpecies(rec.common_name); }
      catch (e) { console.warn('enrichSpecies (home) failed:', e); }

      recent.appendChild(renderSightingCard(rec, sp));
    }
  } catch (e){
    console.warn('initHome failed:', e);
    // optional: show a friendly empty state
    const recent = document.getElementById('recent');
    if (recent) recent.innerHTML = `<div class="small">No recent sightings available.</div>`;
  }
}

function rarityPoints(obsCount){
  // fewer observations -> higher points (0..10)
  if (obsCount <= 50) return 10;
  if (obsCount <= 200) return 9;
  if (obsCount <= 500) return 8;
  if (obsCount <= 1000) return 7;
  if (obsCount <= 5000) return 6;
  if (obsCount <= 10000) return 5;
  if (obsCount <= 50000) return 4;
  if (obsCount <= 100000) return 3;
  if (obsCount <= 500000) return 2;
  return 1;
}

function habitatIcons(hab){
  const h = (hab||'').toLowerCase();
  const icons = [];
  if (/forest|wood/.test(h)) icons.push('🌲');
  if (/grass|savanna/.test(h)) icons.push('🌾');
  if (/wetland|marsh|reed|swamp|river|lake/.test(h)) icons.push('🪿'); // waterfowl-ish
  if (/coast|sea|ocean|shore|beach/.test(h)) icons.push('🌊');
  if (/urban|garden|park|city/.test(h)) icons.push('🏙️');
  if (/shrub|fynbos/.test(h)) icons.push('🌿');
  return icons.map(x=>`<span class="ico" title="${hab}">${x}</span>`).join('');
}

function renderSightingCard(rec, sp) {
  const thumb = rec.images?.[0] || sp?.default_image_medium || './assets/images/logo.png';
  const name  = rec.common_name || 'Unknown bird';
  const sci   = sp?.scientific_name || '';
  const orderCommon = sp?.order?.common || '';
  const orderSci    = sp?.order?.scientific || '';
  const famCommon   = sp?.family?.common || '';
  const famSci      = sp?.family?.scientific || '';
  const status      = sp?.status ? { code: sp.status.code, label: sp.status.label } : { code:'', label:'' };
  const points      = rarityPoints(sp?.observations_count || 0);
  const when        = formatDateTime(rec.observed_at);
  const conf        = rec.confidence || '';
  const first       = rec.first_ever ? `<span class="badge first-ever">First ever</span>` : '';
  const pet         = rec.pet_name ? `<span class="badge pet-name">${rec.pet_name}</span>` : '';
  const moreInfo    = sp?.taxon_id ? `https://www.inaturalist.org/taxa/${sp.taxon_id}` : '#';

  const behaviours = (rec.behaviour || '')
    .split(',')
    .map(x=>x.trim())
    .filter(Boolean)
    .map(b => `<span class="chip mini">${b}</span>`)
    .join('');

return el(`
  <div class="card wingspan">
    <div class="wg-head">
      <h3 class="wg-name"><a href="${rec.url}" ...>${name}</a></h3>
      ${conf ? `<span class="badge confidence wg-conf">${conf}</span>` : ''}
    </div>
    <img class="wg-img" src="${thumb}" alt="">

      <div class="wg-meta">
        ${sci ? `<div class="wg-sci"><em>${sci}</em></div>` : ''}
        ${(orderCommon||orderSci) ? `<div class="wg-line">${orderCommon} ${orderSci?`<em>(${orderSci})</em>`:''}</div>` : ''}
        ${(famCommon||famSci) ? `<div class="wg-line">${famCommon} ${famSci?`<em>(${famSci})</em>`:''}</div>` : ''}
      </div>

      <div class="wg-icons">
        ${habitatIcons(rec.habitat)}
      </div>

      <div class="wg-stats">
        <div class="wg-points" title="Rarity score">${points}</div>
        ${status.code ? `<span class="badge status status-${status.code.toLowerCase()}" title="Conservation status">${status.label}</span>` : ''}
        ${first}
      </div>

      <div class="wg-when">${when}</div>

      ${behaviours ? `<div class="wg-beh">${behaviours}</div>` : ''}

      <div class="wg-foot">
        <a class="wg-more" href="${moreInfo}" target="_blank" rel="noopener">More info</a>
        ${pet}
      </div>
    </div>
  `);
}




  // async function initSightings(){
  //   try{
  //     const issues = await g().getIssues();
  //     const list = document.getElementById('list');
  //     for (const it of issues) {
  //       const rec = p().parseIssue(it);
  //       let sp = null;
  //       try { sp = await s().enrichSpecies(rec.common_name); } catch (_) { sp = null; }
  //       list.appendChild(renderSightingCard(rec, sp));
  //     }
  //   }catch(e){ console.warn(e); }
  // }

async function initSightings(){
  try {
    await g().loadConfig();
    const issues = await g().getIssues();
    const list = document.getElementById('list');
    if (!list) return;

    for (const it of (issues || [])){
      const rec = p().parseIssue(it);
      let sp = null;
      try { sp = await s().enrichSpecies(rec.common_name); }
      catch (e) { console.warn('enrichSpecies (sightings) failed:', e); }
      list.appendChild(renderSightingCard(rec, sp));
    }
  } catch (e){
    console.warn('initSightings failed:', e);
    const list = document.getElementById('list');
    if (list) list.innerHTML = `<div class="small">No sightings to show.</div>`;
  }
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
  try {
    await g().loadConfig();
    const issues = await g().getIssues();
    const parsed = (issues || []).map(it => p().parseIssue(it));

    // Life list
    const life = new Set(
      parsed.map(r => (r.common_name || '').toLowerCase()).filter(Boolean)
    );
    const lifeEl = document.getElementById('statLifeList');
    if (lifeEl) lifeEl.textContent = `${life.size} species`;

    // This month
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const monthCount = parsed.filter(r => (r.observed_at || '').slice(0, 7) === ym).length;
    const monthEl = document.getElementById('statMonth');
    if (monthEl) monthEl.textContent = `${monthCount} sighting${monthCount === 1 ? '' : 's'}`;

    // Big day
    const byDayUniqueSpecies = new Map(); // key: "YYYY-MM-DD|species"
    parsed.forEach(r => {
      const d = (r.observed_at || '').slice(0,10);
      const sp = (r.common_name || '').toLowerCase();
      if (d && sp) byDayUniqueSpecies.set(`${d}|${sp}`, true);
    });

    const dayCounts = {};
    for (const k of byDayUniqueSpecies.keys()){
      const d = k.split('|')[0];
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    }
    const big = Object.entries(dayCounts).sort((a,b)=>b[1]-a[1])[0];
    const bigEl = document.getElementById('statBigDay');
    if (bigEl) bigEl.textContent = big ? `${big[0]} · ${big[1]} species` : '—';
  } catch (e){
    console.warn('initStats failed:', e);
    // show safe placeholders so the UI never looks broken
    const lifeEl  = document.getElementById('statLifeList');
    const monthEl = document.getElementById('statMonth');
    const bigEl   = document.getElementById('statBigDay');
    if (lifeEl)  lifeEl.textContent  = '—';
    if (monthEl) monthEl.textContent = '—';
    if (bigEl)   bigEl.textContent   = '—';
  }
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
