# Checklist de aceitação · V15.51.0-G

Legenda: **APROVADO** (testado e passou) · **REPROVADO** (testado e falhou) · **NÃO TESTADO** (não foi possível testar aqui) · **EMULADO** = Chromium com viewport/toque/user agent de iPad ou iPhone, nunca Safari real.

| # | Critério | Situação | Evidência |
|---|---|---|---|
| 1 | Clone integral da main com SHA registrado e cópia original intocada | APROVADO | `3134ef03…`; pasta original mantida somente leitura |
| 2 | Anexos extraídos isoladamente e confrontados | APROVADO | RAR com 11 HTMLs; matriz na seção 3 do relatório |
| 3 | Nada publicado (GitHub, Actions, Pages, Supabase) | APROVADO | Remoto removido da cópia de trabalho; nenhum push |
| 4 | Validação de release | APROVADO | `validate-release.mjs` sem ✖ |
| 5 | Estados vazios e smoke de rotas | APROVADO | `validate-empty-states.mjs`, `smoke-static.mjs` |
| 6 | Sintaxe de todo JS/MJS e JSON | APROVADO | `node --check`, `JSON.parse` |
| 7 | Remoção de CSS morto sem mudança visual | APROVADO | 246 393 estilos computados comparados; diferenças restantes = ruído/transitórias, 0 reproduzíveis (relatório §5) |
| 8 | 54 → 14 folhas, ordem de cascata preservada | APROVADO | `index.html`, `scripts/css-layers.json`, marcadores `@origem` |
| 9 | Orçamento de `!important` ≤ 7 570 | APROVADO | validador |
| 10 | Exclusões sem referência restante | APROVADO | varredura por nome e caminho; validador CORE; suíte E2E sem 404 |
| 11 | Início · D/T/M (pranchas) | APROVADO · T/M EMULADO | suíte de auditoria, 16 viewports |
| 12 | Meus Cursos · D/T/M | APROVADO · T/M EMULADO | idem (320 px corrigido) |
| 13 | Todos os Mapas · D/T/M | APROVADO após correção · T/M EMULADO | 0 de 14 cartões cortados em 320/390/820/1440 px |
| 14 | Simulados · D/T/M | APROVADO · T/M EMULADO | suíte de auditoria |
| 15 | Progresso · D/T/M | APROVADO · T/M EMULADO | suíte de auditoria |
| 16 | Agenda · D/T/M | APROVADO · T/M EMULADO | inclui correção da clássica 1180×820 |
| 17 | Configurações · D/T/M | APROVADO · T/M EMULADO | suíte de auditoria + `prancha.spec` |
| 18 | Leitor (abrir, fechar, foco, topbar, dock iPad) | APROVADO · T/M EMULADO | auditoria + `app.spec` (testes do leitor aprovados isolados; sob 2 workers alguns estouram 30 s igual na main) |
| 19 | Estados vazios reais (sem cursos/mapas) | APROVADO | 5 viewports |
| 20 | Interface clássica ainda funcional | APROVADO · T/M EMULADO | 5 viewports + `app.spec` |
| 21 | PWA offline real (Chromium): instala, offline, recarrega, navega, abre mapa | APROVADO | teste `PWA offline real` |
| 22 | PWA em Safari/iOS instalado, atualização com aba antiga em aparelho | NÃO TESTADO | sem WebKit/hardware |
| 23 | XSS por título de mapa importado | APROVADO | nenhum handler executou nos dois modos |
| 24 | Login/sessão, nuvem, backup/restauração | APROVADO com mocks | `app.spec`/`prancha.spec` (Supabase simulado) |
| 25 | Supabase real, uploads > 50 MB, RLS | NÃO TESTADO | proibido alterar produção; só mocks |
| 26 | Dados do usuário preservados (chaves, formatos, backup) | APROVADO | JS do app alterado só nos identificadores de versão; backup/merge testados |
| 27 | Mapas e simulados HTML intactos | APROVADO | nenhum arquivo em `cursos/` ou `simulados/` alterado; validador V211 |
| 28 | Alvos de toque ≥ 44 px nas pranchas | APROVADO (área de toque) | pseudo-elemento em `pointer:coarse`; desenho igual |
| 29 | Acessibilidade com axe | NÃO TESTADO | suíte `accessibility.spec.mjs` vazia na main |
| 30 | Teclado/leitor de tela, auditoria manual | NÃO TESTADO | — |
| 31 | Suítes E2E existentes sem nova falha | APROVADO | ver tabela no relatório: nenhuma falha que não existisse na main; 11 testes da clássica falham só sob emulação Chromium do iPhone, igual na main |
| 32 | Versão sincronizada em todos os pontos | APROVADO | `version.json`, `state.js`, `index.html`, `sw.js`, `updates.js`, `reader.html`, `offline.html`, ícone do app — 131 referências `?v=15.51.0` |
| 33 | Dois ZIPs gerados, extraídos e verificados | ver relatório §11 | SHA-256 e teste de extração |
