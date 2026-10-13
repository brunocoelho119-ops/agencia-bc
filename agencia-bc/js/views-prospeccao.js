/* Agência BC · tela de prospecção (CRM): indicadores, "Pra hoje", novo contato, quadro, lista e funil. */
(function (root) {
  'use strict';
  var C = root.BCCalc, S = root.BCStore, BC = root.BC, esc = BC.esc;
  var ORIGEM_NOME = { lista: 'Lista', meta_ads: 'Meta Ads', indicacao: 'Indicação', outro: 'Outro' };
  var CANAIS = [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram DM'], ['email', 'E-mail'], ['ligacao', 'Ligação'], ['linkedin', 'LinkedIn'], ['presencial', 'Presencial']];

  function aberto(p) { return p.etapa !== 'fechado' && p.etapa !== 'perdido'; }
  function titulo(p) { return p.nome || p.negocio || 'Sem nome'; }
  function sub(p) {
    var a = [];
    if (p.negocio && p.negocio !== p.nome) a.push(p.negocio);
    if (p.nicho && p.nicho !== p.negocio) a.push(p.nicho);
    if (p.cidade) a.push(p.cidade);
    return a.join(' · ');
  }
  function digitos(t) { return String(t || '').replace(/\D/g, ''); }

  // ícones de contato: W (WhatsApp), @ (e-mail), IG (Instagram), telefone
  BC.iconesContato = function (p) {
    var wa = BC.waLink(p.telefone), ig = BC.igLink(p.instagram), d = digitos(p.telefone);
    function ico(href, txt, rot, extra) {
      return href ? '<a class="ico-c" href="' + esc(href) + '" target="_blank" rel="noopener" title="' + rot + '" aria-label="' + rot + '">' + txt + '</a>'
        : '<span class="ico-c off" title="' + rot + ': não informado" aria-label="' + rot + ' não informado">' + txt + '</span>';
    }
    return '<span class="ico-linha">' +
      ico(wa, 'W', 'WhatsApp') +
      ico(p.email ? 'mailto:' + p.email : '', '@', 'E-mail') +
      ico(ig, 'IG', 'Instagram') +
      ico(d ? 'tel:+' + d : '', '&#9742;', 'Ligar') + '</span>';
  };

  function quando(p, h) {
    if (!p.proxima_data) return '';
    var d = C.diffDias(h, p.proxima_data);
    if (d < 0) return '<span class="chip atrasado">atrasado · ' + BC.rotuloDias(d) + '</span>';
    if (d === 0) return '<span class="chip hoje">é hoje</span>';
    return '<span class="chip">' + BC.dataCurta(p.proxima_data) + '</span>';
  }

  // ───────── cartão do quadro ─────────
  function cartao(p, h) {
    var prox = C.ORDEM_FUNIL[C.ORDEM_FUNIL.indexOf(p.etapa) + 1];
    return '<div class="cartao" data-act="abrir-prospect" data-id="' + esc(p.id) + '" tabindex="0">' +
      '<div class="t">' + esc(titulo(p)) + '</div>' +
      (sub(p) ? '<div class="d">' + esc(sub(p)) + '</div>' : '') +
      '<div class="linha">' + quando(p, h) + (p.origem === 'meta_ads' ? '<span class="chip acc">Meta Ads</span>' : '') + (p.toques ? '<span class="chip">' + p.toques + (p.toques === 1 ? ' toque' : ' toques') + '</span>' : '') + '</div>' +
      '<div class="linha">' + BC.iconesContato(p) + '</div>' +
      (prox ? '<div class="linha"><button type="button" class="btn-av" data-act="avancar" data-id="' + esc(p.id) + '">' + (prox === 'fechado' ? 'fechar cliente' : 'avançar') + ' &rarr;</button></div>' : '') +
      '</div>';
  }
  function filtrar(todos) {
    var u = BC.ui, q = C.semAcento(u.pBusca || '').trim();
    return todos.filter(function (p) {
      if (u.pEtapa && p.etapa !== u.pEtapa) return false;
      if (u.pOrigem && p.canal !== u.pOrigem) return false; // pOrigem guarda o canal
      if (q && C.semAcento([p.nome, p.negocio, p.nicho, p.cidade, p.telefone, p.instagram, p.email].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
  }
  function quadro(h, todos) {
    var out = '<div class="quadro">';
    C.ORDEM_FUNIL.forEach(function (et) {
      var col = todos.filter(function (p) { return p.etapa === et; });
      col.sort(function (a, b) { return (a.proxima_data || '9999') < (b.proxima_data || '9999') ? -1 : 1; });
      out += '<div class="col"><div class="col-cab">' + esc(BC.nomeEtapa(et)) + '<span>' + col.length + '</span></div>';
      col.slice(0, 40).forEach(function (p) { out += cartao(p, h); });
      if (col.length > 40) out += '<p class="small muted" style="padding:4px 6px">+ ' + (col.length - 40) + ' na vista Lista</p>';
      if (!col.length) out += '<p class="small faint" style="padding:6px 4px">vazio</p>';
      out += '</div>';
    });
    return out + '</div>';
  }
  function lista(h, todos) {
    if (!todos.length) return '<p class="vazio">Nenhum contato com esses filtros.</p>';
    todos = todos.slice().sort(function (a, b) { return (b.atualizado_em || b.created_at || '') < (a.atualizado_em || a.created_at || '') ? -1 : 1; });
    return '<div class="rolagem"><table class="tabela"><thead><tr><th>Contato</th><th class="hide-s">Telefone</th><th class="hide-s">Origem</th><th>Etapa</th><th>Próxima etapa</th><th class="num hide-s">Toques</th></tr></thead><tbody>' +
      todos.slice(0, 300).map(function (p) {
        return '<tr class="clicavel" data-act="abrir-prospect" data-id="' + esc(p.id) + '"><td><div class="nome">' + esc(titulo(p)) + '</div><div class="small faint">' + esc(sub(p)) + '</div></td>' +
          '<td class="hide-s nowrap mono small">' + esc(p.telefone || '—') + '</td><td class="hide-s">' + esc(ORIGEM_NOME[p.origem] || p.origem) + '</td>' +
          '<td><span class="tag">' + esc(BC.nomeEtapa(p.etapa)) + '</span></td><td>' + (quando(p, h) || '<span class="faint">—</span>') + (p.proxima_acao ? ' <span class="small muted">' + esc(p.proxima_acao) + '</span>' : '') + '</td><td class="num hide-s">' + (p.toques || 0) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="small faint" style="margin-top:6px">' + todos.length + ' contatos.</p>';
  }

  // ───────── funil ─────────
  function funilHTML(todos) {
    if (!todos.length) return '<p class="vazio">Sem contatos ainda.</p>';
    var f = C.funil(todos), total = f[0].n || 1;
    var out = '<div class="colunas"><section class="bloco"><div class="bloco-cab"><h2>Funil</h2></div><div class="barras">' + f.map(function (e, i) {
      return '<div class="barra"><span>' + esc(e.nome) + '</span><div class="trilho"><i style="width:' + (e.n / total * 100) + '%"></i></div><span class="v">' + e.n + (i > 0 && e.deAnterior != null ? ' · ' + BC.pct(e.deAnterior) : '') + '</span></div>';
    }).join('') + '</div><p class="small faint" style="margin-top:10px">A porcentagem é sobre a etapa anterior. Conta quem já passou por cada etapa, inclusive os perdidos depois.</p></section>';
    out += '<section class="bloco"><div class="bloco-cab"><h2>Por origem</h2></div><div class="rolagem"><table class="tabela"><thead><tr><th>Origem</th><th class="num">Contatos</th><th class="num">Responderam</th><th class="num">Fechados</th><th class="num">Conversão</th></tr></thead><tbody>' +
      Object.keys(ORIGEM_NOME).map(function (o) {
        var ps = todos.filter(function (p) { return p.origem === o; }); if (!ps.length) return '';
        var ff = C.funil(ps);
        return '<tr><td>' + ORIGEM_NOME[o] + '</td><td class="num">' + ps.length + '</td><td class="num">' + ff[2].n + '</td><td class="num">' + ff[6].n + '</td><td class="num">' + BC.pct(ps.length ? ff[6].n / ps.length : null, 1) + '</td></tr>';
      }).join('') + '</tbody></table></div></section></div>';
    var perdidos = todos.filter(function (p) { return p.etapa === 'perdido'; }), pm = {};
    perdidos.forEach(function (p) { var k = p.motivo_perda || 'Sem motivo'; pm[k] = (pm[k] || 0) + 1; });
    if (perdidos.length) {
      var ks = Object.keys(pm).sort(function (a, b) { return pm[b] - pm[a]; }), mx = pm[ks[0]];
      out += '<section class="bloco espaco"><div class="bloco-cab"><h2>Motivos de perda</h2></div><div class="barras">' + ks.map(function (k) {
        return '<div class="barra"><span>' + esc(k) + '</span><div class="trilho"><i style="width:' + (pm[k] / mx * 100) + '%"></i></div><span class="v">' + pm[k] + '</span></div>';
      }).join('') + '</div></section>';
    }
    return out;
  }

  // ───────── novo contato (inline) ─────────
  function formNovo() {
    var o = CANAIS.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('');
    return '<form class="novo-contato" data-form="prospect" data-id="" id="form-novo" autocomplete="off">' +
      '<div class="nc-cab"><span class="nc-mais">+</span><div><h3>NOVO CONTATO</h3><p class="small muted">Só o nome já basta pra começar. O resto você completa depois, na ficha.</p></div></div>' +
      '<div class="nc-grade">' +
      '<div class="campo"><label for="nc-nome">Nome do contato</label><input id="nc-nome" name="nome" type="text" placeholder="Ex: Rafael Souza" required></div>' +
      '<div class="campo"><label for="nc-negocio">Negócio / nicho</label><input id="nc-negocio" name="negocio" type="text" placeholder="Ex: Barbearia Imperial, estética"></div>' +
      '<div class="campo"><label for="nc-tel">Telefone / WhatsApp</label><input id="nc-tel" name="telefone" type="tel" inputmode="tel" placeholder="Ex: (19) 99999-8888"></div>' +
      '<div class="campo"><label for="nc-email">E-mail</label><input id="nc-email" name="email" type="email" placeholder="Ex: rafael@barbearia.com"></div>' +
      '<div class="campo"><label for="nc-ig">@ do Instagram</label><input id="nc-ig" name="instagram" type="text" placeholder="Ex: @barbeariaimperial"></div>' +
      '<div class="campo"><label for="nc-canal">Canal do primeiro toque</label><select id="nc-canal" name="canal">' + o + '</select></div>' +
      '<div class="campo"><label for="nc-prox">Próxima etapa</label><input id="nc-prox" name="proxima_data" type="date" value="' + C.hoje() + '"></div></div>' +
      '<input type="hidden" name="etapa" value="novo"><input type="hidden" name="origem" value="lista">' +
      '<p class="erro-form" hidden role="alert"></p>' +
      '<div class="nc-rodape"><button type="button" class="btn" data-act="cancelar-novo">Cancelar</button><button type="submit" class="btn primario">Adicionar contato</button></div></form>';
  }

  BC.views.prospeccao = function () {
    var h = C.hoje(), todos = S.all('prospects'), u = BC.ui;
    var meta = Number(S.cfg('meta_diaria', 5)) || 5;
    var datas = S.all('atividades').filter(function (a) { return a.tipo === 'toque'; }).map(function (a) { return C.dataLocalDe(a.created_at); });
    var sq = C.sequencia(datas, meta, h);
    var abertos = todos.filter(aberto);
    var leads = abertos.filter(function (p) { return p.origem === 'meta_ads' && p.etapa === 'novo'; });
    var devidos = abertos.filter(function (p) { return p.proxima_data && p.proxima_data <= h && leads.indexOf(p) < 0; })
      .sort(function (a, b) { return a.proxima_data < b.proxima_data ? -1 : 1; });
    var pendentes = leads.concat(devidos);
    var f = C.funil(todos);
    function taxa(a, b) { return b ? BC.pct(a / b, 0) : '—'; }
    var kpis = [
      ['Etapas pra hoje', pendentes.length, true], ['No painel', abertos.length], ['Em cadência', abertos.filter(function (p) { return p.etapa === 'abordado'; }).length],
      ['Taxa de resposta', taxa(f[2].n, f[1].n)], ['Resposta → reunião', taxa(f[4].n, f[2].n)], ['Reunião → cliente', taxa(f[6].n, f[4].n)], ['Fechados', todos.filter(function (p) { return p.etapa === 'fechado'; }).length]
    ];

    var out = '<div class="pros-topo"><span class="pill-marca">CRM</span>' +
      '<div class="pros-meta"><span title="Dias úteis seguidos batendo a meta"><i class="losango"></i>' + sq.streak + (sq.streak === 1 ? ' dia' : ' dias') + '</span>' +
      '<label>Meta/dia <input type="number" min="1" max="200" value="' + meta + '" data-change="meta-dia" aria-label="Meta de toques por dia"></label>' +
      '<span>hoje: ' + sq.hoje + '/' + meta + '</span></div></div>';
    out += '<div class="kpis">' + kpis.map(function (k) { return '<div class="kpi' + (k[2] ? ' dest' : '') + '"><div class="rot">' + k[0] + '</div><div class="val">' + k[1] + '</div></div>'; }).join('') + '</div>';

    // Pra hoje
    out += '<section class="pra-hoje"><div class="ph-cab"><span>Pra hoje · o painel que te cobra</span><span>' + pendentes.length + '</span></div><div class="ph-corpo">';
    if (!pendentes.length) {
      var falta = Math.max(0, meta - sq.hoje);
      out += '<p class="ph-ok"><strong>&#10003; Nenhuma etapa pendente.</strong> ' + (falta ? 'Agora é abrir conversa nova: faltam ' + falta + ' pra bater a meta de hoje.' : 'Meta de hoje batida.') + '</p>';
    } else {
      out += '<ul class="linhas">' + pendentes.map(function (p) {
        var wa = BC.waLink(p.telefone);
        return '<li><div class="corpo"><div class="tit">' + esc(titulo(p)) + ' <span class="tag">' + esc(BC.nomeEtapa(p.etapa)) + '</span>' + (p.origem === 'meta_ads' ? ' <span class="chip acc">Meta Ads</span>' : '') + '</div>' +
          '<div class="det">' + esc(sub(p)) + (sub(p) ? ' · ' : '') + esc(p.proxima_acao || (p.origem === 'meta_ads' ? 'Responder o lead' : 'Follow-up')) + ' ' + quando(p, h) +
          (p.abordagem ? '' : ' <span class="tag">sem abordagem</span>') + (p.diagnostico ? '' : ' <span class="tag">sem mini-diagnóstico</span>') + '</div></div>' +
          '<div class="acoes">' + (wa ? '<a class="btn mini" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
          '<button class="btn mini primario" data-act="toque" data-id="' + esc(p.id) + '">Toque</button>' +
          (p.etapa === 'abordado' || p.etapa === 'novo' ? '<button class="btn mini" data-act="respondeu" data-id="' + esc(p.id) + '">Respondeu</button>' : '') +
          '<button class="btn mini fantasma" data-act="abrir-prospect" data-id="' + esc(p.id) + '">Abrir</button></div></li>';
      }).join('') + '</ul>';
    }
    out += '</div></section>';

    // barra de ferramentas
    out += '<div class="barra-fer"><button class="btn primario" data-act="novo-prospect">+ Novo contato</button>' +
      '<input type="search" id="busca-pros" placeholder="Buscar nome, negócio, cidade…" value="' + esc(u.pBusca) + '" data-input="busca-pros" aria-label="Buscar contatos">' +
      '<select data-change="filtro-pros" data-filtro="pEtapa" aria-label="Etapa"><option value="">Todas as etapas</option>' + C.ETAPAS.map(function (e) { return '<option value="' + e.id + '"' + (u.pEtapa === e.id ? ' selected' : '') + '>' + esc(e.nome) + '</option>'; }).join('') + '</select>' +
      '<select data-change="filtro-pros" data-filtro="pOrigem" aria-label="Canal"><option value="">Todos os canais</option>' + CANAIS.map(function (c) { return '<option value="' + c[0] + '"' + (u.pOrigem === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select>' +
      '<span class="seg" role="radiogroup" aria-label="Vista">' + [['quadro', 'Quadro'], ['lista', 'Lista'], ['funil', 'Funil']].map(function (v) {
        return '<label><input type="radio" name="vista" value="' + v[0] + '"' + (u.pVista === v[0] ? ' checked' : '') + ' data-change="pros-vista"><span style="width:auto;padding:0 14px;font-family:var(--f-body);font-weight:700">' + v[1] + '</span></label>';
      }).join('') + '</span>' +
      '<span class="barra-fer-fim"><button class="btn" data-act="importar">Importar planilha</button><button class="btn" data-act="exportar-csv">Exportar CSV</button>' +
      (S.temExemplos() ? '<button class="btn fantasma" data-act="limpar-exemplos">Limpar exemplos</button>' : '<button class="btn fantasma" data-act="carregar-exemplos">Exemplo</button>') + '</span></div>';

    if (u.novoAberto) out += formNovo();

    if (!todos.length) return out + '<div class="vazio"><p><strong>Nenhum contato ainda.</strong></p><p style="margin-top:6px">Comece cadastrando 20 contatos do mesmo nicho (um nicho por lote deixa o script específico e a taxa de resposta sobe), ou importe sua planilha. Os leads do tráfego pago também caem aqui.</p></div>';
    var vis = filtrar(todos);
    out += '<div id="vista-pros">' + (u.pVista === 'lista' ? lista(h, vis) : u.pVista === 'funil' ? funilHTML(todos) : quadro(h, vis)) + '</div>';
    return out;
  };

  BC.act['pros-vista'] = function (el) { BC.ui.pVista = el.value; BC.render(); };
  BC.act['filtro-pros'] = function (el) { BC.ui[el.dataset.filtro] = el.value; BC.render(); };
  BC.act['busca-pros'] = function (el) {
    BC.ui.pBusca = el.value;
    var alvo = document.getElementById('vista-pros'); if (!alvo) return;
    var vis = filtrar(S.all('prospects')), h = C.hoje();
    alvo.innerHTML = BC.ui.pVista === 'lista' ? lista(h, vis) : (BC.ui.pVista === 'funil' ? alvo.innerHTML : quadro(h, vis));
  };
  BC.act['meta-dia'] = function (el) {
    var n = Math.max(1, Math.min(200, parseInt(el.value, 10) || 5));
    S.setCfg('meta_diaria', n);
  };
  BC.act['novo-prospect'] = function () {
    BC.ui.novoAberto = !BC.ui.novoAberto;
    if (location.hash !== '#prospeccao') { location.hash = '#prospeccao'; return; }
    BC.render();
    var f = document.getElementById('form-novo');
    if (f) { if (f.scrollIntoView) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); var i = document.getElementById('nc-nome'); if (i) i.focus({ preventScroll: true }); }
  };
  BC.act['cancelar-novo'] = function () { BC.ui.novoAberto = false; BC.render(); };

  BC.act['exportar-csv'] = function () {
    var cols = [['nome', 'Nome'], ['negocio', 'Negócio'], ['nicho', 'Nicho'], ['cidade', 'Cidade'], ['telefone', 'Telefone'], ['email', 'E-mail'], ['instagram', 'Instagram'], ['origem', 'Origem'], ['canal', 'Canal'], ['etapa', 'Etapa'], ['toques', 'Toques'], ['proxima_data', 'Próxima etapa'], ['notas', 'Notas']];
    function cel(v) { v = v == null ? '' : String(v); return /[";\n,]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var linhas = [cols.map(function (c) { return c[1]; }).join(',')].concat(S.all('prospects').map(function (p) { return cols.map(function (c) { return cel(c[0] === 'etapa' ? BC.nomeEtapa(p.etapa) : p[c[0]]); }).join(','); }));
    var csv = linhas.join('\n');
    try { navigator.clipboard.writeText(csv).then(function () { BC.toast('CSV copiado. Cole em uma planilha.'); }, function () { baixar(csv); }); } catch (e) { baixar(csv); }
    function baixar(txt) {
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv' })); a.download = 'prospeccao.csv'; document.body.appendChild(a); a.click(); a.remove(); BC.toast('CSV exportado.'); }
      catch (e2) { BC.toast('Não consegui exportar neste navegador.', true); }
    }
  };
})(window);
