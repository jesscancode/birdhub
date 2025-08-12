// docs/assets/js/parser.js
window.BirdHub = window.BirdHub || {};
(function(){
  // Escape special regex chars in labels ((), ?, +, etc.)
  function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Grab the block after a heading labelled `label` until the next heading
  function grabBlock(text, label){
    const L = esc(label);
    const patterns = [
      new RegExp(`^###\\s*${L}\\s*\\n([\\s\\S]*?)(?=^###\\s|^\\*\\*|\\Z)`, 'im'), // ### Label
      new RegExp(`^\\*\\*\\s*${L}\\s*\\*\\*\\s*\\n([\\s\\S]*?)(?=^###\\s|^\\*\\*|\\Z)`, 'im'), // **Label**
      new RegExp(`^${L}\\s*\\n([\\s\\S]*?)(?=^###\\s|^\\*\\*|\\Z)`, 'im') // plain Label
    ];
    for (const re of patterns){
      const m = text.match(re);
      if (m) return tidy(m[1]);
    }
    return '';
  }

  function tidy(s){
    if (!s) return '';
    s = s.replace(/<!--[\s\S]*?-->/g, '').trim();
    s = s.replace(/\n{3,}/g, '\n\n');
    return s;
  }

  function parseIssue(issue) {
    const body = issue.body || '';
    const get = (label) => grabBlock(body, label);

    const common = get('Common name') || get('Species') || get('Bird');
    const lat = get('Latitude (if Field)') || get('Latitude');
    const lon = get('Longitude (if Field)') || get('Longitude');

    // Images: support markdown and HTML <img>
    const mdImgs = (body.match(/!\[[^\]]*]\(([^)]+)\)/g) || []).map(s => s.match(/\(([^)]+)\)/)[1]);
    const htmlImgs = (body.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi) || [])
      .map(s => (s.match(/src=["']([^"']+)["']/i) || [null, ''])[1]);
    const images = [...mdImgs, ...htmlImgs];

    return {
      id: issue.number,
      url: issue.html_url,
      title: issue.title,
      common_name: common,
      observed_at: get('Date & time') || get('Date/Time') || get('Observed at'),
      count: get('Count'),
      sex: get('Sex'),
      age: get('Age'),
      behaviour: get('Behaviour'),
      habitat: get('Habitat'),
      call_type: get('Call type'),
      confidence: get('Confidence'),
      first_ever: /\byes\b/i.test(get('First time ever seen?') || ''),
      location_mode: /field/i.test(get('Location mode (Home or Field)') || get('Location mode') || ''),
      location_label: get('Place label (if Home)') || get('Place label'),
      lat, lon,
      precision: get('Precision (exact/~100m/~1km)') || get('Precision'),
      notes: get('Notes'),
      images
    };
  }

  window.BirdHub.parser = { parseIssue };
})();
