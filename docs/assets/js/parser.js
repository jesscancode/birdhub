
window.BirdHub = window.BirdHub || {};
(function(){
  function parseIssue(issue) {
    const body = issue.body || '';
    const get = (label) => {
      const re = new RegExp(`### ${label}[\s\S]*?\n([^#][\s\S]*?)(?:\n###|$)`, 'i');
      const m = body.match(re);
      return m ? m[1].trim() : '';
    };
    return {
      id: issue.number,
      url: issue.html_url,
      title: issue.title,
      common_name: get('Common name'),
      observed_at: get('Date & time'),
      count: get('Count'),
      sex: get('Sex'),
      age: get('Age'),
      behaviour: get('Behaviour'),
      habitat: get('Habitat'),
      call_type: get('Call type'),
      confidence: get('Confidence'),
      first_ever: /yes/i.test(get('First time ever seen\?')),
      location_mode: /field/i.test(get('Location mode \(Home or Field\)')) ? 'field' : 'home',
      location_label: get('Place label \(if Home\)'),
      lat: get('Latitude \(if Field\)'),
      lon: get('Longitude \(if Field\)'),
      precision: get('Precision'),
      notes: get('Notes'),
      images: (issue.body.match(/!\[.*?\]\((.*?)\)/g) || []).map(s => s.match(/\((.*?)\)/)[1])
    };
  }
  window.BirdHub.parser = { parseIssue };
})();
