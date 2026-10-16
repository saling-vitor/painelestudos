# Conceitos Nanquim e Latão · V15.50.0-G

Aplicação dos quatro conceitos (Escala Tipográfica, Paleta Grafite e Latão, Pigmentos das Capas e do Menu, Vidro Nanquim) ao app inteiro: pranchas, moldura (menu lateral, barra superior, dock), Leitor, modais, painéis de Configurações e a interface clássica.

## O que mudou

**Fontes.** Archivo (texto e interface), IBM Plex Mono (rótulos e números) e Anton (siglas e números grandes), locais em `assets/fonts`. Os `@font-face` ficam em `design-system/nanquim-typography.css`, carregada também pelo `reader.html`. As variáveis antigas `--sans`, `--mono` e `--condensed` apontam para essas famílias. Saiu o `@import` da Inter do Google Fonts.

**Escala.** Os 1.233 tamanhos em px e `clamp()` das folhas antigas e da `prancha.css` viraram os 14 tokens `--fs-*`, com valor por dispositivo (Desktop ≥ 1181 px, iPad 701–1180 px, Celular ≤ 700 px). O token sai do contexto da regra: maiúsculas → `eyebrow` (11 px); minúsculas pequenas → `caption` (12/13 px); botões, abas e filtros → `label`; campos → `input` (16 px no toque); títulos → `h3`/`h2`/`h1`/`display`. Os 7 tokens antigos `--type-*` (8 a 20 px) apontam para a escala nova. O rótulo do dock usa `tabbar` (12 px).

**Paleta.** As 3.548 cores literais das 48 folhas antigas foram para a paleta: neutros → nanquim, grafite 0–3, linha ou papel 1–3, conforme o brilho; vermelhos → óxido; verdes → musgo; dourados → latão (escuro, base, claro); azuis → ardósia. O alfa foi preservado. O conteúdo de `url(...)`, as capas, a imagem de fundo e os mapas mentais não foram tocados.

**Pigmentos.** Um mapa único em `state.js` (`PIGMENTS`, `CATEGORY_PIGMENT`, `categoryPigment`), usado pelas telas antigas e pelas pranchas. As nove categorias seguem o conceito (Legislação latão, Obras terracota, Urbanismo sálvia, Português argila, Acessibilidade ametista, Projeto/BIM ardósia, Instalações pátina, Infraestrutura ocre, Outros pedra); as demais usam os dez pigmentos de reserva. A cor do card de mapa vem da categoria, não mais da capa. Os cursos usam latão único. No menu, o pigmento aparece só no item ativo; no celular, o "Mais" usa pedra.

**Vidro.** Os quatro materiais do conceito (Barra, Painel, Controles, Micro) com os mesmos tokens `--nq-glass-*` em todo o app, incluindo a barra das pranchas, os menus "⋯", a estrela sobre a capa, a barra do Leitor (Barra) e o trilho de estudo (Painel). O conteúdo continua sólido. Menus nascem do botão (96 % → 100 %, 180 ms), botões afundam ao toque (98 %, 90 ms), e com "reduzir transparência" ou "mais contraste" todo vidro vira `#0b0a09` opaco.

## Travas

`scripts/validate-release.mjs` falha se aparecer no CSS ativo: `font-size` em px/rem fora dos tokens; Inter, JetBrains Mono, Bahnschrift ou fonte da rede; qualquer cor fora da paleta e dos valores de vidro do conceito. `tests/e2e/nanquim-conceitos.spec.mjs` mede os estilos computados nas três telas: famílias, piso de 11/12 px, campos de 16 px no toque, pigmento do menu ativo, cor por categoria, vidro só no que flutua e saída opaca com mais contraste.

## Fora do escopo

O estilo interno dos 14 mapas mentais (Template V211) não foi alterado: a fonte e a escala de dentro do mapa são do template de origem.
