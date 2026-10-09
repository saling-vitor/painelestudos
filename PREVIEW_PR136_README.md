# MEUS MAPAS — HOMOLOGACAO ISOLADA PR #136

**Proposito:** conferir visualmente o acabamento de capa Liquid Glass LG-01 a LG-08 em dominio separado.

## Fontes
- PR auditada: #136 (rascunho). HEAD-base: `f4c2e09b2536f9f09f95558746ce0f4851c15548`.
- Branch de homologacao: `preview/pr136-smoked-glass-isolated-20261009`.
- Nao fazer merge desta branch na `main` ou na PR #136.

## Isolamento de dados
- `assets/js/config.js` desativa `supabaseUrl` e `supabaseAnonKey`, e ignora `studyapp.config.override`.
- A interface pode manter armazenamento **local ao dominio de homologacao**; nao usar credenciais nem dados pessoais de producao durante o teste.
- Nao substituir o GitHub Pages de producao, nao publicar em projeto Vercel ja existente.

## Implantacao autorizada (ainda depende de deploy e verificacao)
1. Criar projeto de hospedagem Vercel **novo e exclusivo** para homologacao, nunca selecionar um projeto de producao.
2. Escolher este repositorio e esta branch como fonte exata; fazer deploy de site estatico da raiz sem jobs de escrita em producao.
3. Confirmar via recurso servido que `assets/js/config.js` tem os campos Supabase vazios, que o `index.html` carrega sem 404 e que o site apresenta controles de capa corretos.
4. Validar Desktop, iPadOS e iOS/PWA em dispositivo fisico, incluindo controles `•••`, favorito, lista MATTE, hover, foco, rolagem e cache da instalacao isolada.
5. Registrar aceite visual antes de solicitar **autorizacao separada** para integrar a PR #136 na `main`.

**Nao confundir a homologacao da UI com teste de sincronizacao/nuvem.** A nuvem esta intencionalmente desabilitada.
