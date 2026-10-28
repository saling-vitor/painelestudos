# V15.57.0-G · Fase pós-prova

Segunda entrega dos conceitos de 27/10/2026. Usa os dados do edital da V15.56.

## Telas

- **Curso, depois da prova:** fechamento com o gabarito em pontos (formulário por disciplina), recursos (questão, mapa da fundamentação, resumo, situação: preparando, enviado, deferido, indeferido) e "aguardando convocação" (chip em Meus Cursos, curso não arquivado).
- **Início:** card "Próximo marco" no Pós-prova (dias até a fase, aviso de prazo para recursos e convocação) e aviso no veredito do Hoje quando um marco cai em até 7 dias. Nova tela "Entre concursos" quando nenhum curso ativo tem prova: mapas portáteis guardados, o que tem REV/DIF primeiro, meta de manutenção (folha 08, padrão 40 min).
- **Simulados:** com estrutura da prova, a tentativa vira pontos da banca (as seções do simulado casam com as disciplinas pelo nome); carimbo em pontos, célula "Eliminatório" e "Margem geral", disciplinas com linha do mínimo. Nota de corte ganha unidade (% ou pontos).
- **Agenda:** marcos do cronograma nas visões de semana, mês e no painel do dia (prazos em óxido). "Importar .ics" lê o arquivo exportado do Google Agenda, sugere curso e fase pelo título e grava na Régua do edital; nada é enviado.
- **Configurações:** folha 09 "Auditoria do acervo", só leitura: mapas sem marcadores, fonte legal não declarada, template, mapas só na nuvem, cursos sem data, sem estrutura, pós-prova sem gabarito, cronograma vazio e tentativas sem disciplina. Avisos contam no carimbo do sistema.

## Dados e build

- `prefs` em studyapp.prancha.v1 (metaEntre); `closures[id].recursos` e `aguardandoAt`; corte com `unit`.
- `scripts/build-search-index.mjs`: cada tópico ganha `markers` e `questions`; o índice ganha `maps[]` (template, G26, fonte declarada, tópicos com marcador, questões). Medido: DEMHAB, PDGV e IERA sem marcadores; 1.843 variantes; 4 de 14 mapas declaram a fonte.
- Componentes do gabarito (`gabForm`, `gabRows`, `gabCard`) e a ação `save-gab-pond` passaram para `prancha-ui.js`, usados pelo Início, pelo Curso e por Simulados.

## Testes

`tests/e2e/pos-prova-v15-57.spec.mjs` (7 casos). `prancha.spec.mjs`: 9 folhas e 10 links no índice.
