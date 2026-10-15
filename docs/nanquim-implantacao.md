# MEUS MAPAS — Design System Nanquim / Papel / Latão / Vidro

## Identidade da entrega
- Repositório: `saling-vitor/painelestudos`; trabalho em `feat/nanquim-design-system-unificado` (PR #180).
- Versão candidata: **V15.48.174-G**, impacto real em Desktop, iPad e iPhone.
- A `main` estava em **V15.48.173-G** na auditoria de 15/10/2026; **não houve publicação autorizada ou merge neste relatório**.
- PR #179 é uma implementação paralela divergente. Não fazer dois merges: preservar no PR #180 somente diferenças verificadas e necessárias.

## Contrato de interface
- Fundo Nanquim `#000000`, cartões sólidos Grafite `#0a0a09`, texto Papel `#ece6da`, ação Latão `#c3aa84`.
- Óxido é risco; Musgo representa concluído. Cores artísticas de capas e imagens são preservadas.
- Vidro fumê e refração em chrome sobreposto (barra, sidebar, popover, modal); não aplicar blur sobre cards de leitura.
- Tipografia Inter / JetBrains Mono com 14 tokens responsivos; 11 px no mínimo para rótulos mono/uppercase, 12 px para leitura normal e 16 px em controles de toque.
- Navegação e controles funcionais em Desktop/Tablet/Smartphone; preservar acessibilidade, movimento reduzido, modo offline e dados de estudo.
- Ícones Lucide PNG e capas existentes não podem ser substituídos por SVG embutido ou imagens genéricas.

## Entrega técnica
- O `index.html` mantém 53 CSS ativos durante a migração; `nanquim-tokens.css`, `nanquim-typography.css`, `nanquim-materials.css` e `nanquim-application.css` definem a camada nova.
- Os 14 mapas HTML sob `cursos/porto-alegre/mapas/` receberam apenas um estilo `mm-nanquim-v211-standard` incorporado: **75 linhas adicionadas e zero removidas em cada diff**. Isso garante ausência de supressão de linhas anteriores, não prova automaticamente todos os fluxos offline.
- `reader.html`, `offline.html`, manifesto escuro canônico `manifest-v15.23.6.webmanifest` e `manifest.webmanifest` alinham o fundo Nanquim. Manifestos históricos versionados continuam preservados para compatibilidade retroativa; o manifesto light permanece opção clara separada.
- `assets/js/app/updates.js` registra `sw.js?v=15.48.174`; `sw.js` usa cache de mesma versão. `scripts/validate-release.mjs` impede divergências dos metadados, manifestos e Service Worker.

## Evidências do CI
- GitHub Actions [run #38786858500](https://github.com/saling-vitor/painelestudos/actions/runs/38786858500): Validate e E2E Desktop Chromium, iPad Chromium, iPad WebKit, iPhone WebKit **aprovados** para o commit anterior.
- Commit `63e39ff0`: corrige microlegendas da Home e adiciona teste de fontes computadas. A sua run [#38790154333](https://github.com/saling-vitor/painelestudos/actions/runs/38790154333) estava em andamento na auditoria: Validate e iPad WebKit aprovados, demais E2E ainda sem conclusão.
- Toda modificação posterior àquela run requer nova aprovação. Resultados históricos **não** autorizam integração do novo HEAD.

## Pente-fino e critérios finais
1. Acompanhar até conclusão todos os testes da versão mais recente, incluindo desktop, iPad Chromium, iPad WebKit e iPhone WebKit.
2. Validar fontes **efetivamente computadas** em componentes visíveis, não apenas procurar declarações CSS legadas. Corrigir as fontes conflitantes na origem, com proteção contra clipping/overflow.
3. Auditar seletores de alta especificidade, `!important`, duplicações e dependências históricas das 53 folhas; não remover uma folha sem testes reais de paridade.
4. Verificar acessibilidade, contraste, teclado, navegação, formulários, simulado, leitor integrado, progresso e conteúdo offline dos 14 mapas.
5. Preservar integralmente os HTMLs de mapas, as capas e as informações pedagógicas. A Template V211 mestre não foi encontrada como arquivo raiz do repositório e não é alterada por esta entrega; exigir o arquivo original para sua migração quando aplicável.
6. Só retirar o PR do modo rascunho e integrar na `main` depois de CI atual aprovado, auditoria concluída e autorização do usuário; verificar o GitHub Pages publicado e sua versão após a integração.

**Estado: candidato em auditoria; não alegar publicação antes de confirmar a `main` e o deploy.**
