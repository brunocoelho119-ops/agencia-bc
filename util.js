/* Agência BC · utilitários de interface: formatação, diálogos, aviso, gráficos em SVG. */
(function (root) {
  'use strict';
  var C = root.BCCalc;
  var BC = root.BC = root.BC || {};
  BC.act = {};      // ações disparadas por data-act="..."
  BC.forms = {};    // formulários com data-form="..."
  BC.views = {};    // telas
  BC.ui = { filtroRisco: false, abaPros: 'hoje', pVista: 'quadro', novoAberto: false, pEtapa: '', pOrigem: '', pLista: '', pBusca: '' };

  // ───────────── formatação ─────────────
  BC.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var nf0 = null, nf2 = null;
  try {
    nf0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    nf2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) { /* segue com o fallback abaixo */ }
  function milhar(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  BC.brl = function (n) {
    if (n == null || n === '' || isNaN(n)) return '—';
    return nf0 ? nf0.format(Number(n)).replace(/ /g, ' ') : 'R$ ' + milhar(n);
  };
  BC.brl2 = function (n) {
    if (n == null || n === '' || isNaN(n)) return '—';
    return nf2 ? nf2.format(Number(n)).replace(/ /g, ' ') : 'R$ ' + Number(n).toFixed(2).replace('.', ',');
  };
  BC.n1 = function (n) { return (n == null || isNaN(n)) ? '—' : (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); };
  BC.pct = function (x, casas) { return (x == null || isNaN(x)) ? '—' : (x * 100).toFixed(casas || 0).replace('.', ',') + '%'; };
  BC.data = function (iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—'; };
  BC.dataCurta = function (iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '—'; };
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  BC.mes = function (m) { return MESES[Number(m.slice(5, 7)) - 1] + '/' + m.slice(2, 4); };
  var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  BC.dataLonga = function (iso) { var d = C.parseISO(iso); return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES_L[d.getMonth()]; };
  BC.rotuloDias = function (dias) {
    if (dias === 0) return 'hoje';
    if (dias === 1) return 'amanhã';
    if (dias === -1) return 'ontem';
    return dias > 0 ? 'em ' + dias + ' dias' : 'há ' + (-dias) + ' dias';
  };
  BC.nomeEtapa = function (id) { var e = C.ETAPAS.filter(function (x) { return x.id === id; })[0]; return e ? e.nome : id; };
  BC.nomeMotivo = function (id) { var m = C.MOTIVOS_SAIDA.filter(function (x) { return x.id === id; })[0]; return m ? m.nome : (id === 'sem_motivo' ? 'Sem motivo' : id); };
  BC.num = function (v) { return (v === '' || v == null) ? null : Number(v); };
  BC.txt = function (v) { return String(v == null ? '' : v).trim(); };
  BC.waLink = function (tel) { var d = C.normalizarTelefone(tel); return d ? 'https://wa.me/' + d : ''; };
  BC.igLink = function (u) { return u ? 'https://instagram.com/' + encodeURIComponent(u) : ''; };

  // ───────────── pedaços de HTML reutilizáveis ─────────────
  var FAROL_NOME = { verde: 'Verde', amarelo: 'Amarelo', vermelho: 'Vermelho' };
  BC.pillFarol = function (f, score) { return '<span class="pill ' + f + '" title="Health score ' + score + '/100">' + FAROL_NOME[f] + (score != null ? ' <span class="mono">' + score + '</span>' : '') + '</span>'; };
  var FAIXA_NOME = { otimo: 'Ótimo', regular: 'Regular', ruim: 'Ruim' };
  BC.pillRel = function (nota) {
    if (nota == null) return '<span class="faint">—</span>';
    return '<span class="pill ' + C.faixaRelacionamento(nota) + '">' + BC.n1(nota) + ' · ' + FAIXA_NOME[C.faixaRelacionamento(nota)] + '</span>';
  };

  // ───────────── aviso e diálogos ─────────────
  var toastTimer = null;
  BC.toast = function (msg, erro) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg; el.className = 'toast' + (erro ? ' erro' : ''); el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, erro ? 6000 : 3000);
  };
  BC.dialogo = function (html, opts) {
    var d = document.createElement('dialog');
    if (opts && opts.estreito) d.className = 'estreito';
    if (opts && opts.gaveta) { d.className = 'gaveta'; d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); }
    d.innerHTML = html;
    document.getElementById('dialogos').appendChild(d);
    d.addEventListener('close', function () { d.remove(); });
    d.showModal();
    var primeiro = d.querySelector('[autofocus], input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea');
    if (primeiro && !(opts && opts.semFoco)) { try { primeiro.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
    return d;
  };
  BC.fechar = function (el) { var d = el.closest('dialog'); if (d) d.close(); };
  BC.cabDialogo = function (titulo, sub) {
    return '<div class="dlg-cab"><div><h3>' + BC.esc(titulo) + '</h3>' + (sub ? '<p>' + BC.esc(sub) + '</p>' : '') + '</div>' +
      '<button type="button" class="btn fantasma mini" data-act="fechar" aria-label="Fechar">Fechar</button></div>';
  };
  BC.dados = function (form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { if (o[k] === undefined) o[k] = v; else if (Array.isArray(o[k])) o[k].push(v); else o[k] = [o[k], v]; });
    return o;
  };
  BC.erroForm = function (form, msg) {
    var el = form.querySelector('.erro-form');
    if (el) { el.textContent = msg; el.hidden = !msg; }
  };
  // roda uma operação assíncrona mostrando erro em vez de quebrar
  BC.seguro = async function (fn, form) {
    try { return await fn(); }
    catch (e) {
      console.error(e);
      var msg = (e && e.message) ? e.message : 'Algo deu errado.';
      if (form) BC.erroForm(form, msg); else BC.toast(msg, true);
    }
  };

  // ───────────── dica (tooltip) dos gráficos ─────────────
  var dica = null;
  function mostraDica(alvo, x, y) {
    if (!dica) { dica = document.createElement('div'); dica.className = 'dica'; dica.setAttribute('role', 'tooltip'); document.body.appendChild(dica); }
    dica.textContent = alvo.getAttribute('data-dica'); dica.hidden = false;
    var w = dica.offsetWidth, px = Math.min(Math.max(8, x + 12), window.innerWidth - w - 8);
    dica.style.left = px + 'px'; dica.style.top = Math.max(8, y - 38) + 'px';
  }
  document.addEventListener('mousemove', function (e) {
    var alvo = e.target.closest && e.target.closest('[data-dica]');
    if (alvo) mostraDica(alvo, e.clientX, e.clientY); else if (dica) dica.hidden = true;
  });
  document.addEventListener('click', function (e) {
    var alvo = e.target.closest && e.target.closest('[data-dica]');
    if (alvo) mostraDica(alvo, e.clientX, e.clientY); else if (dica) dica.hidden = true;
  });

  // ───────────── gráficos (SVG sem biblioteca) ─────────────
  function maxBonito(v) {
    if (v <= 0) return 10;
    var exp = Math.pow(10, Math.floor(Math.log10(v))), f = v / exp;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * exp;
  }
  function barraArredondada(x, y, w, h, r) {   // cantos arredondados só no topo
    r = Math.min(r, w / 2, h);
    if (h <= 0) return '';
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }
  BC.graf = {
    // barras simples (ex.: leads por semana), com linha de meta opcional
    barras: function (valores, rotulos, opts) {
      opts = opts || {};
      var W = 340, H = 130, pe = 28, pd = 6, pt = 12, pb = 20, n = valores.length;
      if (!n) return '<p class="vazio">Sem dados ainda.</p>';
      var topo = maxBonito(Math.max.apply(null, valores.concat([opts.meta || 0])));
      var pw = W - pe - pd, ph = H - pt - pb, passo = pw / n, bw = Math.min(26, passo * 0.62);
      var s = '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + BC.esc(opts.titulo || 'Gráfico de barras') + '">';
      [0, topo / 2, topo].forEach(function (t) {
        var y = pt + ph - (t / topo) * ph;
        s += '<line class="grade" x1="' + pe + '" x2="' + (W - pd) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (pe - 5) + '" y="' + (y + 3.5) + '" text-anchor="end">' + Math.round(t) + '</text>';
      });
      valores.forEach(function (v, i) {
        var h = (v / topo) * ph, x = pe + passo * i + (passo - bw) / 2, y = pt + ph - h;
        var ultimo = i === n - 1;
        s += '<path d="' + barraArredondada(x, y, bw, h, 3) + '" fill="var(--accent)" opacity="' + (ultimo ? 1 : 0.55) + '"/>';
        s += '<rect x="' + (pe + passo * i) + '" y="' + pt + '" width="' + passo + '" height="' + (ph + pb - 4) + '" fill="transparent" data-dica="' + BC.esc(rotulos[i] + ': ' + v + (opts.unid || '')) + '"/>';
        if (ultimo) s += '<text x="' + (x + bw / 2) + '" y="' + (y - 4) + '" text-anchor="middle" style="fill:var(--ink);font-weight:600">' + v + '</text>';
        if (i === 0 || ultimo || n <= 6) s += '<text x="' + (x + bw / 2) + '" y="' + (H - 5) + '" text-anchor="middle">' + BC.esc(rotulos[i]) + '</text>';
      });
      if (opts.meta) {
        var ym = pt + ph - (opts.meta / topo) * ph;
        s += '<line x1="' + pe + '" x2="' + (W - pd) + '" y1="' + ym + '" y2="' + ym + '" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/>';
        s += '<text x="' + (W - pd) + '" y="' + (ym - 4) + '" text-anchor="end" style="fill:var(--ink)">meta ' + opts.meta + '</text>';
      }
      return s + '</svg>';
    },
    // linha de nota 0–10 com as faixas de 7 e 9
    notas: function (valores, rotulos) {
      var W = 340, H = 130, pe = 24, pd = 10, pt = 12, pb = 20, n = valores.length;
      if (!n) return '<p class="vazio">Sem notas de relacionamento ainda.</p>';
      var pw = W - pe - pd, ph = H - pt - pb;
      function X(i) { return n === 1 ? pe + pw / 2 : pe + (pw * i) / (n - 1); }
      function Y(v) { return pt + ph - (v / 10) * ph; }
      var s = '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Nota de relacionamento por semana">';
      [0, 5, 10].forEach(function (t) { s += '<line class="grade" x1="' + pe + '" x2="' + (W - pd) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (pe - 5) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + t + '</text>'; });
      [7, 9].forEach(function (t) { s += '<line x1="' + pe + '" x2="' + (W - pd) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="var(--ink-3)" stroke-dasharray="3 3"/><text x="' + (W - pd) + '" y="' + (Y(t) - 3) + '" text-anchor="end">' + t + '</text>'; });
      var pts = valores.map(function (v, i) { return X(i) + ',' + Y(v); }).join(' ');
      s += '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      valores.forEach(function (v, i) {
        var ult = i === n - 1;
        s += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (ult ? 5 : 3.5) + '" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>';
        s += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="14" fill="transparent" data-dica="' + BC.esc(rotulos[i] + ': ' + BC.n1(v)) + '"/>';
        if (ult) s += '<text x="' + X(i) + '" y="' + (Y(v) - 9) + '" text-anchor="end" style="fill:var(--ink);font-weight:600">' + BC.n1(v) + '</text>';
        if (i === 0 || ult) s += '<text x="' + X(i) + '" y="' + (H - 5) + '" text-anchor="' + (i === 0 ? 'start' : 'end') + '">' + BC.esc(rotulos[i]) + '</text>';
      });
      return s + '</svg>';
    },
    // MRR: histórico (barras neutras), contratado (barras azuis) e esperado (linha com pontos)
    mrr: function (hist, prev) {
      var W = 640, H = 250, pe = 54, pd = 10, pt = 16, pb = 26;
      var meses = hist.map(function (x) { return { mes: x.mes, tipo: 'hist', mrr: x.mrr }; })
        .concat(prev.slice(1).map(function (x) { return { mes: x.mes, tipo: 'prev', contratado: x.contratado, esperado: x.esperado }; }));
      var maxV = Math.max.apply(null, meses.map(function (m) { return Math.max(m.mrr || 0, m.contratado || 0, m.esperado || 0); }).concat([1]));
      var topo = maxBonito(maxV * 1.05), pw = W - pe - pd, ph = H - pt - pb, n = meses.length, passo = pw / n, bw = Math.min(34, passo * 0.56);
      function Y(v) { return pt + ph - (v / topo) * ph; }
      var s = '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="MRR histórico e previsão para os próximos meses">';
      [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
        var v = topo * f;
        s += '<line class="grade" x1="' + pe + '" x2="' + (W - pd) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text x="' + (pe - 6) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + (v >= 1000 ? (Math.round(v / 100) / 10).toString().replace('.', ',') + ' mil' : Math.round(v)) + '</text>';
      });
      var linha = [];
      meses.forEach(function (m, i) {
        var cx = pe + passo * i + passo / 2, x = cx - bw / 2;
        var valor = m.tipo === 'hist' ? m.mrr : m.contratado;
        var cor = m.tipo === 'hist' ? 'var(--ink-3)' : 'var(--accent)';
        var tip = m.tipo === 'hist' ? BC.mes(m.mes) + ': ' + BC.brl(m.mrr) : BC.mes(m.mes) + ' · contratado ' + BC.brl(m.contratado) + ' · esperado ' + BC.brl(m.esperado);
        s += '<path d="' + barraArredondada(x, Y(valor), bw, (valor / topo) * ph, 4) + '" fill="' + cor + '"/>';
        if (m.tipo === 'prev') linha.push({ cx: cx, y: Y(m.esperado), m: m });
        s += '<rect x="' + (cx - passo / 2) + '" y="' + pt + '" width="' + passo + '" height="' + (ph + pb - 6) + '" fill="transparent" data-dica="' + BC.esc(tip) + '"/>';
        s += '<text x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle">' + BC.mes(m.mes) + '</text>';
      });
      if (linha.length) {
        s += '<polyline points="' + linha.map(function (p) { return p.cx + ',' + p.y; }).join(' ') + '" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>';
        linha.forEach(function (p, i) {
          s += '<circle cx="' + p.cx + '" cy="' + p.y + '" r="4.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/>';
          if (i === linha.length - 1) s += '<text x="' + p.cx + '" y="' + (p.y - 9) + '" text-anchor="end" style="fill:var(--ink);font-weight:600">' + BC.brl(p.m.esperado) + '</text>';
        });
      }
      return s + '</svg>' +
        '<div class="legenda"><span><i style="background:var(--ink-3)"></i>Histórico (MRR do mês)</span><span><i style="background:var(--accent)"></i>Contratado (contratos vigentes)</span><span><i style="background:var(--ink);border-radius:50%"></i>Esperado (com renovações prováveis)</span></div>';
    }
  };
})(window);
