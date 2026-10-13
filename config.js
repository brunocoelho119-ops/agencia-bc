/* Agência BC · configuração de ambiente.
   MODE 'local'    -> dados no navegador (localStorage). Usado para validar a ferramenta.
   MODE 'supabase' -> dados no Supabase, com login. Preencher SUPABASE_URL e SUPABASE_KEY
                      (a chave publicável/anon; nunca a service_role). */
window.BC_CONFIG = {
  MODE: 'local',
  SUPABASE_URL: '',
  SUPABASE_KEY: '',
  LOGO: ''   // ex.: 'assets/logo.png' (ou .svg). Vazio = espaço reservado no topo.
};
