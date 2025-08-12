// docs/assets/js/parser.js
window.BirdHub = window.BirdHub || {};
(function(){
  // Grab blocks even if they’re written as "### Label", "**Label**", or plain "Label"
  function grabBlock(text, label){
    const patterns = [
      new RegExp(`^###\\s*${label}\\s*\\n([\\s\\S]*?)(?=^###\\s|^\\*\\*|^[A-Z].+:?$|\\Z)`, 'im'),
      new RegExp(`^\\*\\*\\s*${label}\\s*\\*\\*\\s*\\n([\\s\\S]*?)(?=^###\\s|^\\*\\*|^[A-Z].+:?$|\\Z)`, 'im'),
      new RegExp(`^${label}\\s*\\n([\\s\\S]*?)(?=^###\\s|^\\*\\*|^[A-Z].+:?$|\\Z)`, 'im')
    ];
    for (const re of patterns){
      const m = text.match(re);
      if (m) return tidy(m[1]);
    }
    return '';
  }

  function tidy(s){
    if (!s) return '';
    // remove html comments and trim
    s = s.replace(/<!--[\s\S]*?-->/g, '').trim();
    // collapse multiple blank lines
    s = s.replace(/\n{3,}/g, '\n\n');
    return s;
  }

  function parseIssue(issue) {
    const body = issue.body || '';
    const get = (label) => grabBlock(body, label);

    // Try typical labels; fallbacks for minor naming changes
    const common = get('Common name') || get('Species') || get('Bird');
    const lat = get('Latitude (if Field)') || get('Latitude');
    const lon = get('Longitude (if Field)') || get('Longitude');

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
      first_ever: /\\byes\\b/i.test(get('First time ever seen\\?') || ''),
      location_mode: /field/i.test(get('Location mode (Home or Field)') || get('Location mode') || ''),
      location_label: get('Place label (if Home)') || get('Place label'),
      lat, lon,
      precision: get('Precision (exact/~100m/~1km)') || get('Precision'),
      notes: get('Notes'),
      // grab first markdown image
      images: (body.match(/!\\[[^\\]]*\\]\\(([^)]+)\\)/g) || []).map(s => s.match(/\\(([^)]+)\\)/)[1])
    };
  }

  window.BirdHub.parser = { parseIssue };
})();
