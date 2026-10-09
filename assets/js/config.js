// PR #136 — HOMOLOGACAO VISUAL ISOLADA. Nunca usar credenciais da producao.
// Nesta branch de PREVIA a nuvem permanece desativada por projeto.
// Sem leitura de overrides do localStorage: eles poderiam reativar o Supabase real.
// Alteracao EXCLUSIVA da branch preview/pr136-smoked-glass-isolated-20261009.
window.STUDY_APP_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  bucket: 'study-maps-preview-disabled',
  appVersion: 'V12.7'
};
