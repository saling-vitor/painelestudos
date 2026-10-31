# MEUS MAPAS — RELINT — Auditoria profunda final e correção REV11.7

**Data:** 31/10/2026  
**Escopo:** exclusivamente RELINT (Relações Internacionais, Globalização e Relações entre Estados e Povos), conhecimentos gerais CASAN, Instituto AOCP.  
**Conclusão:** **ENTREGÁVEL TECNICAMENTE COM PENDÊNCIAS EXPLÍCITAS — NÃO HOMOLOGADO MATERIALMENTE**.

## 1. Método, procedência e integridade

- KIT original REV11.7 foi preservado sem edição; conferência de integridade e autoteste foram novamente executados, ambos aprovados.
- Recebidos: pacote original `RELINT_V01.zip`; fontes e planejamento da série `CGA_REV117_TODOS_ARQUIVOS(7).zip`; KIT integral. A montagem anterior permaneceu preservada.
- Portão Zero já executado no ciclo anterior: **22 partes de 22** e recibo **421CC5BC**, com comprovantes sob `AUDITORIAS/PORTAO_ZERO`. Nenhum conteúdo de `99_ARQUIVO_REV09` foi adotado.
- Novo workspace independente: `RELINT_AUDITORIA_PROFUNDA_REV11_7/WORKSPACE_RELINT`, sem modificações nos originais.
- Hash anterior do HTML: `20ac227d89d3bbbdbade5457aa3e36c3f138229f6ca0c8617f07ae06a2e834fd`. Novo hash abaixo; arquivos distintos.

## 2. Cotejo do Drive com as fontes oficiais

- Pasta examinada: `#ESTUDOSMENTAIS` → `04 · Normas e Fontes Técnicas`, `03 · Provas Oficiais e Gabaritos` → `Instituto AOCP`. O acervo de normas nesta pasta contém vários documentos CASAN e técnicos de outras disciplinas, mas não foi identificada fonte normativa adicional indispensável ao escopo específico de RELINT.
- Prova AOCP analisada para referência de **formato**, não para copiar ou identificar itens oficiais de RELINT: `04_PROFISSIONAL - ARQUITETO URBANISTA (TIPO 1).pdf`, SANEPAR 003/2024; Drive: https://drive.google.com/file/d/11dnxtRf6mJHZaE4dXJ3hgxeOfzwO099E/view. Não foi incorporada questão dela ao banco RELINT.
- Edital CASAN 003/2026 e três retificações originais anteriormente extraídos do ZIP da série (Anexo III, p. impressa 28; RET01, RET02 e RET03). A interpretação de RELINT permanece nos itens 2, 2.1 e 4 do programa, sem alteração curricular no Chat B.

### Correção documental C1 — corte temporal

**Antes:** a fonte `ITU` citava `Facts and Figures 2026`, relatório publicado em **13/10/2026**, posterior ao `dataCorteISO = 2026-09-04` do mapa. A fonte COMEX mencionava disponibilidade até setembro de 2026, também posterior à data de corte, sem necessidade para os fatos ensinados.

**Depois:** a fonte UIT passou para `Facts and Figures 2025` (publicado em 2025), com evidências de pessoas offline, renda, qualidade e custo de acesso. As afirmações e fontes derivadas foram reencadeadas nos JSONs 02, 03, 04 e na matriz editorial. Retirada a menção ao período de estatísticas COMEX posterior ao corte, preservando filtros e conceitos verificáveis.

Fontes verificadas:
- https://www.itu.int/itu-d/reports/statistics/facts-figures-2025/
- https://www.itu.int/itu-d/reports/statistics/2026/10/13/ff26-foreword/ (somente contraste cronológico; **não** utilizada como fonte pré-corte)
- https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/perguntas-frequentes-faq/14-como-consultar-estatisticas

### Correção documental C2 — situação da Bolívia no MERCOSUL

**Antes:** a página informativa geral contém ressalva desatualizada sobre adesão da Bolívia; o mapa apresentava seu ingresso como consolidado, porém a justificativa usava apenas a página geral.

**Depois:** `F-RELINT-06-05` vincula tanto `MERC` como `MERC26`, e refere expressamente o comunicado da Cúpula de **30/06/2026**, que identifica a Bolívia entre Estados Partes; fica registrada a suspensão da Venezuela. A fonte antiga recebe alerta de divergência temporal. Links: https://www.mercosur.int/pt-br/sobre-o-mercosul/paises e https://www.mercosur.int/pt-br/comunicado-conjuntos-dos-presidentes-dos-estados-partes-do-mercosul .

### Referências adicionais conservadas

Carta da ONU, CF/1988 art. 4º, OMC, Comex Stat/MDIC, ACNUR (refugiados), UNESCO (diversidade cultural), UNCTAD/WIR 2026, UNFCCC (Acordo de Paris e NDCs), UNECE (águas transfronteiriças). URLs e localizadores individualizados nos arquivos 02 e 03.

## 3. Pedagogia e questões — auditoria C3

| Indicador | Antes | Depois |
|---|---:|---:|
| Ramos / tópicos / subassuntos | 3 / 11 / 22 | 3 / 11 / 22 |
| Fatos vinculados | 55 | 55 |
| Questões autorais | 55 | 55 |
| Questões oficiais AOCP incorporadas | 0 | 0 |
| Alternativa correta como a **mais longa** | 44/55 | **14/55** |
| Alternativa correta como a **mais curta** | — | **1/55** |

- Reformuladas as **220 alternativas incorretas**, quando necessário com reaproveitamento pontual de alternativas anteriores, para reduzir repetição e previsibilidade; revisados os comentários de todas as 55 questões.
- Cada item mantém 5 opções, 1 gabarito autoral, ID preservado, vínculo único com fato documentado e `trapId` nas incorretas; 55/55 questões possuem opções distintas dentro de cada item.
- As letras corretas foram reembaralhadas deterministicamente; os gabaritos anteriormente gerados **não devem** ser reutilizados para a nova versão.
- O estilo das questões foi inspirado no formato de múltipla escolha de provas AOCP; **não são questões AOCP oficiais** e não houve conferência por gabarito oficial.
- Ainda existe repetição de conceitos entre perguntas de cada tópico, razão pela qual o banco exige leitura pedagógica final por pessoa responsável antes da homologação.

## 4. Validação REV11.7 e testes do HTML final

| Validação | Resultado |
|---|---|
| `conferir_kit.py` e `testar_kit_zerado.py` | Aprovados, KIT original preservado |
| `validar_pacote.py` | 0 erros, 191 avisos; 190 de outros mapas e 1 sobre 0 questão real AOCP |
| `auditar_cobertura_integral.py` | Aprovado — vínculos estruturais |
| `auditar_prontidao_editorial.py --modo homologacao --mapa RELINT` | APTO PARA REVISÃO HUMANA FINAL, 22 subassuntos; não certifica materialmente |
| `montar_mapa.py`, ordem das seções e HTML único | Aprovados |
| `relatorio_qualidade.py` | 0 erros de molde, 0 erros RDP |
| `auditar_destaques_dom.py` | 11/11 tópicos acima do mínimo, Chromium |
| Auditoria mestra V211 no DOM | TECNICAMENTE_APTO_SEM_HOMOLOGACAO_MATERIAL; 0 erros e 0 alertas editoriais computados |
| Teste direcionado Chromium 390, 820 e 1280 px | 11 tópicos em cada largura; 0 rolagem lateral; 0 vazamentos |
| Controles OK/REV/DIF | 33 controles detectados; clique de OK registrou estado `done` |
| Erros JS no teste direcionado | 0 |
| ZIP técnico e manifesto | 47 entradas, `testzip() = None`; hashes do manifesto conferidos |

**Limites da verificação:** o ambiente bloqueou `file://` e `http://127.0.0.1` para o navegador (`ERR_BLOCKED_BY_ADMINISTRATOR`). Por isso os testes direcionados utilizaram HTML injetado no Chromium. **Não foram demonstrados** persistência após reload real, operação offline a partir de arquivo local, Safari físico ou estabilidade no iPad/iPhone. Esses itens não podem ser considerados homologados. Uma auditoria DOM estrutural não prova correção jurídica de cada explicação.

## 5. Arquivos de saída e hashes SHA-256

| Arquivo | Bytes | SHA-256 |
|---|---:|---|
| `RELINT_V01.html` | 3,241,040 | `bb899c1d4d5236068b7c85c11f9879066c126487fcec42a654de0d1f8ab52071` |
| `PACOTE_RELINT_V01.zip` | 1,019,579 | `feb6bdb57c5702b10412519e80227f46ba49dac2f434d987f17a8b90ffedf7fe` |
| `AUDITORIA_DOM_RELINT_PROFUNDA.json` | 5,340 | `096afd5d8fcfe55d42695ebfb2d7e8f04f07e977d185c50888301c87077c6cae` |
| `AUDITORIA_MESTRA_PROFUNDA.json` | 1,763 | `7dbf93ad9de8f7b1b4400e7238d0eaa557bcda57e6db882bc2e374a70b335f82` |
| `TESTE_CHROMIUM_INJECAO_REVISAO.json` | 679 | `d3f5eaf9ae8dce1a34e1b456b9cfc6a352fe66327c476658ce0a33821398e17b` |

## 6. Pendências para homologação plena

1. Revisão independente dos 55 itens autorais, especialmente distractores, gabaritos e justificativas; nenhuma questão real de RELINT foi homologada.
2. Persistência e recuperação de estados após recarregamento em uma origem HTTP(S) permitida e em arquivo local real.
3. Verificação em Safari físico (iPad/iPhone) da expansão de fundamentos, das linhas de FIXE, da responsividade e de eventual tremor visual.
4. Se houver retificação superveniente que altere o programa até a prova, novo cotejo documental e atualização pontual do mapa.

**Decisão:** arquivo final revisado e íntegro, **sem homologação material**. Nenhum outro mapa foi produzido ou alterado. O KIT não foi editado. Nenhuma página foi marcada como lida sem leitura real.
