"""Rebuild the bundled Chinese font after copy changes.
Usage: python scripts/subset_font.py path/to/full/NotoSansSC.ttf
Optional dependencies: python -m pip install -r scripts/font-requirements.txt
"""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Full Noto Sans SC source font')
    args = parser.parse_args()
    if not args.source.is_file():
        parser.error(f'Font file does not exist: {args.source}')
    try:
        from fontTools import subset
        import brotli  # Required for WOFF2 output.
    except ImportError:
        parser.exit(1, 'Install dependencies: python -m pip install -r scripts/font-requirements.txt\n')

    sources = [ROOT / 'index.html', *sorted((ROOT / 'js').glob('*.js'))]
    sources.extend(sorted((ROOT / 'locales').glob('*.json')))
    text = ''.join(path.read_text(encoding='utf-8') for path in sources)
    options = subset.Options()
    options.flavor = 'woff2'
    font = subset.load_font(str(args.source), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    destination = ROOT / 'assets/fonts/NotoSansSC.woff2'
    subset.save_font(font, str(destination), options)
    print(f'Wrote {destination.name}: {destination.stat().st_size} bytes')


if __name__ == '__main__':
    main()
