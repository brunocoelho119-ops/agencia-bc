"""Gera dist/agencia-bc.html: a ferramenta inteira em um único arquivo (CSS e JS embutidos).
Uso: python3 tools/build.py   (rode de dentro da pasta do projeto)"""
import re, pathlib
r = pathlib.Path(__file__).resolve().parent.parent
html = (r / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="css/app.css">', lambda m: '<style>\n' + (r / 'css/app.css').read_text(encoding='utf-8') + '\n</style>', html)
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>\n' + (r / m.group(1)).read_text(encoding='utf-8').replace('</script>', '<\\/script>') + '\n</script>', html)
extra = ('<meta name="theme-color" content="#08090C">\n<meta name="mobile-web-app-capable" content="yes">\n'
         '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Agência BC">\n')
html = html.replace('<title>', extra + '<title>', 1)
html = html.replace('width=device-width, initial-scale=1', 'width=device-width, initial-scale=1, viewport-fit=cover')
(r / 'dist').mkdir(exist_ok=True)
(r / 'dist' / 'agencia-bc.html').write_text(html, encoding='utf-8')
print('ok', len(html) // 1024, 'KB')
