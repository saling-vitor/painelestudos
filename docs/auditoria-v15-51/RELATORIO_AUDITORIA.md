# MEUS MAPAS · Relatório de auditoria V15.51.0-G

Auditoria profunda, limpeza de legados, reorganização de CSS, correções de interface D/T/M e testes. Trabalho feito em cópia local; **nada foi publicado** (sem push, PR, Actions, deploy ou acesso ao Supabase de produção).

## 1. Identificação

| Item | Valor |
|---|---|
| Repositório | `saling-vitor/painelestudos`, branch `main` |
| Commit de origem | `3134ef036553e489ca453b8ddd98299323467648` · 2026-10-16 16:54:02 −03:00 · "feat(G): V15.50.0-G · conceitos Nanquim e Latão no app inteiro (#184)" |
| Versão inicial | V15.50.0-G (452 arquivos versionados) |
| Versão final | **V15.51.0-G** (escopo G: Desktop + iPad + celular) |
| Anexo examinado | `Downloads.rar` · SHA-256 `91559cf150da86f587bd23fb6aae49d33e068d6126d61c1671f8234f2fc48b58` · 11 HTMLs (hashes na seção 3) |
| ZIP integral do app anexado | **nenhum** — só o RAR de pranchas; registrado como ausente, sem bloquear a auditoria |
| Ambiente de teste | Linux, Node 22.22, Playwright 1.63.0, Chromium 141 (build 1194) headless, servidor `python3 -m http.server` em 127.0.0.1 |

**Limitação de ambiente:** não havia WebKit instalado e o download de navegadores está bloqueado. Os projetos `ipad-webkit` e `iphone-webkit` foram executados em **Chromium com emulação** (viewport, toque, user agent de iPad/iPhone) e estão marcados como **EMULADO**. Nenhum resultado aqui é validação em hardware Apple real nem em Safari.

## 2. Método

Três conjuntos separados, como pedido:

- `MAIN_ORIGINAL` — clone da main, mantido somente leitura;
- `IMPLEMENTACOES_ANTERIORES` — o RAR extraído em pasta isolada (renderizado em navegador com rede bloqueada; Google Fonts substituída pelas fontes locais do projeto);
- `PROJETO_AUDITADO` — cópia da main onde as mudanças foram feitas.

Ferramentas criadas e entregues no projeto:

- `tests/e2e/auditoria-plataformas.spec.mjs` — suíte independente da **interface atual (pranchas)** em 16 viewports (D: 1280×720, 1366×768, 1440×900, 1920×1080 · T: 810×1080, 820×1180, 834×1194, 1024×1366, 1180×820, 1194×834 · M: 320×568, 360×740, 375×667, 390×844, 414×896, 430×932) e da interface clássica em 5; mede erros de JS, respostas 4xx/5xx, rolagem lateral, alvos de toque e texto < 11 px; testa estados vazios reais, XSS por título importado e PWA offline real. Com `AUDIT_OUT=<pasta>` grava screenshots e o **hash do estilo computado de cada elemento** (todas as propriedades, `::before`/`::after` e geometria).
- `scripts/css-dead-code.mjs` (`npm run audit:css`) — analisador de declarações CSS comprovadamente sobrescritas.

## 3. Material anterior (RAR) × main — matriz de confronto

Hashes dos anexos (SHA-256): Agenda `58ae2346…`, Configurações `42c59880…`, Cursos `701fb18e…`, Escala Tipográfica `53512829…`, Início `674dd3fd…`, Paleta Grafite e Latão `3883a3e9…`, Pigmentos Capas e Menu `0bfce73e…`, Progresso `76735a49…`, Simulados `defea5f2…`, Todos os Mapas `75b06d10…`, Vidro Nanquim `c99e5e82…` (lista completa em `evidencias/anexos-sha256.txt`).

Os 11 HTMLs são **pranchas de conceito estáticas**: cada uma tem um script que desenha a maquete com dados de exemplo fixos ("Números do seu painel em 15/10…"). Nenhuma lê dados do app. A main já contém a implementação dessas pranchas (V15.49.0-G, `docs/prancha-implantacao.md`) e dos conceitos visuais (V15.50.0-G, `docs/nanquim-conceitos-v15-50.md`).

| Recurso | Situação na main | No material anterior | Diferença | Funciona? | Decisão | Justificativa |
|---|---|---|---|---|---|---|
| Início (5 telas) | `prancha-home.js`, ligado a progresso, agenda, sessões, revisões | Maquete com carimbo, 5 telas, planta do edital | Implementação usa dados reais; "Tenho só" mostra os blocos calculados; "Retomar" mostra estado vazio quando não há histórico | Sim (pranchas 16 viewports, sem erro) | Manter | Fiel ao conceito; dados reais em vez de exemplo |
| Meus Cursos | `prancha-courses.js` | Quadro por data da prova, mini planta | Igual em estrutura; números reais (1 curso no teste) | Sim | Manter | — |
| Todos os Mapas | `prancha-maps.js` | Grade de cartões com capa, folha, tópicos, feito | **Defeito na main**: cartões cortados (ver A1) | Parcial | **Corrigir** | Coluna "Feito", título, capa e botão ⋯ ficavam fora do cartão em D/T/M |
| Simulados | `prancha-simulations.js` | Resultado com corte, disciplinas, gabarito | Igual em estrutura | Sim | Manter | — |
| Progresso | `prancha-progress.js` | Curva por histórico diário | Main não inventa dias anteriores (histórico só a partir da instalação) | Sim | Manter | Mais correto que a maquete |
| Agenda | `prancha-agenda.js` | Dia/Semana/Mês com horário | Igual | Sim | Manter | — |
| Configurações | `prancha-settings.js` (painéis reais movidos para 7 folhas) | 7 folhas numeradas | Igual; zona de risco com confirmação em dois toques | Sim | Manter | — |
| Paleta Grafite e Latão | `nanquim-tokens.css`, `nanquim-application.css`, trava de paleta no validador | Diretriz de cores | Main aplica e valida toda cor do CSS ativo | Sim | Manter | — |
| Vidro Nanquim | `nanquim-materials.css`; vidro só em barra, dock, popover, modal | Diretriz de material | Main: cards sólidos (`--mm-smoke-card-filter:none` efetivo) | Sim | Manter | Coerente com "áreas de leitura sólidas" |
| Pigmentos Capas e Menu | `state.js` (categoria→pigmento), menu por seção | Diretriz de pigmentos | Igual; validador confere categorias | Sim | Manter | — |
| Escala Tipográfica | `nanquim-typography.css`, 14 tokens, Archivo/IBM Plex Mono/Anton locais | Mesma escala de 14 tokens, mas com Inter/JetBrains Mono via Google Fonts | O anexo é **anterior** à troca de famílias da V15.50 | Sim | Manter main | Fontes locais e offline; trocar voltaria a depender da rede |

Nada do RAR foi copiado para o projeto: a main já era a implementação desses conceitos. O único trabalho derivado do confronto foi a correção de Todos os Mapas.

## 4. Achados por criticidade

Todos os achados abaixo são **pré-existentes na main** (nenhum foi introduzido pela refatoração; as regressões introduzidas durante o trabalho foram detectadas pelos validadores e corrigidas antes da entrega — ver seção 9).

### CRÍTICO
Nenhum achado crítico comprovado (sem perda de dados, sem quebra de login/sincronização/leitor nos testes).

### ALTO

| # | Achado | Onde | Evidência | Correção |
|---|---|---|---|---|
| A1 | Cartões da grade de **Todos os Mapas** (pranchas) cortados em Desktop, iPad e celular: a capa, a coluna "Feito", o título e o botão **⋯ (Mais ações)** ficavam fora da área visível — o menu do cartão ficava inalcançável | `prancha.css` `.pr-gm` e `.pr-gm .ti` — grid sem `grid-template-columns`, coluna implícita `auto` dimensionada pelo conteúdo (306 px num cartão de 179 px no celular, 272 px num de 217 px no Desktop) | Inspeção: `clientWidth/scrollWidth` 179/306 (390 px), 253/306 (820 px), 217/272 (1440 px); screenshots `evidencias/prancha-*` (maps) | `grid-template-columns:minmax(0,1fr)` + `min-width:0` nas duas regras, na origem. Depois: 0 de 14 cartões cortados em 320, 390, 820 e 1440 px |
| A2 | **Travas de validação e de CI conferiam CSS que nunca valia.** `validate-release.mjs` e o job `verify-live` exigiam `--mm-smoke-card-black:rgba(17,17,16,.94)`, `--mm-smoke-card-filter:blur(12px) saturate(105%)`, `--mm-ivory-strong:#ece6da` etc. no Grafite fumê, mas `nanquim-application.css` redefine essas variáveis no mesmo `:root` depois — os cards nunca tiveram esse blur | `black-smoked-uniform-v15-48-163.css`, `scripts/validate-release.mjs`, `.github/workflows/static.yml` | Analisador de dominância + valor computado | Travas reescritas para o **valor efetivo** (`var(--nq-grafite-1)`, `none`, `var(--nq-papel)`), na autoridade real |
| A3 | Manutenção por sobreposição: 54 folhas CSS (1,17 MB), **8 768 `!important`**, **2 588 declarações que nunca podem vencer** | 52 das 54 folhas | `scripts/css-dead-code.mjs`, seção 5 | Remoção comprovada + consolidação em 14 folhas (seção 5) |

### MÉDIO

| # | Achado | Evidência | Decisão |
|---|---|---|---|
| M1 | Interface **clássica**, iPad paisagem 1180×820, Agenda: rolagem lateral de **116 px** (o `<select>` do formulário rápido define a largura de uma coluna de grid implícita) | Suíte de auditoria na main: único teste reprovado | Corrigido em `study-dashboard.css` (`.study-agenda-form` e seus `label` com `minmax(0,1fr)`); 1180×820 volta a 1180 px |
| M2 | `reader.html` carregava `cloud-core.js?v=13.1.15` e `map-cloud-bridge.js?v=15.0.0`: versões fora do pré-cache do Service Worker (que guarda `?v=15.50.0`) e fora da sincronização de release (`prepare-release.mjs` não tocava `reader.html` nem `offline.html`) | Leitura do código; no teste offline o Chromium serviu o arquivo pelo cache HTTP, portanto a falha não foi reproduzida — é risco, não falha observada | Corrigido: versões alinhadas e `prepare-release.mjs` passa a sincronizar `reader.html` e `offline.html` |
| M3 | `config.js?v=12.7` (versão de 2 partes, fora do cache-bust da release) em `index.html`, `reader.html` e `sw.js` | Leitura | Alinhado à versão da release (sincronizado automaticamente daqui em diante) |
| M4 | Testes das pranchas dependiam do horário: `dayIso()` usava `toISOString()` (UTC). Depois das 21h em Brasília a prova "em 3 dias" virava 4 e três testes falhavam | Baseline: `Início · cinco telas`, `Pós-prova`, `Revisões · adiar` reprovados em iPad e iPhone após 21h | Corrigido em `helpers/prancha-mock.mjs` e `prancha.spec.mjs` (data local / meio-dia local) |
| M5 | O leitor (`#readerFrame`) não tem `sandbox` e roda no mesmo origin: um HTML **importado** executa scripts com acesso ao `localStorage`, que guarda o token da sessão Supabase | Leitura de `index.html`/`reader.js` | **Não alterado**: os mapas V211 dependem do mesmo origin para gravar progresso e notas. Mitigação: só importar HTML de origem confiável. Uma separação real exige servir mapas importados em outro origin — mudança de arquitetura fora do escopo |
| M6 | `#simulationFrame` usa `sandbox="allow-scripts allow-same-origin"`, combinação que anula o isolamento | Leitura | Documentado; mesma razão de M5 |
| M7 | `data/search-index.json` (~1 MB) é baixado e **aguardado** no boot antes do primeiro desenho | `app.js` `boot()` com `Promise.allSettled` dos três JSON | **Não alterado**: Início, Cursos, planejador e automação leem o índice; adiar o carregamento mudaria cálculos de plano gravados. Recomendação para versão futura: carregar em segundo plano e recalcular quando chegar |

### BAIXO

| # | Achado | Decisão |
|---|---|---|
| B1 | Alvos de toque menores que 44 px nas pranchas: `.pr-btn.sm` (40 px) e favorito do cartão `.pr-gm .pr-fav` (34 px) | Área de toque ampliada para 44 px com pseudo-elemento invisível, **sem mudar o desenho** (`prancha.css`, só em `pointer:coarse`) |
| B2 | Em 320 px, a célula "PROGRESSO" de Cursos cortava 3 px | Padding das células reduzido em ≤ 360 px |
| B3 | Legados mortos: 10 manifestos históricos (o `v13.1.7` apontava para ícones já apagados), exportações da identidade V13, 35 ícones `sf-black-filled`, `assets/icons` (V12), imagens de hero e topografia substituídas | Removidos (lista exata na seção 6) |
| B4 | `localStorage['studyapp.config.override']` pode trocar `supabaseUrl` | Exige acesso ao próprio origin; documentado |
| B5 | `assets/brand/README.md` descrevia a identidade V13 como runtime | Reescrito |
| B6 | Mapas abertos fora do leitor carregam `config.js`, `cloud-core.js` e `map-cloud-bridge.js` **sem** `?v=` — não estavam no pré-cache | Incluídos no `CORE` do Service Worker |
| B7 | Comentários que descrevem regras agora removidas continuam nas camadas | Mantidos (inofensivos); limpar junto com a próxima consolidação por tela |
| — | Falsos positivos da medição: `#readerMoreBtn` no iPad tem 34 px mas já possui área de toque de 48 px (`::before` com `inset:-7px`); os dias da semana com `font-size:0` no iPad retrato são intencionais (mostram a inicial por `data-short`) | Nada a fazer |

## 5. Arquitetura antes × depois

### CSS

| Métrica (CSS carregado pelo `index.html`) | V15.50.0 (main) | V15.51.0 | Variação |
|---|---|---|---|
| Folhas | 54 | **14** | −40 requisições |
| Bytes | 1 168 730 | 1 047 294 | −10,4 % |
| Bytes gzip −9 | 184 189 | 171 051 | −7,1 % |
| Regras | 7 354 | 6 702 | −652 |
| Declarações | 22 341 | 19 766 | −2 575 (−2 588 mortas, +13 das correções) |
| `!important` | 8 768 | **7 570** | −1 198 |

**Como a remoção foi provada.** Uma declaração D1 só foi apagada quando, para **cada** seletor da sua lista, existe uma declaração posterior D2 com o mesmo seletor, a mesma propriedade (ou um shorthand que a cobre), contexto `@media/@supports` igual ou mais amplo, importância igual ou maior, sem seletor com prefixo de navegador e com valor igual ou sem sintaxe que algum navegador alvo possa descartar no parse (`dvh`, `clamp()`, `color-mix()`, `env()` etc. ficam de fora). Não há `@layer` nem `@import`, e nenhum script do app desliga folhas — então D2 sempre vence D1, em qualquer estado da página. Primeira passada: 2 546 declarações (1 177 `!important`); segunda, por shorthand: 42 (21 `!important`). Uma terceira execução encontra zero.

**Consolidação.** As 45 folhas de remendo entre `mobile-first.css` e `nanquim-materials.css` foram concatenadas, **na mesma ordem**, em 5 camadas no mesmo diretório (sem reescrever `url()`):

| Camada | Folhas de origem |
|---|---|
| `camada-1-refinos-telas.css` | color-restore-v01, courses-refine-v01, home-refine-v01, system-refine-v01, content-refine-v15-25, map-accent-v01, ipad-stage2-v01, map-library-v01, course-library-refine-v15-32, ui-chrome-refine-v01 |
| `camada-2-responsivo-dispositivos.css` | app-icon-settings-v15-36-2, progress-insights-responsive-v15-36-5, progress-mobile-v15-36-9, mobile-dashboard-density-v15-36-11, study-plan-responsive-v15-36-6, home-plan-surfaces-v15-36-7, dashboard-refine-v15-36-12, dashboard-refine-v15-36-13, button-glass-v15-36-15, responsive-polish-v15-36-16, ipad-course-covers-v15-36-28, ipad-portrait-nav-v15-36-17, desktop-continue-v15-36-19, course-covers-fullbleed-v15-36-31, home-density-v15-36-32, progress-hierarchy-v15-36-33, review-polish-v15-36-34, ipad-progress-actions-v15-36-35, desktop-home-ipad-nav-v15-36-36 |
| `camada-3-automacao-configuracoes.css` | study-automation-v15-37-0, settings-control-center-v15-38-0, ipad-course-refine-v15-38-2 |
| `camada-4-vidro-ambiente.css` | liquid-glass-shell-v15-40, liquid-glass-surfaces-v15-40, topographic-environment-v15-43, design-system-v15-42, v211-parity-v15-42, black-editorial-liquid-glass-v2, dynamic-liquid-glass-v2 |
| `camada-5-acabamento-final.css` | master-refinement-v15-48-1, nav-liquid-glass-v15-48-2, lucide-png-v15-48-172, empty-illustrations-v15-48-160, home-responsive-v15-48-162, black-smoked-uniform-v15-48-163 |

Cada trecho começa com `/* ════ @origem <arquivo> ════ */`; `scripts/css-layers.json` mapeia folha antiga → camada e o validador usa esse mapa para manter as travas históricas sobre o trecho correto. Detalhes e regras de manutenção: `docs/arquitetura-css.md`.

**Por que não reorganizei por componente (tokens/base/layout/…):** mover regras de lugar muda quem vence quando duas regras de mesma especificidade disputam a mesma propriedade. Sem prova regra a regra, isso arriscaria o visual aprovado nas três plataformas. Preservei a ordem e removi apenas o que é demonstravelmente morto. O caminho seguro para a próxima etapa está em `docs/arquitetura-css.md`.

### Paridade visual da limpeza de CSS (prova)

Para isolar a limpeza das correções intencionais, foi montada uma cópia `PARIDADE_CSS` = projeto final **sem** as correções A1, B1, B2 e M1. A suíte de auditoria gravou o hash do estilo computado de todos os elementos em 5 viewports (D-1440, T-820, T-1180, M-390, M-360) × 2 modos × 8 estados (7 áreas + leitor):

| Comparação | Elementos-estado | Diferentes |
|---|---|---|
| main × main (duas execuções, mede o ruído) | 246 393 | 1 057 também diferem entre execuções da própria main |
| main × limpeza | 246 393 | 1 518, dos quais 1 057 são ruído |
| Restantes (461) | — | concentrados em estados transitórios (status de sincronização, "salvo", resumo de configurações, painel movido para a folha de Configurações). **Cada grupo foi reexecutado lado a lado (main e limpeza ao mesmo tempo, 2,5 s de espera): 0 diferenças reproduzíveis.** |

Conclusão: a remoção de 2 588 declarações e a consolidação em camadas não mudaram nenhum estilo computado reproduzível.

### JavaScript

40 scripts clássicos, cada um em IIFE com guarda de dupla inicialização (`if(window.__x)return`). A busca por funções duplicadas encontrou 14 nomes repetidos — todos em escopos de módulo distintos, sem colisão global. Nenhum módulo foi fundido: o ganho seria cosmético e os HTMLs de mapas, backups e o importador dependem dos contratos globais atuais (`nav`, `openMap`, `combinedMaps`, `StudyCloud`, `Prancha` etc.). Alterações em JS do app: só os identificadores de versão sincronizados por `prepare-release.mjs` (`state.js`, `updates.js`, `app-icon-settings-v15-36-2.js`); testes e scripts de release ajustados.

### Arquivos e requisições (primeira carga, sem cache, 1440×900, 3 medições)

| Métrica | V15.50.0 | V15.51.0 |
|---|---|---|
| Requisições até as pranchas | 123–130 | 83–90 |
| Requisições de CSS | 54 | 14 |
| KB de CSS transferidos | 1 141 | 1 023 |
| DOMContentLoaded (ms, local) | 600–991 | 452–754 |

(Medidas no mesmo ambiente local, sem rede real; tempos absolutos não representam o celular. O total de KB da página é dominado por `search-index.json` e imagens, iguais nas duas versões.)

## 6. Itens excluídos, movidos e referências

Toda exclusão passou por: varredura de nome-base e de caminho em todos os HTML/CSS/JS/JSON/manifestos/mapas/simulados do repositório, leitura do `sw.js` (listas estáticas e caminhos montados a partir de `catalog.json`/`simulados.json`), histórico do git (quando a referência deixou de existir) e reexecução das suítes. A lista byte a byte está em `EXCLUIDOS.txt`.

| Grupo | Arquivos | Por que estava morto | Risco avaliado |
|---|---|---|---|
| 45 folhas CSS de remendo | ver seção 5 | Conteúdo integral movido para as camadas | Nenhum — mesmo conteúdo, mesma ordem |
| Manifestos `manifest-v13.1.7`, `v15.21.0`, `v15.22.0`, `v15.22.1`, `v15.23.0`…`v15.23.5` (10) | raiz | Nenhum HTML/JS os referencia; só citavam uns aos outros. O `v13.1.7` apontava para ícones apagados na V15.47 | PWA instalado consulta o manifesto ligado na página atual (`manifest-v15.23.6`), não o antigo. `manifest.webmanifest` e `manifest-light-v15.36.2` mantidos |
| `assets/brand/app-icons/`, `favicon/`, `logo/`, `social/`, `splash/` (62) | marca V13/V15.21 | Substituídos pelo kit `topographic-editorial-v1`; só os manifestos removidos os citavam | Os originais da marca seguem em `assets/brand/source/` |
| `assets/brand/mascot/*` exceto pensando, livros-feliz e ideia (15) | mascotes | Cópias versionadas idênticas (`-v15-22-0`) e mascotes sem uso em runtime | Os três usados por `app.css` mantidos; originais em `source/final/` |
| `assets/ui-icons/sf-black-filled/` (35) | ícones | Substituídos pelos Lucide PNG na V15.48.159; o validador já proibia a referência | — |
| `assets/icons/` (3) | ícones V12 | Última referência removida na V12.4 | — |
| `assets/home-hero-panel-hq.webp`, `assets/ui/topographic-lines-v15-43.webp` | imagens | Substituídas (`covers/home-hero.png`, `topographic-lines-v15-48-1.svg`) | — |

**Total:** 172 arquivos excluídos (45 CSS + 10 manifestos + 62 da marca V13 + 15 mascotes + 35 ícones sf-black-filled + 3 ícones V12 + 2 imagens) e 2 movidos; `EXCLUIDOS.txt` tem 174 linhas (inclui os caminhos antigos dos 2 movidos).

**Preservados de propósito** apesar de não referenciados no código: `assets/capas/default-imported-map.webp` e `assets/capas/cursos/default-course.webp` (podem estar gravados como capa em dados de usuários antigos), todo o kit `topographic-editorial-v1/`, `assets/brand/source/`, `design-system/nanquim-study-v211.css` (fonte canônica do tema dos mapas), licenças de fontes e ícones.

**Movidos:** `SIMULATIONS_V13.md` → `docs/supabase/SIMULATIONS_V13.md`; `supabase_simulations_v13.sql` → `docs/supabase/supabase_simulations_v13.sql` (documentação do banco; nenhum código os referencia).

**Referências atualizadas:** `index.html` (14 `<link>`), `sw.js` (`CORE` e `BOOT_ASSETS`), `scripts/validate-release.mjs`, `scripts/validate-empty-states.mjs`, `.github/workflows/static.yml` (verificação pós-deploy), `tests/e2e/app.spec.mjs`, `black-smoked.spec.mjs`, `home-responsive-v15-48-162.spec.mjs`, `solid-iconography.spec.mjs`.

**Reversibilidade:** tudo volta com o ZIP integral da V15.50 (ou `git revert`) — ver `LEIA-ME_ATUALIZACAO.md`.

## 7. Matriz das sete áreas × três plataformas

Fonte: `tests/e2e/auditoria-plataformas.spec.mjs` (EMULADO em Chromium). "OK" = sem erro de JS, sem 4xx/5xx, sem rolagem lateral, com conteúdo real. Screenshots antes/depois em `evidencias/` (folhas de contato por viewport e modo).

| Área | Desktop (4 viewports) | iPad (6 viewports) | Celular (6 viewports) | Observações |
|---|---|---|---|---|
| Início | OK | OK | OK | Nenhuma mudança visual |
| Meus Cursos | OK | OK | OK (320 px: célula corrigida, B2) | — |
| Todos os Mapas | **Corrigido** (A1) | **Corrigido** (A1) | **Corrigido** (A1) | Cartões inteiros, ⋯ acessível |
| Simulados | OK | OK | OK | — |
| Progresso | OK | OK | OK | — |
| Agenda | OK | OK (clássica 1180×820 corrigida, M1) | OK | — |
| Configurações | OK | OK | OK | — |
| Leitor | OK | OK | OK | Abre pelo fluxo real em todos os viewports |
| Estados vazios (sem cursos e mapas) | OK | OK | OK | 5 viewports |
| Clássica | OK (1440) | OK (820; 1180 corrigido) | OK (360, 390) | Mantida enquanto for oferecida |

## 8. Testes

### Validadores estáticos

| Comando | main (V15.50) | V15.51 |
|---|---|---|
| `node scripts/build-search-index.mjs` | 408 tópicos em 14 mapas | igual |
| `node scripts/validate-release.mjs` | 618 ✓, 0 ✖ | 580 ✓, 0 ✖ (menos linhas porque 45 checagens "CORE arquivo existe" viraram 5) |
| `node scripts/validate-empty-states.mjs` | ✓ | ✓ |
| `node scripts/smoke-static.mjs` | ✓ | ✓ |
| `node --check` em todos os JS/MJS + JSON | ✓ | ✓ |
| `npm run audit:css` | 2 588 mortas | 0 |

### Suíte de auditoria multiplataforma (24 testes)

| | main | V15.51 |
|---|---|---|
| Resultado | 23 aprovados, **1 reprovado** (clássica iPad 1180×820, Agenda: rolagem lateral de 116 px) | **24 aprovados** |
| PWA offline real (instala, desliga a rede, recarrega, navega nas 7 áreas, abre mapa no leitor) | aprovado | aprovado |
| XSS (títulos importados com `<img onerror>` / `<svg onload>` nas 7 áreas, nos dois modos, e na busca) | nenhum handler executou | nenhum handler executou |

### Suítes E2E existentes (573 testes, 4 projetos; iPad WebKit e iPhone WebKit EMULADOS em Chromium)

| | main (V15.50.0) | V15.51.0 |
|---|---|---|
| Execução completa, 2 workers (mesmo ambiente) | 480 aprovados · **24 reprovados** · 69 pulados | **489 aprovados · 15 reprovados** · 69 pulados |
| Falhas que não existiam na main | — | **nenhuma** (as 15 são um subconjunto das 24) |
| Reexecução isolada (1 worker, sem retry) dos 15 que falharam | 26 aprovados · 11 reprovados | 26 aprovados · 11 reprovados (os mesmos) |

Classificação das falhas:

- **6 corrigidas por esta auditoria**: os testes das pranchas `Início · cinco telas`, `Pós-prova` e `Revisões · adiar` em iPad e iPhone, que falhavam depois das 21h por usar data UTC (M4).
- **3 oscilações por carga** que reprovaram na main e passaram na V15.51 (`modo foco`, `rota sobrevive a reload`, `dock lateral no leitor`, todos no iPad) — não atribuo isso à auditoria.
- **4 por carga do ambiente** (2 CPUs, 2 workers): `tempo de estudo só conta…`, `modo foco do mapa…`, `captura rápida de dúvida…`, `[T] Reader mantém topbar…`. Estouram 30 s sob concorrência e **passam isolados**, na main e na V15.51.
- **11 só no projeto iPhone EMULADO em Chromium**, testes da interface clássica que medem comportamento de WebKit (visibilidade de painéis recolhidos no iPhone, opacidade do vidro do dock etc.). Falham igualmente na main e na V15.51, passam nos projetos Desktop e iPad. **Não são conclusivos** sem WebKit real; no CI do repositório eles rodam em WebKit.

Comandos: `npx playwright test -c <wrapper> --workers=2 --project=desktop-chromium --project=ipad --project=ipad-webkit-EMULADO-chromium --project=iphone-webkit-EMULADO-chromium` (o wrapper só aponta o Chromium pré-instalado e troca `browserName` dos projetos WebKit para Chromium). Saídas completas em `evidencias/` não foram incluídas por tamanho; os resumos estão aqui.

### O que NÃO foi possível testar

- Safari/WebKit real (iPadOS/iOS) e hardware físico — tudo marcado como EMULADO.
- Instalação do PWA como app na tela inicial e atualização com aba antiga aberta em dispositivo real (a detecção de worker mais novo é coberta pelo teste `PWA detecta worker mais novo`).
- Supabase real: login, upload > 50 MB, RLS e conflitos com dados remotos — só com mocks, por regra do pedido.
- axe-core: `@axe-core/playwright` está declarado mas a suíte `accessibility.spec.mjs` tem 3 linhas sem casos; não foi ampliada.
- Teclado completo e leitores de tela: não houve auditoria manual.

## 9. Regressões introduzidas durante o trabalho (e corrigidas)

1. A consolidação removeu `lucide-png` do `BOOT_ASSETS` do Service Worker → recolocado como `camada-5`.
2. `validate-release.mjs` e o `verify-live` do CI procuravam nomes de arquivo antigos e valores mortos → adaptados (seção 4, A2).
3. `validate-empty-states.mjs` exigia o nome da folha antiga → adaptado.
4. A primeira correção de A1 só tratou o cartão; o bloco de título também tinha coluna implícita → corrigido e verificado em 4 larguras.

## 10. Aplicação manual e rollback

Ver `LEIA-ME_ATUALIZACAO.md` (ZIP de atualização) — inclui os passos para aplicar o ZIP integral ou o diferencial, a lista de exclusões que precisam ser feitas à mão e o rollback.

## 11. Pacotes

| Pacote | Conteúdo |
|---|---|
| `MEUS_MAPAS_V15.51.0-G_COMPLETO.zip` | Projeto final integral (HTML, CSS, JS, JSON, leitor, mapas, simulados, capas, ícones PNG, fontes locais, PWA, scripts, workflow, testes, docs e este relatório). Sem `.git`, `node_modules`, `package-lock.json`, `data/search-index.json` (gerado pelo CI), resultados de teste. |
| `MEUS_MAPAS_V15.51.0-G_ATUALIZACAO.zip` | Pasta `arquivos/` só com os arquivos novos ou alterados em relação ao commit base (comparação por SHA-256), mais `LEIA-ME_ATUALIZACAO.md`, `ALTERADOS.txt`, `ADICIONADOS.txt`, `EXCLUIDOS.txt`, `BASE_COMMIT.txt`, `SHA256SUMS.txt` e `RELATORIO_AUDITORIA.md`. |

Verificação feita antes da entrega: os dois ZIPs foram extraídos em pastas limpas; o integral passou em `validate-release`, `validate-empty-states`, `smoke-static`, checagem de links internos e numa execução da suíte de auditoria servida a partir da pasta extraída; o diferencial, aplicado sobre uma cópia limpa do commit base (copiar `arquivos/` + apagar `EXCLUIDOS.txt`), resultou em árvore **idêntica byte a byte** à do integral.

Os SHA-256 e tamanhos dos dois pacotes ficam no arquivo `MEUS_MAPAS_V15.51.0-G_SHA256.txt`, entregue junto com eles (um arquivo não pode conter o hash do pacote em que está).
