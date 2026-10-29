# V15.62 · Raio-X lido do PDF do edital

O leitor (`assets/js/app/edital-layout.js` + `edital-reader.js`) remonta as páginas do PDF pela posição de cada trecho, acha o quadro de provas do cargo pelo cabeçalho (Questões/Itens, Valor/Peso, Mínimo, Total), monta disciplinas, blocos, mínimos, etapas, nota final, cronograma e ficha do cargo, e o usuário confere antes de aplicar.

Regras novas do Raio-X: blocos/módulos com mínimo e peso; mínimo em pontos, acertos ou %; não zerar; certo/errado com desconto; escala 0–10 com média ponderada (FCC) e nota padronizada; etapas (discursiva, estudo de caso, prática, títulos) com mínimo e caráter; nota final por soma, média ponderada ou média simples.

## Resultado nos 39 editais da pasta (cargo Arquiteto)

| Banca | Edital | Disciplinas | Questões · pontos · regras | Datas | Avisos do leitor |
|---|---|---|---|---|---|
| AOCP | DIÁRIO OFICIAL DA UNIÃO Publicado em: 08/10/2025 / Edição: 192 / Seção | 3 | 50q 100pts · mg 60 pontos | 4 | quadro montado a partir do texto do edital |
| AOCP | ESTADO DE SANTA CATARINA SECRETARIA DE ESTADO DA SAÚDE EDITAL DE CONCU | 5 | 60q 105pts · mg 60 pct | 0 |  |
| AOCP | GOVERNO DO ESTADO DE PERNAMBUCO JUNTA COMERCIAL DO ESTADO DE PERNAMBUC | 0 | 0q 0pts · mg null pontos | 2 | não encontrei o quadro de provas |
| AOCP | MINISTÉRIO DA EDUCAÇÃO SECRETARIA DE EDUCAÇÃO PROFISSIONAL E TECNOLÓGI | 4 | 60q 100pts · mg 60 pontos | 6 | não achei o quadro específico do cargo; usei o mais provável |
| Cebraspe | ARAUCÁRIA NITROGENADOS S.A. (ANSA) PROCESSO SELETIVO PÚBLICO PARA O PR | 2 | 100q 100pts · mg 30 pontos · certo-errado pen 1 | 1 | não achei o quadro específico do cargo; usei o mais provável |
| Cebraspe | PROCESSO SELETIVO SIMPLIFICADO PARA CONTRATAÇÃO DE PROFISSIONAIS DE NÍ | 3 | 40q 40pts · mg 20 pontos · certo-errado | 2 | não achei o quadro específico do cargo; usei o mais provável |
| Cebraspe | SECRETARIA DE ESTADO DA ADMINISTRAÇÃO DO MARANHÃO (SEAD/MA) SECRETARIA | 2 | 80q 80pts · mg 40 pontos | 1 | não achei o quadro específico do cargo; usei o mais provável |
| FCC | Diário Oficial ALEMS n. 2996 CAMPO GRANDE – MS, QUINTA-FEIRA, 18 DE DE | 2 | 80q 120pts · mg 50 pontos · padronizada | 3 | nota padronizada: o app não calcula aprovação sozinho |
| FCC | PODER JUDICIÁRIO JUSTIÇA DO TRABALHO TRIBUNAL REGIONAL DO TRABALHO DA  | 2 | 60q 100pts · mg 6 pontos · media10 | 2 |  |
| FEPESE | CUNHA PORÃ PROCESSO SELETIVO • EDITAL 001/2025 MUNICÍPIO DE CUNHA PORÃ | 5 | 40q 10pts · mg 3 pontos · NF ponderada 0.8 | 4 |  |
| FEPESE | MUNICÍPIO DE BRUSQUE CONCURSO PÚBLICO • EDITAL 001/2025 SECRETARIA DE  | 5 | 40q 10pts · mg 6 pontos | 4 |  |
| FEPESE | MUNICÍPIO DE JOAÇABA CONCURSO PÚBLICO • EDITAL 001/2025 https://2025cp | 3 | 40q 10pts · mg 5 pontos | 4 |  |
| FEPESE | MUNICÍPIO DE URUBICI CONCURSO PÚBLICO • EDITAL 001/2025 SEAD SECRETARI | 4 | 30q 10pts · mg 6 pontos | 4 |  |
| FEPESE | PREFEITURA MUNICIPAL DE FLORIANÓPOLIS CONCURSO PÚBLICO • EDITAL 025/20 | 4 | 60q 10pts · mg 6 pontos · NF ponderada 0.8 | 4 |  |
| FGV | 27/03/2026, 19:15 SEI/TJSC - 10508131 - Edital ESTADO DE SANTA CATARIN | 11 | 80q 80pts · mg 48 acertos · grupos Módulo de Conhecimentos Específicos:30acertos, Módulo de Conhecimentos Gerais | 0 |  |
| FGV | DIÁRIO OFICIAL ELETRÔNICO ASSEMBLEIA LEGISLATIVA DO ESTADO DE RONDÔNIA | 6 | 80q 80pts · mg 20 pct · grupos Módulo I:30pct, Módulo II:40pct | 5 | o edital tem mínimos diferentes por cargo; confira os blocos |
| FGV | DOE Nº 36.749 DE 31.08.2026. GOVERNO DO ESTADO DO PARÁ SECRETARIA DE E | 4 | 60q 60pts · mg 50 pct · grupos Conhecimentos Básicos, Conhecimentos Específicos | 5 |  |
| FGV | EDITAL Nº 01/2025 A Amazônia Azul Tecnologias de Defesa S.A. - AMAZUL, | 5 | 60q 60pts · mg 30 acertos · grupos Módulo I – Conhecimentos Gerais, Módulo II – Conhecimentos Específicos · naoZerar | 0 | não achei o quadro específico do cargo; usei o mais provável |
| FGV | EDITAL Nº 01/2025 – RETIFICADO EM 15 DE AGOSTO DE 2025 O Diretor-Presi | 4 | 70q 70pts · mg 12 pontos · grupos Módulo I – Conhecimentos Gerais, Módulo II – Conhecimentos Específicos | 0 |  |
| FGV | GOVERNO DO ESTADO DO TOCANTINS SECRETARIA DE ESTADO DE ADMINISTRAÇÃO S | 5 | 60q 90pts · mg 40 pct · grupos Módulo II – Conhecimentos Específicos:24pontos, Módulo I – Conhecimentos Gerais | 0 |  |
| FUNDATEC | Assembleia Legislativa do Rio Grande do Sul - Edital de Abertura – Pro | 3 | 30q 100pts · mg 50 pontos | 5 | não achei o quadro específico do cargo; usei o mais provável |
| FUNDATEC | GHC – Grupo Hospitalar Conceição - Edital de Abertura – Concurso Públi | 3 | 50q 93pts · mg 46.5 pontos | 6 |  |
| FUNDATEC | PREFEITURA MUNICIPAL DE IJUÍ/RS - Edital de Abertura – Concurso Públic | 4 | 75q 80pts · mg 60 pontos | 5 |  |
| FUNDATEC | PREFEITURA MUNICIPAL DE MONTENEGRO/RS - Edital de Abertura – Concurso  | 6 | 40q 80pts · mg 40 pontos | 5 |  |
| FUNDATEC | PREFEITURA MUNICIPAL DE NOVA PÁDUA - Edital de Abertura – Concurso Púb | 4 | 40q 100pts · mg 50 pontos | 4 |  |
| FUNDATEC | PREFEITURA MUNICIPAL DE TAPERA/RS - Edital de Abertura – Concurso Públ | 6 | 45q 90pts · mg 45 pontos | 5 |  |
| FURB | ESTADO DE SANTA CATARINA MUNICÍPIO DE GOVERNADOR CELSO RAMOS CONCURSO  | 4 | 50q 10pts · mg null pontos | 2 |  |
| FURB | ESTADO DE SANTA CATARINA MUNICÍPIO DE SÃO JOÃO BATISTA CONCURSO PÚBLIC | 4 | 40q 10pts · mg null pontos | 4 |  |
| FURB | FUNDAÇÃO UNIVERSIDADE REGIONAL DE BLUMENAU CONCURSO PÚBLICO TÉCNICO-AD | 4 | 50q 10pts · mg null pontos | 2 | não achei o quadro específico do cargo; usei o mais provável |
| FURB | PREFEITURA MUNICIPAL DE NAVEGANTES PROCESSO SELETIVO EDITAL N.º 0172/2 | 4 | 40q 10pts · mg 5 pontos · NF media | 4 | não achei o quadro específico do cargo; usei o mais provável |
| FURB | SECRETARIA DE ESTADO DA EDUCAÇÃO CONCURSO PÚBLICO DO CARGO DE PROFESSO | 0 | 0q 0pts · mg null pontos | 2 | não encontrei o quadro de provas |
| Legalle | CONCURSO PÚBLICO PARA PROVIMENTO DE EMPREGOS FENAC S/A - FEIRAS E EMPR | 4 | 40q 100pts · mg 50 pct | 3 |  |
| Legalle | PREFEITURA MUNICIPAL DE ALVORADA CONCURSO PÚBLICO • 01/2026 www.instit | 5 | 40q 100pts · mg 50 pct | 4 |  |
| Legalle | PREFEITURA MUNICIPAL DE FORQUETINHA CONCURSO PÚBLICO • 001/2026 www.in | 5 | 40q 100pts · mg 50 pct · grupos Conhecimentos Gerais, Conhecimentos | 4 |  |
| Legalle | PREFEITURA MUNICIPAL DE SÃO LOURENÇO DO SUL CONCURSO PÚBLICO • 01/2026 | 6 | 40q 100pts · mg 50 pct | 4 |  |
| Legalle | PREFEITURA MUNICIPAL DE TROMBUDO CENTRAL CONCURSO PÚBLICO • 001/2026 w | 3 | 30q 100pts · mg 50 pct | 4 |  |
| Legalle | PREFEITURA MUNICIPAL DE TRÊS FORQUILHAS CONCURSO PÚBLICO • 01/2026 www | 5 | 40q 100pts · mg 50 pct | 5 |  |
| Objetiva | ESTADO DO RIO GRANDE DO SUL MUNICÍPIO DE CACHOEIRA DO SUL/RS CONCURSO  | 5 | 40q 97.5pts · mg 60 pontos | 3 |  |
| Objetiva | ESTADO DO RIO GRANDE DO SUL MUNICÍPIO DE CANGUÇU/RS CONCURSO PÚBLICO N | 5 | 50q 100pts · mg null pontos | 3 |  |

Sem prova objetiva para o cargo: JUCEPE (só títulos) e SED/SC (professor). Nota padronizada (FCC ALEMS): o app mostra acertos e pontos brutos, mas não decide aprovação.

Testes: `tests/e2e/raiox-edital-v15-62.spec.mjs` (fixtures com páginas reais de Ijuí e TJSC em `tests/fixtures/`).
