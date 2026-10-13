/* Agência BC · roteador, delegação de eventos e inicialização. */
(function (root) {
  'use strict';
  var BC = root.BC, S = root.BCStore, esc = BC.esc;
  var ROTAS = [['painel', 'Painel'], ['clientes', 'Clientes'], ['prospeccao', 'CRM'], ['previsao', 'Previsão'], ['churn', 'Churn'], ['dados', 'Dados']];
  var pronto = false;

  function rota() {
    var h = (location.hash || '').replace(/^#/, '') || 'painel';
    if (h.indexOf('c-') === 0) return { nome: 'cliente', id: h.slice(2), nav: 'clientes' };
    if (!BC.views[h]) h = 'painel';
    return { nome: h, nav: h };
  }

  // Espaço da logo: coloque o arquivo em assets/ e informe o caminho em LOGO (js/config.js). Vazio = espaço reservado.
  function logo() {
    var l = root.BC_CONFIG && root.BC_CONFIG.LOGO;
    return l ? '<img class="marca-logo" src="' + esc(l) + '" alt="Logo">' : '<span class="marca-logo vazio" aria-hidden="true"></span>';
  }
  function barra(nav) {
    var sup = S.modo() === 'supabase';
    return '<header class="topbar"><div class="topbar-in"><a class="marca" href="#painel">' + logo() + '<span class="marca-nome">Agência BC</span></a>' +
      '<div class="topbar-acoes">' + (sup ? '<button class="btn mini fantasma" data-act="sair">Sair</button>' : '<span class="tag" title="Os dados ficam só neste navegador até ligarmos o Supabase">modo local</span>') +
      '<button class="btn mini fantasma" data-act="tema" aria-label="Alternar tema">Tema</button></div></div>' +
      '<nav class="nav" aria-label="Seções">' + ROTAS.map(function (r) { return '<a href="#' + r[0] + '"' + (r[0] === nav ? ' aria-current="page"' : '') + '>' + r[1] + '</a>'; }).join('') + '</nav></header>';
  }

  BC.render = function () {
    if (!pronto) return;
    var r = rota(), app = document.getElementById('app'), html;
    try { html = r.nome === 'cliente' ? BC.views.cliente(r.id) : BC.views[r.nome](); }
    catch (e) { console.error(e); html = '<div class="aviso warn"><span>Algo deu errado ao montar esta tela: ' + esc(e.message) + '</span></div>'; }
    var y = window.scrollY, foco = document.activeElement && document.activeElement.id;
    app.innerHTML = barra(r.nav) + '<main class="pagina">' + html + '</main>';
    if (foco) { var el = document.getElementById(foco); if (el && el.focus) { try { el.focus({ preventScroll: true }); if (el.setSelectionRange && el.type === 'search') el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* ok */ } } }
    window.scrollTo(0, y);
  };

  function tema() {
    var r = document.documentElement, atual = r.getAttribute('data-theme');
    var escuro = atual !== 'light';
    var novo = escuro ? 'light' : 'dark';
    r.setAttribute('data-theme', novo);
    try { localStorage.setItem('bc:tema', novo); } catch (e) { /* ok */ }
  }
  BC.act['fechar'] = function (el) { BC.fechar(el); };
  BC.act['tema'] = tema;
  BC.act['sair'] = async function () { await root.BCSupabase.sair(); location.reload(); };

  function achar(el, attr) { return el && el.closest ? el.closest('[' + attr + ']') : null; }
  function roda(nome, el, ev) {
    var f = BC.act[nome];
    if (!f) { console.warn('ação desconhecida', nome); return; }
    var r = f(el, ev);
    if (r && r.catch) r.catch(function (e) { console.error(e); BC.toast(e.message || 'Algo deu errado', true); });
  }

  document.addEventListener('click', function (ev) {
    var lk = ev.target.closest && ev.target.closest('a[href]');
    if (lk && !lk.hasAttribute('data-act')) return; // links normais (WhatsApp, e-mail...) seguem o caminho deles
    var el = achar(ev.target, 'data-act');
    if (!el) return;
    if (ev.target.closest('a[href], button, input, select') && ev.target.closest('a[href], button, input, select') !== el && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
      // clique em botão/link dentro de um cartão clicável: o botão interno manda
      var interno = ev.target.closest('[data-act]');
      if (interno && interno !== el) el = interno;
    }
    if (el.tagName === 'A' && el.getAttribute('data-act') === 'fechar-e-ir') { roda('fechar-e-ir', el, ev); return; }
    ev.preventDefault();
    roda(el.getAttribute('data-act'), el, ev);
  });
  document.addEventListener('change', function (ev) {
    var el = achar(ev.target, 'data-change');
    if (el) roda(el.getAttribute('data-change'), el, ev);
    var live = ev.target.closest && ev.target.closest('[data-live]');
    if (live && BC.live[live.dataset.live]) BC.live[live.dataset.live](live);
  });
  document.addEventListener('input', function (ev) {
    var el = achar(ev.target, 'data-input');
    if (el) roda(el.getAttribute('data-input'), el, ev);
    var live = ev.target.closest && ev.target.closest('[data-live]');
    if (live && BC.live[live.dataset.live]) BC.live[live.dataset.live](live);
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target.closest('[data-form]');
    if (!f) return;
    ev.preventDefault();
    var fn = BC.forms[f.dataset.form];
    if (fn) fn(f);
  });
  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); BC.render(); });

  function telaLogin(msg) {
    document.getElementById('app').innerHTML = '<form class="login" id="form-login"><h1 style="font-family:var(--f-tit,inherit)">Agência <span style="color:var(--accent)">BC</span></h1>' +
      '<div class="campo"><label for="lg-email">E-mail</label><input id="lg-email" type="email" autocomplete="username" required></div>' +
      '<div class="campo"><label for="lg-senha">Senha</label><input id="lg-senha" type="password" autocomplete="current-password" required></div>' +
      '<p class="erro-form" role="alert"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</p><button class="btn primario" type="submit">Entrar</button></form>';
    document.getElementById('form-login').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      try { await root.BCSupabase.entrar(document.getElementById('lg-email').value, document.getElementById('lg-senha').value); location.reload(); }
      catch (e) { telaLogin('E-mail ou senha incorretos.'); }
    });
  }

  async function iniciar() {
    try { var t = localStorage.getItem('bc:tema'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) { /* ok */ }
    try { await S.init(); }
    catch (e) {
      if (e.precisaLogin) return telaLogin();
      document.getElementById('app').innerHTML = '<main class="pagina"><div class="aviso warn"><span>Não consegui iniciar: ' + esc(e.message) + '</span></div></main>';
      return;
    }
    S.onChange(function () { BC.render(); });
    pronto = true;
    BC.render();
  }
  BC.iniciar = iniciar;
  if (!root.__BC_SEM_AUTO) iniciar();
})(window);
