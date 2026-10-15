# MEUS MAPAS — implantação Nanquim, Latão e Vidro

## Estado verificado em 15/10/2026
PR #180 em rascunho; branch `feat/nanquim-design-system-unificado`. `main` consultada: V15.48.173-G.
A branch contém V15.48.174-G em preparação (ainda NÃO publicada).
Nesta etapa foram alterados 28 arquivos relativos ao Design System, portal,
reader.html, 14 mapas de estudo, testes, PWA e versionamento.

## Regras oficiais de aceitação
- Paleta Nanquim/Grafite/Papel, Latão nas ações, Óxido em risco, Musgo concluído.
- Pigmentos pastéis somente na navegação ativa e nas capas autorais.
- Inter + JetBrains Mono com 14 tokens responsivos; sem tipografia minúscula.
- Leitura e cards sólidos; vidro somente em barras, sidebar, menus, modais
  e controles sobrepostos, respeitando acessibilidade.
- Preservar integralmente conteúdos HTML dos mapas, identidade de capa,
  registro de progresso, dados, interação, nuvem e funcionamento offline.
- Revisar escopo real e sincronizar APP_VERSION, APP_VERSION_LABEL, version.json,
  index.html, Service Worker e cache antes da publicação.

## Auditoria real de CI — run 38754745702
- Validate: sucesso, incluindo validação JS, índice de busca, release e smoke.
- E2E Desktop Chromium: falha.
- E2E iPad Chromium: falha.
- E2E iPad WebKit: falha.
- E2E iPhone WebKit: falha.
- Deploy e verificação do Pages: ignorados, corretamente bloqueados.
- Classes de falha identificadas nos logs:
  1. test suites antigos ainda esperam glass com blur nos cards;
     o novo contrato exige cards opacos sem blur;
  2. alguns testes esperam fundo opaco na sidebar, mas o manual Vidro
     Nanquim especifica sidebar em vidro;
  3. comparação de botões em cards com acento diferente ainda detectou
     cor contextual; adicionada regra CSS específica para neutralização;
  4. testes de transparência da topbar iPad esperam alfa anterior;
     precisa atualizar expectativa para barra 58% e 78% após rolagem;
  5. auditoria axe detectou violação séria/crítica, a identificar e corrigir;
     não alterar o teste de acessibilidade para ocultar a ocorrência.
- Antes de atualizar asserts antigos, verificar os computed styles efetivos
  e confirmar a conformidade com os três HTMLs de referência.

## Pendências obrigatórias
1. Corrigir regressões verificadas (incluindo contraste e foco real da axe).
2. Atualizar E2E legados para o NOVO contrato sem remover cobertura.
3. Testar navegação, formulários, modais e leitores no iPad/iPhone reais.
4. Conferir integridade pedagógica e comportamento offline dos 14 mapas.
5. Testar a Template V211 original de geração: arquivos importados não são
   substitutos para auditoria e atualização da Template mestre.
6. Fazer pente fino dos 49 CSS e das camadas de alta especificidade.
7. Executar nova CI e exigir todos os jobs aprovados antes de integração.
8. Conferir publicações e versões após autorização.

**Não integrar o PR ou alegar publicação enquanto houver falhas.**
