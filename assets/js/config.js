// Configuração pública do PWA. A publishable key do Supabase pode ficar no cliente com RLS ativo.
window.STUDY_APP_CONFIG = Object.assign({
  supabaseUrl: 'https://hapyzjfhbobtaellaejv.supabase.co',
  supabaseAnonKey: 'sb_publishable_C1DYi_orfah9EljItGs1Jw_kmSj93ym',
  bucket: 'study-maps',
  appVersion: 'V11.0'
}, JSON.parse(localStorage.getItem('studyapp.config.override') || '{}'), {appVersion: 'V11.0'});
