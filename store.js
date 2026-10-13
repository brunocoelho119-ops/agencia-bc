/* Agência BC · camada de dados.
   O resto do app só fala com BCStore. Por baixo há um adaptador:
   local (localStorage) agora, Supabase depois (js/store-supabase.js). Mesmos nomes de colunas nos dois. */
(function (root) {
  'use strict';
  var TABELAS = ['clientes', 'checkins', 'feedbacks', 'listas', 'prospects', 'atividades', 'configuracoes'];
  var PREFIXO = 'bc:v1:';

  function uid() {
    try { return crypto.randomUUID(); } catch (e) { return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }

  // ───────────── adaptador local ─────────────
  var Local = {
    nome: 'local', persistente: true, d: {},
    init: function () {
      var self = this;
      TABELAS.forEach(function (t) {
        try { var raw = localStorage.getItem(PREFIXO + t); self.d[t] = raw ? JSON.parse(raw) : []; }
        catch (e) { self.d[t] = []; self.persistente = false; }
      });
      return Promise.resolve();
    },
    grava: function (t) {
      try { localStorage.setItem(PREFIXO + t, JSON.stringify(this.d[t])); }
      catch (e) { this.persistente = false; }
    },
    load: function (t) { return Promise.resolve(this.d[t].slice()); },
    insert: function (t, row) {
      row.id = row.id || uid();
      row.created_at = row.created_at || new Date().toISOString();
      this.d[t].push(row); this.grava(t);
      return Promise.resolve(row);
    },
    insertMany: function (t, rows) {
      var self = this, now = new Date().toISOString();
      rows.forEach(function (r) { r.id = r.id || uid(); r.created_at = r.created_at || now; self.d[t].push(r); });
      this.grava(t);
      return Promise.resolve(rows);
    },
    update: function (t, id, patch) {
      var i = this.d[t].findIndex(function (r) { return r.id === id; });
      if (i < 0) return Promise.reject(new Error('Registro não encontrado'));
      this.d[t][i] = Object.assign({}, this.d[t][i], patch);
      this.grava(t);
      return Promise.resolve(this.d[t][i]);
    },
    remove: function (t, id) {
      this.d[t] = this.d[t].filter(function (r) { return r.id !== id; });
      this.grava(t);
      return Promise.resolve();
    }
  };

  // ───────────── store ─────────────
  var adapter = null, cache = {}, ouvintes = [], agendado = false;
  TABELAS.forEach(function (t) { cache[t] = []; });

  function emite() {
    if (agendado) return;
    agendado = true;
    setTimeout(function () { agendado = false; ouvintes.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }, 0);
  }
  function ehExemplo(r) { return typeof r.id === 'string' && r.id.indexOf('demo-') === 0; }

  var Store = {
    TABELAS: TABELAS,
    async init() {
      var modo = (root.BC_CONFIG && root.BC_CONFIG.MODE) || 'local';
      adapter = (modo === 'supabase' && root.BCSupabase) ? root.BCSupabase : Local;
      await adapter.init();
      for (var i = 0; i < TABELAS.length; i++) cache[TABELAS[i]] = await adapter.load(TABELAS[i]);
    },
    modo: function () { return adapter ? adapter.nome : 'local'; },
    persistente: function () { return adapter ? adapter.persistente !== false : true; },
    all: function (t) { return cache[t]; },
    get: function (t, id) { return cache[t].find(function (r) { return r.id === id; }); },
    async insert(t, row) { var r = await adapter.insert(t, Object.assign({}, row)); cache[t].push(r); emite(); return r; },
    async insertMany(t, rows) {
      if (!rows.length) return [];
      var rs = await adapter.insertMany(t, rows.map(function (r) { return Object.assign({}, r); }));
      rs.forEach(function (r) { cache[t].push(r); });
      emite(); return rs;
    },
    async update(t, id, patch) {
      var r = await adapter.update(t, id, patch);
      var i = cache[t].findIndex(function (x) { return x.id === id; });
      if (i >= 0) cache[t][i] = r;
      emite(); return r;
    },
    async remove(t, id) {
      await adapter.remove(t, id);
      cache[t] = cache[t].filter(function (r) { return r.id !== id; });
      emite();
    },
    // configurações: pares chave/valor guardados na tabela configuracoes
    cfg: function (chave, padrao) {
      var r = cache.configuracoes.find(function (x) { return x.chave === chave; });
      return r && r.valor != null ? r.valor : padrao;
    },
    async setCfg(chave, valor) {
      var r = cache.configuracoes.find(function (x) { return x.chave === chave; });
      if (r) return Store.update('configuracoes', r.id, { valor: valor });
      return Store.insert('configuracoes', { chave: chave, valor: valor });
    },
    onChange: function (fn) { ouvintes.push(fn); },

    // dados de exemplo: ids começam com "demo-"
    temExemplos: function () { return TABELAS.some(function (t) { return cache[t].some(ehExemplo); }); },
    temDados: function () { return ['clientes', 'prospects', 'checkins', 'feedbacks', 'listas'].some(function (t) { return cache[t].length > 0; }); },
    async limparExemplos() {
      for (var i = 0; i < TABELAS.length; i++) {
        var t = TABELAS[i], lixo = cache[t].filter(ehExemplo);
        for (var j = 0; j < lixo.length; j++) await adapter.remove(t, lixo[j].id);
        cache[t] = cache[t].filter(function (r) { return !ehExemplo(r); });
      }
      emite();
    },
    async carregarExemplos(dados) {
      var ordem = ['clientes', 'checkins', 'feedbacks', 'listas', 'prospects', 'atividades'];
      for (var i = 0; i < ordem.length; i++) await Store.insertMany(ordem[i], dados[ordem[i]] || []);
    },

    exportar: function () {
      var tabelas = {};
      TABELAS.forEach(function (t) { tabelas[t] = cache[t].filter(function (r) { return !ehExemplo(r); }); });
      return { app: 'agencia-bc', versao: 1, exportado_em: new Date().toISOString(), tabelas: tabelas };
    },
    async importar(obj, substituir) {
      if (!obj || obj.app !== 'agencia-bc' || !obj.tabelas) throw new Error('Arquivo não é um backup da Agência BC.');
      var i, j;
      if (substituir) {
        for (i = TABELAS.length - 1; i >= 0; i--) {
          var atuais = cache[TABELAS[i]].slice();
          for (j = 0; j < atuais.length; j++) await adapter.remove(TABELAS[i], atuais[j].id);
          cache[TABELAS[i]] = [];
        }
      }
      var ordem = ['clientes', 'listas', 'prospects', 'checkins', 'feedbacks', 'atividades', 'configuracoes'];
      for (i = 0; i < ordem.length; i++) {
        var existentes = {};
        cache[ordem[i]].forEach(function (r) { existentes[r.id] = true; });
        var novos = (obj.tabelas[ordem[i]] || []).filter(function (r) { return !existentes[r.id]; });
        await Store.insertMany(ordem[i], novos);
      }
    }
  };
  root.BCStore = Store;
  root.BCLocalAdapter = Local;
})(window);
