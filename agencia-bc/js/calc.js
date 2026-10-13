/* Agência BC · cálculos puros (sem DOM). Rodam no navegador e no Node (tests/). */
(function (root) {
  'use strict';

  // ───────────── constantes ─────────────
  var ETAPAS = [
    { id: 'novo', nome: 'A contatar' },
    { id: 'abordado', nome: 'Abordado' },
    { id: 'respondeu', nome: 'Respondeu' },
    { id: 'diagnostico', nome: 'Mini-diagnóstico' },
    { id: 'reuniao', nome: 'Reunião' },
    { id: 'proposta', nome: 'Proposta' },
    { id: 'fechado', nome: 'Fechado' },
    { id: 'perdido', nome: 'Perdido' }
  ];
  var ORDEM_FUNIL = ['novo', 'abordado', 'respondeu', 'diagnostico', 'reuniao', 'proposta', 'fechado'];

  // Pesquisa de relacionamento: 5 critérios, nota 1 a 5. A confiança pesa o dobro.
  var CRITERIOS = [
    { id: 'confianca', nome: 'Confiança e abertura', peso: 2,
      pergunta: 'O cliente ouve você como conselheiro ou só como quem executa pedidos?',
      ancoras: { 1: 'Desconfia e rebate tudo', 3: 'Confia no básico, hesita no resto', 5: 'Pede opinião e divide o contexto do negócio' } },
    { id: 'aderencia', nome: 'Aderência ao combinado', peso: 1,
      pergunta: 'Ele aplicou o que foi orientado no relatório da semana?',
      ancoras: { 1: 'Não aplicou nada', 3: 'Aplicou o essencial, com atraso', 5: 'Aplica tudo, rápido' } },
    { id: 'postura', nome: 'Postura diante de problemas', peso: 1,
      pergunta: 'Quando o resultado cai, ele encara junto ou procura culpado?',
      ancoras: { 1: 'Culpa a agência', 3: 'Escuta, mas reclama', 5: 'Assume a parte dele e age' } },
    { id: 'presenca', nome: 'Presença e resposta', peso: 1,
      pergunta: 'Ele responde e participa durante a semana?',
      ancoras: { 1: 'Some por dias', 3: 'Responde, com atrasos pontuais', 5: 'Ativo e rápido' } },
    { id: 'insumos', nome: 'Entrega de insumos', peso: 1,
      pergunta: 'Ele envia acessos, retorno dos leads e materiais pedidos?',
      ancoras: { 1: 'Não envia nada', 3: 'Envia o básico, fora do prazo', 5: 'Envia tudo, no prazo' } }
  ];

  // Sinais de desengajamento (antecipam churn). peso = pontos tirados do health score.
  var GATILHOS = [
    { id: 'sumiu', texto: 'Passou mais de 5 dias sem responder', curto: 'sumiu', peso: 10 },
    { id: 'cobranca', texto: 'Só responde com cobrança constante', curto: 'responde só com cobrança', peso: 7 },
    { id: 'reunioes', texto: 'Falta ou desmarca as reuniões combinadas', curto: 'falta a reuniões', peso: 7 },
    { id: 'nao_implementa', texto: 'Não implementa o que foi pedido', curto: 'não implementa', peso: 7 },
    { id: 'reduziu_verba', texto: 'Reduziu a verba ou o investimento', curto: 'reduziu a verba', peso: 10 },
    { id: 'nao_acessa', texto: 'Não abre o relatório nem o painel', curto: 'não abre o relatório', peso: 7 },
    { id: 'atraso_pagto', texto: 'Atrasa pagamentos com frequência', curto: 'atrasa pagamentos', peso: 10 },
    { id: 'desinteresse', texto: 'Perdeu o interesse em ideias novas', curto: 'sem interesse em ideias', peso: 7 },
    { id: 'frio', texto: 'Ficou seco: só trata de assunto objetivo', curto: 'relação fria', peso: 7 },
    { id: 'sem_vitoria', texto: 'Não comemora mais os resultados', curto: 'não comemora resultados', peso: 7 }
  ];

  // Motivos de saída em cascata: percorre de cima para baixo e para no primeiro que explica.
  var MOTIVOS_SAIDA = [
    { id: 'erro_critico', nome: 'Erro crítico', def: 'Falha grave de operação na campanha ou na entrega.' },
    { id: 'performance', nome: 'Performance', def: 'O serviço contratado não chegou a ser entregue.' },
    { id: 'alinhamento', nome: 'Falta de alinhamento', def: 'Foi entregue, mas o cliente não percebeu o valor.' },
    { id: 'estrutura', nome: 'Falta de estrutura interna', def: 'Entreguei, mas ele não tinha equipe ou atendimento para aproveitar.' },
    { id: 'perspectiva', nome: 'Falta de perspectiva', def: 'Serviço e relação bons, mas sem visão de futuro; trocou por uma promessa maior.' },
    { id: 'relacionamento', nome: 'Relacionamento', def: 'A relação se rompeu por conflito ou desrespeito.' },
    { id: 'troca_gestor', nome: 'Troca de gestor', def: 'O gestor mudou e o vínculo não continuou.' },
    { id: 'saida_contato', nome: 'Saída do contato', def: 'Quem contratou deixou a empresa.' },
    { id: 'escopo', nome: 'Escopo', def: 'Precisou de algo que não ofereço e buscou fora.' },
    { id: 'negocio', nome: 'Negócio', def: 'Uma decisão dele sobre a empresa tornou o trabalho inviável.' }
  ];

  var PROB_RENOVACAO_PADRAO = { verde: 0.85, amarelo: 0.6, vermelho: 0.3 };
  var PROB_ETAPA_PADRAO = { abordado: 0.02, respondeu: 0.06, diagnostico: 0.12, reuniao: 0.25, proposta: 0.45 };

  // ───────────── datas (sempre texto AAAA-MM-DD, fuso local) ─────────────
  var DIA = 86400000;
  function pad(n) { return String(n).padStart(2, '0'); }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { var p = String(s).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  var _hoje = null;
  function hoje() { return _hoje || toISO(new Date()); }
  function setHoje(iso) { _hoje = iso; }
  function addDias(iso, n) { var d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
  function addMeses(iso, n) {
    var d = parseISO(iso), dia = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    var ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ult));
    return toISO(d);
  }
  function diffDias(a, b) { return Math.round((parseISO(b) - parseISO(a)) / DIA); } // b - a
  function inicioSemana(iso) { var d = parseISO(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toISO(d); }
  function mesDe(iso) { return String(iso).slice(0, 7); }
  function primeiroDiaMes(iso) { return mesDe(iso) + '-01'; }
  function ultimoDiaMes(iso) { var d = parseISO(iso); return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
  function addMesesMes(iso, n) { return mesDe(addMeses(primeiroDiaMes(iso), n)); }
  function diaUtil(iso) { var w = parseISO(iso).getDay(); return w !== 0 && w !== 6; }
  function dataLocalDe(ts) { return toISO(new Date(ts)); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function soma(arr, f) { return arr.reduce(function (s, x) { return s + (Number(f(x)) || 0); }, 0); }

  // ───────────── cliente: tempo de casa, valor, contrato, curva ─────────────
  function fimVida(c, h) { return (c.status === 'churn' && c.churn_data) ? c.churn_data : h; }
  function ltMeses(c, h) { h = h || hoje(); return Math.max(0, diffDias(c.inicio, fimVida(c, h))) / 30.4375; }
  function ltv(c, h) { return ltMeses(c, h) * (Number(c.mensalidade) || 0); }
  function fimContrato(c) { return addMeses(c.inicio, Number(c.duracao_meses) || 0); }
  function diasParaFim(c, h) { return diffDias(h || hoje(), fimContrato(c)); }

  // Curva por percentil de mensalidade entre os ativos: A = 20% de cima, B = próximos 30%, C = resto.
  function curvaABC(ativos) {
    var ord = ativos.slice().sort(function (a, b) {
      return (Number(b.mensalidade) - Number(a.mensalidade)) || String(a.nome).localeCompare(String(b.nome));
    });
    var n = ord.length, out = {}, ultimoValor = null, ultimoPos = 0;
    ord.forEach(function (c, i) {
      var v = Number(c.mensalidade);
      if (v !== ultimoValor) { ultimoValor = v; ultimoPos = i; }   // empates dividem a mesma curva
      var p = ultimoPos / n;
      out[c.id] = p < 0.2 ? 'A' : (p < 0.5 ? 'B' : 'C');
    });
    return out;
  }

  // ───────────── relacionamento ─────────────
  function notaRelacionamento(r) {
    var s = 0, pesos = 0;
    for (var i = 0; i < CRITERIOS.length; i++) {
      var c = CRITERIOS[i], v = Number(r[c.id]);
      if (!(v >= 1 && v <= 5)) return null;
      s += v * c.peso; pesos += c.peso;
    }
    return r1(s / pesos * 2);
  }
  function faixaRelacionamento(n) { return n >= 9 ? 'otimo' : (n >= 7 ? 'regular' : 'ruim'); }
  function exigeJustificativa(n) { return n != null && (n < 7 || n >= 9.5); }

  // ───────────── resultado ─────────────
  function cpl(investimento, leads) {
    var i = Number(investimento), l = Number(leads);
    return (investimento != null && leads != null && l > 0 && i >= 0) ? i / l : null;
  }

  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
  function fmtBRL(n) { return 'R$ ' + (Math.round(n * 100) / 100).toFixed(2).replace('.', ','); }

  // ───────────── health score ─────────────
  // Sinais: check-ins, relacionamento, feedbacks, resultado vs meta e sinais de desengajamento.
  function saude(c, checkins, feedbacks, h) {
    h = h || hoje();
    var motivos = [], score = 100;
    function pen(n, t) { score -= n; motivos.push({ peso: n, texto: t }); }

    var cks = checkins.filter(function (x) { return x.cliente_id === c.id; })
      .sort(function (a, b) { return a.semana < b.semana ? 1 : (a.semana > b.semana ? -1 : 0); });
    var fbs = feedbacks.filter(function (x) { return x.cliente_id === c.id; });
    var diasCasa = diffDias(c.inicio, h);
    var ult = cks[0];

    // 1) ritmo de check-in
    if (ult) {
      var dd = diffDias(ult.semana, h);
      if (dd >= 21) pen(15, 'Sem check-in há ' + Math.floor(dd / 7) + ' semanas');
      else if (dd >= 14) pen(6, 'Check-in da semana passada não foi feito');
    } else if (diasCasa > 14) {
      pen(10, 'Nenhum check-in registrado');
    }

    // 2) relacionamento
    var comRel = cks.filter(function (x) { return x.nota_rel != null; });
    if (comRel.length) {
      var n = Number(comRel[0].nota_rel);
      if (n < 7) pen(30, 'Relacionamento ' + fmt1(n) + ' (abaixo de 7)');
      else if (n < 9) pen(8, 'Relacionamento regular (' + fmt1(n) + ')');
      if (comRel[1]) {
        var queda = Number(comRel[1].nota_rel) - n;
        if (queda >= 1.5) pen(10, 'Nota de relacionamento caiu ' + fmt1(queda) + ' pontos');
      }
    }

    // 3) feedbacks negativos nos últimos 30 dias
    var neg = fbs.filter(function (f) {
      var d = diffDias(f.data, h);
      return f.tom === 'negativo' && d >= 0 && d <= 30;
    }).length;
    if (neg) pen(Math.min(30, 15 * neg), neg + (neg > 1 ? ' feedbacks negativos' : ' feedback negativo') + ' em 30 dias');

    // 4) resultado contra a meta
    if (ult && ult.leads != null && Number(c.meta_leads_semana) > 0) {
      var rz = Number(ult.leads) / Number(c.meta_leads_semana);
      var pc = Math.round(rz * 100);
      if (rz < 0.4) pen(25, 'Leads em ' + pc + '% da meta da semana');
      else if (rz < 0.7) pen(12, 'Leads em ' + pc + '% da meta da semana');
    }
    if (ult && Number(c.meta_cpl) > 0) {
      var cp = cpl(ult.investimento, ult.leads);
      if (cp != null) {
        if (cp > c.meta_cpl * 1.5) pen(12, 'CPL ' + fmtBRL(cp) + ' (meta ' + fmtBRL(Number(c.meta_cpl)) + ')');
        else if (cp > c.meta_cpl * 1.2) pen(6, 'CPL ' + fmtBRL(cp) + ' (meta ' + fmtBRL(Number(c.meta_cpl)) + ')');
      }
    }
    if (ult && cks[1] && ult.leads != null && cks[1].leads != null &&
        Number(cks[1].leads) >= 5 && Number(ult.leads) <= Number(cks[1].leads) * 0.6) {
      var q = Math.round((1 - Number(ult.leads) / Number(cks[1].leads)) * 100);
      pen(8, 'Leads caíram ' + q + '% sobre a semana anterior');
    }

    // 5) sinais de desengajamento marcados no último check-in
    if (ult && diffDias(ult.semana, h) <= 13 && ult.gatilhos && ult.gatilhos.length) {
      var tot = 0, nomes = [];
      ult.gatilhos.forEach(function (id) {
        var g = GATILHOS.filter(function (x) { return x.id === id; })[0];
        if (g) { tot += g.peso; nomes.push(g.curto); }
      });
      if (nomes.length) pen(Math.min(35, tot), nomes.length + (nomes.length > 1 ? ' sinais' : ' sinal') + ' de desengajamento: ' + nomes.join(', '));
    }

    score = Math.max(0, score);
    var farol = score >= 75 ? 'verde' : (score >= 50 ? 'amarelo' : 'vermelho');
    motivos.sort(function (a, b) { return b.peso - a.peso; });
    var dfim = diasParaFim(c, h);
    return {
      score: score, farol: farol, motivos: motivos,
      renovacao: dfim <= 45,           // contrato acaba em até 45 dias (ou já passou)
      diasFim: dfim,
      novo90: diasCasa < 91
    };
  }

  // ───────────── churn ─────────────
  function estatChurn(clientes, h) {
    h = h || hoje();
    var perdidos = clientes.filter(function (c) { return c.status === 'churn' && c.churn_data; });
    var porMotivo = {};
    perdidos.forEach(function (c) { var k = c.churn_motivo || 'sem_motivo'; porMotivo[k] = (porMotivo[k] || 0) + 1; });
    var meses = [];
    for (var i = 11; i >= 0; i--) {
      var mes = addMesesMes(h, -i), ini = mes + '-01', fim = ultimoDiaMes(ini);
      var sai = perdidos.filter(function (c) { return c.churn_data >= ini && c.churn_data <= fim; });
      var ativosIni = clientes.filter(function (c) {
        return c.inicio < ini && (c.status !== 'churn' || !c.churn_data || c.churn_data >= ini);
      }).length;
      meses.push({
        mes: mes, saidas: sai.length, ativosInicio: ativosIni,
        churnPct: ativosIni ? sai.length / ativosIni * 100 : null,
        ltMedio: sai.length ? soma(sai, function (c) { return ltMeses(c, h); }) / sai.length : null,
        ltvMedio: sai.length ? soma(sai, function (c) { return ltv(c, h); }) / sai.length : null,
        mrrPerdido: soma(sai, function (c) { return c.mensalidade; })
      });
    }
    return {
      perdidos: perdidos, porMotivo: porMotivo, meses: meses,
      ltMedio: perdidos.length ? soma(perdidos, function (c) { return ltMeses(c, h); }) / perdidos.length : null,
      ltvMedio: perdidos.length ? soma(perdidos, function (c) { return ltv(c, h); }) / perdidos.length : null
    };
  }

  // ───────────── MRR: histórico, previsão, pipeline, concentração ─────────────
  function mrrEm(clientes, iso) {
    return soma(clientes.filter(function (c) {
      return c.inicio <= iso && (c.status !== 'churn' || !c.churn_data || c.churn_data > iso);
    }), function (c) { return c.mensalidade; });
  }
  function historicoMrr(clientes, h, n) {
    h = h || hoje(); n = n || 6;
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var mes = addMesesMes(h, -i), ini = mes + '-01';
      var fim = i === 0 ? h : ultimoDiaMes(ini);
      out.push({
        mes: mes, mrr: mrrEm(clientes, fim),
        novo: soma(clientes.filter(function (c) { return mesDe(c.inicio) === mes; }), function (c) { return c.mensalidade; }),
        perdido: soma(clientes.filter(function (c) { return c.status === 'churn' && c.churn_data && mesDe(c.churn_data) === mes; }), function (c) { return c.mensalidade; })
      });
    }
    return out;
  }
  function mesesEntre(isoA, isoB) { // meses de calendário de A até B
    var a = parseISO(isoA), b = parseISO(isoB);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }
  // contratado = contratos vigentes; esperado = contratado + renovações ponderadas pela probabilidade do farol
  function previsaoMrr(clientes, farolPorId, prob, h, meses) {
    h = h || hoje(); meses = meses || 6; prob = prob || PROB_RENOVACAO_PADRAO;
    var ativos = clientes.filter(function (c) { return c.status !== 'churn'; });
    var out = [];
    for (var t = 0; t < meses; t++) {
      var mes = addMesesMes(h, t), ini = mes + '-01', contratado = 0, esperado = 0;
      ativos.forEach(function (c) {
        var m = Number(c.mensalidade) || 0, fim = fimContrato(c);
        if (t === 0 || fim >= ini) { contratado += m; esperado += m; return; }
        var dur = Math.max(1, Number(c.duracao_meses) || 1);
        var k = Math.floor(Math.max(0, mesesEntre(fim, ini)) / dur) + 1;
        var p = prob[farolPorId[c.id] || 'amarelo'];
        if (p == null) p = 0.6;
        esperado += m * Math.pow(p, k);
      });
      out.push({ mes: mes, contratado: contratado, esperado: esperado });
    }
    return out;
  }
  function pipelinePonderado(prospects, probEtapa, ticket) {
    probEtapa = probEtapa || PROB_ETAPA_PADRAO;
    var n = 0, mrr = 0, porEtapa = {};
    prospects.forEach(function (p) {
      var pr = probEtapa[p.etapa];
      if (pr == null) return;
      n++; mrr += pr * ticket;
      porEtapa[p.etapa] = (porEtapa[p.etapa] || 0) + 1;
    });
    return { n: n, mrr: mrr, porEtapa: porEtapa };
  }
  function concentracao(ativos) {
    var vals = ativos.map(function (c) { return Number(c.mensalidade) || 0; }).sort(function (a, b) { return b - a; });
    var tot = vals.reduce(function (s, v) { return s + v; }, 0);
    if (!tot) return { total: 0, top1: 0, top3: 0 };
    return { total: tot, top1: vals[0] / tot, top3: (vals[0] + (vals[1] || 0) + (vals[2] || 0)) / tot };
  }

  // ───────────── prospecção ─────────────
  function etapaMax(p) {
    if (p.etapa_max && ORDEM_FUNIL.indexOf(p.etapa_max) >= 0) return p.etapa_max;
    return ORDEM_FUNIL.indexOf(p.etapa) >= 0 ? p.etapa : 'abordado';
  }
  function funil(prospects) {
    var total = prospects.length;
    var lista = ORDEM_FUNIL.map(function (id, i) {
      var n = prospects.filter(function (p) { return ORDEM_FUNIL.indexOf(etapaMax(p)) >= i; }).length;
      return { id: id, nome: ETAPAS.filter(function (e) { return e.id === id; })[0].nome, n: n };
    });
    lista.forEach(function (e, i) {
      e.deAnterior = i === 0 ? null : (lista[i - 1].n ? e.n / lista[i - 1].n : null);
      e.doTotal = total ? e.n / total : null;
    });
    return lista;
  }
  // datas ISO dos toques -> toques de hoje e sequência de dias úteis batendo a meta
  function sequencia(datasToques, meta, h) {
    h = h || hoje();
    var cont = {};
    datasToques.forEach(function (d) { cont[d] = (cont[d] || 0) + 1; });
    var hojeN = cont[h] || 0, streak = 0;
    if (hojeN >= meta) streak++;
    var d = addDias(h, -1), guarda = 0;
    while (guarda++ < 400) {
      var n = cont[d] || 0;
      if (diaUtil(d)) { if (n >= meta) streak++; else break; }
      else if (n >= meta) streak++;      // fim de semana trabalhado conta; folga não quebra
      d = addDias(d, -1);
    }
    return { hoje: hojeN, streak: streak };
  }

  // ───────────── importação de planilha (CSV) ─────────────
  function parseCSV(texto) {
    texto = String(texto).replace(/^﻿/, '');
    var primeira = texto.split(/\r?\n/)[0] || '';
    var delim = [',', ';', '\t'].map(function (d) { return [d, primeira.split(d).length - 1]; })
      .sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var rows = [], row = [], campo = '', aspas = false;
    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (aspas) {
        if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
        else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === delim) { row.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && texto[i + 1] === '\n') i++;
        row.push(campo); rows.push(row); row = []; campo = '';
      } else campo += ch;
    }
    if (campo !== '' || row.length) { row.push(campo); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
    if (!rows.length) return { delim: delim, headers: [], rows: [] };
    return { delim: delim, headers: rows[0].map(function (x) { return String(x).trim(); }), rows: rows.slice(1) };
  }
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  var PADROES = {
    telefone: /(telefone|whats|celular|fone|\btel\b)/,
    email: /(e-?mail)/,
    instagram: /(instagram|insta\b|^ig$|@)/,
    cidade: /(cidade|municipio)/,
    nicho: /(nicho|segmento|categoria|ramo)/,
    negocio: /(empresa|negocio|clinica|estabelecimento|razao|fantasia|loja)/,
    nome: /^(nome|contato|responsavel|nome do contato|proprietari)/
  };
  function adivinharMapeamento(headers) {
    var mapa = {}, usados = {};
    ['telefone', 'email', 'instagram', 'cidade', 'nicho', 'negocio', 'nome'].forEach(function (campo) {
      for (var i = 0; i < headers.length; i++) {
        if (usados[i]) continue;
        if (PADROES[campo].test(semAcento(headers[i]))) { mapa[campo] = i; usados[i] = true; return; }
      }
      mapa[campo] = -1;
    });
    return mapa;
  }
  function normalizarTelefone(s) {
    var d = String(s || '').replace(/\D/g, '');
    if (d.length === 10 || d.length === 11) return '55' + d;
    if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) return d;
    return d.length >= 8 ? d : '';
  }
  function normalizarInstagram(s) {
    var v = String(s || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/^@/, '');
    return v.indexOf(' ') >= 0 ? '' : v;
  }
  function chavesDedupe(p) {
    var ks = [];
    var t = String(p.telefone || '').replace(/\D/g, '');
    if (t.length >= 8) ks.push('t:' + t.slice(-9));
    if (p.instagram) ks.push('i:' + String(p.instagram).toLowerCase());
    if (p.email) ks.push('e:' + String(p.email).toLowerCase());
    if (!ks.length) ks.push('n:' + semAcento((p.nome || '') + '|' + (p.negocio || '')));
    return ks;
  }

  root.BCCalc = {
    ETAPAS: ETAPAS, ORDEM_FUNIL: ORDEM_FUNIL, CRITERIOS: CRITERIOS, GATILHOS: GATILHOS, MOTIVOS_SAIDA: MOTIVOS_SAIDA,
    PROB_RENOVACAO_PADRAO: PROB_RENOVACAO_PADRAO, PROB_ETAPA_PADRAO: PROB_ETAPA_PADRAO,
    toISO: toISO, parseISO: parseISO, hoje: hoje, setHoje: setHoje, addDias: addDias, addMeses: addMeses, diffDias: diffDias,
    inicioSemana: inicioSemana, mesDe: mesDe, primeiroDiaMes: primeiroDiaMes, ultimoDiaMes: ultimoDiaMes, addMesesMes: addMesesMes,
    diaUtil: diaUtil, dataLocalDe: dataLocalDe, soma: soma,
    ltMeses: ltMeses, ltv: ltv, fimContrato: fimContrato, diasParaFim: diasParaFim, curvaABC: curvaABC,
    notaRelacionamento: notaRelacionamento, faixaRelacionamento: faixaRelacionamento, exigeJustificativa: exigeJustificativa,
    cpl: cpl, saude: saude, estatChurn: estatChurn,
    mrrEm: mrrEm, historicoMrr: historicoMrr, previsaoMrr: previsaoMrr, pipelinePonderado: pipelinePonderado, concentracao: concentracao,
    etapaMax: etapaMax, funil: funil, sequencia: sequencia,
    parseCSV: parseCSV, adivinharMapeamento: adivinharMapeamento, normalizarTelefone: normalizarTelefone,
    normalizarInstagram: normalizarInstagram, chavesDedupe: chavesDedupe, semAcento: semAcento
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BCCalc;
})(typeof window !== 'undefined' ? window : globalThis);
