
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
    const params = {
      title: 'Sighting: ',
      labels: `${CFG.labels.sighting},${CFG.labels.bird}`,
      body: bodyText
    };
    const url = g().buildNewIssueUrl(params);
    const logBtn = document.getElementById('logBtn');
    if (logBtn) logBtn.href = url;

    // Recent sightings
    try{
      const issues = await g().getIssues();
      const recent = document.getElementById('recent');
      const top = issues.slice(0,6);
      for (const it of top){
        const rec = p().parseIssue(it);
        const sp = await s().enrichSpecies(rec.common_name);
        recent.appendChild(renderSightingCard(rec, sp));
      }
    } catch(e){
      console.warn(e);
    }
  }

  function renderSightingCard(rec, sp){
    const thumb = rec.images[0] || (sp && sp.default_image) || '';
    const sci = sp && sp.scientific_name ? `<div class="small"><em>${sp.scientific_name}</em></div>` : '';
    const img = thumb ? `<img class="thumb" src="${thumb}" alt="">` : '<div class="thumb">No image</div>';
    const first = rec.first_ever ? '<span class="badge">First ever</span>' : '';
    const conf = rec.confidence ? `<span class="badge">${rec.confidence}</span>` : '';
    return el(`
      <div class="card sighting-card">
        ${img}
        <h3>${rec.common_name || 'Unknown'}</h3>
        ${sci}
        <div class="small">${rec.observed_at || ''}</div>
        <div style="margin:6px 0">${first} ${conf}</div>
        <a class="small" href="${rec.url}" target="_blank">View entry</a>
      </div>
    `);
  }

  async function initSightings(){
    try{
      const issues = await g().getIssues();
      const list = document.getElementById('list');
      for (const it of issues){
        const rec = p().parseIssue(it);
        const sp = await s().enrichSpecies(rec.common_name);
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
