# HISTGEOSC — Auditoria profunda final e correção REV11.7 · V02

**Data:** 31/10/2026. **Mapa:** HISTGEOSC — História e Geografia de Santa Catarina, série CGA CASAN 003/2026.  
**Status:** **versão técnica corrigida, NÃO HOMOLOGADA EDITORIALMENTE**. Nenhuma revisão humana independente foi declarada ou simulada.

## Escopo, procedência e segurança

- Apenas o mapa HISTGEOSC foi editado no workspace de trabalho; KIT REV11.7 original e demais mapas preservados.
- Portão Zero da primeira passagem registrado em `RECIBO_PORTAO_HISTGEOSC_REV117.txt` e em 22 partes de leitura; conferência de integridade, autoteste e leitura do KIT realizados antes da V01. Recibo consolidado **421CC5BC**. `99_ARQUIVO_REV09` não aplicado.
- A V02 parte da V01 técnica já preparada e mantém a árvore curricular sem alteração material. O comparativo automatizado confirmou os mesmos IDs de ramos, tópicos e subassuntos, na mesma ordem.
- Pasta Google Drive `#ESTUDOSMENTAIS` inspecionada: `04 · Normas e Fontes Técnicas`, `03 · Provas Oficiais e Gabaritos/Instituto AOCP` e `02 · Editais e Conteúdos Programáticos`. Os PDFs identificados na primeira pasta são predominantemente de legislação/CASAN, arquitetura ou outros temas; o conteúdo do edital e suas três retificações já está incluído no pacote local. Não se confundiu a existência de uma prova AOCP no Drive com a autenticação de questões para HISTGEOSC.

## Comparativo V01 → V02 (dos workspaces técnicos, não do ZIP preliminar do Chat A)

| Critério | V01 | V02 | Resultado |
|---|---:|---:|---|
| Ramos | 3 | 3 | preservados |
| Tópicos | 15 | 15 | preservados |
| Subassuntos | 30 | 30 | preservados, IDs conferidos |
| Fontes inventariadas | 26 | 28 | +2 |
| Fatos | 75 | 77 | +2 |
| Questões | 75 | 77 | +2 |

**Principais correções:**

1. Atualização integral dos enunciados autorais para perguntas específicas em lugar de formulações genéricas, com revisão das alternativas, explicações e indicações COMO CAI.
2. Revisão de seções ENTENDA, corrigindo fragmentos de frases e repetições, preservando o teor dos tópicos originais.
3. Inclusão de fonte IBGE sobre pedologia e de fonte institucional InvestSC sobre turismo, acompanhadas por um fato e uma questão autoral em cada tópico afetado (relevo/solos e agropecuária/logística/turismo).
4. Ajuste crítico de interpretação sanitária: **54,3% (indicador do Censo 2022 com agrupamento de modalidades de esgotamento) não equivale a esgoto efetivamente tratado**. No mesmo diagnóstico estadual, **33,5%** representa a categoria específica de rede geral ou pluvial; os denominadores/conceitos não são equivalentes a tratamento.
5. Política sem imagens preservada (`05_FIGURAS_SELETIVAS.json`: figuras e triagem vazias, desativadas).
6. Nenhuma questão foi declarada AOCP oficial; **77/77 são autorais**, com marcação e gabarito autoral.

## Correspondência temática, fontes primárias e localizadores

| Frente auditada | Referência de suporte | Recorte verificável |
|---|---|---|
| Povos indígenas | Secretaria de Estado da Assistência Social (SC) https://www.sas.sc.gov.br/index.php/combate-a-fome-menu/sfc/65-conselhos/cepin02/403-historico | Histórico estadual dos povos Guarani, Kaingang e Xokleng/Laklãnõ |
| Contestado | Arquivo Nacional https://querepublicaeessa.an.gov.br/index.php/que-republica-e-essa/assuntos/temas/97-tema-contestado | Conflito 1912–1916, dimensão fundiária e social |
| Clima e Mata Atlântica | Inventário Florístico Florestal SC https://www.iff.sc.gov.br/nossas-a%C3%A7%C3%B5es/invent%C3%A1rio-florestal/metodologia/nossa-%C3%A1rea-de-estudo | Climas Cfa e Cfb, formações vegetais |
| Região e hidrografia | Sistema de Recursos Hídricos SC https://www.aguas.sc.gov.br/a-bacia-rio-das-antas/regiao-hidrografica-rio-das-antas | Vertentes atlântica e interior |
| População e área | IBGE https://www.ibge.gov.br/cidades-e-estados/sc | Censo 2022, estimativa 2026 e divisão político-administrativa; dados datados |
| Solos | IBGE https://www.ibge.gov.br/geociencias/informacoes-ambientais/pedologia/15829-solos.html?lang=pt-BR | Pedologia, classificação e variabilidade territorial; evitar afirmar um único tipo de solo |
| Turismo | InvestSC https://invest.sc.gov.br/turismo-2/ | Diversidade regional de destinos e atividades turísticas |
| Saneamento | SEPLAN/SC https://www.seplan.sc.gov.br/download/diagnostico-da-demografia-catarinense/?refresh=6a33332645be31781740326&wpdmdl=81599 | Diagnóstico da Demografia Catarinense, tabela 12: modalidades de esgotamento do Censo 2022, não tratamento |
| Edital e retificações | 4 PDFs dentro de `FONTES/PDFS` no ZIP V02 | Edital CASAN 003/2026 p. 55/90 (Anexo III); retificação 01 p. 1/1, 02 pp. 1–2/2 e 03 p. 1/1, conforme conferência documental anterior |

O inventário `02_FONTES_E_INVENTARIO.json` contém as 28 fontes e seus localizadores específicos. Fontes de contexto oficial não garantem, por si, revisão independente frase a frase.

## Auditorias executadas na versão V02

| Procedimento | Evidência | Resultado |
|---|---|---|
| `validar_pacote.py` | `VALIDACAO_FINAL.log` | **0 erros bloqueantes**, 191 avisos, muitos pertencentes à matriz da série com pendências de outros mapas; não foram falsamente encerrados neste B |
| `auditar_cobertura_integral.py` | `COBERTURA.log` | Verificação estrutural aprovada; demais mapas da série fora de escopo |
| `relatorio_qualidade.py` | `QUALIDADE_FINAL.log` e `RELATORIO_QUALIDADE.md` | Execução OK; pontos a melhorar registrados abaixo |
| `empacotar_mapa.py` | `EMPACOTAMENTO_FINAL.log` | Pacote oficial criado, pré-montagem e auditoria DOM aprovadas |
| `montar_mapa.py` | `MONTAGEM_FINAL.log` | HTML íntegro, ordem das seções aprovada |
| `conferir_manifesto.py` | `MANIFESTO_FINAL.log` | **pacote íntegro e compatível com KIT REV11.7** |
| `auditar_destaques_dom.py` | `DOM_V02.json`, `DOM_V02.log`, `EMPACOTAMENTO_FINAL.log` | **15/15 tópicos** acima da densidade exigida em Chromium |
| Chromium 390/820/1280 px | `TESTE_CHROMIUM_V02.json` | 15 tópicos; sem transbordamento horizontal nem exceções JS nas 3 larguras; abertura de `<details>` efetiva |
| `auditar_prontidao_editorial.py --modo homologacao --mapa HISTGEOSC` | `PRONTIDAO_EDITORIAL_FINAL.log` | **BLOQUEADO — 47 pendências**, revisão independente não comprovada |

### Limites importantes dos testes

- **Persistência após recarregamento: NÃO VERIFICADA.** Teste por navegação direta `file://` e via domínio de teste foi bloqueado pelo administrador do ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR`), impedindo reload confiável; o teste usou injeção do HTML por Playwright para verificar renderização, layout, interações e erros JS.
- **Safari real (iPad/iPhone): NÃO TESTADO.** Chromium em emulação de largura não equivale a Safari físico.
- **Questões AOCP originais autenticadas: ZERO.** O diretório de provas da pasta Drive foi inventariado, mas nenhum item foi incorporado como questão real sem cotejo entre prova e gabarito oficiais.
- O relatório de qualidade assinala como melhorias não bloqueantes: sequência de letras de gabarito repetida em alguns tópicos, três subtipos da taxonomia de armadilhas ainda não utilizados, e ausência de questões reais.
- Os 47 apontamentos da Regra 36 não foram “resolvidos” por preenchimento artificial: 30 subassuntos ainda requerem verificação semântica independente e 15 tópicos requerem conferência pedagógica independente, além de 2 estados de prontidão editorial.
- O status final é **ENTREGÁVEL TECNICAMENTE · NÃO HOMOLOGADO EDITORIALMENTE**.

## Integridade e proveniência do resultado

| Artefato | Tamanho | SHA-256 |
|---|---:|---|
| HTML | 3,277,202 bytes | `f8d30613e76634ca3a718c9ec5afb929d73e27b09d1894064f3ff6231d62de1d` |
| ZIP | 4,668,707 bytes | `d7940ccb6d79f72ac2a65980229e840ac6eb6ccd1463ebd7b2f9cfa21ee41ceb` |

O ZIP contém **51 arquivos, inclusive os quatro PDFs de edital/retificações**. Recibos anteriores e logs desta auditoria foram reunidos no pacote complementar de evidências. O usuário pode cotejar as versões pelo SHA-256 acima.
