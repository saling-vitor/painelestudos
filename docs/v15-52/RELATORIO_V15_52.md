# MEUS MAPAS V15.52.0-G · relatório de implementação

Base: `main` em `c003b8c` (V15.51.0-G). Escopo aprovado: **todo o diagnóstico agora (lotes A–D); migração para o Google Drive depois**, quando houver um OAuth Client ID criado pelo proprietário. Publicação só com o CI verde.

Nada foi feito no Supabase nem no Google Drive. Nenhuma credencial foi criada, nenhum mapa V211 foi alterado (os HTMLs de `cursos/` e `simulados/` estão idênticos byte a byte) e nenhum dado do usuário é apagado ou migrado.

## Lote A · desempenho e publicação

| Item | O que mudou | Resultado medido |
|---|---|---|
| P0-1 · atualização baixava tudo de novo | Service Worker com dois caches: o do app (troca a cada versão) e `study-content-v1` (mapas, simulados, capas, ícones, fontes), que persiste entre versões. Revalidação condicional (ETag / Last-Modified) uma vez por versão; migração do conteúdo dos caches antigos na ativação. | 1ª abertura após o deploy (SW antigo ainda ativo): 89 MB, como antes. Abertura seguinte: **~2,5 MB**; depois, ~0. Offline continua completo. |
| P0-2 · CI | Concorrência por branch (PR não cancela a publicação da `main`), permissões mínimas por job, `npm ci` com lockfile e cache, iPad em 2 partes, auditoria D/T/M + acessibilidade **bloqueando** o deploy, resumo dos testes no painel, artefatos só em falha (5 dias), verificação do site publicado por SHA-256 de 11 arquivos, Dependabot semanal. | — |

## Lote B · acessibilidade e contraste

- Nova suíte `acessibilidade-pranchas.spec.mjs`: axe-core (WCAG 2.1 AA) nas 7 telas em Desktop 1440, iPad 820 e celular 390. Falhas críticas/sérias bloqueiam o deploy.
- Abas das pranchas: `aria-selected` (sem `aria-pressed`, que é inválido em `role=tab`).
- Contraste corrigido em rótulos óxido, porcentagens, dias passados da semana, legenda dos lotes, metadados de atualização e crédito dos ícones.
- Gráficos com rolagem lateral recebem foco por teclado e rótulo.

## Lote C · navegação e continuidade

- **P1-8** · o degrau do iPad em retrato passou de 820 para 900 px (834 px deixava o carimbo apertado).
- **P1-9** · índice de seções no celular (Início e Progresso) e índice das folhas das Configurações fixos no topo ao rolar, com a seção atual destacada. No desktop, só as Configurações mantêm o índice. Como no celular e no iPad o `position: sticky` não tem efeito (o `<body>` vira contêiner de rolagem), a fixação é feita por JS só nesses casos, sem mexer no comportamento global de rolagem.
- **P1-10 + F1** · o leitor informa o último tópico visível (mensagem `postMessage` da mesma origem; os mapas não são alterados). A Home mostra "Retomar · mapa · tópico" logo abaixo do "Agora", preenchendo o vão que existia ao lado do Plano do dia, e o botão "Continuar no tópico" abre o mapa nesse ponto.
- **P1-11** · as Configurações mostram se o Supabase está no ar, pausado ou sem resposta (sondagem só de leitura em `/auth/v1/health`, sem token, no máximo a cada 10 minutos) e quanto o app ocupa no aparelho (dados locais, cota, armazenamento protegido). Projeto pausado vira aviso na ficha técnica, com a orientação de reativar no painel do Supabase.

## Lote D · estudo e manutenção

- **F2** · revisão guiada no leitor: "Revisão guiada no leitor · N" na tela Revisões abre o primeiro tópico vencido; uma faixa no leitor oferece Errei / Difícil / Ok / Fácil, Pular e Encerrar e segue para o próximo. Usa o agendamento por tópico que já existia (`StudyPlanner.rateTopic`); o mapa é reaberto após cada avaliação para reler o estado atualizado.
- **F3** · `scripts/measure-topic-matching.mjs` mede quantos tópicos de simulado a recuperação pós-simulado consegue ligar a um tópico de mapa (mesma regra do app). Hoje: **155 de 180 (86%)**; os 25 sem correspondência são listados (ex.: AutoCAD 2D, Esquadrias, Gerenciamento/EAP). O CI publica essa medição no resumo, sem bloquear.
- **F4** · o `.ics` da Agenda passou a seguir a RFC 5545: blocos com horário saem com início e fim, dias inteiros têm `DTEND`, linhas longas são dobradas e revisões têm categoria.
- **P2-1** · o índice de busca (~1 MB) não segura mais a abertura do app. Automação (manutenção da agenda e recuperação pós-simulado) espera o índice chegar antes de agir.
- **P2-2** · a opção "Usar a interface clássica" saiu das Configurações. O código e o caminho de volta continuam por duas semanas; a remoção definitiva fica para a próxima versão.
- **P3-1** · `studyapp.config.override` aceita só `supabaseUrl` (https://*.supabase.co), `supabaseAnonKey` e `bucket`, com formato validado; JSON inválido não derruba mais o app.

## Verificação

- Validadores: `validate-release`, `validate-empty-states`, `smoke-static` aprovados; CSS morto = 0.
- Testes novos: `fluxo-estudo.spec.mjs` (retomar, revisão guiada, índice de seções, estado da nuvem, configuração restrita, índice de busca assíncrono) e `acessibilidade-pranchas.spec.mjs`.
- Suítes E2E completas: ver o resumo do CI do PR (Desktop, iPad 1/2 e 2/2, iPad WebKit, iPhone, Auditoria D/T/M e acessibilidade).

## Pendências conscientes

- Migração para o Google Drive: aguardando o OAuth Client ID (plano no documento de migração).
- Remoção definitiva da interface clássica: próxima versão, após duas semanas.
- A 1ª abertura depois desta publicação ainda baixa tudo uma vez (o Service Worker antigo é quem atende); a economia vale a partir da seguinte.
