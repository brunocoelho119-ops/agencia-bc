/* Agência BC · diálogos da prospecção: contato, toque, perda, conversão e importação de planilha. */
(function (root) {
  'use strict';
  var C = root.BCCalc, S = root.BCStore, BC = root.BC, esc = BC.esc;

  function campo(id, rotulo, input, extra) {
    extra = extra || {};
    return '<div class="campo' + (extra.largo ? ' largo' : '') + '"><label for="' + id + '">' + rotulo + '</label>' + input + (extra.dica ? '<small>' + extra.dica + '</small>' : '') + '</div>';
  }
  function opcoes(lista, atual) {
    return lista.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(atual) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  var ORIGENS = [['lista', 'Lista de prospecção'], ['meta_ads', 'Meta Ads (lead do anúncio)'], ['indicacao', 'Indicação'], ['outro', 'Outro']];
  var CANAIS = [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram DM'], ['email', 'E-mail'], ['ligacao', 'Ligação'], ['linkedin', 'LinkedIn'], ['presencial', 'Presencial']];
  var MOTIVOS_PERDA = ['Sem resposta', 'Sem verba para anúncios', 'Já tem gestor de tráfego', 'Sem interesse', 'Não é o momento', 'Outro'];
  var DICAS_ETAPA = {
    novo: 'Antes de abordar, deixe a mensagem de abordagem e o mini-diagnóstico prontos para quando o lead responder.',
    abordado: 'Programe o próximo follow-up. Se ele responder, o mini-diagnóstico já deve estar pronto.',
    respondeu: 'Ele respondeu: envie o mini-diagnóstico agora.',
    diagnostico: 'Diagnóstico enviado. Próximo passo: propor uma reunião para apresentá-lo.',
    reuniao: 'Depois da reunião, envie a proposta (validade de 7 dias).',
    proposta: 'Proposta enviada. Cobre o retorno antes de ela vencer.'
  };
  function idx(etapa) { return C.ORDEM_FUNIL.indexOf(etapa); }
  function maiorEtapa(atual, nova) { return idx(nova) > idx(atual) ? nova : (idx(atual) < 0 ? nova : atual); }
  function agora() { return new Date().toISOString(); }

  // ───────────── contato: gaveta lateral com os dados editáveis ─────────────
  BC.abrirProspect = function (id) {
    var p = id ? S.get('prospects', id) : null;
    if (!p) { BC.ui.novoAberto = true; BC.render(); return; }
    var listas = S.all('listas');
    var ativ = S.all('atividades').filter(function (a) { return a.prospect_id === id; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 12);
    var tipos = { toque: 'Toque', resposta: 'Resposta', etapa: 'Etapa', nota: 'Nota' };
    var cad = p.created_at ? BC.dataCurta(C.dataLocalDe(p.created_at)) : '—';
    var prox = C.ORDEM_FUNIL[idx(p.etapa) + 1];

    var html = '<form class="dlg gv" data-form="prospect" data-id="' + esc(id) + '">' +
      '<div class="gv-cab"><div><h3>' + esc(p.nome || p.negocio) + '</h3><p>' + esc([p.negocio, BC.nomeEtapa(p.etapa)].filter(Boolean).join(' · ')) + '</p></div>' +
      '<button type="button" class="gv-x" data-act="fechar" aria-label="Fechar">&times;</button></div>' +
      '<div class="gv-corpo">' +
      (DICAS_ETAPA[p.etapa] ? '<div class="aviso" style="margin:0">' + esc(DICAS_ETAPA[p.etapa]) + '</div>' : '') +
      campo('pr-nome', 'Nome', '<input id="pr-nome" name="nome" type="text" required autocomplete="off" value="' + esc(p.nome || '') + '">') +
      campo('pr-negocio', 'Negócio / nicho', '<input id="pr-negocio" name="negocio" type="text" value="' + esc(p.negocio || '') + '">') +
      campo('pr-telefone', 'Telefone / WhatsApp', '<input id="pr-telefone" name="telefone" type="tel" inputmode="tel" value="' + esc(p.telefone || '') + '">') +
      campo('pr-email', 'E-mail', '<input id="pr-email" name="email" type="email" value="' + esc(p.email || '') + '">') +
      campo('pr-instagram', '@ do Instagram', '<input id="pr-instagram" name="instagram" type="text" value="' + esc(p.instagram ? '@' + p.instagram : '') + '">') +
      campo('pr-canal', 'Canal', '<select id="pr-canal" name="canal">' + opcoes(CANAIS, p.canal) + '</select>') +
      campo('pr-etapa', 'Etapa', '<select id="pr-etapa" name="etapa">' + opcoes(C.ETAPAS.map(function (e) { return [e.id, e.nome]; }), p.etapa) + '</select>') +
      campo('pr-proxima_data', 'Próxima etapa', '<input id="pr-proxima_data" name="proxima_data" type="date" value="' + esc(p.proxima_data || '') + '">') +
      campo('pr-proxima_acao', 'O que fazer na próxima etapa', '<input id="pr-proxima_acao" name="proxima_acao" type="text" value="' + esc(p.proxima_acao || '') + '" placeholder="Ex.: Follow-up 1">') +
      campo('pr-notas', 'Anotações da conversa', '<textarea id="pr-notas" name="notas" placeholder="O que ele falou, o que ficou combinado, quando retomar...">' + esc(p.notas || '') + '</textarea>') +
      campo('pr-abordagem', 'Mensagem de abordagem', '<textarea id="pr-abordagem" name="abordagem" placeholder="A mensagem que você vai enviar neste primeiro contato.">' + esc(p.abordagem || '') + '</textarea>') +
      campo('pr-diagnostico', 'Mini-diagnóstico (entregável)', '<textarea id="pr-diagnostico" name="diagnostico" placeholder="Resumo ou link do mini-diagnóstico, pronto para enviar se ele responder.">' + esc(p.diagnostico || '') + '</textarea>') +
      (p.etapa === 'perdido' ? campo('pr-motivo_perda', 'Motivo da perda', '<input id="pr-motivo_perda" name="motivo_perda" type="text" value="' + esc(p.motivo_perda || '') + '">') : '') +
      '<div class="gv-links">' + BC.iconesContato(p) + '</div>' +
      '<details class="gv-mais"><summary>Mais detalhes</summary><div class="gv-mais-corpo">' +
      campo('pr-nicho', 'Nicho', '<input id="pr-nicho" name="nicho" type="text" value="' + esc(p.nicho || '') + '">') +
      campo('pr-cidade', 'Cidade', '<input id="pr-cidade" name="cidade" type="text" value="' + esc(p.cidade || '') + '">') +
      campo('pr-origem', 'Origem', '<select id="pr-origem" name="origem">' + opcoes(ORIGENS, p.origem) + '</select>') +
      campo('pr-campanha', 'Campanha / formulário', '<input id="pr-campanha" name="campanha" type="text" value="' + esc(p.campanha || '') + '">') +
      campo('pr-lista_id', 'Lista', '<select id="pr-lista_id" name="lista_id"><option value="">Sem lista</option>' + opcoes(listas.map(function (l) { return [l.id, l.nome]; }), p.lista_id || '') + '</select>') +
      '</div></details>' +
      '<div class="gv-acoes"><button type="button" class="btn mini primario" data-act="toque" data-id="' + esc(id) + '">Registrar toque</button>' +
      (p.etapa === 'abordado' || p.etapa === 'novo' ? '<button type="button" class="btn mini" data-act="respondeu" data-id="' + esc(id) + '">Respondeu</button>' : '') +
      (p.cliente_id ? '<a class="btn mini" href="#c-' + esc(p.cliente_id) + '" data-act="fechar-e-ir">Ver cliente</a>' : (p.etapa !== 'fechado' ? '<button type="button" class="btn mini" data-act="converter" data-id="' + esc(id) + '">Converter em cliente</button>' : '')) +
      (p.etapa !== 'perdido' && p.etapa !== 'fechado' ? '<button type="button" class="btn mini fantasma" data-act="perdido" data-id="' + esc(id) + '">Marcar como perdido</button>' : '') + '</div>' +
      '<div class="gv-hist"><h2>Histórico</h2>' + (ativ.length ? '<ul class="linhas">' + ativ.map(function (a) {
        var d = new Date(a.created_at);
        return '<li><div class="corpo"><div class="small"><span class="tag">' + (tipos[a.tipo] || a.tipo) + '</span> ' + BC.dataCurta(C.toISO(d)) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + (a.canal ? ' · ' + esc(a.canal) : '') + '</div>' + (a.texto ? '<div class="det">' + esc(a.texto) + '</div>' : '') + '</div></li>';
      }).join('') + '</ul>' : '<p class="small faint">Nenhum toque registrado ainda.</p>') + '</div>' +
      '<p class="small faint gv-meta">Cadastrado em ' + cad + ' · etapa atual: <strong>' + esc(BC.nomeEtapa(p.etapa)) + '</strong>' + (p.proxima_data ? ' · próxima etapa em ' + BC.dataCurta(p.proxima_data) : '') + '</p>' +
      '</div>' +
      '<p class="erro-form" hidden role="alert" style="padding:0 20px"></p>' +
      '<div class="gv-rodape"><button type="submit" class="btn primario">Salvar</button>' +
      (prox ? '<button type="button" class="btn" data-act="avancar" data-id="' + esc(id) + '">Avançar etapa</button>' : '') +
      '<button type="button" class="btn perigo" data-act="excluir-prospect" data-id="' + esc(id) + '">Excluir</button></div></form>';
    BC.dialogo(html, { gaveta: true, semFoco: true });
  };
  BC.act['abrir-prospect'] = function (el) { BC.abrirProspect(el.dataset.id); };
  BC.act['fechar-e-ir'] = function (el) { BC.fechar(el); };

  BC.forms.prospect = function (form) {
    var d = BC.dados(form), id = form.dataset.id;
    var nome = BC.txt(d.nome) || BC.txt(d.negocio);
    if (!nome) return BC.erroForm(form, 'Informe o nome do contato ou do negócio.');
    var tel = BC.txt(d.telefone), telNorm = C.normalizarTelefone(tel);
    var row = {
      nome: nome, negocio: BC.txt(d.negocio), nicho: BC.txt(d.nicho), cidade: BC.txt(d.cidade), telefone: telNorm || tel,
      email: BC.txt(d.email).toLowerCase(), instagram: C.normalizarInstagram(d.instagram), canal: d.canal, origem: d.origem, campanha: BC.txt(d.campanha),
      lista_id: d.lista_id || null, etapa: d.etapa, proxima_data: d.proxima_data || null, proxima_acao: BC.txt(d.proxima_acao),
      abordagem: BC.txt(d.abordagem), diagnostico: BC.txt(d.diagnostico), notas: BC.txt(d.notas), atualizado_em: agora()
    };
    if (d.motivo_perda != null) row.motivo_perda = BC.txt(d.motivo_perda);
    BC.seguro(async function () {
      if (id) {
        var antigo = S.get('prospects', id);
        row.etapa_max = maiorEtapa(C.etapaMax(antigo), row.etapa);
        await S.update('prospects', id, row);
        if (antigo.etapa !== row.etapa) await S.insert('atividades', { prospect_id: id, tipo: 'etapa', canal: '', texto: 'De ' + BC.nomeEtapa(antigo.etapa) + ' para ' + BC.nomeEtapa(row.etapa) });
      } else {
        row.etapa_max = idx(row.etapa) >= 0 ? row.etapa : 'novo'; row.toques = 0; row.motivo_perda = row.motivo_perda || ''; row.meta_lead_id = '';
        await S.insert('prospects', row);
      }
      BC.ui.novoAberto = false;
      BC.fechar(form); BC.toast(id ? 'Contato atualizado.' : 'Contato adicionado.');
    }, form);
  };
  BC.act['excluir-prospect'] = function (el) {
    if (!el.dataset.confirmar) { el.dataset.confirmar = '1'; el.textContent = 'Confirmar exclusão'; return; }
    BC.seguro(async function () {
      var id = el.dataset.id, ats = S.all('atividades').filter(function (a) { return a.prospect_id === id; });
      for (var i = 0; i < ats.length; i++) await S.remove('atividades', ats[i].id);
      await S.remove('prospects', id); BC.fechar(el); BC.toast('Contato excluído.');
    });
  };

  // ───────────── toque ─────────────
  BC.abrirToque = function (id) {
    var p = S.get('prospects', id); if (!p) return;
    var n = (Number(p.toques) || 0) + 1;
    var padrao = n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 7;
    var presets = [[1, 'Amanhã'], [2, 'Em 2 dias'], [3, 'Em 3 dias'], [7, 'Em 7 dias'], [0, 'Sem follow-up']];
    var html = '<form class="dlg" data-form="toque" data-id="' + esc(id) + '">' + BC.cabDialogo('Registrar toque ' + n, p.negocio || p.nome) +
      '<div class="grade">' + campo('tq-canal', 'Canal', '<select id="tq-canal" name="canal">' + opcoes(CANAIS, p.canal) + '</select>') +
      campo('tq-texto', 'O que foi enviado ou dito (opcional)', '<input id="tq-texto" name="texto" type="text" autocomplete="off">') + '</div>' +
      '<div class="campo"><span class="rotulo">Próximo follow-up</span><div class="seg" role="radiogroup" aria-label="Próximo follow-up">' +
      presets.map(function (x) { return '<label><input type="radio" name="dias" value="' + x[0] + '"' + (x[0] === padrao ? ' checked' : '') + '><span style="width:auto;padding:0 12px;font-family:var(--f-body);font-weight:500">' + x[1] + '</span></label>'; }).join('') + '</div></div>' +
      '<div class="grade">' + campo('tq-proxima_acao', 'Próxima ação', '<input id="tq-proxima_acao" name="proxima_acao" type="text" value="Follow-up ' + n + '">') + '</div>' +
      '<p class="erro-form" hidden role="alert"></p><div class="dlg-rodape"><button type="button" class="btn" data-act="fechar">Cancelar</button><button type="submit" class="btn primario">Registrar toque</button></div></form>';
    BC.dialogo(html, { estreito: true, semFoco: true });
  };
  BC.act['toque'] = function (el) { var d = el.closest('dialog'); if (d) d.close(); BC.abrirToque(el.dataset.id); };
  BC.forms.toque = function (form) {
    var d = BC.dados(form), id = form.dataset.id, p = S.get('prospects', id), dias = Number(d.dias) || 0;
    BC.seguro(async function () {
      var patch = {
        toques: (Number(p.toques) || 0) + 1, canal: d.canal, atualizado_em: agora(),
        proxima_data: dias ? C.addDias(C.hoje(), dias) : null, proxima_acao: dias ? BC.txt(d.proxima_acao) : ''
      };
      if (p.etapa === 'novo') { patch.etapa = 'abordado'; patch.etapa_max = maiorEtapa(C.etapaMax(p), 'abordado'); }
      await S.update('prospects', id, patch);
      await S.insert('atividades', { prospect_id: id, tipo: 'toque', canal: d.canal, texto: BC.txt(d.texto) });
      BC.fechar(form); BC.toast('Toque registrado.');
    }, form);
  };

  // ───────────── etapas ─────────────
  async function mudarEtapa(id, nova, extra) {
    var p = S.get('prospects', id);
    var patch = Object.assign({ etapa: nova, etapa_max: maiorEtapa(C.etapaMax(p), nova), atualizado_em: agora() }, extra || {});
    await S.update('prospects', id, patch);
    await S.insert('atividades', { prospect_id: id, tipo: nova === 'respondeu' ? 'resposta' : 'etapa', canal: '', texto: 'De ' + BC.nomeEtapa(p.etapa) + ' para ' + BC.nomeEtapa(nova) });
  }
  BC.act['respondeu'] = function (el) {
    BC.seguro(async function () {
      await mudarEtapa(el.dataset.id, 'respondeu', { proxima_data: C.hoje(), proxima_acao: 'Enviar o mini-diagnóstico' });
      BC.toast('Ele respondeu. Hora de enviar o mini-diagnóstico.');
    });
  };
  BC.act['avancar'] = function (el) {
    var p = S.get('prospects', el.dataset.id); if (!p) return;
    var prox = C.ORDEM_FUNIL[idx(p.etapa) + 1];
    if (!prox) return;
    var dlg = el.closest('dialog');
    if (prox === 'fechado') { if (dlg) dlg.close(); BC.converterProspect(p.id); return; }
    BC.seguro(async function () {
      await mudarEtapa(p.id, prox, { proxima_data: null, proxima_acao: '' });
      if (dlg) dlg.close();
      BC.toast('Movido para ' + BC.nomeEtapa(prox) + '.');
    });
  };
  BC.converterProspect = function (id) {
    var p = S.get('prospects', id); if (!p) return;
    BC.abrirCliente(null, {
      nome: p.negocio || p.nome, contato_nome: p.negocio && p.nome !== p.negocio ? p.nome : '', whatsapp: p.telefone,
      instagram: p.instagram, segmento: p.nicho, prospect_id: p.id
    });
  };
  BC.act['converter'] = function (el) { var d = el.closest('dialog'); if (d) d.close(); BC.converterProspect(el.dataset.id); };

  BC.act['perdido'] = function (el) {
    var p = S.get('prospects', el.dataset.id); if (!p) return;
    var d0 = el.closest('dialog'); if (d0) d0.close();
    var html = '<form class="dlg" data-form="perdido" data-id="' + esc(p.id) + '">' + BC.cabDialogo('Marcar como perdido', p.negocio || p.nome) +
      campo('pd-motivo', 'Motivo', '<select id="pd-motivo" name="motivo">' + opcoes(MOTIVOS_PERDA.map(function (m) { return [m, m]; }), 'Sem resposta') + '</select>') +
      '<div class="dlg-rodape"><button type="button" class="btn" data-act="fechar">Cancelar</button><button type="submit" class="btn perigo">Marcar como perdido</button></div></form>';
    BC.dialogo(html, { estreito: true });
  };
  BC.forms.perdido = function (form) {
    var d = BC.dados(form);
    BC.seguro(async function () {
      await mudarEtapa(form.dataset.id, 'perdido', { proxima_data: null, proxima_acao: '', motivo_perda: d.motivo });
      BC.fechar(form); BC.toast('Contato marcado como perdido.');
    }, form);
  };

  // ───────────── importação de planilha ─────────────
  var CAMPOS_IMP = [['nome', 'Nome do contato'], ['negocio', 'Negócio'], ['telefone', 'Telefone / WhatsApp'], ['instagram', 'Instagram'], ['email', 'E-mail'], ['cidade', 'Cidade'], ['nicho', 'Nicho']];
  BC.imp = { parsed: null, arquivo: '' };

  BC.act['importar'] = function () {
    BC.imp = { parsed: null, arquivo: '' };
    var html = '<div class="dlg" data-importacao>' + BC.cabDialogo('Importar planilha de prospecção', 'No Google Sheets: Arquivo → Baixar → Valores separados por vírgula (.csv).') +
      '<div id="imp-passo1" class="secao" style="border-top:0;padding-top:0">' +
      campo('imp-arq', 'Arquivo CSV', '<input id="imp-arq" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" data-change="imp-arquivo">') +
      campo('imp-colar', 'Ou cole as linhas da planilha aqui', '<textarea id="imp-colar" style="min-height:90px" placeholder="Nome;Empresa;WhatsApp&#10;..."></textarea>') +
      '<p class="erro-form" id="imp-erro" hidden role="alert"></p>' +
      '<div class="dlg-rodape"><button type="button" class="btn" data-act="fechar">Cancelar</button><button type="button" class="btn primario" data-act="imp-ler">Ler planilha</button></div></div>' +
      '<form id="imp-passo2" data-form="importar" hidden></form></div>';
    BC.dialogo(html, { semFoco: true });
  };
  BC.act['imp-arquivo'] = function (el) {
    var f = el.files && el.files[0]; if (!f) return;
    var r = new FileReader();
    BC.imp.arquivo = f.name.replace(/\.[^.]+$/, '');
    r.onload = function () { var ta = document.getElementById('imp-colar'); if (ta) ta.value = r.result; BC.act['imp-ler'](el); };
    r.onerror = function () { BC.toast('Não consegui ler o arquivo.', true); };
    r.readAsText(f);
  };
  BC.act['imp-ler'] = function (el) {
    var raiz = el.closest('[data-importacao]'), ta = raiz.querySelector('#imp-colar'), erro = raiz.querySelector('#imp-erro');
    var parsed = C.parseCSV(ta.value || '');
    if (!parsed.headers.length || !parsed.rows.length) { erro.textContent = 'Não encontrei linhas. Confira se o arquivo é um CSV com cabeçalho na primeira linha.'; erro.hidden = false; return; }
    erro.hidden = true; BC.imp.parsed = parsed;
    var mapa = C.adivinharMapeamento(parsed.headers);
    var nomeLista = BC.imp.arquivo || ('Importação de ' + BC.dataCurta(C.hoje()));
    var f = raiz.querySelector('#imp-passo2');
    f.innerHTML = '<div class="secao" style="border-top:0;padding-top:0"><p class="small muted"><strong>' + parsed.rows.length + '</strong> linhas lidas. Confira quais colunas correspondem a cada campo.</p>' +
      '<div class="mapa">' + CAMPOS_IMP.map(function (c) {
        return '<div class="campo"><label for="map-' + c[0] + '">' + c[1] + '</label><select id="map-' + c[0] + '" name="map_' + c[0] + '" data-change="imp-mapa"><option value="-1">— não importar —</option>' +
          parsed.headers.map(function (h, i) { return '<option value="' + i + '"' + (mapa[c[0]] === i ? ' selected' : '') + '>' + esc(h || 'Coluna ' + (i + 1)) + '</option>'; }).join('') + '</select></div>';
      }).join('') + '</div>' +
      '<label class="check"><input type="checkbox" name="extras" value="1" checked data-change="imp-mapa"><span>Guardar as colunas não mapeadas nas notas de cada contato (ex.: faixa, avaliação)</span></label></div>' +
      '<div class="secao"><h2>Destino</h2><div class="grade">' +
      campo('imp-lista', 'Nome da lista', '<input id="imp-lista" name="lista" type="text" required value="' + esc(nomeLista) + '">') +
      campo('imp-nicho', 'Nicho padrão', '<input id="imp-nicho" name="nicho" type="text" placeholder="Usado quando a planilha não tem nicho">') +
      campo('imp-cidade', 'Cidade padrão', '<input id="imp-cidade" name="cidade" type="text">') +
      campo('imp-canal', 'Canal do primeiro toque', '<select id="imp-canal" name="canal">' + opcoes(CANAIS, 'whatsapp') + '</select>') + '</div></div>' +
      '<div class="secao"><h2>Prévia</h2><div class="previa"><table class="tabela"><thead><tr>' + parsed.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      parsed.rows.slice(0, 5).map(function (r) { return '<tr>' + parsed.headers.map(function (_, i) { return '<td>' + esc(r[i] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="small" data-out="resumo-imp"></p></div>' +
      '<p class="erro-form" hidden role="alert"></p><div class="dlg-rodape"><button type="button" class="btn" data-act="fechar">Cancelar</button><button type="submit" class="btn primario" data-out="btn-imp">Importar</button></div>';
    f.hidden = false; raiz.querySelector('#imp-passo1').hidden = true;
    BC.act['imp-mapa'](f);
  };
  function montar(form) {
    var d = BC.dados(form), parsed = BC.imp.parsed, mapa = {};
    CAMPOS_IMP.forEach(function (c) { mapa[c[0]] = Number(d['map_' + c[0]]); if (isNaN(mapa[c[0]])) mapa[c[0]] = -1; });
    var usadas = {}; Object.keys(mapa).forEach(function (k) { if (mapa[k] >= 0) usadas[mapa[k]] = true; });
    var existentes = {}; S.all('prospects').forEach(function (p) { C.chavesDedupe(p).forEach(function (k) { existentes[k] = true; }); });
    var novos = [], dup = 0, vazio = 0;
    parsed.rows.forEach(function (r) {
      function g(c) { return mapa[c] >= 0 ? BC.txt(r[mapa[c]]) : ''; }
      var tel = C.normalizarTelefone(g('telefone')), ig = C.normalizarInstagram(g('instagram'));
      var nome = g('nome') || g('negocio') || ig || g('telefone');
      if (!nome) { vazio++; return; }
      var p = { nome: nome, negocio: g('negocio'), nicho: g('nicho') || BC.txt(d.nicho), cidade: g('cidade') || BC.txt(d.cidade), telefone: tel, email: g('email').toLowerCase(), instagram: ig };
      var ks = C.chavesDedupe(p);
      if (ks.some(function (k) { return existentes[k]; })) { dup++; return; }
      ks.forEach(function (k) { existentes[k] = true; });
      var notas = [];
      if (d.extras) parsed.headers.forEach(function (h, i) { var v = BC.txt(r[i]); if (!usadas[i] && v) notas.push((h || 'Coluna ' + (i + 1)) + ': ' + v); });
      p.notas = notas.join('\n');
      novos.push(p);
    });
    return { novos: novos, dup: dup, vazio: vazio, d: d };
  }
  BC.act['imp-mapa'] = function (el) {
    var form = el.closest ? el.closest('form') : el; if (!form || !BC.imp.parsed) return;
    var r = montar(form);
    form.querySelector('[data-out=resumo-imp]').innerHTML = '<strong>' + r.novos.length + '</strong> contatos serão importados' + (r.dup ? ' · ' + r.dup + ' repetidos (mesmo telefone, Instagram ou nome) serão ignorados' : '') + (r.vazio ? ' · ' + r.vazio + ' linhas sem nome ignoradas' : '') + '.';
    var b = form.querySelector('[data-out=btn-imp]'); b.disabled = !r.novos.length; b.textContent = r.novos.length ? 'Importar ' + r.novos.length + ' contatos' : 'Nada para importar';
  };
  BC.forms.importar = function (form) {
    var r = montar(form);
    if (!r.novos.length) return BC.erroForm(form, 'Nenhum contato novo para importar.');
    BC.seguro(async function () {
      var lista = await S.insert('listas', { nome: BC.txt(r.d.lista) || 'Importação', nicho: BC.txt(r.d.nicho), cidade: BC.txt(r.d.cidade) });
      var agoraIso = agora();
      var linhas = r.novos.map(function (p) {
        return Object.assign({ lista_id: lista.id, origem: 'lista', campanha: '', meta_lead_id: '', canal: r.d.canal || 'whatsapp', etapa: 'novo', etapa_max: 'novo', toques: 0, proxima_data: null, proxima_acao: '', abordagem: '', diagnostico: '', motivo_perda: '', cliente_id: null, atualizado_em: agoraIso }, p);
      });
      await S.insertMany('prospects', linhas);
      BC.fechar(form);
      BC.ui.abaPros = 'hoje';
      BC.toast(linhas.length + ' contatos importados' + (r.dup ? ' (' + r.dup + ' repetidos ignorados)' : '') + '.');
      location.hash = '#prospeccao';
    }, form);
  };
})(window);
