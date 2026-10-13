/* Agência BC · adaptador Supabase (etapa 2: será validado quando o projeto for criado).
   Carregado só quando BC_CONFIG.MODE === 'supabase'. Usa a chave publicável + login do usuário;
   a segurança vem do RLS (ver supabase/schema.sql). */
(function (root) {
  'use strict';
  var sb = null;
  var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

  function carregaLib() {
    if (root.supabase && root.supabase.createClient) return Promise.resolve();
    return new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = LIB; s.onload = ok; s.onerror = function () { erro(new Error('Não foi possível carregar o Supabase.')); };
      document.head.appendChild(s);
    });
  }
  function tira(row) { var r = Object.assign({}, row); delete r.user_id; if (r.id && /^(demo-|id-)/.test(r.id)) delete r.id; return r; }

  var A = {
    nome: 'supabase', persistente: true, sessao: null,
    async init() {
      var C = root.BC_CONFIG;
      if (!C.SUPABASE_URL || !C.SUPABASE_KEY) throw new Error('Preencha SUPABASE_URL e SUPABASE_KEY em js/config.js.');
      await carregaLib();
      sb = root.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
      var r = await sb.auth.getSession();
      A.sessao = r.data.session;
      if (!A.sessao) throw Object.assign(new Error('Faça login para continuar.'), { precisaLogin: true });
    },
    async entrar(email, senha) {
      var r = await sb.auth.signInWithPassword({ email: email, password: senha });
      if (r.error) throw r.error;
      A.sessao = r.data.session;
    },
    async sair() { await sb.auth.signOut(); A.sessao = null; },
    async load(t) {
      var out = [], de = 0, passo = 1000;
      for (;;) {
        var r = await sb.from(t).select('*').order('created_at', { ascending: true }).range(de, de + passo - 1);
        if (r.error) throw r.error;
        out = out.concat(r.data);
        if (r.data.length < passo) break;
        de += passo;
      }
      return out;
    },
    async insert(t, row) {
      var r = await sb.from(t).insert(tira(row)).select().single();
      if (r.error) throw r.error;
      return r.data;
    },
    async insertMany(t, rows) {
      var out = [];
      for (var i = 0; i < rows.length; i += 500) {
        var r = await sb.from(t).insert(rows.slice(i, i + 500).map(tira)).select();
        if (r.error) throw r.error;
        out = out.concat(r.data);
      }
      return out;
    },
    async update(t, id, patch) {
      var p = tira(patch); delete p.id; delete p.created_at;
      var r = await sb.from(t).update(p).eq('id', id).select().single();
      if (r.error) throw r.error;
      return r.data;
    },
    async remove(t, id) {
      var r = await sb.from(t).delete().eq('id', id);
      if (r.error) throw r.error;
    }
  };
  root.BCSupabase = A;
})(window);
