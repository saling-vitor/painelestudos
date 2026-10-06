import { test, expect } from '@playwright/test';

async function infer(page,lines){return page.evaluate(text=>window.__coursePdfAutofillTest.infer(text),lines.join('\n'))}

test('[G] parser multi-layout cobre Objetiva, FUNDATEC, DEMHAB e AOCP',async({page})=>{
  await page.goto('/#courses');

  const objetiva=await infer(page,[
    'ESTADO DO RIO GRANDE DO SUL',
    'MUNICÍPIO DE CANGUÇU/RS',
    'CONCURSO PÚBLICO Nº 001/2026',
    'Realização: Objetiva Instituto de Desenvolvimento e Inovação (INSTITUTO OBJETIVA)',
    'Cargo Público Escolaridade Grupo de prova',
    'Arquiteto Ensino Superior completo e habilitação legal para o exercício da profissão de Arquiteto 30h 01+CR 7.470,46 140,80 G04',
    'ANEXO IV CRONOGRAMA DE EXECUÇÃO',
    '04/09/2026 Publicação do extrato e do edital',
    '01/11/2026 Aplicação da prova objetiva (GRUPOS 03 E 04)',
    '22/11/2026 Aplicação da prova objetiva (GRUPOS 01 E 02)'
  ]);
  expect(objetiva.title.value).toBe('Prefeitura Canguçu');
  expect(objetiva.subtitle.value).toBe('Arquiteto');
  expect(objetiva.board.value).toBe('Objetiva');
  expect(objetiva.city.value).toBe('Canguçu/RS');
  expect(objetiva.examDate.value).toBe('2026-11-01');
  expect(objetiva.institution.value).toBe('Município de Canguçu');

  const tapera=await infer(page,[
    'PREFEITURA MUNICIPAL DE TAPERA/RS - Edital de Abertura – Concurso Público nº 01/2026',
    'Executora: FUNDATEC',
    '2 Arquiteto Ensino Superior Completo em Arquitetura e Urbanismo com registro ativo no respectivo Conselho de Classe. 01 + CR 40h 7.540,89 Manhã',
    'Disponibilização do Formulário Online para envio das documentações 09/10/2026',
    'Aplicação das Provas Teórico-Objetivas – data provável. 11/10/2026',
    'Edital de Divulgação dos Gabaritos Preliminares 13/10/2026'
  ]);
  expect(tapera.title.value).toBe('Prefeitura Tapera');
  expect(tapera.board.value).toBe('FUNDATEC');
  expect(tapera.city.value).toBe('Tapera/RS');
  expect(tapera.examDate.value).toBe('2026-10-11');
  expect(tapera.institution.value).toBe('Prefeitura Municipal de Tapera');

  const demhab=await infer(page,[
    'Departamento Municipal de Habitação',
    'EDITAL DE ABERTURA 001/2026',
    'O Departamento Municipal de Habitação - DEMHAB, do Município de Porto Alegre, do Estado do Rio Grande do Sul, tendo em vista o Contrato celebrado com Fundação Universidade Empresa de Tecnologia e Ciências – FUNDATEC',
    'CP 01 Arquiteto 01 + C.R.',
    'Disponibilização do Formulário Online para envio das documentações 16/10/2026',
    'Aplicação das Provas Teórico-Objetivas – data provável 18/10/2026',
    'Edital de Divulgação dos Gabaritos Preliminares 19/10/2026'
  ]);
  expect(demhab.title.value).toBe('DEMHAB Porto Alegre');
  expect(demhab.subtitle.value).toBe('CP 01 · Arquiteto');
  expect(demhab.board.value).toBe('FUNDATEC');
  expect(demhab.city.value).toBe('Porto Alegre/RS');
  expect(demhab.examDate.value).toBe('2026-10-18');
  expect(demhab.institution.value).toContain('DEMHAB');

  const aocp=await infer(page,[
    'COMPANHIA CATARINENSE DE ÁGUAS E SANEAMENTO – CASAN',
    'EDITAL DE CONCURSO PÚBLICO N.º 003/2026',
    'O Concurso Público será executado pelo Instituto AOCP',
    'Código do Cargo 406 Arquiteto e Urbanista Florianópolis CR CR',
    'ANEXO I CRONOGRAMA',
    'PUBLICAÇÃO DO EDITAL DE ABERTURA 04/09/2026',
    'APLICAÇÃO DA PROVA OBJETIVA 22/11/2026',
    'Divulgação do Gabarito Preliminar 23/11/2026'
  ]);
  expect(aocp.title.value).toBe('CASAN Florianópolis');
  expect(aocp.subtitle.value).toBe('Arquiteto e Urbanista');
  expect(aocp.board.value).toBe('Instituto AOCP');
  expect(aocp.city.value).toBe('Florianópolis/SC');
  expect(aocp.examDate.value).toBe('2026-11-22');
  expect(aocp.institution.value).toContain('CASAN');
});

test('[G] Novo concurso continua exigindo confirmação explícita',async({page})=>{
  await page.goto('/#courses');
  const whatsNew=page.locator('#whatsNewModal');
  if(await whatsNew.count()&&await whatsNew.evaluate(el=>el.classList.contains('open'))){
    const dismiss=page.locator('#whatsNewClose');
    if(await dismiss.count())await dismiss.click();
    else await page.evaluate(()=>closeModal('whatsNewModal'));
  }
  await page.locator('#newCourseBtn2').click();
  await expect(page.locator('#courseModal')).toHaveClass(/open/);
  await expect(page.locator('#coursePdfAutofill')).toBeHidden();
  await expect(page.locator('#courseSave')).toHaveText('Criar concurso');
});
