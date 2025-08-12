
window.BirdHub = window.BirdHub || {};
(function() {
  const cfgUrl = './config.json';
  let CFG = null;

  async function loadConfig() {
    if (CFG) return CFG;
    const res = await fetch(cfgUrl);
    if (!res.ok) throw new Error('Cannot load config.json');
    CFG = await res.json();
    return CFG;
  }

  function repoPath() {
    return `${CFG.repo_owner}/${CFG.repo_name}`;
  }

  async function getIssues() {
    await loadConfig();
    const url = `https://api.github.com/repos/${repoPath()}/issues?state=open&per_page=100&labels=${encodeURIComponent(CFG.labels.sighting)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('GitHub API error');
    return await res.json();
  }

  function buildNewIssueUrl(prefill) {
    const base = `https://github.com/${repoPath()}/issues/new`;
    const params = new URLSearchParams(prefill);
    return `${base}?${params.toString()}`;
  }

  window.BirdHub.github = { loadConfig, getIssues, buildNewIssueUrl };
})();
