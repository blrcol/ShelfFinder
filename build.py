#!/usr/bin/env python3
"""Bundle src/ into a single self-contained index.html (works offline, easy to host)."""
import json, pathlib
here = pathlib.Path(__file__).parent
src = here / 'src'
html = (src / 'template.html').read_text()
html = html.replace('/*__DATA__*/', (src / 'library-data.js').read_text())
html = html.replace('/*__CORE__*/', (src / 'core.js').read_text())
html = html.replace('/*__MAPS__*/{}', json.dumps(json.loads((src / 'maps.json').read_text())))
(here / 'index.html').write_text(html)
print('Built index.html', round(len(html) / 1024), 'KB')
