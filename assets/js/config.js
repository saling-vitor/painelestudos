// Configuração pública do PWA. A publishable key do Supabase pode ficar no cliente com RLS ativo.
window.STUDY_APP_CONFIG = Object.assign({
  supabaseUrl: 'https://hapyzjfhbobtaellaejv.supabase.co',
  supabaseAnonKey: 'sb_publishable_C1DYi_orfah9EljItGs1Jw_kmSj93ym',
  bucket: 'study-maps',
  appVersion: 'V12.7'
}, (() => {
  // V15.52 · P3-1: a substituição local aceita só chaves conhecidas, com formato validado. JSON inválido não derruba o app.
  try {
    const raw = JSON.parse(localStorage.getItem('studyapp.config.override') || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    if (typeof raw.supabaseUrl === 'string' && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(raw.supabaseUrl)) out.supabaseUrl = raw.supabaseUrl.replace(/\/$/, '');
    if (typeof raw.supabaseAnonKey === 'string' && /^[A-Za-z0-9._-]{20,400}$/.test(raw.supabaseAnonKey)) out.supabaseAnonKey = raw.supabaseAnonKey;
    if (typeof raw.bucket === 'string' && /^[a-z0-9][a-z0-9._-]{1,62}$/.test(raw.bucket)) out.bucket = raw.bucket;
    return out;
  } catch { return {}; }
})(), {appVersion: 'V12.7'});
