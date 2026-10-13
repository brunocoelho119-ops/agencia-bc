/* Agência BC · telas da carteira: painel, clientes, ficha do cliente, churn, previsão, dados. */
(function (root) {
  'use strict';
  var C = root.BCCalc, S = root.BCStore, BC = root.BC, esc = BC.esc;

  // contexto compartilhado pelas telas
  BC.ctx = function () {
    var h = C.hoje(), clientes = S.all('clientes');
    var ativos = clientes.filter(function (c) { return c.status !== 'churn'; });
    var checkins = S.all('checkins'), feedbacks = S.all('feedbacks'), saude = {};
    ativos.forEach(function (c) { saude[c.id] = C.saude(c, checkins, feedbacks, h); });
    return { h: h, clientes: clientes, ativos: ativos, checkins: checkins, feedbacks: feedbacks, saude: saude, curva: C.curvaABC(ativos), semana: C.inicioSemana(h) };
  };
  function checkinsDe(x, id) {
    return x.checkins.filter(function (k) { return k.cliente_id === id; }).sort(function (a, b) { return a.semana < b.semana ? 1 : (a.semana > b.semana ? -1 : 0); });
  }
  function linkCli(c) { return '<a href="#c-' + esc(c.id) + '" class="tit" style="text-decoration:none;color:inherit">' + esc(c.nome) + '</a>'; }
  function soma(arr, f) { return C.soma(arr, f); }
  var SEV = { vermelho: 0, amarelo: 1, verde: 2 };

  function bannerExemplos() {
    if (!S.temExemplos()) return '';
    return '<div class="aviso"><span>Você está vendo <strong>dados de exemplo</strong> (clientes e contatos fictícios) para testar a ferramenta. Seus dados reais ficam misturados até você limpar.</span>' +
      '<button class="btn mini" data-act="limpar-exemplos">Limpar exemplos</button></div>';
  }
  function bannerArmazenamento() {
    if (S.persistente()) return '';
    return '<div class="aviso warn"><span>Este navegador não está guardando os dados (armazenamento bloqueado). Eles valem só enquanto a página estiver aberta. No Supabase isso deixa de ser um problema.</span></div>';
  }
  function estadoVazio() {
    return '<div class="bloco"><div class="vazio" style="padding:22px 0"><p><strong>Nenhum dado ainda.</strong></p>' +
      '<p style="margin-top:6px">Cadastre seu primeiro cliente, importe uma planilha de prospecção ou carregue dados de exemplo para ver tudo funcionando.</p>' +
      '<div class="pagehead-acoes" style="margin-top:14px"><button class="btn primario" data-act="novo-cliente">+ Cliente</button><button class="btn" data-act="importar">Importar planilha de prospecção</button><button class="btn" data-act="carregar-exemplos">Carregar exemplos</button></div></div></div>';
  }

  // ───────────── painel ─────────────
  BC.views.painel = function () {
    var x = BC.ctx(), h = x.h;
    var mrr = soma(x.ativos, function (c) { return c.mensalidade; });
    var atencao = x.ativos.filter(function (c) { return x.saude[c.id].farol !== 'verde'; })
      .sort(function (a, b) { return x.saude[a.id].score - x.saude[b.id].score; });
    var feitos = x.ativos.filter(function (c) { return x.checkins.some(function (k) { return k.cliente_id === c.id && k.semana === x.semana; }); });
    var pend = x.ativos.filter(function (c) { return feitos.indexOf(c) < 0; });
    var renov = x.ativos.filter(function (c) { return C.diasParaFim(c, h) <= 60; }).sort(function (a, b) { return C.diasParaFim(a, h) - C.diasParaFim(b, h); });

    // prospecção
    var meta = Number(S.cfg('meta_diaria', 5)) || 5;
    var datas = S.all('atividades').filter(function (a) { return a.tipo === 'toque'; }).map(function (a) { return C.dataLocalDe(a.created_at); });
    var sq = C.sequencia(datas, meta, h);
    var abertos = S.all('prospects').filter(function (p) { return p.etapa !== 'fechado' && p.etapa !== 'perdido'; });
    var devidos = abertos.filter(function (p) { return p.proxima_data && p.proxima_data <= h; });
    var leadsNovos = abertos.filter(function (p) { return p.origem === 'meta_ads' && p.etapa === 'novo'; });

    var out = '<div class="pagehead"><div><h1>Painel</h1><p class="sub">' + esc(BC.dataLonga(h)) + '</p></div>' +
      '<div class="pagehead-acoes"><button class="btn primario" data-act="checkin">Check-in semanal</button><button class="btn" data-act="novo-cliente">+ Cliente</button></div></div>';
    out += bannerArmazenamento() + bannerExemplos();
    if (!S.temDados()) return out + estadoVazio();

    out += '<div class="faixa">' +
      '<div><div class="rot">MRR ativo</div><div class="val">' + BC.brl(mrr) + '</div><div class="nota">ticket médio ' + BC.brl(x.ativos.length ? mrr / x.ativos.length : 0) + '</div></div>' +
      '<div><div class="rot">Clientes ativos</div><div class="val">' + x.ativos.length + '</div><div class="nota">LT médio ' + BC.n1(x.ativos.length ? soma(x.ativos, function (c) { return C.ltMeses(c, h); }) / x.ativos.length : 0) + ' meses</div></div>' +
      '<div><div class="rot">Em atenção</div><div class="val">' + atencao.length + '</div><div class="nota">' + atencao.filter(function (c) { return x.saude[c.id].farol === 'vermelho'; }).length + ' em vermelho</div></div>' +
      '<div><div class="rot">Check-ins da semana</div><div class="val">' + feitos.length + '<span class="faint" style="font-size:16px"> / ' + x.ativos.length + '</span></div><div class="nota">semana de ' + BC.dataCurta(x.semana) + '</div></div>' +
      '</div>';

    out += '<div class="colunas">';

    // atenção
    out += '<section class="bloco"><div class="bloco-cab"><h2>Clientes em atenção</h2><a href="#clientes" class="small">Ver carteira</a></div>';
    if (!atencao.length) out += '<p class="vazio">Nenhum cliente em amarelo ou vermelho. Siga o ritmo dos check-ins.</p>';
    else out += '<ul class="linhas">' + atencao.slice(0, 6).map(function (c) {
      var s = x.saude[c.id];
      return '<li><div class="corpo">' + linkCli(c) + ' ' + BC.pillFarol(s.farol, s.score) + '<div class="det">' +
        s.motivos.slice(0, 2).map(function (m) { return esc(m.texto); }).join(' · ') + '</div></div>' +
        '<div class="acoes"><button class="btn mini" data-act="checkin" data-id="' + esc(c.id) + '">Check-in</button></div></li>';
    }).join('') + '</ul>';
    out += '</section>';

    // check-ins pendentes
    out += '<section class="bloco"><div class="bloco-cab"><h2>Check-in da semana</h2><span class="small muted">' + feitos.length + ' de ' + x.ativos.length + ' feitos</span></div>';
    out += '<div class="progresso' + (pend.length ? '' : ' ok') + '" style="margin-bottom:6px" role="progressbar" aria-valuenow="' + feitos.length + '" aria-valuemax="' + x.ativos.length + '"><i style="width:' + (x.ativos.length ? feitos.length / x.ativos.length * 100 : 0) + '%"></i></div>';
    if (!pend.length) out += '<p class="vazio">Todos os check-ins da semana estão feitos.</p>';
    else out += '<ul class="linhas">' + pend.map(function (c) {
      var u = checkinsDe(x, c.id)[0];
      return '<li><div class="corpo">' + linkCli(c) + '<div class="det">' + (u ? 'Último check-in: semana de ' + BC.dataCurta(u.semana) : 'Ainda sem check-in') + '</div></div>' +
        '<div class="acoes"><button class="btn mini primario" data-act="checkin" data-id="' + esc(c.id) + '">Fazer check-in</button></div></li>';
    }).join('') + '</ul>';
    out += '</section>';

    // prospecção hoje
    out += '<section class="bloco"><div class="bloco-cab"><h2>CRM hoje</h2><a href="#prospeccao" class="small">Abrir CRM</a></div>' +
      '<div class="resumo-pros" style="margin-bottom:10px"><div class="item"><div class="rot">Toques hoje</div><div class="val">' + sq.hoje + '<span class="faint" style="font-size:16px"> / ' + meta + '</span></div></div>' +
      '<div class="item"><div class="rot">Sequência</div><div class="val">' + sq.streak + '<span class="faint" style="font-size:16px"> ' + (sq.streak === 1 ? 'dia útil' : 'dias úteis') + '</span></div></div></div>' +
      '<div class="progresso' + (sq.hoje >= meta ? ' ok' : '') + '" style="margin-bottom:10px"><i style="width:' + Math.min(100, sq.hoje / meta * 100) + '%"></i></div>' +
      '<ul class="linhas"><li><div class="corpo">Follow-ups para hoje ou atrasados</div><div class="num">' + devidos.length + '</div></li>' +
      '<li><div class="corpo">Leads novos do tráfego pago</div><div class="num">' + leadsNovos.length + '</div></li>' +
      '<li><div class="corpo">Contatos em andamento</div><div class="num">' + abertos.filter(function (p) { return p.etapa !== 'novo'; }).length + '</div></li></ul></section>';

    // renovações
    out += '<section class="bloco"><div class="bloco-cab"><h2>Contratos a renovar (60 dias)</h2></div>';
    if (!renov.length) out += '<p class="vazio">Nenhum contrato termina nos próximos 60 dias.</p>';
    else out += '<ul class="linhas">' + renov.map(function (c) {
      var d = C.diasParaFim(c, h), s = x.saude[c.id];
      return '<li><div class="corpo">' + linkCli(c) + ' ' + BC.pillFarol(s.farol) + '<div class="det">' + (d < 0 ? 'Venceu ' + BC.rotuloDias(d) : 'Termina ' + BC.rotuloDias(d)) + ' (' + BC.data(C.fimContrato(c)) + ') · ' + BC.brl(c.mensalidade) + '/mês</div></div>' +
        '<div class="acoes"><button class="btn mini" data-act="novo-feedback" data-id="' + esc(c.id) + '">+ Feedback</button></div></li>';
    }).join('') + '</ul>';
    out += '</section></div>';
    return out;
  };

  // ───────────── clientes ─────────────
  BC.views.clientes = function () {
    var x = BC.ctx(), h = x.h, ui = BC.ui;
    var lista = x.ativos.slice().sort(function (a, b) { return x.saude[a.id].score - x.saude[b.id].score || String(a.nome).localeCompare(String(b.nome)); });
    if (ui.filtroRisco) lista = lista.filter(function (c) { return x.saude[c.id].farol !== 'verde'; });
    var mrr = soma(x.ativos, function (c) { return c.mensalidade; });

    var out = '<div class="pagehead"><div><h1>Clientes</h1><p class="sub">' + x.ativos.length + ' ativos · MRR ' + BC.brl(mrr) + '</p></div>' +
      '<div class="pagehead-acoes"><button class="btn' + (ui.filtroRisco ? ' primario' : '') + '" data-act="toggle-risco" aria-pressed="' + ui.filtroRisco + '">Só em atenção</button>' +
      '<button class="btn primario" data-act="novo-cliente">+ Cliente</button></div></div>' + bannerExemplos();
    if (!x.ativos.length) return out + '<p class="vazio">Nenhum cliente ativo. Use “+ Cliente” para cadastrar o primeiro.</p>';
    out += '<div class="rolagem"><table class="tabela"><thead><tr><th>Cliente</th><th>Curva</th><th class="num">Mensalidade</th><th class="num hide-s">LT</th><th class="num hide-s">LTV</th>' +
      '<th class="num hide-s">Leads / meta</th><th>Relacionamento</th><th>Farol</th><th class="hide-s">Contrato até</th><th></th></tr></thead><tbody>';
    lista.forEach(function (c) {
      var s = x.saude[c.id], u = checkinsDe(x, c.id)[0], rel = checkinsDe(x, c.id).filter(function (k) { return k.nota_rel != null; })[0];
      out += '<tr class="clicavel" data-act="abrir-cliente" data-id="' + esc(c.id) + '">' +
        '<td><div class="nome">' + esc(c.nome) + '</div><div class="small faint">' + esc(c.segmento || '') + (s.novo90 ? ' · <span class="tag acc">primeiros 90 dias</span>' : '') + '</div></td>' +
        '<td><span class="curva ' + x.curva[c.id] + '" title="Curva por percentil de mensalidade">' + x.curva[c.id] + '</span></td>' +
        '<td class="num">' + BC.brl(c.mensalidade) + '</td>' +
        '<td class="num hide-s">' + BC.n1(C.ltMeses(c, h)) + ' m</td>' +
        '<td class="num hide-s">' + BC.brl(C.ltv(c, h)) + '</td>' +
        '<td class="num hide-s">' + (u && u.leads != null ? u.leads + (c.meta_leads_semana ? ' / ' + c.meta_leads_semana : '') : '—') + '</td>' +
        '<td>' + BC.pillRel(rel ? rel.nota_rel : null) + '</td>' +
        '<td>' + BC.pillFarol(s.farol, s.score) + '</td>' +
        '<td class="hide-s nowrap">' + BC.data(C.fimContrato(c)) + (s.renovacao ? ' <span class="tag acc">renovar</span>' : '') + '</td>' +
        '<td><button class="btn mini" data-act="checkin" data-id="' + esc(c.id) + '">Check-in</button></td></tr>';
    });
    out += '</tbody><tfoot><tr><td colspan="2">Total</td><td class="num">' + BC.brl(mrr) + '</td><td class="hide-s"></td><td class="num hide-s">' + BC.brl(soma(x.ativos, function (c) { return C.ltv(c, h); })) + '</td><td colspan="5" class="hide-s"></td></tr></tfoot></table></div>';
    if (!lista.length) out += '<p class="vazio">Nenhum cliente em atenção. Bom sinal.</p>';
    out += '<p class="small faint" style="margin-top:12px">LT = meses desde o início. LTV = LT × mensalidade. Curva A/B/C por percentil de mensalidade entre os ativos (A = 20% maiores, B = próximos 30%, C = restante). O farol vem do health score de 0 a 100: verde a partir de 75, amarelo a partir de 50.</p>';
    return out;
  };
  BC.act['toggle-risco'] = function () { BC.ui.filtroRisco = !BC.ui.filtroRisco; BC.render(); };
  BC.act['abrir-cliente'] = function (el) { location.hash = '#c-' + el.dataset.id; };

  // ───────────── ficha do cliente ─────────────
  BC.views.cliente = function (id) {
    var c = S.get('clientes', id);
    if (!c) return '<p class="vazio">Cliente não encontrado. <a href="#clientes">Voltar para a carteira</a>.</p>';
    var x = BC.ctx(), h = x.h, perdido = c.status === 'churn';
    var cks = checkinsDe(x, id), asc = cks.slice().reverse().slice(-10);
    var fbs = x.feedbacks.filter(function (f) { return f.cliente_id === id; }).sort(function (a, b) { return a.data < b.data ? 1 : (a.data > b.data ? -1 : 0); });
    var s = perdido ? null : x.saude[id];

    var out = '<a class="voltar" href="#' + (perdido ? 'churn' : 'clientes') + '">← ' + (perdido ? 'Churn' : 'Clientes') + '</a>';
    out += '<div class="cli-cab"><div style="min-width:0"><h1>' + esc(c.nome) + '</h1>' +
      '<p class="sub muted" style="margin-top:6px">' + esc([c.segmento, c.contato_nome].filter(Boolean).join(' · ')) +
      (c.whatsapp && BC.waLink(c.whatsapp) ? ' · <a href="' + esc(BC.waLink(c.whatsapp)) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
      (c.instagram ? ' · <a href="' + esc(BC.igLink(c.instagram)) + '" target="_blank" rel="noopener">@' + esc(c.instagram) + '</a>' : '') + '</p>';
    if (s) {
      out += '<div style="margin-top:10px">' + BC.pillFarol(s.farol, s.score) + (s.renovacao ? ' <span class="tag acc">renovação em ' + (s.diasFim < 0 ? 'atraso' : s.diasFim + ' dias') + '</span>' : '') + (s.novo90 ? ' <span class="tag acc">primeiros 90 dias</span>' : '') + '</div>';
      out += s.motivos.length ? '<ul class="motivos">' + s.motivos.map(function (m) { return '<li>− ' + esc(m.texto) + '</li>'; }).join('') + '</ul>' : '<p class="small muted" style="margin-top:8px">Sem alertas no momento.</p>';
    }
    out += '</div><div class="pagehead-acoes">';
    if (!perdido) out += '<button class="btn primario" data-act="checkin" data-id="' + esc(id) + '">Check-in</button><button class="btn" data-act="novo-feedback" data-id="' + esc(id) + '">+ Feedback</button>';
    out += '<button class="btn" data-act="editar-cliente" data-id="' + esc(id) + '">Editar</button>';
    out += perdido ? '<button class="btn" data-act="reverter-churn" data-id="' + esc(id) + '">Reverter churn</button>' : '<button class="btn perigo" data-act="churn" data-id="' + esc(id) + '">Dar churn</button>';
    out += '</div></div>';

    if (perdido) {
      out += '<div class="aviso warn" style="flex-direction:column;align-items:flex-start"><div><strong>Cliente perdido em ' + BC.data(c.churn_data) + '.</strong> Motivo: ' + esc(BC.nomeMotivo(c.churn_motivo)) + '.</div>' +
        (c.churn_aprendizados ? '<div class="small"><strong>O que eu faria diferente:</strong> ' + esc(c.churn_aprendizados) + '</div>' : '') + '</div>';
    }
    out += '<div class="faixa">' +
      '<div><div class="rot">Mensalidade</div><div class="val">' + BC.brl(c.mensalidade) + '</div>' + (perdido ? '' : '<div class="nota">curva ' + x.curva[id] + '</div>') + '</div>' +
      '<div><div class="rot">LT</div><div class="val">' + BC.n1(C.ltMeses(c, h)) + '<span class="faint" style="font-size:16px"> meses</span></div><div class="nota">desde ' + BC.data(c.inicio) + '</div></div>' +
      '<div><div class="rot">LTV</div><div class="val">' + BC.brl(C.ltv(c, h)) + '</div>' + (perdido ? '<div class="nota">congelado na saída</div>' : '') + '</div>' +
      '<div><div class="rot">Contrato</div><div class="val" style="font-size:20px">' + BC.data(C.fimContrato(c)) + '</div><div class="nota">' + (Number(c.duracao_meses) || '—') + ' meses' + (perdido ? '' : ' · ' + BC.rotuloDias(C.diasParaFim(c, h))) + '</div></div>' +
      '<div><div class="rot">Verba de anúncios</div><div class="val" style="font-size:20px">' + BC.brl(c.verba_mensal) + '</div><div class="nota">por mês, paga pelo cliente</div></div></div>';

    var leadsAsc = asc.filter(function (k) { return k.leads != null; });
    var relAsc = asc.filter(function (k) { return k.nota_rel != null; });
    out += '<div class="graficos"><div><div class="graf-tit"><span>Leads por semana</span><span class="faint">' + (c.meta_leads_semana ? 'meta ' + c.meta_leads_semana : 'sem meta definida') + '</span></div>' +
      BC.graf.barras(leadsAsc.map(function (k) { return Number(k.leads); }), leadsAsc.map(function (k) { return BC.dataCurta(k.semana); }), { meta: c.meta_leads_semana ? Number(c.meta_leads_semana) : 0, unid: ' leads', titulo: 'Leads por semana' }) + '</div>' +
      '<div><div class="graf-tit"><span>Nota de relacionamento</span><span class="faint">tracejado: 7 e 9</span></div>' +
      BC.graf.notas(relAsc.map(function (k) { return Number(k.nota_rel); }), relAsc.map(function (k) { return BC.dataCurta(k.semana); })) + '</div></div>';

    out += '<section class="bloco"><div class="bloco-cab"><h2>Check-ins semanais</h2></div>';
    if (!cks.length) out += '<p class="vazio">Nenhum check-in ainda.' + (perdido ? '' : ' Use o botão “Check-in” acima.') + '</p>';
    else {
      out += '<div class="rolagem"><table class="tabela"><thead><tr><th>Semana</th><th class="num">Investido</th><th class="num">Leads</th><th class="num hide-s">CPL</th><th class="num hide-s">Vendas</th><th>Relac.</th><th class="hide-s">Sinais</th><th class="hide-s">Feito → próxima ação</th></tr></thead><tbody>';
      cks.forEach(function (k) {
        var cp = C.cpl(k.investimento, k.leads);
        out += '<tr class="clicavel" data-act="checkin" data-id="' + esc(id) + '" data-semana="' + esc(k.semana) + '"><td class="nowrap">' + BC.dataCurta(k.semana) + '</td>' +
          '<td class="num">' + (k.investimento != null ? BC.brl(k.investimento) : '—') + '</td><td class="num">' + (k.leads != null ? k.leads : '—') + '</td>' +
          '<td class="num hide-s">' + (cp != null ? BC.brl2(cp) : '—') + '</td><td class="num hide-s">' + (k.vendas != null ? k.vendas : '—') + '</td>' +
          '<td>' + BC.pillRel(k.nota_rel) + '</td><td class="hide-s">' + (k.gatilhos && k.gatilhos.length ? '<span class="pill amarelo sem-ponto">' + k.gatilhos.length + '</span>' : '<span class="faint">—</span>') + '</td>' +
          '<td class="truncar hide-s">' + esc([k.feito, k.proximo].filter(Boolean).join(' → ') || '—') + '</td></tr>';
      });
      out += '</tbody></table></div>';
    }
    out += '</section>';

    out += '<section class="bloco espaco"><div class="bloco-cab"><h2>Feedbacks</h2>' + (perdido ? '' : '<button class="btn mini" data-act="novo-feedback" data-id="' + esc(id) + '">+ Feedback</button>') + '</div>';
    if (!fbs.length) out += '<p class="vazio">Nenhum feedback registrado.</p>';
    else out += '<ul class="linhas">' + fbs.map(function (f) {
      return '<li><div class="corpo"><div><span class="pill ' + f.tom + '">' + ({ positivo: 'Positivo', neutro: 'Neutro', negativo: 'Negativo' }[f.tom] || f.tom) + '</span> <span class="small muted">' + BC.data(f.data) + (f.canal ? ' · ' + esc({ whatsapp: 'WhatsApp', reuniao: 'Reunião', ligacao: 'Ligação', outro: 'Outro' }[f.canal] || f.canal) : '') + '</span></div><div style="margin-top:4px;overflow-wrap:anywhere">' + esc(f.texto) + '</div></div>' +
        '<div class="acoes"><button class="btn mini fantasma" data-act="excluir-feedback" data-id="' + esc(f.id) + '" aria-label="Remover feedback">Remover</button></div></li>';
    }).join('') + '</ul>';
    out += '</section>';
    if (c.notas) out += '<section class="bloco espaco"><div class="bloco-cab"><h2>Notas</h2></div><p style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(c.notas) + '</p></section>';
    return out;
  };

  // ───────────── churn ─────────────
  BC.views.churn = function () {
    var x = BC.ctx(), h = x.h, e = C.estatChurn(x.clientes, h);
    var comBase = e.meses.filter(function (m) { return m.churnPct != null; });
    var churnMedio = comBase.length ? comBase.reduce(function (s, m) { return s + m.churnPct; }, 0) / comBase.length : null;
    var motivos = Object.keys(e.porMotivo).map(function (k) { return [k, e.porMotivo[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var out = '<div class="pagehead"><div><h1>Churn</h1><p class="sub">O padrão dos motivos importa mais que cada saída isolada.</p></div></div>' + bannerExemplos();
    if (!e.perdidos.length) return out + '<p class="vazio">Nenhum cliente perdido registrado. Quando alguém sair, use “Dar churn” na ficha do cliente.</p>';
    out += '<div class="faixa">' +
      '<div><div class="rot">Clientes perdidos</div><div class="val">' + e.perdidos.length + '</div><div class="nota">MRR perdido ' + BC.brl(soma(e.perdidos, function (c) { return c.mensalidade; })) + '</div></div>' +
      '<div><div class="rot">Churn mensal médio</div><div class="val">' + (churnMedio == null ? '—' : BC.n1(churnMedio) + '%') + '</div><div class="nota">últimos 12 meses</div></div>' +
      '<div><div class="rot">LT médio dos perdidos</div><div class="val">' + BC.n1(e.ltMedio) + '<span class="faint" style="font-size:16px"> meses</span></div></div>' +
      '<div><div class="rot">LTV médio dos perdidos</div><div class="val">' + BC.brl(e.ltvMedio) + '</div></div></div>';
    var maxM = motivos.length ? motivos[0][1] : 1;
    out += '<div class="colunas"><section class="bloco"><div class="bloco-cab"><h2>Motivos de saída</h2></div><div class="barras">' + motivos.map(function (m) {
      return '<div class="barra"><span>' + esc(BC.nomeMotivo(m[0])) + '</span><div class="trilho"><i style="width:' + (m[1] / maxM * 100) + '%"></i></div><span class="v">' + m[1] + ' (' + Math.round(m[1] / e.perdidos.length * 100) + '%)</span></div>';
    }).join('') + '</div><p class="small muted" style="margin-top:10px">Mais frequente: <strong>' + esc(BC.nomeMotivo(motivos[0][0])) + '</strong>.</p></section>';
    var meses = e.meses.filter(function (m) { return m.saidas > 0 || m.mes >= C.addMesesMes(h, -5); });
    out += '<section class="bloco"><div class="bloco-cab"><h2>Ao longo do tempo</h2></div><div class="rolagem"><table class="tabela"><thead><tr><th>Mês</th><th class="num">Saídas</th><th class="num">Churn</th><th class="num hide-s">LT médio</th><th class="num hide-s">LTV médio</th></tr></thead><tbody>' +
      meses.map(function (m) {
        return '<tr><td>' + BC.mes(m.mes) + '</td><td class="num">' + m.saidas + '</td><td class="num">' + (m.churnPct == null ? '—' : BC.n1(m.churnPct) + '%') + '</td><td class="num hide-s">' + (m.ltMedio == null ? '—' : BC.n1(m.ltMedio) + ' m') + '</td><td class="num hide-s">' + (m.ltvMedio == null ? '—' : BC.brl(m.ltvMedio)) + '</td></tr>';
      }).join('') + '</tbody></table></div></section></div>';
    out += '<section class="bloco espaco"><div class="bloco-cab"><h2>Clientes perdidos</h2></div><div class="rolagem"><table class="tabela"><thead><tr><th>Cliente</th><th>Motivo</th><th>Saída</th><th class="num hide-s">LT</th><th class="num hide-s">LTV</th><th class="hide-s">O que eu faria diferente</th></tr></thead><tbody>' +
      e.perdidos.sort(function (a, b) { return a.churn_data < b.churn_data ? 1 : -1; }).map(function (c) {
        return '<tr class="clicavel" data-act="abrir-cliente" data-id="' + esc(c.id) + '"><td class="nome">' + esc(c.nome) + '</td><td>' + esc(BC.nomeMotivo(c.churn_motivo)) + '</td><td class="nowrap">' + BC.data(c.churn_data) + '</td>' +
          '<td class="num hide-s">' + BC.n1(C.ltMeses(c, h)) + ' m</td><td class="num hide-s">' + BC.brl(C.ltv(c, h)) + '</td><td class="hide-s" style="max-width:340px;overflow-wrap:anywhere">' + esc(c.churn_aprendizados || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
    return out;
  };

  // ───────────── previsão de MRR ─────────────
  function premissas(ativos) {
    var pr = Object.assign({}, C.PROB_RENOVACAO_PADRAO, S.cfg('prob_renovacao', {}));
    var pe = Object.assign({}, C.PROB_ETAPA_PADRAO, S.cfg('prob_etapa', {}));
    var ticket = Number(S.cfg('ticket_padrao', 0)) || (ativos.length ? soma(ativos, function (c) { return c.mensalidade; }) / ativos.length : 0);
    return { renov: pr, etapa: pe, ticket: ticket, ticketManual: Number(S.cfg('ticket_padrao', 0)) || 0 };
  }
  BC.views.previsao = function () {
    var x = BC.ctx(), h = x.h, pm = premissas(x.ativos);
    var farois = {}; x.ativos.forEach(function (c) { farois[c.id] = x.saude[c.id].farol; });
    var prev = C.previsaoMrr(x.clientes, farois, pm.renov, h, 6);
    var hist = C.historicoMrr(x.clientes, h, 6);
    var pipe = C.pipelinePonderado(S.all('prospects'), pm.etapa, pm.ticket);
    var conc = C.concentracao(x.ativos);
    var mrr = soma(x.ativos, function (c) { return c.mensalidade; });
    var out = '<div class="pagehead"><div><h1>Previsão de MRR</h1><p class="sub">Próximos 6 meses a partir dos contratos, do farol de cada cliente e do pipeline.</p></div></div>' + bannerExemplos();
    if (!x.ativos.length) return out + '<p class="vazio">Cadastre clientes com contrato para ver a previsão.</p>';
    var m3 = prev[3] || prev[prev.length - 1];
    out += '<div class="faixa">' +
      '<div><div class="rot">MRR hoje</div><div class="val">' + BC.brl(mrr) + '</div><div class="nota">' + x.ativos.length + ' contratos ativos</div></div>' +
      '<div><div class="rot">Contratado em ' + BC.mes(m3.mes) + '</div><div class="val">' + BC.brl(m3.contratado) + '</div><div class="nota">só contratos vigentes</div></div>' +
      '<div><div class="rot">Esperado em ' + BC.mes(m3.mes) + '</div><div class="val">' + BC.brl(m3.esperado) + '</div><div class="nota">com renovações prováveis</div></div>' +
      '<div><div class="rot">Pipeline ponderado</div><div class="val">' + BC.brl(pipe.mrr) + '</div><div class="nota">' + pipe.n + ' contatos em aberto</div></div>' +
      '<div><div class="rot">Concentração</div><div class="val">' + BC.pct(conc.top1) + '</div><div class="nota">maior cliente · top 3 = ' + BC.pct(conc.top3) + '</div></div></div>';
    out += '<section class="bloco"><div class="bloco-cab"><h2>MRR: histórico e previsão</h2></div>' + BC.graf.mrr(hist, prev) + '</section>';

    out += '<div class="colunas espaco"><section class="bloco"><div class="bloco-cab"><h2>Mês a mês</h2></div><div class="rolagem"><table class="tabela"><thead><tr><th>Mês</th><th class="num">Contratado</th><th class="num">Esperado</th><th class="num">+ pipeline</th></tr></thead><tbody>' +
      prev.map(function (p, i) {
        return '<tr><td>' + BC.mes(p.mes) + (i === 0 ? ' <span class="faint small">(atual)</span>' : '') + '</td><td class="num">' + BC.brl(p.contratado) + '</td><td class="num">' + BC.brl(p.esperado) + '</td><td class="num">' + BC.brl(p.esperado + (i >= 2 ? pipe.mrr : 0)) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="small faint" style="margin-top:8px">“+ pipeline” soma o novo MRR esperado do CRM a partir do segundo mês, supondo fechamento em até 60 dias.</p></section>';

    var movim = hist.slice().reverse();
    out += '<section class="bloco"><div class="bloco-cab"><h2>Movimento do MRR</h2></div><div class="rolagem"><table class="tabela"><thead><tr><th>Mês</th><th class="num">MRR</th><th class="num">Novo</th><th class="num">Perdido</th></tr></thead><tbody>' +
      movim.map(function (m) { return '<tr><td>' + BC.mes(m.mes) + '</td><td class="num">' + BC.brl(m.mrr) + '</td><td class="num">' + (m.novo ? '+' + BC.brl(m.novo) : '—') + '</td><td class="num">' + (m.perdido ? '−' + BC.brl(m.perdido) : '—') + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="small faint" style="margin-top:8px">Assume a mensalidade atual em todo o período (a ferramenta não guarda reajustes).</p></section></div>';

    var ate = C.addMeses(h, 6);
    var renov = x.ativos.filter(function (c) { return C.fimContrato(c) <= ate; }).sort(function (a, b) { return C.fimContrato(a) < C.fimContrato(b) ? -1 : 1; });
    out += '<section class="bloco espaco"><div class="bloco-cab"><h2>Renovações nos próximos 6 meses</h2></div>';
    if (!renov.length) out += '<p class="vazio">Nenhum contrato vence neste período.</p>';
    else out += '<div class="rolagem"><table class="tabela"><thead><tr><th>Cliente</th><th>Termina</th><th>Farol</th><th class="num">Chance de renovar</th><th class="num">Mensalidade</th><th class="num">Valor esperado</th></tr></thead><tbody>' +
      renov.map(function (c) {
        var f = farois[c.id], p = pm.renov[f];
        return '<tr class="clicavel" data-act="abrir-cliente" data-id="' + esc(c.id) + '"><td class="nome">' + esc(c.nome) + '</td><td class="nowrap">' + BC.data(C.fimContrato(c)) + '</td><td>' + BC.pillFarol(f) + '</td><td class="num">' + BC.pct(p) + '</td><td class="num">' + BC.brl(c.mensalidade) + '</td><td class="num">' + BC.brl(c.mensalidade * p) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    out += '</section>';

    out += '<section class="bloco espaco"><div class="bloco-cab"><h2>Premissas</h2></div><p class="small muted" style="margin-bottom:10px">São estimativas suas, não dados. Ajuste conforme o seu histórico real de renovação e de fechamento.</p>' +
      '<form data-form="premissas"><div class="grade">' +
      ['verde', 'amarelo', 'vermelho'].map(function (f) { return '<div class="campo"><label for="pm-r-' + f + '">Chance de renovar · farol ' + f + ' (%)</label><input id="pm-r-' + f + '" name="r_' + f + '" type="number" min="0" max="100" step="1" value="' + Math.round(pm.renov[f] * 100) + '"></div>'; }).join('') +
      '</div><div class="grade" style="margin-top:12px">' +
      [['abordado', 'Abordado'], ['respondeu', 'Respondeu'], ['diagnostico', 'Mini-diagnóstico'], ['reuniao', 'Reunião'], ['proposta', 'Proposta']].map(function (e) { return '<div class="campo"><label for="pm-e-' + e[0] + '">Fechar · etapa ' + e[1] + ' (%)</label><input id="pm-e-' + e[0] + '" name="e_' + e[0] + '" type="number" min="0" max="100" step="0.5" value="' + (Math.round(pm.etapa[e[0]] * 1000) / 10) + '"></div>'; }).join('') +
      '<div class="campo"><label for="pm-ticket">Ticket de um cliente novo (R$)</label><input id="pm-ticket" name="ticket" type="number" min="0" step="any" value="' + (pm.ticketManual || '') + '" placeholder="' + Math.round(pm.ticket) + '"><small>Em branco: usa o ticket médio atual.</small></div></div>' +
      '<p class="erro-form" hidden role="alert"></p><div style="margin-top:12px"><button class="btn primario" type="submit">Salvar premissas</button></div></form></section>';
    out += '<p class="small faint" style="margin-top:14px">Concentração: quando poucos clientes respondem pela maior parte do MRR, a receita é frágil. Com poucos clientes isso é natural no começo; acompanhe se cai conforme a carteira cresce.</p>';
    return out;
  };
  BC.forms.premissas = function (form) {
    var d = BC.dados(form), pr = {}, pe = {};
    ['verde', 'amarelo', 'vermelho'].forEach(function (f) { pr[f] = Math.min(1, Math.max(0, (Number(d['r_' + f]) || 0) / 100)); });
    ['abordado', 'respondeu', 'diagnostico', 'reuniao', 'proposta'].forEach(function (e) { pe[e] = Math.min(1, Math.max(0, (Number(d['e_' + e]) || 0) / 100)); });
    BC.seguro(async function () {
      await S.setCfg('prob_renovacao', pr); await S.setCfg('prob_etapa', pe); await S.setCfg('ticket_padrao', BC.num(d.ticket) || 0);
      BC.toast('Premissas salvas.');
    }, form);
  };

  // ───────────── dados e backup ─────────────
  BC.views.dados = function () {
    var out = '<div class="pagehead"><div><h1>Dados</h1><p class="sub">Backup, exemplos e preferências.</p></div></div>' + bannerArmazenamento() + bannerExemplos();
    out += '<div class="colunas"><section class="bloco"><div class="bloco-cab"><h2>Onde ficam os dados</h2></div>' +
      (S.modo() === 'supabase' ? '<p>Seus dados estão no <strong>Supabase</strong>, protegidos por login.</p>' : '<p>Os dados estão neste navegador (<strong>modo local</strong>). Trocar de navegador ou limpar os dados do site apaga tudo. Na etapa seguinte a ferramenta passa a gravar no Supabase.</p>') +
      '<p class="small muted" style="margin-top:8px">Os exemplos não entram no backup.</p></section>' +
      '<section class="bloco"><div class="bloco-cab"><h2>Backup</h2></div><div class="pagehead-acoes"><button class="btn" data-act="exportar">Baixar backup (.json)</button><button class="btn" data-act="copiar-backup">Copiar backup</button></div>' +
      '<div class="campo" style="margin-top:14px"><label for="arq-backup">Restaurar de um arquivo</label><input id="arq-backup" type="file" accept=".json,application/json" data-change="arquivo-backup"></div>' +
      '<p class="small muted" style="margin-top:6px">A restauração soma os registros do arquivo aos que já existem (ids repetidos são ignorados).</p><p class="erro-form" id="erro-backup" hidden role="alert"></p></section>' +
      '<section class="bloco"><div class="bloco-cab"><h2>Exemplos</h2></div><p class="muted">Clientes e contatos fictícios para ver as telas funcionando.</p><div class="pagehead-acoes" style="margin-top:10px">' +
      '<button class="btn" data-act="carregar-exemplos"' + (S.temExemplos() ? ' disabled' : '') + '>Carregar exemplos</button><button class="btn" data-act="limpar-exemplos"' + (S.temExemplos() ? '' : ' disabled') + '>Limpar exemplos</button></div></section>' +
      '<section class="bloco"><div class="bloco-cab"><h2>Preferências</h2></div><form data-form="preferencias"><div class="campo"><label for="pf-meta">Meta diária de toques na prospecção</label><input id="pf-meta" name="meta" type="number" min="1" step="1" value="' + (Number(S.cfg('meta_diaria', 5)) || 5) + '"></div><p class="erro-form" hidden role="alert"></p><div style="margin-top:12px"><button class="btn primario" type="submit">Salvar</button></div></form></section></div>';
    return out;
  };
  BC.forms.preferencias = function (form) {
    var d = BC.dados(form);
    BC.seguro(async function () { await S.setCfg('meta_diaria', Math.max(1, Math.round(Number(d.meta) || 5))); BC.toast('Preferências salvas.'); }, form);
  };
  BC.act['exportar'] = function () {
    var json = JSON.stringify(S.exportar(), null, 2);
    try {
      var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      var a = document.createElement('a'); a.href = url; a.download = 'agencia-bc-backup-' + C.hoje() + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      BC.toast('Backup gerado. Se nada baixou, use “Copiar backup”.');
    } catch (e) { BC.toast('Não foi possível baixar. Use “Copiar backup”.', true); }
  };
  BC.act['copiar-backup'] = function () {
    var json = JSON.stringify(S.exportar());
    var ok = function () { BC.toast('Backup copiado. Cole em um arquivo .json e guarde.'); };
    var falha = function () {
      var d = BC.dialogo('<div class="dlg">' + BC.cabDialogo('Backup', 'Selecione tudo e copie.') + '<textarea id="bk" style="min-height:240px" readonly>' + esc(json) + '</textarea></div>');
      var t = d.querySelector('textarea'); t.focus(); t.select();
    };
    try { navigator.clipboard.writeText(json).then(ok, falha); } catch (e) { falha(); }
  };
  BC.act['arquivo-backup'] = function (el) {
    var f = el.files && el.files[0]; if (!f) return;
    var err = document.getElementById('erro-backup');
    var r = new FileReader();
    r.onload = function () {
      BC.seguro(async function () {
        await S.importar(JSON.parse(r.result), false);
        if (err) err.hidden = true;
        BC.toast('Backup restaurado.');
      }).then(function () { el.value = ''; });
    };
    r.onerror = function () { BC.toast('Não consegui ler o arquivo.', true); };
    r.readAsText(f);
  };
  BC.act['limpar-exemplos'] = function () { BC.seguro(async function () { await S.limparExemplos(); BC.toast('Exemplos removidos.'); }); };
  BC.act['carregar-exemplos'] = function () {
    BC.seguro(async function () { await S.carregarExemplos(root.BCSeed.gerar(C.hoje())); BC.toast('Exemplos carregados.'); });
  };
})(window);
