/* Agência BC · diálogos da carteira: cliente, check-in semanal, feedback, churn. */
(function (root) {
  'use strict';
  var C = root.BCCalc, S = root.BCStore, BC = root.BC, esc = BC.esc;

  function porNome(a, b) { return String(a.nome).localeCompare(String(b.nome)); }
  function campo(id, rotulo, input, extra) {
    extra = extra || {};
    return '<div class="campo' + (extra.largo ? ' largo' : '') + '"><label for="' + id + '">' + rotulo + '</label>' + input + (extra.dica ? '<small>' + extra.dica + '</small>' : '') + '</div>';
  }
  function inp(id, tipo, valor, attrs) {
    return '<input id="' + id + '" name="' + id.replace(/^[a-z]+-/, '') + '" type="' + tipo + '" value="' + esc(valor == null ? '' : valor) + '" ' + (attrs || '') + '>';
  }
  function opcoes(lista, atual) {
    return lista.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(atual) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }

  // ───────────── cliente ─────────────
  BC.abrirCliente = function (cliente, pre) {
    var c = cliente || {}; pre = pre || {};
    function v(k, d) { return c[k] != null ? c[k] : (pre[k] != null ? pre[k] : (d != null ? d : '')); }
    var durs = [3, 6, 9, 12, 18, 24]; var dAtual = Number(v('duracao_meses', 6));
    if (durs.indexOf(dAtual) < 0) durs.push(dAtual);
    durs.sort(function (a, b) { return a - b; });
    var html = '<form class="dlg" data-form="cliente" data-id="' + esc(c.id || '') + '" data-prospect="' + esc(pre.prospect_id || '') + '">' +
      BC.cabDialogo(c.id ? 'Editar cliente' : 'Novo cliente', c.id ? '' : 'Só o essencial para a conta. O resto você completa depois.') +
      '<div class="grade">' +
      campo('cli-nome', 'Nome do cliente', inp('cli-nome', 'text', v('nome'), 'required autocomplete="off"'), { largo: true }) +
      campo('cli-segmento', 'Segmento', inp('cli-segmento', 'text', v('segmento'), 'placeholder="Ex.: estética, imobiliária"')) +
      campo('cli-contato_nome', 'Quem decide no cliente', inp('cli-contato_nome', 'text', v('contato_nome'))) +
      campo('cli-whatsapp', 'WhatsApp', inp('cli-whatsapp', 'text', v('whatsapp'), 'inputmode="tel"')) +
      campo('cli-instagram', 'Instagram (sem @)', inp('cli-instagram', 'text', v('instagram'))) +
      campo('cli-mensalidade', 'Mensalidade (R$)', inp('cli-mensalidade', 'number', v('mensalidade'), 'required min="0" step="any" inputmode="decimal"'), { dica: 'Valor da sua gestão, sem a verba dos anúncios.' }) +
      campo('cli-inicio', 'Início do contrato', inp('cli-inicio', 'date', v('inicio', C.hoje()), 'required')) +
      campo('cli-duracao_meses', 'Duração (meses)', '<select id="cli-duracao_meses" name="duracao_meses">' + opcoes(durs.map(function (d) { return [d, d + ' meses']; }), dAtual) + '</select>') +
      campo('cli-verba_mensal', 'Verba mensal de anúncios (R$)', inp('cli-verba_mensal', 'number', v('verba_mensal'), 'min="0" step="any" inputmode="decimal"'), { dica: 'Paga pelo cliente direto à plataforma.' }) +
      campo('cli-meta_leads_semana', 'Meta de leads por semana', inp('cli-meta_leads_semana', 'number', v('meta_leads_semana'), 'min="0" step="1" inputmode="numeric"'), { dica: 'Usada no health score.' }) +
      campo('cli-meta_cpl', 'CPL máximo aceitável (R$)', inp('cli-meta_cpl', 'number', v('meta_cpl'), 'min="0" step="any" inputmode="decimal"')) +
      campo('cli-notas', 'Notas', '<textarea id="cli-notas" name="notas">' + esc(v('notas')) + '</textarea>', { largo: true }) +
      '</div><p class="erro-form" hidden role="alert"></p>' +
      '<div class="dlg-rodape">' + (c.id ? '<button type="button" class="btn perigo esq" data-act="excluir-cliente" data-id="' + esc(c.id) + '">Excluir cliente</button>' : '') +
      '<button type="button" class="btn" data-act="fechar">Cancelar</button><button type="submit" class="btn primario">Salvar</button></div></form>';
    BC.dialogo(html);
  };
  BC.act['novo-cliente'] = function () { BC.abrirCliente(null); };
  BC.act['editar-cliente'] = function (el) { BC.abrirCliente(S.get('clientes', el.dataset.id)); };
  BC.forms.cliente = function (form) {
    var d = BC.dados(form), id = form.dataset.id, pid = form.dataset.prospect;
    var row = {
      nome: BC.txt(d.nome), segmento: BC.txt(d.segmento), contato_nome: BC.txt(d.contato_nome), whatsapp: BC.txt(d.whatsapp),
      instagram: C.normalizarInstagram(d.instagram), mensalidade: Number(d.mensalidade) || 0, inicio: d.inicio,
      duracao_meses: Number(d.duracao_meses) || 3, verba_mensal: BC.num(d.verba_mensal), meta_leads_semana: BC.num(d.meta_leads_semana),
      meta_cpl: BC.num(d.meta_cpl), notas: BC.txt(d.notas)
    };
    if (!row.nome) return BC.erroForm(form, 'Informe o nome do cliente.');
    if (!row.inicio) return BC.erroForm(form, 'Informe a data de início.');
    BC.seguro(async function () {
      var r;
      if (id) r = await S.update('clientes', id, row);
      else {
        row.status = 'ativo';
        if (pid) row.prospect_id = pid;
        r = await S.insert('clientes', row);
        if (pid) {
          var p = S.get('prospects', pid);
          if (p) {
            await S.update('prospects', pid, { etapa: 'fechado', etapa_max: 'fechado', cliente_id: r.id, proxima_data: null, proxima_acao: '', atualizado_em: new Date().toISOString() });
            await S.insert('atividades', { prospect_id: pid, tipo: 'etapa', canal: '', texto: 'Virou cliente' });
          }
        }
      }
      BC.fechar(form);
      BC.toast(id ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      if (!id) location.hash = '#c-' + r.id;
    }, form);
  };
  BC.act['excluir-cliente'] = function (el) {
    if (!el.dataset.confirmar) { el.dataset.confirmar = '1'; el.textContent = 'Confirmar exclusão'; return; }
    BC.seguro(async function () {
      var id = el.dataset.id;
      var filhos = S.all('checkins').filter(function (k) { return k.cliente_id === id; });
      for (var i = 0; i < filhos.length; i++) await S.remove('checkins', filhos[i].id);
      filhos = S.all('feedbacks').filter(function (f) { return f.cliente_id === id; });
      for (i = 0; i < filhos.length; i++) await S.remove('feedbacks', filhos[i].id);
      var ps = S.all('prospects').filter(function (p) { return p.cliente_id === id; });
      for (i = 0; i < ps.length; i++) await S.update('prospects', ps[i].id, { cliente_id: null });
      await S.remove('clientes', id);
      BC.fechar(el); location.hash = '#clientes';
      BC.toast('Cliente excluído.');
    });
  };

  // ───────────── check-in semanal ─────────────
  BC.abrirCheckin = function (clienteId, semana) {
    var ativos = S.all('clientes').filter(function (c) { return c.status !== 'churn'; }).sort(porNome);
    if (!ativos.length) { BC.toast('Cadastre um cliente antes de fazer o check-in.', true); return; }
    clienteId = clienteId || ativos[0].id;
    semana = semana || C.inicioSemana(C.hoje());
    var aberto = document.querySelector('dialog[data-checkin]');
    if (aberto) aberto.remove();
    var ex = S.all('checkins').filter(function (k) { return k.cliente_id === clienteId && k.semana === semana; })[0] || {};
    var semanas = [];
    for (var i = 0; i < 8; i++) { var s = C.addDias(C.inicioSemana(C.hoje()), -7 * i); semanas.push([s, 'Semana de ' + BC.dataCurta(s) + (i === 0 ? ' (atual)' : '')]); }
    if (!semanas.some(function (x) { return x[0] === semana; })) semanas.push([semana, 'Semana de ' + BC.dataCurta(semana)]);
    var gat = ex.gatilhos || [];

    var crit = C.CRITERIOS.map(function (k) {
      var seg = '<div class="seg" role="radiogroup" aria-label="' + esc(k.nome) + '">';
      for (var n = 1; n <= 5; n++) seg += '<label><input type="radio" name="r_' + k.id + '" value="' + n + '"' + (Number(ex['r_' + k.id]) === n ? ' checked' : '') + '><span>' + n + '</span></label>';
      seg += '</div>';
      return '<div class="crit"><div><span class="nome">' + esc(k.nome) + '</span><span class="peso">peso ' + k.peso + '</span><div class="q">' + esc(k.pergunta) + '</div>' +
        '<div class="q faint">1 = ' + esc(k.ancoras[1]) + ' · 3 = ' + esc(k.ancoras[3]) + ' · 5 = ' + esc(k.ancoras[5]) + '</div></div>' + seg + '</div>';
    }).join('');
    var checks = C.GATILHOS.map(function (g) {
      return '<label class="check"><input type="checkbox" name="gatilhos" value="' + g.id + '"' + (gat.indexOf(g.id) >= 0 ? ' checked' : '') + '><span>' + esc(g.texto) + '</span></label>';
    }).join('');

    var html = '<form class="dlg" data-form="checkin" data-live="checkin" data-id="' + esc(ex.id || '') + '">' +
      BC.cabDialogo('Check-in semanal', ex.id ? 'Editando um check-in já registrado.' : 'Resultado, relacionamento e sinais da semana.') +
      '<div class="grade">' +
      campo('ck-cliente_id', 'Cliente', '<select id="ck-cliente_id" name="cliente_id" data-change="troca-checkin">' + opcoes(ativos.map(function (c) { return [c.id, c.nome]; }), clienteId) + '</select>') +
      campo('ck-semana', 'Semana', '<select id="ck-semana" name="semana" data-change="troca-checkin">' + opcoes(semanas, semana) + '</select>') +
      '</div>' +
      '<div class="secao"><h2>Resultado dos últimos 7 dias</h2><div class="grade">' +
      campo('ck-investimento', 'Investido em anúncios (R$)', inp('ck-investimento', 'number', ex.investimento, 'min="0" step="any" inputmode="decimal"')) +
      campo('ck-leads', 'Leads', inp('ck-leads', 'number', ex.leads, 'min="0" step="1" inputmode="numeric"')) +
      campo('ck-vendas', 'Vendas informadas pelo cliente', inp('ck-vendas', 'number', ex.vendas, 'min="0" step="1" inputmode="numeric"')) +
      campo('ck-faturamento', 'Faturamento do cliente (R$)', inp('ck-faturamento', 'number', ex.faturamento, 'min="0" step="any" inputmode="decimal"'), { dica: 'Opcional, se ele informar.' }) +
      '</div><p class="small muted">CPL da semana: <strong class="mono" data-out="cpl">—</strong></p></div>' +
      '<div class="secao"><h2>PDCA da semana</h2><div class="grade">' +
      campo('ck-feito', 'O que eu fiz (Do / Act)', '<textarea id="ck-feito" name="feito">' + esc(ex.feito || '') + '</textarea>') +
      campo('ck-proximo', 'Próxima ação (Plan)', '<textarea id="ck-proximo" name="proximo">' + esc(ex.proximo || '') + '</textarea>') +
      '</div></div>' +
      '<div class="secao"><h2>Relacionamento</h2><p class="small muted">Notas de 1 a 5 avaliando o cliente, não a agência. Deixe tudo em branco para pular nesta semana.</p>' + crit +
      '<div class="notaviva" data-out="nota"><span class="muted small">Responda os cinco critérios para ver a nota.</span></div>' +
      '<div class="campo" data-just hidden><label for="ck-justificativa">Justificativa (obrigatória para nota abaixo de 7 ou a partir de 9,5)</label><textarea id="ck-justificativa" name="justificativa">' + esc(ex.justificativa || '') + '</textarea></div></div>' +
      '<div class="secao"><h2>Sinais de desengajamento</h2><p class="small muted">Marque o que apareceu nesta semana.</p><div class="checks">' + checks + '</div></div>' +
      '<p class="erro-form" hidden role="alert"></p>' +
      '<div class="dlg-rodape"><button type="button" class="btn" data-act="fechar">Cancelar</button><button type="submit" class="btn primario">Salvar check-in</button></div></form>';
    var dlg = BC.dialogo(html, { semFoco: true });
    dlg.setAttribute('data-checkin', '1');
    BC.live.checkin(dlg.querySelector('form'));
  };
  BC.act['checkin'] = function (el) { BC.abrirCheckin(el.dataset.id, el.dataset.semana || null); };
  BC.act['troca-checkin'] = function (el) {
    var f = el.closest('form'), d = BC.dados(f);
    BC.abrirCheckin(d.cliente_id, d.semana);
  };
  BC.live = BC.live || {};
  BC.live.checkin = function (form) {
    var d = BC.dados(form);
    var cp = C.cpl(BC.num(d.investimento), BC.num(d.leads));
    form.querySelector('[data-out=cpl]').textContent = cp == null ? '—' : BC.brl2(cp);
    var nota = C.notaRelacionamento({ confianca: d.r_confianca, aderencia: d.r_aderencia, postura: d.r_postura, presenca: d.r_presenca, insumos: d.r_insumos });
    var out = form.querySelector('[data-out=nota]'), just = form.querySelector('[data-just]'), ta = just.querySelector('textarea');
    if (nota == null) {
      out.innerHTML = '<span class="muted small">Responda os cinco critérios para ver a nota.</span>';
      just.hidden = true; ta.required = false;
    } else {
      out.innerHTML = '<span class="grande">' + BC.n1(nota) + '</span>' + BC.pillRel(nota);
      var exige = C.exigeJustificativa(nota);
      just.hidden = !exige; ta.required = exige;
    }
  };
  BC.forms.checkin = function (form) {
    var d = BC.dados(form), id = form.dataset.id;
    var rel = { confianca: d.r_confianca, aderencia: d.r_aderencia, postura: d.r_postura, presenca: d.r_presenca, insumos: d.r_insumos };
    var respondidos = Object.keys(rel).filter(function (k) { return rel[k] != null && rel[k] !== ''; }).length;
    if (respondidos > 0 && respondidos < 5) return BC.erroForm(form, 'Responda os cinco critérios de relacionamento ou deixe todos em branco.');
    var nota = respondidos === 5 ? C.notaRelacionamento(rel) : null;
    if (C.exigeJustificativa(nota) && !BC.txt(d.justificativa)) return BC.erroForm(form, 'Escreva a justificativa da nota (obrigatória abaixo de 7 ou a partir de 9,5).');
    var gat = d.gatilhos == null ? [] : (Array.isArray(d.gatilhos) ? d.gatilhos : [d.gatilhos]);
    var row = {
      cliente_id: d.cliente_id, semana: d.semana,
      investimento: BC.num(d.investimento), leads: BC.num(d.leads), vendas: BC.num(d.vendas), faturamento: BC.num(d.faturamento),
      feito: BC.txt(d.feito), proximo: BC.txt(d.proximo),
      r_confianca: nota == null ? null : Number(rel.confianca), r_aderencia: nota == null ? null : Number(rel.aderencia),
      r_postura: nota == null ? null : Number(rel.postura), r_presenca: nota == null ? null : Number(rel.presenca), r_insumos: nota == null ? null : Number(rel.insumos),
      nota_rel: nota, justificativa: C.exigeJustificativa(nota) ? BC.txt(d.justificativa) : '', gatilhos: gat
    };
    BC.seguro(async function () {
      var igual = S.all('checkins').filter(function (k) { return k.cliente_id === row.cliente_id && k.semana === row.semana; })[0];
      if (id || igual) await S.update('checkins', id || igual.id, row); else await S.insert('checkins', row);
      BC.fechar(form);
      BC.toast('Check-in salvo.');
    }, form);
  };

  // ───────────── feedback ─────────────
  BC.abrirFeedback = function (clienteId) {
    var cli = S.get('clientes', clienteId); if (!cli) return;
    var tons = [['positivo', 'Positivo'], ['neutro', 'Neutro'], ['negativo', 'Negativo']];
    var html = '<form class="dlg" data-form="feedback" data-cliente="' + esc(clienteId) + '">' +
      BC.cabDialogo('Novo feedback', cli.nome) +
      '<div class="grade">' +
      campo('fb-data', 'Data', inp('fb-data', 'date', C.hoje(), 'required')) +
      campo('fb-canal', 'Onde aconteceu', '<select id="fb-canal" name="canal">' + opcoes([['whatsapp', 'WhatsApp'], ['reuniao', 'Reunião'], ['ligacao', 'Ligação'], ['outro', 'Outro']], 'whatsapp') + '</select>') +
      '<div class="campo largo"><span class="rotulo">Tom</span><div class="seg" role="radiogroup" aria-label="Tom do feedback">' +
      tons.map(function (t) { return '<label><input type="radio" name="tom" value="' + t[0] + '"' + (t[0] === 'neutro' ? ' checked' : '') + '><span style="width:auto;padding:0 16px">' + t[1] + '</span></label>'; }).join('') + '</div></div>' +
      campo('fb-texto', 'O que o cliente disse', '<textarea id="fb-texto" name="texto" required></textarea>', { largo: true }) +
      '</div><p class="erro-form" hidden role="alert"></p>' +
      '<div class="dlg-rodape"><button type="button" class="btn" data-act="fechar">Cancelar</button><button type="submit" class="btn primario">Salvar feedback</button></div></form>';
    BC.dialogo(html);
  };
  BC.act['novo-feedback'] = function (el) { BC.abrirFeedback(el.dataset.id); };
  BC.forms.feedback = function (form) {
    var d = BC.dados(form);
    if (!BC.txt(d.texto)) return BC.erroForm(form, 'Escreva o feedback.');
    BC.seguro(async function () {
      await S.insert('feedbacks', { cliente_id: form.dataset.cliente, data: d.data, canal: d.canal, tom: d.tom || 'neutro', texto: BC.txt(d.texto) });
      BC.fechar(form); BC.toast('Feedback registrado.');
    }, form);
  };
  BC.act['excluir-feedback'] = function (el) { BC.seguro(async function () { await S.remove('feedbacks', el.dataset.id); BC.toast('Feedback removido.'); }); };

  // ───────────── churn ─────────────
  BC.abrirChurn = function (clienteId) {
    var cli = S.get('clientes', clienteId); if (!cli) return;
    var lista = C.MOTIVOS_SAIDA.map(function (m, i) {
      return '<label><input type="radio" name="motivo" value="' + m.id + '"><span class="ord">' + (i + 1) + '</span><span><span class="t">' + esc(m.nome) + '</span><br><span class="d">' + esc(m.def) + '</span></span></label>';
    }).join('');
    var html = '<form class="dlg" data-form="churn" data-id="' + esc(clienteId) + '">' +
      BC.cabDialogo('Registrar churn', cli.nome) +
      '<div class="grade">' + campo('ch-data', 'Data da saída', inp('ch-data', 'date', C.hoje(), 'required'), { dica: 'O LT e o LTV ficam congelados nesta data.' }) + '</div>' +
      '<div class="campo"><span class="rotulo">Motivo da saída</span><p class="small muted">Percorra a lista de cima para baixo e pare no primeiro motivo que explica a saída.</p>' +
      '<div class="cascata" role="radiogroup" aria-label="Motivo da saída">' + lista + '</div>' +
      '<small>“Não pagou” não é motivo: o atraso decorre de alguma das causas acima. “Cliente fora do perfil” também não vale, porque tira o foco da entrega.</small></div>' +
      campo('ch-aprendizados', 'O que eu faria diferente (até 5 pontos)', '<textarea id="ch-aprendizados" name="aprendizados" required placeholder="Culpar o cliente não melhora a operação. Liste o que você mudaria."></textarea>', { largo: true }) +
      '<p class="erro-form" hidden role="alert"></p>' +
      '<div class="dlg-rodape"><button type="button" class="btn" data-act="fechar">Cancelar</button><button type="submit" class="btn perigo">Registrar churn</button></div></form>';
    BC.dialogo(html);
  };
  BC.act['churn'] = function (el) { BC.abrirChurn(el.dataset.id); };
  BC.forms.churn = function (form) {
    var d = BC.dados(form);
    if (!d.motivo) return BC.erroForm(form, 'Escolha o motivo da saída.');
    if (!BC.txt(d.aprendizados)) return BC.erroForm(form, 'Escreva o que você faria diferente.');
    BC.seguro(async function () {
      await S.update('clientes', form.dataset.id, { status: 'churn', churn_data: d.data, churn_motivo: d.motivo, churn_aprendizados: BC.txt(d.aprendizados) });
      BC.fechar(form); BC.toast('Churn registrado.');
      location.hash = '#churn';
    }, form);
  };
  BC.act['reverter-churn'] = function (el) {
    BC.seguro(async function () {
      await S.update('clientes', el.dataset.id, { status: 'ativo', churn_data: null, churn_motivo: null, churn_aprendizados: null });
      BC.toast('Cliente voltou para a carteira.');
      location.hash = '#c-' + el.dataset.id;
    });
  };
})(window);
