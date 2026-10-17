'use strict';
/* V15.53 · Classificação automática da categoria de um mapa ao importar o HTML.
 *
 * Ordem de decisão (para na primeira que responder):
 *   1. meta study-category (ou study-map-category / map-category) declarada no HTML;
 *   2. mesma sigla já usada na sua biblioteca, com título compatível (respeita correções suas);
 *   3. sigla conhecida (MAP_CATEGORY_CODE_HINTS);
 *   4. sigla do catálogo empacotado;
 *   5. leitura do conteúdo, por zonas com pesos diferentes:
 *        título ×5 · programa/escopo declarado ×3 · nome do arquivo ×2 · ramos ×2 (+ voto por ramo)
 *        · nomes dos tópicos ×0,6 · fontes normativas dos tópicos ×0,6 (sem repetição).
 *      Ramos e fontes também votam: a categoria que vence mais ramos/fontes ganha bônus.
 *      Normas citadas pelo número (NBR 9050, Lei 10.257, Lei 14.133…) pesam mais que palavras soltas.
 *      As dezenas de metas de regras de geração do mapa NÃO são lidas: elas citam todos os temas e
 *      confundiriam a classificação.
 * A confiança sai de quanto a primeira categoria supera a segunda; com confiança baixa a prévia
 * de importação avisa e oferece as alternativas mais prováveis.
 */

const MAP_CATEGORY_CODE_HINTS=Object.freeze({
  LOPA:'Legislação e Administração',DEMHAB:'Legislação e Administração',PDGV:'Legislação e Administração',CF88:'Legislação e Administração',EFPA:'Legislação e Administração',IERA:'Legislação e Administração',LIA:'Legislação e Administração',LGPD:'Legislação e Administração',LRF:'Legislação e Administração',ECA:'Legislação e Administração',DHC:'Legislação e Administração',
  LP:'Português',PORT:'Português',PORTUGUES:'Português',
  RLM:'Raciocínio Lógico e Matemática',RL:'Raciocínio Lógico e Matemática',
  INFO:'Informática',INF:'Informática',
  HGA:'Conhecimentos Gerais e Atualidades',
  EPF:'Projeto, Representação e BIM',DCAS:'Acessibilidade e Segurança',UTI:'Infraestrutura e Mobilidade Urbana',TEP:'Instalações e Sistemas Prediais',
  HPS:'Urbanismo e Habitação',LIU:'Urbanismo e Habitação',GCO:'Obras, Gestão e Orçamento'
});

const PIGMENT_LABELS=Object.freeze({latao:'Latão',terracota:'Terracota',salvia:'Sálvia',argila:'Argila',ametista:'Ametista',ardosia:'Ardósia',patina:'Pátina',ocre:'Ocre',pedra:'Pedra',rosa:'Rosa',coral:'Coral',canela:'Canela',palha:'Palha',folha:'Folha',petroleo:'Petróleo',ceu:'Céu',cobalto:'Cobalto',indigo:'Índigo',malva:'Malva'});
function categoryPigmentLabel(cat){const id=typeof categoryPigmentName==='function'?categoryPigmentName(cat):'';return PIGMENT_LABELS[id]||'Latão'}
function updateCategoryPigmentHint(cat){const hint=document.getElementById('manageMapCategoryHint');if(!hint)return;const value=String(cat||'Outros');hint.innerHTML='<i class="category-pigment-dot" style="background:'+ESC(categoryPigment(value))+'" aria-hidden="true"></i>A cor do card vem da categoria · '+ESC(categoryPigmentLabel(value))}

function normalizeCategoryText(v){
  return String(v||'')
    .replace(/(\d)\.(?=\d{3}\b)/g,'$1')            // 10.257 → 10257 · 15.575 → 15575
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g,' ').trim()
}

/* Nomes aceitos na meta study-category além do nome exato da categoria. */
const MAP_CATEGORY_ALIASES=(()=>{const a={
  'Legislação e Administração':['legislacao','legislacao geral','direito administrativo','administracao publica','legislacao e administracao publica'],
  'Português':['portugues','lingua portuguesa','lp'],
  'Raciocínio Lógico e Matemática':['raciocinio logico','matematica','rlm','raciocinio logico matematico'],
  'Informática':['informatica','nocoes de informatica','tecnologia da informacao'],
  'Conhecimentos Gerais e Atualidades':['conhecimentos gerais','atualidades','realidade','historia e geografia'],
  'Arquitetura e Tecnologia':['arquitetura','teoria e historia da arquitetura','historia da arquitetura','tecnologia da construcao','tecnologia das edificacoes'],
  'Projeto, Representação e BIM':['projeto','representacao grafica','bim','projeto arquitetonico'],
  'Obras, Gestão e Orçamento':['obras','orcamento','gestao de obras','licitacoes','obras publicas'],
  'Instalações e Sistemas Prediais':['instalacoes','sistemas prediais','instalacoes prediais'],
  'Conforto Ambiental e Desempenho':['conforto','conforto ambiental','desempenho','desempenho de edificacoes'],
  'Estruturas e Materiais':['estruturas','materiais','materiais de construcao','sistemas estruturais'],
  'Urbanismo e Habitação':['urbanismo','habitacao','planejamento urbano','legislacao urbanistica'],
  'Infraestrutura e Mobilidade Urbana':['infraestrutura','mobilidade','mobilidade urbana','saneamento','topografia'],
  'Meio Ambiente e Sustentabilidade':['meio ambiente','sustentabilidade','legislacao ambiental'],
  'Acessibilidade e Segurança':['acessibilidade','seguranca','seguranca contra incendio','acessibilidade e seguranca contra incendio'],
  'Patrimônio e Restauro':['patrimonio','restauro','patrimonio historico','patrimonio cultural'],
  'Planejamento e Políticas Públicas':['planejamento','politicas publicas','gestao publica'],
  'Exercício Profissional, Perícia e Avaliação':['exercicio profissional','pericia','avaliacao de imoveis','etica profissional','legislacao profissional','pericias e avaliacoes'],
  'Outros Conhecimentos Específicos':['conhecimentos especificos','outros especificos'],
  'Outros':['outros','geral']};
  const out=new Map();for(const[cat,list]of Object.entries(a)){out.set(normalizeCategoryText(cat),cat);for(const alias of list)out.set(normalizeCategoryText(alias),cat)}return out})();
function resolveCategoryName(value){const v=String(value||'').trim();if(!v)return'';if(MAP_CATEGORY_CATALOG.includes(v))return v;return MAP_CATEGORY_ALIASES.get(normalizeCategoryText(v))||''}

/* Ajudantes de padrão sobre o texto normalizado. */
const LAW_PREFIX='(?:lei|lc|decreto|dl|decreto lei|lei complementar|lei federal|lei estadual|lei municipal|mp|medida provisoria)(?: (?:federal|complementar|estadual|municipal|n|no|nro|numero))*';
const law=(...nums)=>[new RegExp('\\b'+LAW_PREFIX+' (?:'+nums.join('|')+')\\b','g'),10];
const nbr=(...nums)=>[new RegExp('\\bnbr(?: iso| iec)? (?:'+nums.join('|')+')\\b','g'),10];
const rx=(source,weight)=>[new RegExp(source,'g'),weight];

/* Vocabulário: peso 10 = norma pelo número / termo exclusivo; 5–7 = expressão técnica típica; 1–3 = palavra solta. */
const MAP_CATEGORY_RULES=[
  ['Legislação e Administração',[
    rx('\\bconstituicao (?:federal|estadual|do estado)\\b|\\bcf ?88\\b|\\bcrfb\\b',8),
    rx('\\blei organica\\b',9),
    rx('\\bestatuto dos? (?:servidores|funcionarios)|\\bregime juridico (?:unico|dos servidores)|\\bservidor(?:es)? publicos?\\b|\\bprocesso administrativo disciplinar\\b|\\bprocesso disciplinar\\b',7),
    rx('\\bdireito administrativo\\b|\\bdireito constitucional\\b|\\batos? administrativos?\\b|\\bpoderes administrativos\\b|\\bresponsabilidade civil do estado\\b|\\bcontrole da administracao\\b|\\bagentes publicos\\b|\\borganizacao administrativa\\b',7),
    rx('\\banpd\\b|\\btratamento de dados\\b|\\bdados pessoais\\b|\\bimprobidade\\b|\\blia\\b|\\blgpd\\b|\\bprotecao de dados\\b|\\bresponsabilidade fiscal\\b|\\blrf\\b|\\bacesso a informacao\\b|\\btransparencia publica\\b',7),
    rx('\\bmaria da penha\\b|\\beca\\b|\\bestatuto da crianca\\b|\\bestatuto da pessoa idosa\\b|\\bestatuto do idoso\\b|\\bigualdade racial\\b|\\bdireitos humanos\\b|\\bgrupos vulneraveis\\b',7),
    rx('\\bcodigo de etica do servidor\\b|\\betica (?:no servico|na administracao) publica\\b|\\bintegridade\\b|\\bconflito de interesses\\b',5),
    rx('\\bdireitos (?:e garantias )?fundamentais\\b|\\borganizacao do estado\\b|\\bpoder (?:legislativo|executivo|judiciario)\\b|\\bprocesso legislativo\\b|\\bvereadores\\b|\\bcamara municipal\\b',5),
    rx('\\blegislacao\\b',3),rx('\\badministracao publica\\b',4),
    law('8112','8429','9784','12527','13709','101','11340','8069','10741'),
    rx('\\blei\\b|\\bdecreto\\b|\\bart\\b|\\bartigo\\b',0.3)]],
  ['Português',[
    rx('\\blingua portuguesa\\b|\\bnorma padrao\\b',10),
    rx('\\bgramatica\\b|\\bortografia\\b|\\bacentuacao\\b|\\bcrase\\b|\\bsintaxe\\b|\\bmorfologia\\b|\\bconcordancia (?:verbal|nominal)\\b|\\bregencia\\b|\\bpontuacao\\b|\\bcolocacao pronominal\\b|\\bvozes verbais\\b|\\bfonologia\\b',6),
    rx('\\binterpretacao (?:de texto|textual)\\b|\\bcompreensao (?:de texto|textual)\\b|\\bgeneros textuais\\b|\\bcoesao\\b|\\bcoerencia\\b|\\bsemantica\\b|\\bsinonimia\\b|\\bfiguras de linguagem\\b|\\bredacao oficial\\b|\\bmanual de redacao\\b',5),
    rx('\\bportugues\\b',4)]],
  ['Raciocínio Lógico e Matemática',[
    rx('\\braciocinio logico\\b|\\blogica (?:proposicional|matematica|de argumentacao)\\b|\\btabela verdade\\b|\\bproposicoes\\b|\\bsilogismo\\b',9),
    rx('\\bmatematica\\b|\\bporcentagem\\b|\\bregra de tres\\b|\\bjuros (?:simples|compostos)\\b|\\bprobabilidade\\b|\\banalise combinatoria\\b|\\bcombinatoria\\b|\\bprogressao (?:aritmetica|geometrica)\\b|\\bconjuntos\\b|\\bequacoes?\\b|\\bestatistica descritiva\\b|\\bmedia mediana\\b',6),
    rx('\\bproporcao\\b|\\brazao\\b|\\bsequencias\\b',2)]],
  ['Informática',[
    rx('\\binformatica\\b|\\bnocoes de informatica\\b',10),
    rx('\\bwindows\\b|\\blinux\\b|\\bmicrosoft (?:word|excel|office|365|powerpoint)\\b|\\blibreoffice\\b|\\bnavegadores?\\b|\\bcorreio eletronico\\b|\\bcomputacao em nuvem\\b|\\bseguranca da informacao\\b|\\bmalware\\b|\\bvirus\\b|\\bbackup\\b|\\bredes de computadores\\b|\\bintranet\\b|\\bhardware\\b|\\bsistemas operacionais\\b|\\bplanilhas? eletronicas?\\b|\\beditores? de texto\\b',6),
    rx('\\binternet\\b|\\bsoftware\\b|\\bexcel\\b',2)]],
  ['Conhecimentos Gerais e Atualidades',[
    rx('\\bconhecimentos gerais\\b|\\batualidades\\b',10),
    rx('\\bhistoria (?:do brasil|do rio grande do sul|do rs|de porto alegre|do municipio|geral)\\b|\\bgeografia (?:do brasil|do rio grande do sul|do rs|do municipio)\\b|\\brealidade (?:etnica|social|historica|geografica|economica|politica)\\b|\\beconomia brasileira\\b|\\bformacao (?:historica|economica)\\b',7),
    rx('\\bgeopolitica\\b|\\bglobalizacao\\b|\\bcultura (?:gaucha|regional|brasileira)\\b',4)]],
  ['Arquitetura e Tecnologia',[
    rx('\\bteoria (?:e historia )?da arquitetura\\b|\\bhistoria da arquitetura\\b|\\bhistoria (?:da arte|do urbanismo)\\b|\\barquitetura (?:moderna|modernista|contemporanea|brasileira|classica|colonial|gotica|barroca|neoclassica)\\b|\\bmovimento moderno\\b|\\bmodernismo\\b|\\bbrutalismo\\b|\\bbauhaus\\b|\\ble corbusier\\b|\\bniemeyer\\b|\\blucio costa\\b|\\bvitruvio\\b|\\bpos modernismo\\b',8),
    rx('\\btecnologia (?:da construcao|das edificacoes|construtiva)\\b|\\btecnicas construtivas\\b|\\bsistemas construtivos\\b|\\bconstrutibilidade\\b|\\bvedacoes\\b|\\bcoberturas\\b|\\bimpermeabilizacao\\b|\\besquadrias\\b|\\brevestimentos\\b|\\bpre fabricacao\\b|\\bsteel frame\\b|\\bwood frame\\b|\\bdrywall\\b|\\balvenaria (?:estrutural|de vedacao)\\b',6),
    rx('\\bcomposicao arquitetonica\\b|\\bpartido arquitetonico\\b|\\btipologias?\\b|\\bprogramacao arquitetonica\\b',4),
    rx('\\barquitetura\\b|\\bedificacoes\\b',1)]],
  ['Projeto, Representação e BIM',[
    rx('\\bbim\\b|\\bmodelagem da informacao da construcao\\b|\\brevit\\b|\\bifc\\b|\\bautocad\\b|\\bcad\\b|\\bsketchup\\b|\\barchicad\\b',9),
    nbr('6492','16636','8196','8403','10067','10068','10126','10582','13142','16752','19650','12298'),
    rx('\\brepresentacao (?:grafica|tecnica)\\b|\\bdesenho (?:tecnico|arquitetonico)\\b|\\bgeometria descritiva\\b|\\bperspectiva\\b|\\bescalas?\\b|\\bcotas?\\b|\\bplantas? baixas?\\b|\\bcortes? e fachadas?\\b|\\bcarimbo\\b|\\bpranchas?\\b',5),
    rx('\\belaboracao de projetos?\\b|\\betapas de projeto\\b|\\bestudo preliminar\\b|\\banteprojeto\\b|\\bprojeto (?:basico|executivo|legal|arquitetonico)\\b|\\bcompatibilizacao de projetos\\b|\\bcoordenacao de projetos\\b|\\bprograma de necessidades\\b',6),
    rx('\\bprojeto\\b',1)]],
  ['Obras, Gestão e Orçamento',[
    law('14133','8666','10520','12462','13303'),
    rx('\\blicitac(?:ao|oes)\\b|\\bcontratos? administrativos?\\b|\\bcontratacao publica\\b|\\bpregao\\b|\\bconcorrencia\\b|\\bregime de execucao\\b|\\bmedicao de obras?\\b|\\baditivos?\\b|\\breequilibrio\\b',8),
    rx('\\borcamento (?:de obras?|da edificacao|parametrico|discriminado)\\b|\\bcomposicao de custos\\b|\\bcustos? (?:da edificacao|de obras?|unitarios?)\\b|\\bsinapi\\b|\\bsicro\\b|\\bbdi\\b|\\bcub\\b|\\bencargos sociais\\b|\\bcurva abc\\b',9),
    rx('\\bfiscalizacao de obras?\\b|\\bexecucao (?:de obras?|e fiscalizacao)\\b|\\bobras? publicas?\\b|\\bgerenciamento (?:da construcao|de obras?|de projetos?)\\b|\\bplanejamento de obras?\\b|\\bcronograma (?:fisico financeiro)?\\b|\\bcpm\\b|\\bpert\\b|\\bcaminho critico\\b|\\bcanteiro de obras?\\b|\\bdiario de obras?\\b|\\brecebimento (?:provisorio|definitivo)\\b|\\bqualidade (?:da construcao|na construcao)\\b|\\bpbqp h\\b',7),
    nbr('12721','12722'),
    rx('\\bobras?\\b|\\borcamento\\b|\\bcustos?\\b',1.5)]],
  ['Instalações e Sistemas Prediais',[
    nbr('5410','5419','5626','8160','10844','7198','13969','15526','13523','13103','5444','16401'),
    rx('\\binstalac(?:ao|oes) (?:eletricas?|hidraulicas?|hidrossanitarias?|sanitarias?|prediais|de gas|de esgoto|de agua|de climatizacao|telefonicas?)\\b|\\bhidrossanitari[ao]s?\\b|\\bsistemas? prediais\\b|\\bspda\\b|\\bdescargas atmosfericas\\b|\\bpara raios\\b',9),
    rx('\\bagua (?:fria|quente)\\b|\\besgoto sanitario\\b|\\baguas pluviais\\b|\\breservatorios?\\b|\\bbarrilete\\b|\\bcircuitos?\\b|\\bquadro de distribuicao\\b|\\baterramento\\b|\\bdisjuntor(?:es)?\\b|\\bluminotecnico\\b|\\bclimatizacao\\b|\\bar condicionado\\b|\\belevadores?\\b|\\bglp\\b|\\bfossa septica\\b',6),
    rx('\\binstalac(?:ao|oes)\\b',2)]],
  ['Conforto Ambiental e Desempenho',[
    nbr('15575','15220','10152','15215','16313','10151','12179'),
    rx('\\bconforto (?:termico|acustico|luminico|ambiental|higrotermico|visual)\\b|\\bdesempenho (?:termico|acustico|luminico|de edificacoes|das edificacoes)\\b|\\bnorma de desempenho\\b|\\bbioclimatic[ao]s?\\b|\\bzoneamento bioclimatico\\b|\\bcarta (?:solar|bioclimatica)\\b|\\binsolacao\\b|\\bventilacao natural\\b|\\biluminacao natural\\b|\\bbrises?\\b|\\btransmitancia\\b|\\binercia termica\\b|\\btempo de reverberacao\\b|\\bisolamento acustico\\b|\\beficiencia energetica\\b|\\bpbe edifica\\b|\\bprocel\\b',9),
    rx('\\bconforto\\b|\\bergonomia\\b|\\bdesempenho\\b|\\bacustica\\b|\\bvida util de projeto\\b|\\bdurabilidade\\b',3)]],
  ['Estruturas e Materiais',[
    nbr('6118','6122','8800','7190','6120','6123','15961','14931','15270','16055','16868','7211','12655','5739','15812'),
    rx('\\bsistemas? estruturais\\b|\\bconcreto armado\\b|\\bconcreto protendido\\b|\\bestruturas? (?:de concreto|metalicas?|de aco|de madeira|mistas)\\b|\\bfundac(?:ao|oes)\\b|\\bresistencia dos materiais\\b|\\bisostatica\\b|\\bhiperestatica\\b|\\bpre dimensionamento\\b|\\blajes?\\b|\\bvigas?\\b|\\bpilares?\\b|\\bsapatas?\\b|\\bestacas?\\b|\\bmomento fletor\\b|\\besforco cortante\\b',8),
    rx('\\bmateriais de construcao\\b|\\bcimento\\b|\\bagregados?\\b|\\bargamassas?\\b|\\bceramic[ao]s?\\b|\\bpatologias? (?:das construcoes|estruturais?)\\b|\\bfissuras?\\b|\\bcorrosao\\b|\\bcarbonatacao\\b|\\bdosagem\\b|\\bslump\\b|\\bfck\\b',6),
    rx('\\bestrutur(?:a|as|al|ais)\\b|\\bmateriais\\b|\\baco\\b|\\bmadeira\\b|\\bconcreto\\b',1.5)]],
  ['Urbanismo e Habitação',[
    law('10257','6766','13465','11124','13089','11977','14620','11888','9785'),
    rx('\\bestatuto da (?:cidade|metropole)\\b|\\bplano diretor\\b|\\bparcelamento do solo\\b|\\bloteamentos?\\b|\\bdesmembramento\\b|\\breurb\\b|\\bregularizacao fundiaria\\b|\\busucapiao\\b|\\bzeis\\b|\\boutorga onerosa\\b|\\boperac(?:ao|oes) urbanas? consorciadas?\\b|\\biptu progressivo\\b|\\bdireito de preempcao\\b|\\btransferencia do direito de construir\\b|\\bestudo de impacto de vizinhanca\\b|\\beiv\\b|\\bfuncao social da (?:cidade|propriedade)\\b|\\buso e ocupacao do solo\\b|\\bzoneamento urbano\\b|\\bcoeficiente de aproveitamento\\b|\\btaxa de ocupacao\\b',9),
    rx('\\bhabitac(?:ao|ional|oes) (?:de interesse social|social|popular)\\b|\\bpolitica (?:habitacional|urbana|nacional de habitacao)\\b|\\bhis\\b|\\bsnhis\\b|\\bfnhis\\b|\\bplhis\\b|\\bathis\\b|\\bminha casa,? minha vida\\b|\\bmcmv\\b|\\bdeficit habitacional\\b|\\bdireito a moradia\\b|\\bassentamentos? precarios?\\b|\\bfavelas?\\b|\\btrabalho social\\b|\\burbanizacao de (?:favelas|assentamentos)\\b',8),
    rx('\\bcodigo de (?:obras|edificacoes|posturas)\\b|\\blegislacao (?:urbanistica|edilicia)\\b|\\bhabite se\\b|\\balvara de (?:construcao|obras?)\\b|\\blicenciamento (?:urbanistico|de obras|edilicio)\\b|\\baprovacao de projetos?\\b|\\bindices urbanisticos\\b|\\brecuos?\\b|\\bmacrozoneamento\\b',8),
    rx('\\burbanismo\\b|\\bplanejamento urbano\\b|\\bdesenho urbano\\b|\\bmorfologia urbana\\b|\\bpaisagismo\\b|\\bpaisagem urbana\\b|\\bespacos? livres?\\b|\\bcidades? (?:sustentaveis|compactas|inteligentes)\\b|\\bhistoria do urbanismo\\b|\\bteoria do urbanismo\\b',6),
    rx('\\bhabitac(?:ao|ional)\\b|\\bmoradia\\b|\\burbanistic[oa]s?\\b|\\burban[oa]s?\\b',2)]],
  ['Infraestrutura e Mobilidade Urbana',[
    law('12587','11445','14026','9503'),
    nbr('13133','14166','9649','12218','15645'),
    rx('\\bmobilidade urbana\\b|\\bsistema viario\\b|\\bhierarquia viaria\\b|\\btransporte (?:publico|coletivo|urbano)\\b|\\bbrt\\b|\\bciclovias?\\b|\\bciclofaixas?\\b|\\bcalcadas?\\b|\\btrafego\\b|\\btransito\\b|\\bcodigo de transito\\b|\\bpavimentac(?:ao|oes)\\b|\\bgreide\\b|\\bterraplenagem\\b',8),
    rx('\\binfraestrutura urbana\\b|\\bsaneamento (?:basico|ambiental)\\b|\\bdrenagem (?:urbana|pluvial)\\b|\\bmicrodrenagem\\b|\\bmacrodrenagem\\b|\\babastecimento de agua\\b|\\btratamento de (?:agua|esgoto)\\b|\\bredes? de (?:esgoto|agua|distribuicao)\\b|\\biluminacao publica\\b|\\bresiduos solidos urbanos\\b',8),
    rx('\\btopografi[ac]\\b|\\blevantamento (?:topografico|planialtimetrico)\\b|\\bcurvas de nivel\\b|\\bgeorreferenciamento\\b|\\bgeoprocessamento\\b|\\bsig\\b|\\bgis\\b|\\bcartografia\\b|\\bsirgas\\b|\\bgeodesi[ac]\\b|\\bsensoriamento remoto\\b|\\bcadastro (?:tecnico|multifinalitario)\\b|\\bctm\\b|\\baltimetria\\b|\\bplanimetria\\b',8),
    rx('\\binfraestrutura\\b|\\bmobilidade\\b|\\bsaneamento\\b|\\bdrenagem\\b|\\bviari[oa]s?\\b',2)]],
  ['Meio Ambiente e Sustentabilidade',[
    law('6938','9605','12651','9985','12305','9433','11428','12187','14119'),
    rx('\\bconama\\b|\\blicenciamento ambiental\\b|\\bimpacto ambiental\\b|\\beia rima\\b|\\beia\\b|\\brima\\b|\\bcodigo florestal\\b|\\bareas? de preservacao permanente\\b|\\bapps?\\b|\\breserva legal\\b|\\bunidades de conservacao\\b|\\bsnuc\\b|\\bpoliticas? nacionais? (?:do meio ambiente|de residuos solidos|de recursos hidricos)\\b|\\bcrimes ambientais\\b|\\bmudancas climaticas\\b|\\bcertificac(?:ao|oes) ambientais?\\b|\\bleed\\b|\\baqua hqe\\b|\\bselo casa azul\\b|\\bconstrucao sustentavel\\b|\\bresiduos da construcao\\b|\\brcd\\b',9),
    rx('\\bmeio ambiente\\b|\\bsustentabilidade\\b|\\bsustentave(?:l|is)\\b|\\bambiental\\b|\\becologi[ac]\\b|\\bods\\b|\\bagenda 2030\\b',3)]],
  ['Acessibilidade e Segurança',[
    nbr('9050','16537','14718','15599','9077','14276','13434','10898','12693','17240','14880','16651'),
    law('13146','10098','10048','13425','5296'),
    rx('\\bacessibilidade\\b|\\bdesenho universal\\b|\\brotas? acessive(?:l|is)\\b|\\bpessoa(?:s)? com deficiencia\\b|\\bpcd\\b|\\bmobilidade reduzida\\b|\\bpiso tatil\\b|\\brampas?\\b|\\bmodulo de referencia\\b|\\bestatuto da pessoa com deficiencia\\b|\\blei brasileira de inclusao\\b|\\blbi\\b',8),
    rx('\\bseguranca contra incendio\\b|\\bprevencao (?:e protecao )?contra incendio\\b|\\bppci\\b|\\bsaidas? de emergencia\\b|\\brotas? de fuga\\b|\\bescadas? (?:enclausuradas?|de emergencia|protegidas?)\\b|\\bcompartimentac(?:ao|oes)\\b|\\bextintores?\\b|\\bhidrantes?\\b|\\bsprinklers?\\b|\\bbombeiros\\b|\\blei kiss\\b|\\bcarga de incendio\\b|\\bsinalizacao de emergencia\\b',9),
    rx('\\bseguranca do trabalho\\b|\\bnr ?18\\b|\\bnr ?35\\b|\\bnr ?10\\b|\\bepi\\b',5),
    rx('\\bseguranca\\b|\\bincendio\\b|\\binclusao\\b',2)]],
  ['Patrimônio e Restauro',[
    law('25 1937','3924','3551'),
    rx('\\bpatrimonio (?:historico|cultural|artistico|arquitetonico|material|imaterial|edificado)\\b|\\brestauro\\b|\\brestauracao\\b|\\btombamento\\b|\\biphan\\b|\\biphae\\b|\\bcompahc\\b|\\bepahc\\b|\\bcartas? patrimoniais?\\b|\\bcarta de (?:atenas|veneza|burra|washington|lisboa)\\b|\\bbrandi\\b|\\bviollet le duc\\b|\\bruskin\\b|\\bboito\\b|\\bconservacao preventiva\\b|\\bretrofit\\b|\\breabilitacao de (?:edificios|edificacoes|centros historicos)\\b|\\bcentro historico\\b|\\bbens tombados\\b|\\binventario de bens\\b|\\bsitio historico\\b|\\barqueologic[oa]\\b',9),
    rx('\\bpatrimonio\\b|\\bpreservacao\\b|\\bmemoria\\b|\\bintervencao em bens\\b',2)]],
  ['Planejamento e Políticas Públicas',[
    rx('\\bpoliticas? publicas?\\b|\\bciclo de politicas\\b|\\bformulacao de politicas\\b|\\bavaliacao de politicas\\b|\\bplanejamento (?:governamental|estrategico|publico|municipal|regional|territorial)\\b|\\bgestao publica\\b|\\bgovernanca (?:publica|metropolitana|urbana)\\b|\\bppa\\b|\\bplano plurianual\\b|\\bldo\\b|\\bloa\\b|\\bindicadores (?:sociais|urbanos|de desempenho)\\b|\\borcamento participativo\\b|\\bparticipacao (?:social|popular)\\b|\\bconselhos? (?:municipais?|gestores?|da cidade)\\b|\\bconferencias? (?:das cidades|municipais)\\b|\\bconsorcios? publicos?\\b|\\bcontrole social\\b',8),
    rx('\\bplanejamento\\b|\\bgovernanca\\b|\\bgestao\\b',1.5)]],
  ['Exercício Profissional, Perícia e Avaliação',[
    law('12378','5194','9610','6496'),
    nbr('14653','13752','16747','5674','16280','14037'),
    rx('\\bexercicio profissional\\b|\\bcau(?: br| rs| uf)?\\b|\\bconselho de arquitetura e urbanismo\\b|\\bcodigo de etica (?:e disciplina|profissional)\\b|\\betica (?:e disciplina )?profissional\\b|\\brrt\\b|\\bregistro de responsabilidade tecnica\\b|\\bart crea\\b|\\banotacao de responsabilidade tecnica\\b|\\bresponsabilidade (?:tecnica|profissional|civil do arquiteto)\\b|\\batribuic(?:ao|oes) profissionais?\\b|\\bdireito autoral\\b|\\bhonorarios\\b|\\btabela de honorarios\\b|\\bfiscalizacao profissional\\b|\\bresolucao cau\\b',9),
    rx('\\bpericias?\\b|\\bperito\\b|\\bassistente tecnico\\b|\\blaudos? (?:tecnicos?|periciais?|de vistoria)\\b|\\bvistorias?\\b|\\binspecao predial\\b|\\bavaliac(?:ao|oes) de (?:imoveis|bens)\\b|\\bengenharia de avaliacoes\\b|\\bmetodo comparativo\\b|\\bmetodo evolutivo\\b|\\bmetodo involutivo\\b|\\bdepreciacao\\b|\\bvalor de mercado\\b|\\bhomogeneizacao\\b|\\bgrau de fundamentacao\\b|\\bpatologias? (?:e pericias?|construtivas?)\\b|\\bmanutencao predial\\b|\\bmanual de uso operacao e manutencao\\b',9),
    rx('\\betica\\b|\\bprofissional\\b|\\bavaliacao\\b|\\blaudo\\b',1)]]
];
const MAP_CATEGORY_RULES_COMPILED=MAP_CATEGORY_RULES.map(([category,patterns])=>[category,patterns]);

/* Pontua um texto já normalizado. Cada padrão conta no máximo 3 vezes por zona. */
function scoreCategoryText(text,zoneWeight=1,into=Object.create(null)){
  const t=' '+text+' ';if(!text)return into;
  for(const[category,patterns]of MAP_CATEGORY_RULES_COMPILED){
    let s=0;for(const[re,w]of patterns){re.lastIndex=0;let n=0;while(n<3&&re.exec(t))n++;s+=n*w}
    if(s)into[category]=(into[category]||0)+s*zoneWeight}
  return into}
function rankCategoryScores(scores){return Object.entries(scores).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])}

/* Compatibilidade: classifica um texto livre (usado por outros módulos e testes). */
function inferCategoryFromContent(text){const ranked=rankCategoryScores(scoreCategoryText(normalizeCategoryText(text)));return ranked.length?{category:ranked[0][0],score:ranked[0][1]}:{category:'Outros',score:0}}

/* Lê as zonas úteis do HTML do mapa. */
function mapCategoryZones(doc,meta,{title='',shortTitle='',code='',filename=''}={}){
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const uniq=list=>[...new Set(list.map(v=>v.trim()).filter(Boolean))];
  const fileStem=String(filename||'').replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' ').replace(/\bV\d+\b/ig,' ').replace(/\b(?:estudo|mapa|mental)\b/ig,' ');
  const program=['study-partitioning-parent-program','study-partitioning-scope','study-content-calibration','study-subject','study-discipline','study-area','description','keywords'].map(n=>meta(n)).filter(Boolean).join(' · ');
  const ramos=[...doc.querySelectorAll('.ramo')].slice(0,40).map(r=>[text(r.querySelector('.ramo-title,h2')),text(r.querySelector('.ramo-desc'))].filter(Boolean).join(' · ')).filter(Boolean);
  const ramoTitles=ramos.length?ramos:[...doc.querySelectorAll('.ramo-title,main h2')].slice(0,40).map(text).filter(Boolean);
  const topics=uniq([...doc.querySelectorAll('.topic-name,.topic-title')].slice(0,400).map(text));
  const fallbackTopics=topics.length?topics:uniq([...doc.querySelectorAll('h3,.topic-card summary')].slice(0,300).map(text));
  const sources=uniq([...doc.querySelectorAll('.topic-source-local')].slice(0,400).map(el=>text(el).replace(/^fonte\s*[·:]?\s*/i,'')));
  return{title:uniq([title,shortTitle,meta('study-display-title'),meta('study-short-title'),doc.title||'']).join(' · '),file:fileStem,program,ramos:ramoTitles,topics:fallbackTopics,sources,code}}

const MAP_CATEGORY_ZONE_WEIGHTS=Object.freeze({title:5,program:3,file:2,ramo:2,topic:0.6,source:0.6,ramoVote:12,sourceVote:12});

function classifyMapContent(zones){
  const scores=Object.create(null),W=MAP_CATEGORY_ZONE_WEIGHTS,n=normalizeCategoryText;
  scoreCategoryText(n(zones.title),W.title,scores);
  scoreCategoryText(n(zones.program),W.program,scores);
  scoreCategoryText(n(zones.file),W.file,scores);
  const votes=Object.create(null);
  for(const ramo of zones.ramos||[]){const own=rankCategoryScores(scoreCategoryText(n(ramo),1));for(const[c,v]of own)scores[c]=(scores[c]||0)+v*W.ramo;if(own[0]&&own[0][1]>=4)votes[own[0][0]]=(votes[own[0][0]]||0)+1}
  scoreCategoryText(n((zones.topics||[]).join(' · ')),W.topic,scores);
  scoreCategoryText(n((zones.sources||[]).join(' · ')),W.source,scores);
  /* Voto das fontes: cada referência normativa distinta vota na sua categoria (a lei-base do mapa domina). */
  const sourceVotes=Object.create(null);let sourceTotal=0;
  for(const src of zones.sources||[]){const own=rankCategoryScores(scoreCategoryText(n(src),1));if(own[0]&&own[0][1]>=7){sourceVotes[own[0][0]]=(sourceVotes[own[0][0]]||0)+1;sourceTotal++}}
  if(sourceTotal)for(const[c,v]of Object.entries(sourceVotes))scores[c]=(scores[c]||0)+W.sourceVote*(v/sourceTotal)*Math.min(1,sourceTotal/5)*4;
  /* Voto dos ramos: a categoria que vence mais ramos ganha bônus proporcional à fatia de ramos. */
  const totalVotes=Object.values(votes).reduce((a,b)=>a+b,0);
  if(totalVotes)for(const[c,v]of Object.entries(votes))scores[c]=(scores[c]||0)+W.ramoVote*(v/totalVotes)*Math.min(1,totalVotes/3)*4;
  const ranked=rankCategoryScores(scores);
  if(!ranked.length)return{category:'Outros',score:0,margin:0,confidence:'baixa',alternatives:[]};
  const[[top,s1],second]=ranked,s2=second?second[1]:0,margin=s2?s1/s2:Infinity;
  /* Limiares calibrados nos mapas do app (scripts/measure-map-category.mjs). */
  const confidence=s1>=40&&margin>=1.6?'alta':s1>=18&&margin>=1.25?'média':'baixa';
  const alternatives=ranked.slice(1,4).filter(([,v])=>v>=s1*0.35).map(([c])=>c);
  if(s1<6)return{category:'Outros',score:s1,margin,confidence:'baixa',alternatives:[top,...alternatives].slice(0,3)};
  return{category:top,score:Math.round(s1),margin,confidence,alternatives}}

function mapCategoryTitleTokens(v){return new Set(normalizeCategoryText(v).split(' ').filter(w=>w.length>3))}
function mapCategoryTitleSimilar(a,b){const A=mapCategoryTitleTokens(a),B=mapCategoryTitleTokens(b);if(!A.size||!B.size)return false;let hit=0;for(const w of A)if(B.has(w))hit++;return hit/Math.min(A.size,B.size)>=0.5}

function detectMapCategory(doc,meta,info={}){
  const{title='',shortTitle='',code=''}=info;
  const explicit=resolveCategoryName(meta('study-category')||meta('study-map-category')||meta('map-category'));
  if(explicit)return{category:explicit,categorySource:'metadado do HTML',categoryConfidence:'alta',categoryAlternatives:[]};
  const normalizedCode=String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(normalizedCode&&typeof combinedMaps==='function'){
    const own=combinedMaps().filter(m=>String(m.code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'')===normalizedCode&&MAP_CATEGORY_CATALOG.includes(m.category)&&m.category!=='Outros'&&mapCategoryTitleSimilar(m.title||m.shortTitle,title||shortTitle));
    if(own.length)return{category:own[0].category,categorySource:'mesma sigla na sua biblioteca',categoryConfidence:'alta',categoryAlternatives:[]}}
  if(MAP_CATEGORY_CODE_HINTS[normalizedCode])return{category:MAP_CATEGORY_CODE_HINTS[normalizedCode],categorySource:'sigla do mapa',categoryConfidence:'alta',categoryAlternatives:[]};
  const catalogMatch=(state.catalog?.maps||[]).find(m=>String(m.code||'').trim().toUpperCase()===normalizedCode)||null;
  if(catalogMatch?.category&&MAP_CATEGORY_CATALOG.includes(catalogMatch.category))return{category:catalogMatch.category,categorySource:'catálogo do app',categoryConfidence:'alta',categoryAlternatives:[]};
  const result=classifyMapContent(mapCategoryZones(doc,meta,info));
  return{category:result.category,categorySource:result.score<6?'sem sinais suficientes':'conteúdo do HTML',categoryConfidence:result.confidence,categoryAlternatives:result.alternatives,categoryScore:result.score}}

/* ── Prévia de importação: categoria por mapa, com troca manual antes de importar ── */
function importBatchCategoryChoice(){return document.getElementById('importCategory')?.value||'__auto__'}
function importCategoryFor(c,existing){
  if(existing?.category)return existing.category;
  if(c?.categoryOverride)return c.categoryOverride;
  const batch=importBatchCategoryChoice();
  return batch==='__auto__'?(c?.category||'Outros'):batch}
function importCategoryNote(c,existing){
  if(existing)return'categoria atual preservada';
  if(c?.categoryOverride)return'definida por você';
  if(importBatchCategoryChoice()!=='__auto__')return'definida para o lote';
  const conf=c?.categoryConfidence||'baixa';
  return'automática · '+(c?.categorySource||'conteúdo do HTML')+' · confiança '+conf}
function importCategoryNeedsReview(c){return!c?.categoryOverride&&importBatchCategoryChoice()==='__auto__'&&(c?.categoryConfidence||'baixa')==='baixa'}
function importCategoryControl(c,i,existing,category,note,warn,blocked){
  const dot='<i class="category-pigment-dot" style="background:'+ESC(categoryPigment(category))+'" aria-hidden="true"></i>';
  if(existing||blocked)return'<span class="batch-category">'+dot+'<b>'+ESC(category)+'</b><span class="batch-category-note">'+ESC(note)+'</span></span>';
  const alts=(c.categoryAlternatives||[]).filter(a=>a!==category);
  const options=mapCategoryOptions(category).map(cat=>'<option value="'+ESC(cat)+'"'+(cat===category?' selected':'')+'>'+ESC(cat)+'</option>').join('');
  return'<span class="batch-category'+(warn?' needs-review':'')+'" data-import-category-row="'+i+'">'+dot
    +'<select data-import-category="'+i+'" aria-label="Categoria de '+ESC(c.code||'mapa')+'">'+options+'</select>'
    +'<span class="batch-category-note">'+(warn?'<b>Confira</b> · ':'')+ESC(note)+(alts.length?' · também pode ser: '+alts.map(a=>'<button type="button" class="batch-category-alt" data-import-category-pick="'+i+'" data-category="'+ESC(a)+'">'+ESC(a)+'</button>').join(', '):'')+'</span></span>'}
function applyImportCategoryOverride(index,category){
  const c=(typeof importCandidates!=='undefined'?importCandidates:[])[index];if(!c||!MAP_CATEGORY_CATALOG.includes(category))return;
  c.categoryOverride=category===c.category&&importBatchCategoryChoice()==='__auto__'?'':category;
  const row=document.querySelector('[data-import-category-row="'+index+'"]');if(!row)return;
  const courseId=document.getElementById('importCourse')?.value||'';
  const existing=typeof importExisting==='function'?importExisting(c,courseId):null;
  const html=importCategoryControl(c,index,existing,importCategoryFor(c,existing),importCategoryNote(c,existing),!existing&&importCategoryNeedsReview(c),false);
  const tmp=document.createElement('span');tmp.innerHTML=html;row.replaceWith(tmp.firstElementChild);
  document.querySelector('[data-import-category="'+index+'"]')?.focus()}
document.addEventListener('change',e=>{const sel=e.target.closest?.('[data-import-category]');if(sel)applyImportCategoryOverride(Number(sel.dataset.importCategory),sel.value)});
document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-import-category-pick]');if(!btn)return;e.preventDefault();e.stopPropagation();applyImportCategoryOverride(Number(btn.dataset.importCategoryPick),btn.dataset.category)},true);
