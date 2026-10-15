# MEUS MAPAS — implantação Nanquim, Latão e Vidro
Estado: em andamento, não liberar a main até os testes.
Base: três HTMLs de referência (Paleta Grafite e Latão, Escala Tipográfica, Vidro Nanquim).

## Escopo
- Desktop, iPad, iPhone e PWA, todos os painéis da Home à Configuração.
- Leitor reader.html, Template V211 e HTMLs antigos e futuros.
- Capas, imagens, fontes pedagógicas, conteúdo e suas cores originais preservados.
- Interface em Grafite/Papel/Latão, óxido para risco e musgo para concluído;
  as tonalidades pastel de navegação ativa só quando previstas no Vidro Nanquim.
- Inter e JetBrains Mono com os 14 tokens da escala.
- Cards e leitura sólidos; apenas superfícies flutuantes com vidro de quatro intensidades.

## Implantação segura pendente
1. Fotografar/medir estado real em desktop, iPad e iPhone antes de alterar o CSS.
2. Migrar declarações existentes para os tokens, unificando as 49 folhas ativas,
   sem `html *` e sem cascata global de `!important`.
3. Substituir material Black Smoked em cards mantendo a base preta opaca.
4. Mapear corretamente classes ópticas já produzidas por dynamic-liquid-glass-v2.js.
5. Migrar botões, navegação ativa, modais, controles e indicadores.
6. Aplicar a mesma escala a reader.html e Template V211 preservando ações,
   busca, favoritos, anotações, imagens e funcionamento offline.
7. Migrar mapas existentes com backups e testes de regressão por arquivo,
   sem sobrescrever conteúdo ou metadados de estudo.
8. Atualizar scripts/validate-release.mjs que hoje exige o CSS Black Smoked
   como última camada, contagem estática de 49 folhas e valores antigos.
9. Atualizar version.json, APP_VERSION, APP_VERSION_LABEL, index.html,
   sw.js, cache PWA e workflows de acordo com versão mais recente da main.
10. Testar contraste em capas claras (o microvidro com alfa .4 e blur 10
    não assegura automaticamente WCAG 4.5:1), foco, toque, movimento,
    transparência reduzida, offline e E2E por plataforma.
11. Validar GitHub Actions e o deploy em ambiente de prévia antes do merge.
12. Somente fazer merge/publicação após todos os testes aprovados.

## Estado nesta branch
Estão introduzidos apenas os três arquivos independentes em
`assets/css/design-system/`. Não são importados pelo index.html e não alteram
o comportamento publicado: esta é a primeira etapa, não a entrega final.
