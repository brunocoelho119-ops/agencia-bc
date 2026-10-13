/* Agência BC · dados de exemplo (todos fictícios, ids "demo-...", datas relativas a hoje).
   Servem só para ver a ferramenta funcionando. "Limpar exemplos" remove tudo. */
(function (root) {
  'use strict';
  var C = root.BCCalc;

  function gerar(h) {
    var seg = C.inicioSemana(h);
    function sem(n) { return C.addDias(seg, -7 * n); }
    function dia(n) { return C.addDias(h, -n); }
    function ts(iso, hora) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], hora || 10, 0, 0).toISOString(); }

    var clientes = [
      { id: 'demo-c1', nome: 'Clínica Aurora Estética (exemplo)', segmento: 'Estética', contato_nome: 'Marina', whatsapp: '5511900000011', instagram: '',
        mensalidade: 1500, inicio: dia(210), duracao_meses: 12, verba_mensal: 1500, meta_leads_semana: 25, meta_cpl: 14, status: 'ativo', notas: 'Atende bem os leads; responde no mesmo dia.' },
      { id: 'demo-c2', nome: 'Studio Vértice Pilates (exemplo)', segmento: 'Pilates', contato_nome: 'Rafael', whatsapp: '5511900000012', instagram: '',
        mensalidade: 1200, inicio: dia(100), duracao_meses: 6, verba_mensal: 1000, meta_leads_semana: 15, meta_cpl: 18, status: 'ativo', notas: '' },
      { id: 'demo-c3', nome: 'Casa Prado Imóveis (exemplo)', segmento: 'Imobiliária', contato_nome: 'Débora', whatsapp: '5511900000013', instagram: '',
        mensalidade: 2000, inicio: dia(72), duracao_meses: 3, verba_mensal: 1000, meta_leads_semana: 15, meta_cpl: 20, status: 'ativo', notas: 'Corretores demoram a ligar de volta.' },
      { id: 'demo-c4', nome: 'Doce Ateliê Confeitaria (exemplo)', segmento: 'Confeitaria', contato_nome: 'Paula', whatsapp: '5511900000014', instagram: '',
        mensalidade: 900, inicio: dia(25), duracao_meses: 3, verba_mensal: 600, meta_leads_semana: 10, meta_cpl: 15, status: 'ativo', prospect_id: 'demo-p11', notas: '' },
      { id: 'demo-c5', nome: 'Oficina Rota Sul (exemplo)', segmento: 'Automotivo', contato_nome: 'Sérgio', whatsapp: '5511900000015', instagram: '',
        mensalidade: 1100, inicio: dia(300), duracao_meses: 6, verba_mensal: 800, meta_leads_semana: 12, meta_cpl: 20, status: 'churn', churn_data: dia(40), churn_motivo: 'alinhamento',
        churn_aprendizados: 'Eu mostrava só leads, não as vendas que ele percebia. Faltou um relatório mensal ligando o anúncio ao faturamento.' },
      { id: 'demo-c6', nome: 'Pet Bem Estar (exemplo)', segmento: 'Pet shop', contato_nome: 'Lúcia', whatsapp: '5511900000016', instagram: '',
        mensalidade: 800, inicio: dia(420), duracao_meses: 6, verba_mensal: 500, meta_leads_semana: 10, meta_cpl: 12, status: 'churn', churn_data: dia(150), churn_motivo: 'estrutura',
        churn_aprendizados: 'Ninguém atendia o WhatsApp. Eu devia ter exigido atendimento antes de aumentar a verba.' }
    ];

    // check-ins: n = semanas atrás (0 = semana atual). Relacionamento = [confiança, aderência, postura, presença, insumos]
    var checkins = [];
    function ck(cid, n, inv, leads, vendas, rel, gat, feito, proximo, just) {
      var o = { id: 'demo-k-' + cid + '-' + n, cliente_id: cid, semana: sem(n), investimento: inv, leads: leads, vendas: vendas, faturamento: null,
        feito: feito || '', proximo: proximo || '', gatilhos: gat || [], justificativa: just || '' };
      var nomes = ['r_confianca', 'r_aderencia', 'r_postura', 'r_presenca', 'r_insumos'];
      o.nota_rel = null;
      nomes.forEach(function (k) { o[k] = null; });
      if (rel) {
        nomes.forEach(function (k, i) { o[k] = rel[i]; });
        o.nota_rel = C.notaRelacionamento({ confianca: rel[0], aderencia: rel[1], postura: rel[2], presenca: rel[3], insumos: rel[4] });
      }
      checkins.push(o);
    }
    var l1 = [21, 24, 23, 27, 25, 22, 26, 24], i1 = [280, 300, 320, 300, 290, 300, 310, 300], v1 = [4, 5, 5, 7, 6, 4, 5, 6];
    for (var n = 7; n >= 0; n--) {
      var k = 7 - n;
      ck('demo-c1', n, i1[k], l1[k], v1[k], [5, 4, 5, 4, 5], [],
        n === 0 ? 'Troquei o criativo principal e pausei o público frio de menor retorno.' : 'Ajuste de orçamento entre conjuntos.',
        n === 0 ? 'Testar vídeo curto com depoimento.' : '');
    }
    var l2 = [12, 14, 15, 13, 15, 16, 14], i2 = [220, 230, 240, 240, 250, 250, 240];
    for (n = 7; n >= 1; n--) {
      k = 7 - n;
      ck('demo-c2', n, i2[k], l2[k], 2 + (k % 3), [4, 4, 4, 3, 4], [], 'Revisão de público e nova arte de carrossel.', 'Aguardar fotos novas do estúdio.');
    }
    var l3 = [14, 15, 13, 12, 11, 9, 5], i3 = [220, 220, 220, 200, 200, 180, 160];
    var r3 = [[4, 4, 4, 4, 4], [4, 4, 4, 4, 4], [4, 3, 4, 3, 3], [4, 3, 4, 3, 3], [3, 3, 3, 3, 2], [3, 3, 3, 3, 2], [3, 2, 3, 2, 2]];
    for (n = 6; n >= 0; n--) {
      k = 6 - n;
      var g3 = n === 0 ? ['reduziu_verba', 'nao_implementa'] : (n === 1 ? ['cobranca'] : []);
      var just = 'Reduziu a verba sem avisar e não ajustou o atendimento dos leads, como combinado. A relação esfriou.';
      var nota = C.notaRelacionamento({ confianca: r3[k][0], aderencia: r3[k][1], postura: r3[k][2], presenca: r3[k][3], insumos: r3[k][4] });
      ck('demo-c3', n, i3[k], l3[k], n > 3 ? 2 : 0, r3[k], g3,
        n === 0 ? 'Refiz o formulário e reforcei o pedido de resposta rápida aos leads.' : 'Ajustes de segmentação.',
        n === 0 ? 'Marcar conversa sobre a renovação e o atendimento.' : '', nota < 7 ? just : '');
    }
    ck('demo-c4', 2, 120, 8, 1, null, [], 'Subi a primeira campanha de encomendas.', 'Aguardar aprovação das fotos.');
    ck('demo-c4', 1, 150, 11, 2, [4, 4, 5, 4, 4], [], 'Ativei remarketing para quem visitou o perfil.', 'Testar oferta de kits para datas comemorativas.');

    var feedbacks = [
      { id: 'demo-f1', cliente_id: 'demo-c1', data: dia(3), canal: 'whatsapp', tom: 'positivo', texto: 'Elogiou o fluxo de agendamentos e pediu para aumentar a verba no próximo mês.' },
      { id: 'demo-f2', cliente_id: 'demo-c1', data: dia(20), canal: 'reuniao', tom: 'neutro', texto: 'Quer entender melhor como os leads são classificados.' },
      { id: 'demo-f3', cliente_id: 'demo-c2', data: dia(9), canal: 'whatsapp', tom: 'neutro', texto: 'Pediu para trocar a arte do carrossel por fotos reais das alunas.' },
      { id: 'demo-f4', cliente_id: 'demo-c2', data: dia(30), canal: 'reuniao', tom: 'positivo', texto: 'Satisfeito com a quantidade de aulas experimentais agendadas.' },
      { id: 'demo-f5', cliente_id: 'demo-c3', data: dia(6), canal: 'ligacao', tom: 'negativo', texto: 'Reclamou que os leads não atendem o telefone e que o investimento não está compensando.' },
      { id: 'demo-f6', cliente_id: 'demo-c3', data: dia(22), canal: 'whatsapp', tom: 'neutro', texto: 'Perguntou quando os primeiros fechamentos devem aparecer.' },
      { id: 'demo-f7', cliente_id: 'demo-c4', data: dia(4), canal: 'whatsapp', tom: 'positivo', texto: 'Recebeu várias encomendas pelo WhatsApp e mandou print das conversas.' }
    ];

    var listas = [{ id: 'demo-l1', nome: 'Clínicas de estética (exemplo)', nicho: 'Estética', cidade: 'Cidade Exemplo' }];
    function pr(i, nome, cidadeNicho, over) {
      var base = { id: 'demo-p' + i, lista_id: 'demo-l1', nome: nome, negocio: nome, nicho: 'Estética', cidade: 'Cidade Exemplo',
        telefone: '55119000000' + (10 + i), email: '', instagram: '', origem: 'lista', campanha: '', meta_lead_id: '', canal: 'whatsapp',
        etapa: 'novo', etapa_max: 'novo', toques: 0, proxima_data: null, proxima_acao: '', abordagem: '', diagnostico: '', notas: '', motivo_perda: '', cliente_id: null,
        atualizado_em: ts(h, 9) };
      return Object.assign(base, over || {});
    }
    var prospects = [
      pr(1, 'Clínica Bela Forma', '', { origem: 'meta_ads', campanha: 'Teste · formulário instantâneo', nicho: 'Estética', lista_id: null, etapa: 'novo', canal: 'whatsapp', notas: 'Lead chegou pelo formulário do anúncio.' }),
      pr(2, 'Estética Lumi', '', { origem: 'meta_ads', campanha: 'Teste · formulário instantâneo', lista_id: null, etapa: 'novo' }),
      pr(3, 'Espaço Renove', '', { etapa: 'novo', instagram: 'espacorenove' }),
      pr(4, 'Studio Pele & Cia', '', { etapa: 'novo', instagram: 'studiopeleecia' }),
      pr(5, 'Clínica Vivaz', '', { etapa: 'abordado', etapa_max: 'abordado', toques: 1, proxima_data: h, proxima_acao: 'Follow-up 1' }),
      pr(6, 'Dermo Centro', '', { etapa: 'abordado', etapa_max: 'abordado', toques: 2, proxima_data: dia(1), proxima_acao: 'Follow-up 2' }),
      pr(7, 'Instituto Alba', '', { etapa: 'abordado', etapa_max: 'abordado', toques: 1, proxima_data: C.addDias(h, 2), proxima_acao: 'Follow-up 1' }),
      pr(8, 'Spa Urbano', '', { etapa: 'respondeu', etapa_max: 'respondeu', toques: 2, proxima_data: h, proxima_acao: 'Enviar o mini-diagnóstico',
        diagnostico: 'Resumo: perfil com boa avaliação, mas sem anúncio ativo e sem botão de WhatsApp no destaque.' }),
      pr(9, 'Clínica Prime Skin', '', { etapa: 'reuniao', etapa_max: 'reuniao', toques: 3, proxima_data: C.addDias(h, 1), proxima_acao: 'Reunião às 15h', diagnostico: 'Mini-diagnóstico enviado e aprovado.' }),
      pr(10, 'Estética Aurea', '', { etapa: 'proposta', etapa_max: 'proposta', toques: 4, proxima_data: C.addDias(h, 3), proxima_acao: 'Cobrar retorno da proposta' }),
      pr(11, 'Doce Ateliê Confeitaria', '', { etapa: 'fechado', etapa_max: 'fechado', toques: 3, cliente_id: 'demo-c4', nicho: 'Confeitaria', origem: 'indicacao', lista_id: null }),
      pr(12, 'Studio Contorno', '', { etapa: 'perdido', etapa_max: 'reuniao', toques: 4, motivo_perda: 'Sem verba para anúncios agora' })
    ];

    // toques: 3 hoje; dias úteis anteriores com contagens [6,5,7,4,6,5] (a quebra de 4 limita a sequência)
    var atividades = [], seq = 0;
    var alvo = [5, 6, 7, 8, 9, 10];
    function toque(iso, hora) {
      var p = alvo[seq % alvo.length]; seq++;
      atividades.push({ id: 'demo-a' + seq, prospect_id: 'demo-p' + p, tipo: 'toque', canal: 'whatsapp', texto: 'Mensagem enviada', created_at: ts(iso, hora) });
    }
    for (var t = 0; t < 3; t++) toque(h, 9 + t);
    var contagens = [6, 5, 7, 4, 6, 5], d = 1, ci = 0;
    while (ci < contagens.length) {
      var iso = dia(d);
      if (C.diaUtil(iso)) { for (var q = 0; q < contagens[ci]; q++) toque(iso, 9 + (q % 8)); ci++; }
      d++;
    }
    return { clientes: clientes, checkins: checkins, feedbacks: feedbacks, listas: listas, prospects: prospects, atividades: atividades };
  }

  root.BCSeed = { gerar: gerar };
})(window);
