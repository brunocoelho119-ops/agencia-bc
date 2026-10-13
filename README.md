# Agência BC

Ferramenta interna: carteira de clientes, check-ins semanais, relacionamento, churn, previsão de MRR e CRM de prospecção.
Site estático (HTML/CSS/JS puros), sem build.

## Rodar localmente
Abra `index.html` no navegador. Em `js/config.js` com `MODE: 'local'`, os dados ficam no localStorage do navegador (faça backup em Dados → Exportar).

## Publicar no GitHub Pages
1. Crie o repositório e envie todos os arquivos (exceto nada secreto — não há segredos aqui).
2. Settings → Pages → Deploy from a branch → `main` / root.

## Ligar ao Supabase
1. Rode `supabase/schema.sql` no projeto.
2. Crie seu usuário em Authentication → Users e desative novos cadastros (Sign-ups).
3. Em `js/config.js`: `MODE: 'supabase'`, `SUPABASE_URL` e `SUPABASE_KEY` (chave publishable/anon). Nunca coloque a service_role aqui.
4. Segurança: RLS em todas as tabelas (`user_id = auth.uid()`); sem login não se lê nada.

## Testes
`node tests/calc.test.js`

## Arquivo único e celular
- `dist/agencia-bc.html` é a ferramenta inteira em um arquivo só (gerado por `python3 tools/build.py`). Para publicar no GitHub Pages, envie esse arquivo renomeado como `index.html` (na raiz do repositório).
- Abra o link no celular e use "Adicionar à tela inicial" para virar um atalho de app.
- Logo: coloque o arquivo em `assets/` e informe o caminho em `LOGO` no `js/config.js`. Se usar o arquivo único, envie a pasta `assets/` junto.
- Enquanto o modo for `local`, os dados ficam só no navegador de cada aparelho (celular e computador não se sincronizam). A sincronização vem com o Supabase.
