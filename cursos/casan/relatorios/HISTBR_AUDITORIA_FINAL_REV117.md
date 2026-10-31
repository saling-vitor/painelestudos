# HISTBR · Auditoria profunda final — Chat B REV11.7

**Data de emissão:** 31/10/2026  **Mapa:** HISTBR V01 — História do Brasil. **Escopo:** apenas HISTBR.

## Veredito

**ENTREGÁVEL COM CONFERÊNCIAS PENDENTES; NÃO HOMOLOGADO.** O HTML e pacote passam nos testes estruturais, editorialmente têm conteúdo válido para estudo, mas o portão final exige pendências reais que não podem ser declaradas concluídas artificialmente.

## Fontes e edital conferidos

- Edital CASAN 003/2026 de nível superior, **Anexo III**, página impressa **28** (55ª página do PDF). O item comum é **“História e Geografia do Brasil e do Estado de Santa Catarina”**. O HISTBR aborda somente História do Brasil, preservando o escopo aprovado para os demais mapas.
- **Retificação 01**, p. 1: art. 1º altera 4.7.1, alínea b.1, sobre isenção eleitoral; **não altera HISTBR**.
- **Retificação 02**, pp. 1–2: art. 1º altera requisito de diploma (3.1, e, e 16.14, VIII); art. 2º altera requisitos de seis cargos; art. 3º altera Conhecimentos Específicos do Assistente Social; **não altera HISTBR**.
- **Retificação 03**, p. 1: art. 1º altera requisito de formação do cargo 403, Analista de Dados; **não altera HISTBR**.
- Fontes históricas verificadas: Arquivo Nacional (acervo, presença indígena, expansão colonial, abolicionismo e AI-5), Senado Federal (Constituições), FGV CPDOC (Vargas e transição política), Planalto (AI-5, CLT, Constituição de 1988), e demais referências contextualizadoras identificadas nos sete JSONs.
- Fontes primárias e contextualizadoras **não se confundem**: o cotejo de marcos selecionados não equivale a prova de verificação exaustiva de cada assertiva historiográfica.

**Localizadores oficiais (consultados):**
- Senado, Constituições: https://www12.senado.leg.br/noticias/constituicoes (Carta de 1824, 1891, 1934, 1937, 1946, 1967 e 1988).
- Arquivo Nacional, acervo: https://www.gov.br/arquivonacional/pt-br/acesso-a-informacao/institucional/acervo (Colônia, 1808–1822, Império e República).
- Arquivo Nacional, povos indígenas: https://historialuso.arquivonacional.gov.br/index.php/historia-luso-brasileira/assuntos/listadetemas/indios (artigo de 2017).
- Arquivo Nacional, abolição: https://www.gov.br/arquivonacional/pt-br/sites_eventos/sites-tematicos-1/brasil-oitocentista/temas-oitocentistas/legislacao-abolicionista-no-imperio (Lei 1850/1871/1885/1888).
- Planalto, AI-5: https://www.planalto.gov.br/ccivil_03/ait/ait-05-68.htm (13/12/1968, especialmente arts. 4, 10, 11).
- Planalto, CLT: https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm (Decreto-lei 5.452/1943, art. 1º).
- FGV CPDOC, Era Vargas: https://cpdoc.fgv.br/pesquisa-conhecimento/getulio-vargas-1954 (1930, 1945, 1951).

## Antes × depois desta auditoria

| Controle | Antes | Depois |
|---|---|---|
| Ramos / tópicos / subassuntos | 3 / 16 / 32 | **3 / 16 / 32**, preservados |
| Banco de questões | 80 autorais; 80 majoritariamente classificatórias | 80 autorais; **16 substituídas** por questões histórico-causais/contrastes factuais, 64 classificatórias restantes |
| Retificações e atos históricos | Verificação editorial incompleta | Retificações 01–03 cotejadas; marcos normativos selecionados referenciados; flags justificadas no relatório |
| Identificação editorial | “rascunho”, “em preparação”, “uma questão autoral” | Atualizada para refletir 80 questões autorais e conferências ainda pendentes |
| Categoria no navegador | Ramo 1 argila, ramo 2 ardósia, ramo 3 rosa | **Palha #C9BE96** nos 16 tópicos, 3 ramos e 3 cards (cor computada; CSS local pós-montagem) |
| Autoteste zerado do KIT | Inconclusivo por tempo | **APROVADO; 0 problemas** |
| Persistência após reload | Sem evidência | Não comprovada: navegação file://, localhost e URL interceptada bloqueadas pela política do navegador |

## Inventário tópico a tópico

| Ramo | Tópico | Subassuntos | Fatos | Questões autorais |
|---|---|---:|---:|---:|
| r1 | Povos originários e ocupação do território | 2 | 2 | 5 |
| r1 | Expansão portuguesa e primeiros contatos | 2 | 2 | 5 |
| r1 | Administração e formação colonial | 2 | 2 | 5 |
| r1 | Açúcar, escravização e economia colonial | 2 | 2 | 5 |
| r1 | Mineração e interiorização | 2 | 2 | 5 |
| r2 | Reformas, revoltas e emancipação | 2 | 2 | 5 |
| r2 | Independência e Primeiro Reinado | 2 | 2 | 5 |
| r2 | Regência e conflitos regionais | 2 | 2 | 5 |
| r2 | Segundo Reinado e transformações econômicas | 2 | 2 | 5 |
| r2 | Abolição, imigração e crise do Império | 2 | 2 | 5 |
| r3 | Proclamação e Primeira República | 2 | 2 | 5 |
| r3 | Era Vargas e reorganização do Estado | 2 | 2 | 5 |
| r3 | Democracia de 1946 e desenvolvimentismo | 2 | 2 | 5 |
| r3 | Ditadura militar e sociedade | 2 | 2 | 5 |
| r3 | Redemocratização e Constituição de 1988 | 2 | 2 | 5 |
| r3 | Brasil recente: Estado, economia e sociedade | 2 | 2 | 5 |

**Evidência individual por subassunto:** IDs, factIds, topicIds, títulos e fontes ficam preservados no `RELATORIO_EDITORIAL_DO_MAPA.json`, `01_IDENTIFICACAO_E_PLANO.json` e `02_FONTES_E_INVENTARIO.json` incluídos no pacote. O inventário individual soma exatamente 32 subassuntos e 32 factIds.

## Validações executadas

- `conferir_kit.py` e leitura obrigatória REV11.7 realizados na rodada anterior; recibo 421CC5BC documentado.
- `testar_kit_zerado.py`: **EXIT 0**; Template G28 íntegro, exemplo de ponta a ponta montado, 0 problemas.
- `validar_pacote.py`: **EXIT 0, 0 erros, 195 avisos**. Avisos incluem fontes pendentes de outros mapas na matriz integral (não objeto do Chat B), fontes AOCP reais ausentes e orientação editorial de marcadores.
- `auditar_cobertura_integral.py`: **EXIT 0**, vínculos estruturais aprovados; não atesta verdade material de todos os fatos.
- `montar_mapa.py`: **EXIT 0**, pré e pós-montagem, ordem e HTML único aprovados.
- `relatorio_qualidade.py`: **EXIT 0**, 0 erros de molde/RDP, 0 avisos no HTML final.
- `auditar_destaques_dom.py`: **EXIT 0**, 16/16 tópicos aprovados em Chromium.
- `empacotar_mapa.py`: **EXIT 0**, 51 arquivos, incluindo edital/3 retificações.
- `conferir_manifesto.py`: **EXIT 0**, pacote descompactado, hashes conferidos e compatibilidade com KIT REV11.7.
- `auditar_prontidao_editorial.py --modo homologacao --mapa HISTBR`: **BLOQUEADO, 2 pendências abertas**, corretamente mantidas. Não declarar homologado.

## Testes de navegador

| Viewport | Largura do documento | Largura da viewport | Rolagem interna de tabelas | Cor computada |
|---:|---:|---:|---:|---|
| 390px | 370px | 390px | 19 | #c9be96 |
| 820px | 800px | 820px | 0 | #c9be96 |
| 1280px | 1260px | 1280px | 0 | #c9be96 |

Interpretação: em 390 px o `body.scrollWidth` alcança 458 px por conteúdo de tabelas com rolagem interna, mas **o documento principal tem 370 px** em uma viewport de 390 px; não houve rolagem horizontal do documento. Não confundir a largura do body com a do elemento de rolagem raiz. Em 820 e 1280 px nenhuma tabela exigiu rolagem interna neste teste.
- Chromium com HTML injetado (sem URL estável): 16 tópicos, 3 ramos, 48 botões de estado; o primeiro botão `done` mudou `aria-pressed=false → true`. Não comprova recuperação após recarregamento.
- **Não testado:** Safari físico iPad/iPhone e persistência de `localStorage` após reload. O navegador rejeitou `file://`, `localhost` e URL interceptada (`ERR_BLOCKED_BY_ADMINISTRATOR`).

## Pendências reais

1. Revisão humana independente, pontual e semântica, de 32 subassuntos, bases bibliográficas e 80 questões.
2. Incorporação e conferência de questões AOCP reais com enunciado e gabarito oficial, se exigida para homologação pedagógica; os 80 itens existentes permanecem **autoria IA não oficial**. As 64 questões de classificação temática remanescentes ainda limitam a variedade de competências.
3. Persistência após reload em origem estável e teste físico Safari iPhone/iPad.
4. A decisão humana final de homologação após o encerramento das pendências e um novo teste de `auditar_prontidao_editorial.py`. Nenhuma flag foi inventada para aprovar o portão.

## Reprodução da montagem, sem editar KIT

1. Descompactar o `PACOTE_HISTBR_V01.zip` e executar `montar_mapa.py` do KIT REV11.7 sobre o diretório do pacote.
2. Executar `python APLICAR_PALETA_HISTBR.py HISTBR_V01.html` sobre o HTML montado. A rotina atua apenas neste HTML e verifica 16 tópicos / 6 atributos de ramo/card antes de gravar; inclui regra CSS local com prioridade para impedir que o JS do template restaure cores de outros ramos.
3. Reexecutar validação HTML e auditoria DOM. **O ZIP oficial inclui o template original íntegro; o HTML final colorido foi pós-processado e este script acompanha o ZIP de entrega.**

## Arquivos, tamanhos e SHA-256

- `HISTBR_V01.html` — 3,256,834 bytes; SHA-256 `3e1a4871b61464ce6caacdce55fcb25beb21dc4ceb745fe678741ff4cec0cf08`
- `PACOTE_HISTBR_V01.zip` — 4,661,402 bytes; SHA-256 `2b8a1818a66c39032322bc9543fc4df4331909486305f6897acce8076313e74e`

## Relatório do portão editorial

```
MEUS MAPAS · REV11.7 · PRONTIDÃO EDITORIAL · MAPA HISTBR · HOMOLOGACAO
Subassuntos do mapa: 32 Tópicos: 16
PENDENTE · Relatório ainda possui pendências materiais abertas
PENDENTE · Estado não é PRONTO_PARA_HOMOLOGACAO
RESULTADO: BLOQUEADO NO CHAT B · 2 pendências
```

**Conclusão:** entrega técnica do HISTBR concluída na presente sessão com ressalvas reais, sem alteração do KIT e sem produzir outros mapas; **não há evidência para chamar de HOMOLOGADO**.
