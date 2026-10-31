# Registro de publicação — HISTGEOSC V02 — 31/10/2026

**Escopo:** apenas o mapa HISTGEOSC (Conhecimentos Gerais e Atualidades — CASAN 003/2026), preservando os outros mapas, o cadastro do aplicativo e o KIT REV11.7.

## Publicação GitHub

- Repositório: https://github.com/saling-vitor/painelestudos
- Branch: `main`
- Commit do mapa e relatórios: [`2f4763fc3eb96e593092127afc7c372d16cbae5c`](https://github.com/saling-vitor/painelestudos/commit/2f4763fc3eb96e593092127afc7c372d16cbae5c)
- Commit complementar da validação CSS: [`e1851a6fd918b2509992a78b0451076cd26dda82`](https://github.com/saling-vitor/painelestudos/commit/e1851a6fd918b2509992a78b0451076cd26dda82)
- HTML público, **dependente do deploy Pages**: https://saling-vitor.github.io/painelestudos/cursos/casan/mapas/HISTGEOSC_V02.html
- Página do arquivo no GitHub (já confirmada na branch): https://github.com/saling-vitor/painelestudos/blob/main/cursos/casan/mapas/HISTGEOSC_V02.html
- Pipeline do Pages para o commit complementar: https://github.com/saling-vitor/painelestudos/actions/runs/41235560502
- Commit do ZIP de evidências: https://github.com/saling-vitor/painelestudos/commit/eea329c81cf227341627c5cc066c50017a348262
- Commit das 12 partes do pacote e downloader: https://github.com/saling-vitor/painelestudos/commit/4d19ab4246c3b5adc11d15b5d655ced63a892bc8
- Página pública de download, dependente do Pages: https://saling-vitor.github.io/painelestudos/cursos/casan/downloads/BAIXAR_PACOTE_HISTGEOSC_V02.html
- Workflow do commit final: https://github.com/saling-vitor/painelestudos/actions/runs/41236425203

## Arquivos enviados ao GitHub

1. `cursos/casan/mapas/HISTGEOSC_V02.html` — HTML completo.
2. `docs/mapas/HISTGEOSC/RELATORIO_AUDITORIA_PROFUNDA_HISTGEOSC_V02.md`.
3. `docs/mapas/HISTGEOSC/RELATORIO_EDITORIAL_HISTGEOSC_V02.json`.
4. `docs/mapas/HISTGEOSC/RELATORIO_QUALIDADE.md`.
5. `docs/mapas/HISTGEOSC/HASHES_V02.sha256`.
6. `cursos/casan/downloads/EVIDENCIAS_AUDITORIA_HISTGEOSC_V02.zip` — evidências compactadas idênticas ao original.
7. `cursos/casan/downloads/PACOTE_HISTGEOSC_V02.zip.part01` até `.part12` — segmentos binários do ZIP original, 11 × 400.000 B e 1 × 268.707 B.
8. `cursos/casan/downloads/BAIXAR_PACOTE_HISTGEOSC_V02.html` — página que recompõe os 12 segmentos no navegador, verifica SHA-256 e baixa o ZIP.

O ZIP integral está hospedado em 12 segmentos (não como `.zip` único) e continua disponível diretamente nesta conversa. O diretório `docs/` não é incorporado ao artefato do GitHub Pages, mas está acessível no repositório.

## Integridade

- HTML: SHA-256 `f8d30613e76634ca3a718c9ec5afb929d73e27b09d1894064f3ff6231d62de1d`; SHA Git blob `868a335e7ccf25ef880785728e1b491cb946c7e9` (coincidência verificada com a versão local).
- ZIP: SHA-256 `d7940ccb6d79f72ac2a65980229e840ac6eb6ccd1463ebd7b2f9cfa21ee41ceb` (ZIP local e partes publicadas com os 12 hashes Git confirmados).
- Conteúdo: 3 ramos, 15 tópicos, 30 subassuntos, 77 fatos, 77 questões autorais.

## Estado editorial e limites

O mapa foi tecnicamente auditado, mas **não homologado**: a Regra 36 mantém 47 pendências de revisão independente; não há questões oficiais AOCP autenticadas. Não foi realizado Safari físico nem verificação conclusiva de persistência após reload.

## Acompanhamento do deploy

O commit original foi enviado com sucesso; a validação inicial do GitHub Actions falhou devido a duas declarações `!important` de uma alteração CSS preexistente. A correção eliminou as duas declarações excedentes, preservou a regra de validação e recebeu **Validate: success** na execução `41235560502`. No último acompanhamento, os testes E2E adicionais ainda estavam em execução e já tinham passado `iPad 1/2`, `iPad 2/2`, `iPad WebKit` e auditoria D/T/M; os testes Desktop e iPhone ainda estavam em execução. **A disponibilidade pública do Pages não estava comprovada no momento desta anotação.** Consulte o workflow acima para o resultado final.

## Reversão, se necessária

Para desfazer apenas o ajuste CSS: `git revert e1851a6fd918b2509992a78b0451076cd26dda82` (atenção: restauraria a falha no limite de `!important`). Para reverter os downloads: reverter `4d19ab4246c3b5adc11d15b5d655ced63a892bc8` e `eea329c81cf227341627c5cc066c50017a348262`. Para reverter a publicação principal de HISTGEOSC: `git revert 2f4763fc3eb96e593092127afc7c372d16cbae5c`. Confirmar a ordem e os commits posteriores antes de reverter em um repositório compartilhado.
