# V15.56.0-G · Fundação do edital

Primeira entrega do conjunto de conceitos aprovado em 27/10/2026 (Conceitos_*_V15.56.html). Cria os dados do edital que as versões seguintes usam e resolve as duas situações do momento: a nota do Pós-prova em porcentagem e os mapas do DEMHAB ocultos depois da prova.

## Dados novos (studyapp.prancha.v1)

| Seção | Conteúdo | Lida por |
|---|---|---|
| `editais[courseId]` | `prova[]` (disciplina, questões, peso, mínimo, categorias, padrão), `minimoGeral`, `fonte`, `fases{}`, `cargo{}` | Curso (Raio-X, Régua), Pós-prova |
| `padroes[BANCA]` | estrutura típica de prova por banca; FUNDATEC vem no código | Configurações 08, Curso |
| `mapMeta[mapKey]` | `alcance` escolhido pelo usuário | Todos os Mapas, Curso |

As três seções entram na sincronização, na mesclagem e no backup pelo mesmo caminho de `closures` (lista `SECTIONS` em `prancha-data.js`). `data/catalog.json` ganhou `alcance` nos 14 mapas: LOPA, EFPA e DEMHAB locais, IERA misto, os demais portáteis.

API: `Prancha.editais` (`get`, `set`, `prova`, `pontuar`, `disciplinaDoMapa`, `fases`, `proximoMarco`, `padroes`, `padraoDaBanca`, `aplicarPadrao`, `alcance`, `setAlcance`) e `Prancha.data.libraryMaps()`.

## Telas

- **Curso:** Régua do edital (7 fases, fase atual, próximo marco, cronograma editável) e Raio-X da prova (cards por disciplina com peso, pontos, mínimo e os mapas ligados; ficha do cargo; formulário com ligação categoria → disciplina). Sem estrutura, o card oferece o padrão da banca do curso. Painel do lote ganha o alcance do mapa.
- **Início · Pós-prova:** com estrutura da prova, o gabarito é registrado por disciplina e mostrado em pontos, com mínimo por disciplina e geral. Sem estrutura, o formulário antigo continua.
- **Todos os Mapas:** só mapas locais de concursos encerrados saem da vista; filtro “Alcance” e chip portátil/misto no card.
- **Configurações:** folha 08 “Concursos e editais” com os padrões por banca (editar, criar, remover os criados).

## O que não muda

Plano, revisões, Agenda e Início continuam sem os mapas de concursos encerrados (StudyScope). Visual Nanquim/Latão, tokens `--fs-*` e paleta inalterados. Mapas e simulados (Template V211) não foram tocados.

## Testes

`tests/e2e/edital-v15-56.spec.mjs` (6 casos: nota ponderada 60/52, raio-x e régua no curso, gabarito no pós-prova, biblioteca com portáteis, folha 08, celular sem rolagem lateral). Ajustados: `concursos-encerrados.spec.mjs` (biblioteca mantém os portáteis) e `prancha.spec.mjs` (8 folhas, 9 links no índice).
