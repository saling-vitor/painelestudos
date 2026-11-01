'use strict';
/* MEUS MAPAS · Central de Limpeza Inteligente
   Escopo conservador: somente dados rastreados por exclusões reais; nunca inferir
   que um namespace desconhecido é descartável. Sem ações destrutivas automáticas. */
(() => {
  const LEDGER = 'studyapp.cleanupLedger.v1:';
  const DELETED = '__studyCleanupDeleted';
  const MAX = 500;
  const j = (v, def) => { try { return JSON.parse(v) ?? def; } catch { return def; } };
  const meId = () => String(window.StudyCloud?.session?.()?.user?.id || '');
  const ledgerKey = (id = meId()) => LEDGER + id;
  const read = (id = meId()) => {
    if (!id) return [];
    const val = j(localStorage.getItem(ledgerKey(id)), []);
    return Array.isArray(val) ? val.filter(x => x && x.owner === id && Array.isArray(x.maps)).slice(-MAX) : [];
  };
  const save = (data, id = meId()) => {
    if (!id) return;
    localStorage.setItem(ledgerKey(id), JSON.stringify(data.slice(-MAX)));
  };
  const code = m => String(m.code || m.id || '').toLowerCase();
  const mapKey = m => String(m.courseId || m.course_id || '') + '::' + code(m);
  const ns = m => String(m.storageId || m.storage_id || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ownerValid = () => {
    const owner = meId();
    if (!owner || !window.StudyCloud?.configured?.()) throw Error('Entre na conta sincronizada para analisar a limpeza.');
    if (navigator.onLine === false || state.cloudLoading || state.cloudSyncError) throw Error('A nuvem deve estar conectada e carregada para uma limpeza segura.');
    if ((window.StudyCloud?.pendingCount?.() || 0) || (typeof preferencesPending === 'function' && preferencesPending())) throw Error('Sincronize as alterações pendentes antes de limpar.');
    return owner;
  };
  const liveMaps = () => Array.isArray(state.cloudMaps) ? state.cloudMaps : [];
  const liveNamespaces = () => new Set(liveMaps().map(ns).filter(Boolean));
  const liveKeys = () => new Set(liveMaps().map(mapKey));
  const livePaths = () => {
    const items = [...(state.cloudMaps || []), ...(state.cloudDocs || []),
      ...(state.cloudSimulations || []), ...Object.values(state.coverOverrides || {})];
    const out = new Set();
    items.forEach(x => [x.storage_path, x.storagePath, x.contentPath, x.path].filter(Boolean).forEach(v => out.add(v)));
    return out;
  };
  // Registro criado APENAS após a confirmação da exclusão na API.
  function recordRemoved(maps, paths = [], kind = 'mapas') {
    const owner = meId();
    if (!owner) return false;
    const items = (maps || []).map(m => ({ ns: ns(m), key: mapKey(m), courseId: String(m.courseId || m.course_id || '') }))
      .filter(x => x.ns || x.key);
    if (!items.length && !paths.length) return false;
    const list = read(owner);
    list.push({ id: (crypto.randomUUID?.() || String(Date.now())), owner,
      kind: String(kind), at: new Date().toISOString(), maps: items,
      paths: [...new Set((paths || []).filter(x => typeof x === 'string' && x.length > 3))],
      done: [], cacheDone: [] });
    save(list, owner);
    return true;
  }
  function scanLocal() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/^mindmap_(state|notes)::[a-z0-9-]+$/.test(k || '')) out.push(k);
    }
    return out;
  }
  function classify() {
    const owner = meId(), entries = read(owner), liveNs = liveNamespaces(), liveK = liveKeys(), liveP = livePaths();
    const snapshots = new Set(), files = new Set(), blocked = new Set(), protectedKeys = new Set();
    for (const entry of entries) {
      for (const map of entry.maps) {
        if (!map.ns || liveNs.has(map.ns) || (map.key && liveK.has(map.key))) {
          if (map.ns) blocked.add(map.ns);
          continue;
        }
        for (const kind of ['state', 'notes']) {
          const key = 'mindmap_' + kind + '::' + map.ns;
          if (!(entry.done || []).includes(key)) snapshots.add(key);
        }
      }
      for (const path of entry.paths || []) if (!liveP.has(path) && !(entry.cacheDone || []).includes(path)) files.add(path);
    }
    for (const n of liveNs) {
      protectedKeys.add('mindmap_state::' + n);
      protectedKeys.add('mindmap_notes::' + n);
    }
    const local = scanLocal();
    const unknown = local.filter(k => !protectedKeys.has(k) && !snapshots.has(k) &&
      !entries.some(e => (e.done || []).includes(k)));
    return { owner, entries, snapshots: [...snapshots].sort(), files: [...files].sort(),
      blocked: blocked.size, unknown, localEligible: local.filter(k => snapshots.has(k)),
      active: liveNs.size };
  }
  async function analyze() {
    const owner = ownerValid(), a = classify();
    if (owner !== a.owner) throw Error('Sessão alterada: execute a análise novamente.');
    const remote = [];
    // Uma consulta por chave precisa; não se apoia no limite de paginação da listagem global.
    for (const key of a.snapshots) {
      const q = 'user_id=eq.' + encodeURIComponent(owner) + '&storage_key=eq.' + encodeURIComponent(key) + '&select=storage_key,payload';
      const rows = await StudyCloud.rows('study_snapshots', q);
      if ((rows || []).some(x => !x.payload?.[DELETED])) remote.push(key);
    }
    return { ...a, remote, stamp: Date.now() };
  }
  async function cleanCache(report) {
    ownerValid();
    const current = classify();
    const allowed = new Set(current.files);
    let count = 0;
    const failures = [];
    for (const path of report.files || []) {
      if (!allowed.has(path)) continue;
      try {
        await window.StudyCloud.forgetCached(path);
        for (const entry of current.entries) if ((entry.paths || []).includes(path)) {
          entry.cacheDone = [...new Set([...(entry.cacheDone || []), path])];
        }
        count++;
      } catch(e) { failures.push(path); }
    }
    save(current.entries, current.owner);
    return { cache: count, failures };
  }
  async function cleanPermanent(report) {
    const owner = ownerValid();
    if (!report || report.owner !== owner || Date.now() - report.stamp > 120000) throw Error('Atualize a análise antes de limpar.');
    const current = classify();
    const allowed = new Set(current.snapshots);
    const keys = (report.snapshots || []).filter(k => allowed.has(k));
    const stamp = new Date().toISOString();
    let removed = 0;
    for (const key of keys) {
      ownerValid();
      if (!classify().snapshots.includes(key)) continue;
      // Lápide mínima na nuvem impede que outro aparelho com dados velhos os
      // reenvie ao reconciliar. O conteúdo antigo é substituído por {}.
      const written = await StudyCloud.upsert('study_snapshots', {
        user_id: owner, storage_key: key, payload: { [DELETED]: true },
        client_updated_at: stamp, updated_at: stamp,
        device_id: String(window.StudyCloud.device?.() || 'cleanup')
      }, 'user_id,storage_key');
      if (!Array.isArray(written) || !written.some(r => r.storage_key === key && r.payload?.[DELETED])) {
        throw Error('Não foi possível confirmar a limpeza na nuvem para ' + key + '.');
      }
      localStorage.removeItem(key);
      localStorage.removeItem('studyapp.modified::' + key);
      for (const entry of current.entries) if (entry.maps.some(m =>
        m.ns && key.endsWith('::' + m.ns))) entry.done = [...new Set([...(entry.done || []), key])];
      save(current.entries, owner);
      removed++;
    }
    const cacheResult = await cleanCache(report);
    return { snapshots: removed, ...cacheResult };
  }
  window.StudyCleanup = Object.freeze({ analyze, cleanCache, cleanPermanent, recordRemoved });
})();
