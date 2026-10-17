# Marca — Meus Mapas (estado em V15.51.0-G)

## Runtime (o que o aplicativo carrega)

A identidade em uso é o kit **Topographic Editorial V1** em `assets/brand/topographic-editorial-v1/` (ver o README do kit):

- ícones PWA, favicon e apple-touch-icon: `topographic-editorial-v1/icons/` (referenciados por `index.html`, `reader.html`, `offline.html`, manifestos e `sw.js`);
- logotipos SVG/PNG da barra lateral e da tela offline: `topographic-editorial-v1/svg/` e `png/`;
- capa do Início: `topographic-editorial-v1/covers/home-hero.png`.

Da identidade anterior (V13 · fantasma leitor) só três mascotes continuam em uso, nos estados vazios da interface clássica (`assets/css/app.css`):

- `mascot/mascote-pensando.png`, `mascot/mascote-livros-feliz.png`, `mascot/mascote-ideia.png`.

## Masters preservados

`assets/brand/source/` guarda os originais do kit V13 fornecido pelo usuário (logos, ícone mestre e os sete mascotes em `source/final/`). Não são carregados pelo app; ficam como acervo para regenerar derivados. Não redesenhar nem recolorir.

## Removido na auditoria V15.51.0-G

As exportações derivadas da identidade V13 que nenhum arquivo do app referenciava mais (`app-icons/`, `favicon/`, `logo/`, `social/`, `splash/`, cópias versionadas `-v15-21-0`/`-v15-22-0` dos mascotes e os demais mascotes sem uso em runtime) foram excluídas. A lista exata e a evidência estão em `docs/auditoria-v15-51/RELATORIO_AUDITORIA.md`. Os originais continuam em `source/`.
