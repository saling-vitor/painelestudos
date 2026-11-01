'use strict';
/* MEUS MAPAS · auditoria histórica e manutenção por aparelho.
   Sem varreduras destrutivas: compara registros antigos com mapas
   realmente existentes na conta e exige confirmação para cada categoria. */
(() => {
  const RE = /^mindmap_(?:state|notes)::([a-z0-9-]+)$/;
  const TOMBSTONE = '__studyCleanupDeleted';
  const LEDGER = 'studyapp.cleanupLedger.v1:';
  const MAX_PAGES = 100;
  const SIZE = 200;
  const me = () => String(window.StudyCloud?.session?.()?.user?.id || '');
  const slug = s => String(s || '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
  const keyNS = k => RE.exec(k || '')?.[1] || '';
  const localKeys = () => {
    const a = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (RE.test(k || '')) a.push(k);
    }
    return a.sort();
  };
  function owner(allowPending = true) {
    const id = me();
    if (!id || !StudyCloud?.configured?.()) throw Error('Entre na sua conta para analisar o histórico da nuvem.');
    if (navigator.onLine === false || state.cloudLoading || state.cloudSyncError)
      throw Error('É necessário carregar e conectar a conta na nuvem.');
    if (!allowPending && ((StudyCloud.pendingCount?.() || 0) ||
      (typeof preferencesPending === 'function' && preferencesPending())))
      throw Error('Sincronize todas as alterações antes de executar uma limpeza.');
    return id;
  }
  async function listAll(table, columns, id) {
    const all = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      if (id !== me()) throw Error('Sessão alterada durante a análise.');
      const order = table === 'maps' ? 'id.asc' : 'storage_key.asc';
      const query = 'user_id=eq.' + encodeURIComponent(id) + '&select=' + columns +
        '&order=' + order + '&limit=' + SIZE + '&offset=' + (page * SIZE);
      const rows = await StudyCloud.rows(table, query);
      if (!Array.isArray(rows)) throw Error('Consulta incompleta da nuvem; nenhuma limpeza autorizada.');
      all.push(...rows);
      if (rows.length < SIZE) return all;
    }
    throw Error('A lista é muito extensa para conferência integral. Nenhuma exclusão foi autorizada.');
  }
  function ledgerKeys(id) {
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem(LEDGER + id) || '[]'); } catch {}
    const keys = new Set();
    if (Array.isArray(rows)) for (const row of rows) {
      if (row.owner !== id) continue;
      for (const map of row.maps || []) if (map.ns) {
        keys.add('mindmap_state::' + map.ns);
        keys.add('mindmap_notes::' + map.ns);
      }
    }
    return keys;
  }
  function builtins() {
    const entries = typeof combinedMaps === 'function' ? combinedMaps() :
      (state.catalog?.maps || []);
    return new Set(entries.map(m => slug(m.storageId || m.storage_id)).filter(Boolean));
  }
  function activeMapNamespaces(rows) {
    const active = new Set([...builtins()]);
    for (const m of (state.cloudMaps || [])) {
      const n = slug(m.storageId || m.storage_id);
      if (n) active.add(n);
    }
    for (const m of rows) {
      const n = slug(m.storage_id || m.storageId);
      if (n) active.add(n);
    }
    return active;
  }
  async function scanDevice() {
    const names = typeof caches !== 'undefined' && caches.keys ? await caches.keys() : [];
    const owned = names.filter(n => /^study-(?:pwa|content|private)-/.test(n));
    const sizes = [];
    for (const name of owned) {
      try { const cache = await caches.open(name); sizes.push({ name, count: (await cache.keys()).length }); }
      catch { sizes.push({ name, count: null }); }
    }
    return { names: owned.sort(), entries: sizes.reduce((v, x) => v + (x.count || 0), 0), supported: typeof caches !== 'undefined' };
  }
  async function analyze() {
    const id = owner(true);
    const [maps, snapshots, device] = await Promise.all([
      listAll('maps', 'storage_id,course_id,code', id),
      listAll('study_snapshots', 'storage_key,payload', id),
      scanDevice()
    ]);
    if (id !== me()) throw Error('Sessão alterada; refaça a análise.');
    const active = activeMapNamespaces(maps);
    const ledgers = ledgerKeys(id);
    const snapshotKeys = new Set(snapshots.map(x => x.storage_key));
    const historicRemote = snapshots.filter(x => keyNS(x.storage_key) &&
      !active.has(keyNS(x.storage_key)) &&
      !ledgers.has(x.storage_key) && x.payload?.[TOMBSTONE] !== true)
      .map(x => x.storage_key).sort();
    const historicalBackup = snapshots.filter(x => historicRemote.includes(x.storage_key))
      .map(x => ({ storage_key:x.storage_key, payload:x.payload }));
    const localOrphans = localKeys().filter(k => !active.has(keyNS(k)) &&
      !snapshotKeys.has(k) && !ledgers.has(k));
    const activeLocal = localKeys().filter(k => active.has(keyNS(k)));
    const protectedOther = localKeys().length - activeLocal.length - localOrphans.length;
    return {
      owner: id, stamp: Date.now(), historicRemote, localOrphans, activeLocal: activeLocal.length,
      protectedOther, cloudMaps: maps.length, cloudSnapshots: snapshots.length,
      historicalBackup, device, /* modelo-snapshot completo não persistido; a limpeza revalida na nuvem */
    };
  }
  function exportHistoric(report) {
    if (!report || report.owner !== me() || Date.now() - report.stamp > 120000)
      throw Error('Atualize a análise antes de exportar.');
    const rows = Array.isArray(report.historicalBackup) ? report.historicalBackup : [];
    if (!rows.length) throw Error('Não há registros históricos na nuvem para exportar.');
    const data = {type:'meus-mapas-historical-backup',exportedAt:new Date().toISOString(),
      notice:'Arquivo privado para conferência manual. A restauração não é automática.', rows};
    const file = new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    const uri = URL.createObjectURL(file), anchor = document.createElement('a');
    anchor.href = uri; anchor.download = 'MEUS_MAPAS_RESIDUOS_ANTIGOS_' +
      new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(uri),4000);
    return rows.length;
  }
  function validateReport(report, mode) {
    if (!report || report.owner !== owner(mode === 'device') ||
        Date.now() - report.stamp > 120000) throw Error('Faça uma nova análise antes da limpeza.');
  }
  async function clearDevice(report) {
    if (!report?.device || Date.now() - report.stamp > 120000)
      throw Error('Analise o cache deste dispositivo novamente.');
    const fresh = await scanDevice();
    const allowed = new Set(fresh.names);
    const names = report.device.names.filter(n => allowed.has(n));
    let removed = 0;
    for (const name of names) if (await caches.delete(name)) removed++;
    return { removed, entries: report.device.entries };
  }
  async function clearLocalOrphans(report) {
    validateReport(report, 'local');
    const id = owner(false);
    const [maps, snapshots] = await Promise.all([
      listAll('maps','storage_id,course_id,code',id),
      listAll('study_snapshots','storage_key',id)
    ]);
    const active = activeMapNamespaces(maps);
    const remote = new Set(snapshots.map(x => x.storage_key));
    const requested = report.localOrphans.filter(k => RE.test(k));
    const candidates = requested.filter(k => localStorage.getItem(k) !== null &&
      !active.has(keyNS(k)) && !remote.has(k) && !ledgerKeys(id).has(k));
    if (candidates.length && typeof createRestorePoint === 'function')
      await createRestorePoint('before-legacy-local-cleanup','Antes da limpeza local de dados antigos');
    for (const key of candidates) {
      localStorage.removeItem(key);
      localStorage.removeItem('studyapp.modified::' + key);
    }
    return { removed: candidates.length, protected: requested.length - candidates.length };
  }
  async function clearHistoricRemote(report) {
    validateReport(report, 'cloud');
    const id = owner(false);
    const [maps, snapshots] = await Promise.all([
      listAll('maps','storage_id,course_id,code',id),
      listAll('study_snapshots','storage_key,payload',id)
    ]);
    const active = activeMapNamespaces(maps);
    const saved = new Map(snapshots.map(x => [x.storage_key,x]));
    const requested = report.historicRemote.filter(k => RE.test(k));
    const safe = requested.filter(k => !active.has(keyNS(k)) && !ledgerKeys(id).has(k) &&
      saved.has(k) && saved.get(k)?.payload?.[TOMBSTONE] !== true);
    if (safe.length && typeof createRestorePoint === 'function')
      await createRestorePoint('before-legacy-cloud-cleanup','Antes da limpeza histórica na nuvem');
    let count = 0;
    for (const key of safe) {
      owner(false);
      // Retestar a referência antes da alteração de cada registro.
      const freshMaps = await listAll('maps', 'storage_id,course_id,code', id);
      if (activeMapNamespaces(freshMaps).has(keyNS(key))) continue;
      const now = new Date().toISOString();
      const written = await StudyCloud.upsert('study_snapshots',{
        user_id:id, storage_key:key, payload:{[TOMBSTONE]:true},
        client_updated_at:now, updated_at:now,
        device_id:String(StudyCloud.device?.()||'historical-cleanup')
      },'user_id,storage_key');
      if (!Array.isArray(written) || !written.some(x => x.storage_key === key && x.payload?.[TOMBSTONE])) {
        throw Error('Falha na confirmação da exclusão de ' + key + '. Os demais registros não foram processados.');
      }
      localStorage.removeItem(key);
      localStorage.removeItem('studyapp.modified::' + key);
      count++;
    }
    return {removed:count,protected:requested.length-count};
  }
  window.StudyCleanupHistory = Object.freeze({
    analyze, scanDevice, clearDevice, clearLocalOrphans, clearHistoricRemote, exportHistoric
  });
})();
