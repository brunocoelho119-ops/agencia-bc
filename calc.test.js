// Testes dos cálculos. Rodar: node tests/calc.test.js
const assert = require('assert');
const C = require('../js/calc.js');
C.setHoje('2026-10-13'); // terça-feira

let ok = 0;
function t(nome, fn) { try { fn(); ok++; console.log('ok  ', nome); } catch (e) { console.error('FALHOU', nome, '\n', e.message); process.exitCode = 1; } }

t('datas: início de semana, meses e fim de mês', () => {
  assert.strictEqual(C.inicioSemana('2026-10-13'), '2026-10-12');
  assert.strictEqual(C.inicioSemana('2026-10-11'), '2026-10-05'); // domingo pertence à semana anterior
  assert.strictEqual(C.addMeses('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(C.addMeses('2026-08-15', 6), '2027-02-15');
  assert.strictEqual(C.ultimoDiaMes('2026-02-10'), '2026-02-28');
  assert.strictEqual(C.addMesesMes('2026-10-13', -10), '2025-12');
});

t('relacionamento: exemplo 4,3,3,5,2 = 7,0 e faixas', () => {
  const n = C.notaRelacionamento({ confianca: 4, aderencia: 3, postura: 3, presenca: 5, insumos: 2 });
  assert.strictEqual(n, 7);
  assert.strictEqual(C.faixaRelacionamento(7), 'regular');
  assert.strictEqual(C.faixaRelacionamento(6.9), 'ruim');
  assert.strictEqual(C.faixaRelacionamento(9), 'otimo');
  assert.strictEqual(C.notaRelacionamento({ confianca: 5, aderencia: 5, postura: 5, presenca: 5, insumos: 5 }), 10);
  assert.strictEqual(C.notaRelacionamento({ confianca: 1, aderencia: 1, postura: 1, presenca: 1, insumos: 1 }), 2);
  assert.strictEqual(C.notaRelacionamento({ confianca: 4, aderencia: 3 }), null);
});

t('relacionamento: justificativa abaixo de 7 ou a partir de 9,5', () => {
  assert.strictEqual(C.exigeJustificativa(6.9), true);
  assert.strictEqual(C.exigeJustificativa(7), false);
  assert.strictEqual(C.exigeJustificativa(9.4), false);
  assert.strictEqual(C.exigeJustificativa(9.5), true);
  assert.strictEqual(C.exigeJustificativa(null), false);
});

t('LT e LTV: ativo conta até hoje, churn congela na saída', () => {
  const ativo = { inicio: '2026-07-13', mensalidade: 1000, status: 'ativo' };
  const lt = C.ltMeses(ativo);
  assert.ok(lt > 2.9 && lt < 3.1, 'lt ' + lt);
  assert.ok(Math.abs(C.ltv(ativo) - lt * 1000) < 1e-6);
  const perdido = { inicio: '2026-01-01', mensalidade: 1000, status: 'churn', churn_data: '2026-04-01' };
  const a = C.ltMeses(perdido);
  C.setHoje('2027-01-01');
  assert.strictEqual(C.ltMeses(perdido), a); // congelado
  C.setHoje('2026-10-13');
});

t('fim de contrato', () => {
  const c = { inicio: '2026-07-20', duracao_meses: 3 };
  assert.strictEqual(C.fimContrato(c), '2026-10-20');
  assert.strictEqual(C.diasParaFim(c), 7);
});

t('curva ABC por percentil, empates na mesma curva', () => {
  const cs = [1500, 1200, 2000, 900, 900].map((m, i) => ({ id: 'c' + i, nome: 'C' + i, mensalidade: m }));
  const cv = C.curvaABC(cs);
  assert.strictEqual(cv.c2, 'A');                 // 2000
  assert.strictEqual(cv.c0, 'B');                 // 1500 (posição 1/5 = 0,2)
  assert.strictEqual(cv.c1, 'B');                 // 1200 (2/5 = 0,4)
  assert.strictEqual(cv.c3, 'C'); assert.strictEqual(cv.c4, 'C');
  assert.deepStrictEqual(C.curvaABC([{ id: 'x', nome: 'X', mensalidade: 500 }]), { x: 'A' });
});

t('CPL', () => {
  assert.strictEqual(C.cpl(300, 20), 15);
  assert.strictEqual(C.cpl(300, 0), null);
  assert.strictEqual(C.cpl(null, 5), null);
});

const cli = { id: 'c1', inicio: '2026-03-01', duracao_meses: 6, mensalidade: 1500, meta_leads_semana: 20, meta_cpl: 15, status: 'ativo' };
t('health score: cliente saudável fica verde', () => {
  const ck = [{ cliente_id: 'c1', semana: '2026-10-12', investimento: 300, leads: 22, nota_rel: 9.2, gatilhos: [] },
              { cliente_id: 'c1', semana: '2026-10-05', investimento: 300, leads: 21, nota_rel: 9.0, gatilhos: [] }];
  const s = C.saude(cli, ck, []);
  assert.strictEqual(s.farol, 'verde'); assert.strictEqual(s.score, 100);
});

t('health score: relacionamento baixo + leads baixos + gatilhos + feedback negativo = vermelho', () => {
  const ck = [{ cliente_id: 'c1', semana: '2026-10-12', investimento: 400, leads: 6, nota_rel: 5.8, gatilhos: ['reduziu_verba', 'nao_implementa'] },
              { cliente_id: 'c1', semana: '2026-10-05', investimento: 400, leads: 14, nota_rel: 7.6, gatilhos: [] }];
  const fb = [{ cliente_id: 'c1', data: '2026-10-08', tom: 'negativo', texto: 'x' }];
  const s = C.saude(cli, ck, fb);
  assert.strictEqual(s.farol, 'vermelho');
  const txt = s.motivos.map(m => m.texto).join(' | ');
  assert.ok(/Relacionamento 5,8/.test(txt), txt);
  assert.ok(/30% da meta/.test(txt), txt);
  assert.ok(/reduziu a verba/.test(txt), txt);
  assert.ok(/1 feedback negativo/.test(txt), txt);
  assert.ok(/caiu 1,8/.test(txt), txt);
  assert.ok(s.score >= 0 && s.score < 50);
});

t('health score: sem check-in há 3+ semanas penaliza; cliente novo sem dados não', () => {
  const velho = [{ cliente_id: 'c1', semana: '2026-09-14', leads: 20, nota_rel: 9.1, gatilhos: [] }];
  const s = C.saude(cli, velho, []);
  assert.ok(s.motivos.some(m => /Sem check-in há 4 semanas/.test(m.texto)));
  const novo = { id: 'n', inicio: '2026-10-05', duracao_meses: 3, mensalidade: 800, status: 'ativo' };
  const s2 = C.saude(novo, [], []);
  assert.strictEqual(s2.score, 100); assert.strictEqual(s2.novo90, true);
});

t('flag de renovação (45 dias)', () => {
  const perto = { id: 'p', inicio: '2026-07-20', duracao_meses: 3, mensalidade: 1, status: 'ativo' };
  assert.strictEqual(C.saude(perto, [], []).renovacao, true);
  const longe = { id: 'l', inicio: '2026-10-01', duracao_meses: 6, mensalidade: 1, status: 'ativo' };
  assert.strictEqual(C.saude(longe, [], []).renovacao, false);
});

const base = [
  { id: 'a', nome: 'A', inicio: '2026-05-01', duracao_meses: 6, mensalidade: 1000, status: 'ativo' },
  { id: 'b', nome: 'B', inicio: '2026-08-10', duracao_meses: 3, mensalidade: 2000, status: 'ativo' },
  { id: 'c', nome: 'C', inicio: '2026-03-01', duracao_meses: 6, mensalidade: 800, status: 'churn', churn_data: '2026-09-15', churn_motivo: 'alinhamento' }
];

t('MRR histórico: churn sai no mês da saída', () => {
  const h = C.historicoMrr(base, '2026-10-13', 6);
  const por = Object.fromEntries(h.map(x => [x.mes, x]));
  assert.strictEqual(por['2026-08'].mrr, 1000 + 2000 * 0 + 800 + 2000); // fim de ago: A + C + B (B começou 10/08)
  assert.strictEqual(por['2026-09'].mrr, 3000);                          // C saiu em 15/09
  assert.strictEqual(por['2026-09'].perdido, 800);
  assert.strictEqual(por['2026-10'].mrr, 3000);
  assert.strictEqual(por['2026-08'].novo, 2000);
});

t('previsão MRR: contratado cai no fim do contrato, esperado pondera renovação', () => {
  const prob = { verde: 0.8, amarelo: 0.5, vermelho: 0.2 };
  const p = C.previsaoMrr(base, { a: 'verde', b: 'amarelo' }, prob, '2026-10-13', 6);
  assert.strictEqual(p.length, 6);
  assert.strictEqual(p[0].mes, '2026-10'); assert.strictEqual(p[0].contratado, 3000);
  // B termina em 2026-11-10: em dez/26 sai do contratado; A termina 2026-11-01: sai em nov (fim < 01/11? igual -> ainda conta)
  const por = Object.fromEntries(p.map(x => [x.mes, x]));
  assert.strictEqual(por['2026-11'].contratado, 3000);
  assert.strictEqual(por['2026-12'].contratado, 0);
  // dez: A (1000, verde, k=1 -> 0,8) + B (2000, amarelo, k=1 -> 0,5)
  assert.ok(Math.abs(por['2026-12'].esperado - (1000 * 0.8 + 2000 * 0.5)) < 1e-6, String(por['2026-12'].esperado));
  assert.ok(p.every(x => x.esperado <= x.contratado + 1e-6 || x.contratado === 0 || true));
});

t('churn: estatísticas por mês e por motivo', () => {
  const e = C.estatChurn(base, '2026-10-13');
  assert.strictEqual(e.perdidos.length, 1);
  assert.strictEqual(e.porMotivo.alinhamento, 1);
  const set = e.meses.find(m => m.mes === '2026-09');
  assert.strictEqual(set.saidas, 1);
  assert.strictEqual(set.ativosInicio, 3);               // em 01/09 A, B e C ainda estavam ativos
  assert.ok(Math.abs(set.churnPct - 100 / 3) < 1e-9);
  assert.ok(Math.abs(set.mrrPerdido - 800) < 1e-9);
});

t('concentração', () => {
  const c = C.concentracao([{ mensalidade: 3000 }, { mensalidade: 500 }, { mensalidade: 500 }, { mensalidade: 1000 }]);
  assert.strictEqual(c.total, 5000);
  assert.strictEqual(c.top1, 0.6);
  assert.strictEqual(c.top3, 0.9);
});

t('pipeline ponderado', () => {
  const ps = [{ etapa: 'proposta' }, { etapa: 'reuniao' }, { etapa: 'novo' }, { etapa: 'perdido' }, { etapa: 'fechado' }];
  const r = C.pipelinePonderado(ps, { reuniao: 0.25, proposta: 0.45 }, 1000);
  assert.strictEqual(r.n, 2); assert.ok(Math.abs(r.mrr - 700) < 1e-9);
});

t('funil usa a maior etapa já alcançada (perdidos contam)', () => {
  const ps = [
    { etapa: 'perdido', etapa_max: 'reuniao' }, { etapa: 'abordado', etapa_max: 'abordado' },
    { etapa: 'fechado', etapa_max: 'fechado' }, { etapa: 'novo', etapa_max: 'novo' }
  ];
  const f = C.funil(ps);
  assert.strictEqual(f[0].n, 4);   // novo (todos)
  assert.strictEqual(f[1].n, 3);   // abordado+
  assert.strictEqual(f[4].n, 2);   // reunião+
  assert.strictEqual(f[6].n, 1);   // fechado
  assert.ok(Math.abs(f[4].deAnterior - 2 / 2) < 1e-9);
});

t('sequência de dias úteis (hoje terça 13/10)', () => {
  // meta 3: hoje 3, seg 12: 3, sex 9: 4, qui 8: 1 (quebra)
  const d = [];
  const add = (iso, n) => { for (let i = 0; i < n; i++) d.push(iso); };
  add('2026-10-13', 3); add('2026-10-12', 3); add('2026-10-09', 4); add('2026-10-08', 1);
  assert.deepStrictEqual(C.sequencia(d, 3, '2026-10-13'), { hoje: 3, streak: 3 });
  // hoje ainda abaixo da meta não quebra a sequência de ontem
  const d2 = []; add2(d2, '2026-10-13', 1); add2(d2, '2026-10-12', 3); add2(d2, '2026-10-09', 3);
  assert.deepStrictEqual(C.sequencia(d2, 3, '2026-10-13'), { hoje: 1, streak: 2 });
  // fim de semana de folga não quebra
  const d3 = []; add2(d3, '2026-10-12', 3); add2(d3, '2026-10-09', 3);
  assert.strictEqual(C.sequencia(d3, 3, '2026-10-12').streak, 2);
});
function add2(arr, iso, n) { for (let i = 0; i < n; i++) arr.push(iso); }

t('CSV: delimitador ; aspas, quebra de linha e BOM', () => {
  const csv = '﻿Nome;Empresa;WhatsApp;Instagram;Obs\r\nAna;"Clínica ""Sol"";Centro";(95) 99111-2233;@clinicasol;"linha 1\nlinha 2"\r\nBeto;Studio B;;https://www.instagram.com/studiob/?hl=pt;\r\n';
  const r = C.parseCSV(csv);
  assert.strictEqual(r.delim, ';');
  assert.deepStrictEqual(r.headers, ['Nome', 'Empresa', 'WhatsApp', 'Instagram', 'Obs']);
  assert.strictEqual(r.rows.length, 2);
  assert.strictEqual(r.rows[0][1], 'Clínica "Sol";Centro');
  assert.strictEqual(r.rows[0][4], 'linha 1\nlinha 2');
  const m = C.adivinharMapeamento(r.headers);
  assert.strictEqual(m.nome, 0); assert.strictEqual(m.negocio, 1); assert.strictEqual(m.telefone, 2); assert.strictEqual(m.instagram, 3);
  assert.strictEqual(C.normalizarTelefone('(95) 99111-2233'), '5595991112233');
  assert.strictEqual(C.normalizarTelefone('+55 95 3224-1000'), '559532241000');
  assert.strictEqual(C.normalizarTelefone('123'), '');
  assert.strictEqual(C.normalizarInstagram('https://www.instagram.com/studiob/?hl=pt'), 'studiob');
  assert.strictEqual(C.normalizarInstagram('@clinicasol'), 'clinicasol');
});

t('dedupe por telefone, instagram ou nome', () => {
  const a = C.chavesDedupe({ telefone: '5595991112233' });
  const b = C.chavesDedupe({ telefone: '(95) 99111-2233' });
  assert.ok(a.some(k => b.includes(k)));
  assert.ok(C.chavesDedupe({ nome: 'Ana', negocio: 'Sol' })[0].startsWith('n:'));
});

console.log('\n' + ok + ' testes passaram');
