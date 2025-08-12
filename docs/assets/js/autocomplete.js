// autocomplete.js


<script>
// --- iNaturalist autocomplete for Common name ---
(function(){
  const input = document.getElementById('common_name');
  const box   = document.getElementById('nameSuggest');
  const hidTaxon = document.getElementById('taxon_id');
  const hidSci   = document.getElementById('scientific_name');

  let items = [];       // current suggestions
  let active = -1;      // active index for keyboard
  let lastQ = '';       // last queried string
  let t;                // debounce timer

  function debounceFetch(q){
    clearTimeout(t);
    t = setTimeout(()=> fetchSuggestions(q), 180);
  }

  async function fetchSuggestions(q){
    q = q.trim();
    if (!q || q === lastQ) { hide(); return; }
    lastQ = q;

    try{
      const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(q)}&per_page=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('iNat failed');
      const data = await res.json();
      items = (data.results || []).map(t => ({
        taxon_id: t.id,
        common:   t.preferred_common_name || t.name || '',
        scientific: t.name || '',
        thumb:    t.default_photo ? t.default_photo.square_url : null
      }));
      render();
    }catch(e){
      console.warn('autocomplete error:', e);
      hide();
    }
  }

  function render(){
    if (!items.length){ hide(); return; }
    box.innerHTML = items.map((it,i)=>`
      <div class="row${i===active?' active':''}" data-i="${i}">
        ${it.thumb?`<img class="thumb" src="${it.thumb}" alt="">`:''}
        <div class="names">
          <div class="common">${escapeHtml(it.common)}</div>
          <div class="sci"><em>${escapeHtml(it.scientific)}</em></div>
        </div>
      </div>`).join('');
    box.hidden = false;
  }

  function hide(){ box.hidden = true; box.innerHTML=''; items=[]; active=-1; }

  function choose(i){
    const it = items[i]; if(!it) return;
    input.value = it.common;
    hidTaxon.value = String(it.taxon_id);
    hidSci.value   = it.scientific;
    hide();
  }

  function move(delta){
    if (!items.length) return;
    active = (active + delta + items.length) % items.length;
    render();
    const row = box.querySelector(`.row[data-i="${active}"]`);
    if (row) row.scrollIntoView({block:'nearest'});
  }

  // events
  input.addEventListener('input', e=>{
    // clear stored selection if the user types
    hidTaxon.value = ''; hidSci.value = '';
    debounceFetch(e.target.value);
  });
  input.addEventListener('keydown', e=>{
    if (box.hidden) return;
    if (e.key === 'ArrowDown'){ e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); move(-1); }
    else if (e.key === 'Enter'){ if(active>-1){ e.preventDefault(); choose(active); } }
    else if (e.key === 'Escape'){ hide(); }
  });
  box.addEventListener('mousedown', e=>{
    const row = e.target.closest('.row'); if(!row) return;
    choose(Number(row.dataset.i));
  });
  document.addEventListener('click', e=>{
    if (!box.contains(e.target) && e.target !== input) hide();
  });

  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
})();
</script>
