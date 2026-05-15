#!/usr/bin/env python3
"""
remove_center_css.py
--------------------
Запусти из корня репозитория:
    python3 remove_center_css.py

Удаляет блок CENTER_CSS который был внедрён patch_atlas_cart.py
в инлайн-стили каждой atlas-страницы.
Этот блок содержит .container { display: flex } которое ломает model-viewer.
"""

import re, sys, glob
from pathlib import Path

# Точная сигнатура начала блока
START = '/* ── Centering: h1, description, model-viewer ── */'

def remove_center_css(path: Path) -> bool:
    html = path.read_text(encoding='utf-8')
    if START not in html:
        return False

    # Удаляем от START до конца ближайшего </style> (не включая тег)
    new_html = re.sub(
        r'[ \t\r\n]*/\* ── Centering: h1, description, model-viewer ── \*/.*?(?=\s*</style>)',
        '\n    ',
        html,
        flags=re.DOTALL
    )

    if new_html == html:
        return False

    path.write_text(new_html, encoding='utf-8')
    return True


def main():
    root = Path('.')

    # Все index.html внутри папок с atlas- в пути
    files = [
        p for p in root.rglob('index.html')
        if any('atlas-' in part for part in p.parts)
        and '.bak' not in str(p)
        and 'node_modules' not in str(p)
    ]

    if not files:
        print('Файлы не найдены. Запускай из корня репозитория.')
        sys.exit(1)

    cleaned = 0
    for p in sorted(files):
        if remove_center_css(p):
            cleaned += 1
            print(f'  ✅  {p}')

    print(f'\nГотово. Очищено: {cleaned} из {len(files)} файлов.')


if __name__ == '__main__':
    main()