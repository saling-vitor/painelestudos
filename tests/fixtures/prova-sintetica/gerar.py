"""Gera um caderno de prova e um gabarito sintéticos (conteúdo inventado) para os testes do leitor de provas.
   Layout de duas colunas como os cadernos do Instituto AOCP: cabeçalho, disciplinas, texto de apoio, figura."""
import os, textwrap
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
D = os.path.dirname(os.path.abspath(__file__))
W, H = A4
COLS = [(42, 283), (311, 552)]
def cabec(c, n):
    c.setFont('Helvetica', 8); c.drawString(42, 800, 'PREFEITURA MUNICIPAL DE VILA SERENA'); c.drawRightString(553, 800, 'INSTITUTO AOCP')
    c.drawString(48, 38, 'ARQUITETO'); c.drawRightString(547, 38, 'Tipo 01 – Página %d' % n)
class Col:
    def __init__(s, c, page): s.c, s.i, s.y, s.page = c, 0, 776, page
    def nl(s, dy=12.5):
        s.y -= dy
        if s.y < 60:
            s.i += 1; s.y = 776
            if s.i > 1: s.c.showPage(); s.page += 1; cabec(s.c, s.page); s.i = 0
    def text(s, t, size=10, indent=0, font='Helvetica'):
        x0, x1 = COLS[s.i]; width = int((x1 - x0 - indent) / (size * 0.5))
        for ln in textwrap.wrap(t, width):
            s.c.setFont(font, size); s.c.drawString(x0 + indent, s.y, ln); s.nl(size + 2.5)
    def header(s, t): s.nl(4); s.text(t, 14, 0, 'Helvetica-Bold'); s.nl(6)
    def q(s, n, stem, alts, fig=False):
        s.c.setFont('Helvetica-Bold', 11); s.c.drawString(COLS[s.i][0], s.y, str(n)); s.nl(16)
        s.text(stem)
        if fig:
            x0, x1 = COLS[s.i]; s.nl(4)
            s.c.rect(x0 + 20, s.y - 70, 160, 70); s.c.line(x0 + 20, s.y - 70, x0 + 180, s.y); s.c.circle(x0 + 100, s.y - 35, 18)
            s.y -= 82; s.c.setFont('Helvetica', 8); s.c.drawString(x0 + 20, s.y, 'Figura 1 – planta esquemática'); s.nl(14)
        for i, a in enumerate(alts):
            x0, _ = COLS[s.i]; lines = textwrap.wrap(a, 40)
            s.c.setFont('Helvetica', 10); s.c.drawString(x0, s.y, '(%s) %s' % ('ABCDE'[i], lines[0])); s.nl()
            for ln in lines[1:]: s.c.drawString(x0 + 20, s.y, ln); s.nl()
        s.nl(10)
c = canvas.Canvas(os.path.join(D, 'prova-sintetica.pdf'), pagesize=A4)
c.setFont('Helvetica-Bold', 16); c.drawString(60, 760, 'PREFEITURA MUNICIPAL DE VILA SERENA')
c.setFont('Helvetica', 11); c.drawString(60, 735, 'EDITAL DE CONCURSO PÚBLICO Nº 007/2026'); c.drawString(60, 715, 'ARQUITETO'); c.drawString(60, 695, 'Nível SUPERIOR   Turno TARDE')
c.drawString(60, 660, 'Sobre o material recebido pelo candidato: confira o caderno e a inscrição. Instruções gerais.')
c.showPage(); cabec(c, 2)
col = Col(c, 2)
col.header('Língua Portuguesa')
col.text('A cidade inventada', 12, 0, 'Helvetica-Bold'); col.nl(4)
for p in ['Ruas estreitas desenham caminhos que ninguém planejou, e as praças surgem onde as pessoas resolveram parar. A vida urbana nasce do encontro e do uso cotidiano.', 'Quando o planejamento ignora esse uso, o espaço fica vazio. Quando o acolhe, a cidade se torna um lugar de pertencimento e de memória coletiva.']:
    col.text(p); col.nl(4)
Q = [
 ('De acordo com o texto, as praças surgem', ['por decisão exclusiva do poder público.', 'onde as pessoas resolveram parar.', 'apenas em bairros planejados.', 'sem relação com o uso cotidiano.', 'como resultado de leis municipais.']),
 ('No trecho “a cidade se torna um lugar de pertencimento”, a palavra “pertencimento” é', ['verbo.', 'adjetivo.', 'substantivo.', 'advérbio.', 'preposição.']),
 ('Assinale a alternativa em que a concordância está correta.', ['Fazem dois anos que a praça abriu.', 'Houveram muitas reuniões.', 'Existe vários projetos.', 'Faz dois anos que a praça abriu.', 'Sobrou poucas vagas.']),
]
for i, (s, a) in enumerate(Q, 1): col.q(i, s, a)
col.header('Conhecimentos Específicos')
E = [
 ('Observe a figura a seguir, que representa um lote de esquina. A área destacada corresponde ao', ['recuo frontal.', 'afastamento lateral.', 'círculo de manobra.', 'pátio interno.', 'jardim de chuva.'], True),
 ('Segundo a NBR 9050, a largura mínima livre de uma porta acessível é de', ['60 cm.', '70 cm.', '80 cm.', '90 cm.', '100 cm.'], False),
 ('O Estatuto da Cidade é a Lei nº', ['8.666/1993.', '10.257/2001.', '6.766/1979.', '12.587/2012.', '14.133/2021.'], False),
 ('Em conforto térmico, a inércia térmica elevada é recomendada para', ['climas com grande amplitude térmica diária.', 'ambientes sem ocupação.', 'coberturas metálicas leves.', 'climas sempre úmidos e quentes.', 'fachadas envidraçadas.'], False),
 ('A escala 1:50 em uma planta significa que 1 cm no desenho equivale a', ['5 cm.', '50 cm.', '5 m.', '50 m.', '0,5 cm.'], False),
]
for i, (s, a, f) in enumerate(E, 4): col.q(i, s, a, f)
c.showPage(); c.save()
g = canvas.Canvas(os.path.join(D, 'gabarito-sintetico.pdf'), pagesize=A4)
g.setFont('Helvetica-Bold', 12); g.drawCentredString(W / 2, 790, 'PREFEITURA MUNICIPAL DE VILA SERENA'); g.drawCentredString(W / 2, 770, 'GABARITO PRELIMINAR')
for k, (tit, ans) in enumerate([('TÉCNICO EM EDIFICAÇÕES - PROVA 1', 'ABCDEABC'), ('ARQUITETO - PROVA 1', 'BCDCCBAB')]):
    y = 730 - k * 90; g.setFont('Helvetica-Bold', 10); g.drawString(60, y, tit); g.setFont('Helvetica', 10)
    for i, a in enumerate(ans): g.drawString(60 + i * 40, y - 18, str(i + 1)); g.drawString(60 + i * 40, y - 32, a)
g.save()
