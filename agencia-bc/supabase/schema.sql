-- Agência BC · schema do banco (Supabase / Postgres)
-- JÁ APLICADO no projeto Supabase 'agencia-bc' (migration schema_inicial_agencia_bc). Guardado aqui como referência.
-- Todas as tabelas pertencem a um usuário (user_id) e têm RLS ativado:
-- cada login só enxerga e altera as próprias linhas.
-- Os nomes de colunas são idênticos aos campos usados pelo front-end (js/store.js).

-- ───────────── clientes ─────────────
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  segmento text,
  contato_nome text,
  whatsapp text,
  instagram text,
  mensalidade numeric(12,2) not null default 0,
  inicio date not null,
  duracao_meses int not null default 3 check (duracao_meses > 0),
  verba_mensal numeric(12,2),            -- verba de anúncios que o cliente paga à plataforma
  meta_leads_semana int,                 -- meta usada no health score
  meta_cpl numeric(10,2),                -- CPL máximo aceitável
  status text not null default 'ativo' check (status in ('ativo','churn')),
  churn_data date,
  churn_motivo text,                     -- id do motivo (ver MOTIVOS_SAIDA em js/calc.js)
  churn_aprendizados text,               -- "o que eu faria diferente"
  prospect_id uuid,                      -- de qual prospect este cliente veio (fk abaixo)
  notas text,
  created_at timestamptz not null default now()
);

-- ───────────── check-in semanal (resultado + relacionamento + sinais) ─────────────
-- semana = segunda-feira da semana em que o check-in foi feito.
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  semana date not null,
  investimento numeric(12,2),            -- verba investida nos últimos 7 dias
  leads int,
  vendas int,
  faturamento numeric(12,2),             -- faturamento do cliente (opcional)
  feito text,                            -- o que foi feito (Do/Act do PDCA)
  proximo text,                          -- próxima ação (Plan do PDCA)
  r_confianca smallint check (r_confianca between 1 and 5),
  r_aderencia smallint check (r_aderencia between 1 and 5),
  r_postura   smallint check (r_postura   between 1 and 5),
  r_presenca  smallint check (r_presenca  between 1 and 5),
  r_insumos   smallint check (r_insumos   between 1 and 5),
  nota_rel numeric(3,1),                 -- nota de relacionamento (0 a 10), calculada no front
  justificativa text,                    -- obrigatória se nota < 7 ou >= 9,5
  gatilhos jsonb not null default '[]'::jsonb,  -- ids dos sinais de desengajamento marcados
  created_at timestamptz not null default now(),
  unique (cliente_id, semana)
);

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  data date not null default current_date,
  canal text,                            -- whatsapp | reuniao | ligacao | outro
  tom text not null default 'neutro' check (tom in ('positivo','neutro','negativo')),
  texto text not null,
  created_at timestamptz not null default now()
);

-- ───────────── prospecção ─────────────
create table public.listas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  nicho text,
  cidade text,
  created_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lista_id uuid references public.listas(id) on delete set null,
  nome text not null,
  negocio text,
  nicho text,
  cidade text,
  telefone text,
  email text,
  instagram text,
  origem text not null default 'lista' check (origem in ('lista','meta_ads','indicacao','outro')),
  campanha text,                         -- nome da campanha/formulário (leads do Meta Ads)
  meta_lead_id text,                     -- leadgen_id do Meta (permite devolver conversões ao Meta)
  canal text default 'whatsapp',
  etapa text not null default 'novo'
    check (etapa in ('novo','abordado','respondeu','diagnostico','reuniao','proposta','fechado','perdido')),
  etapa_max text default 'novo',         -- maior etapa já alcançada (base das taxas de conversão)
  toques int not null default 0,
  proxima_data date,
  proxima_acao text,
  abordagem text,                        -- mensagem de abordagem planejada
  diagnostico text,                      -- mini-diagnóstico pronto para enviar
  notas text,
  motivo_perda text,
  cliente_id uuid references public.clientes(id) on delete set null,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.clientes
  add constraint clientes_prospect_fk
  foreign key (prospect_id) references public.prospects(id) on delete set null;

create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  tipo text not null check (tipo in ('toque','resposta','etapa','nota')),
  canal text,
  texto text,
  created_at timestamptz not null default now()
);

create table public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  chave text not null,
  valor jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, chave)
);

-- ───────────── índices ─────────────
create index on public.clientes (user_id, status);
create index on public.clientes (prospect_id);
create index on public.checkins (cliente_id, semana desc);
create index on public.checkins (user_id);
create index on public.feedbacks (cliente_id, data desc);
create index on public.feedbacks (user_id);
create index on public.prospects (user_id, etapa);
create index on public.prospects (lista_id);
create index on public.prospects (cliente_id);
create index on public.prospects (proxima_data);
create unique index prospects_meta_lead_uni on public.prospects (user_id, meta_lead_id) where meta_lead_id is not null;
create index on public.atividades (prospect_id, created_at desc);
create index on public.atividades (user_id, created_at desc);
create index on public.listas (user_id);

-- ───────────── RLS: cada usuário só vê as próprias linhas ─────────────
do $$
declare t text;
begin
  foreach t in array array['clientes','checkins','feedbacks','listas','prospects','atividades','configuracoes','contas_anuncio','metricas_diarias']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "dono_total" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;


-- ───────────── Fase futura: integração Meta/Google ─────────────
create table public.contas_anuncio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  plataforma text not null default 'meta' check (plataforma in ('meta','google')),
  conta_id text not null,
  nome text,
  created_at timestamptz not null default now(),
  unique (user_id, plataforma, conta_id)
);
create table public.metricas_diarias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conta_id uuid not null references public.contas_anuncio(id) on delete cascade,
  dia date not null,
  investimento numeric(12,2) default 0,
  impressoes bigint default 0,
  cliques bigint default 0,
  leads int default 0,
  created_at timestamptz not null default now(),
  unique (conta_id, dia)
);
create index on public.contas_anuncio (user_id);
create index on public.contas_anuncio (cliente_id);
create index on public.metricas_diarias (user_id);
create index on public.metricas_diarias (conta_id, dia desc);
