/* Agência BC · configuração de ambiente.
   MODE 'local'    -> dados no navegador (localStorage). Usado para validar a ferramenta.
   MODE 'supabase' -> dados no Supabase, com login. Preencher SUPABASE_URL e SUPABASE_KEY
                      (a chave publicável/anon; nunca a service_role). */
window.BC_CONFIG = {
  MODE: 'supabase',
  SUPABASE_URL: 'https://ejrohgtjqrsppfogvwnk.supabase.co',
  SUPABASE_KEY: 'sb_publishable_PaOCLhlnH5YGfoASrS2bSw_Tk3tgI1-',   // chave publicável: pode ficar no código público; os dados só abrem com login (RLS)
  LOGO: ''   // ex.: 'assets/logo.png' (ou .svg). Vazio = espaço reservado no topo.
};
