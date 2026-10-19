"""Rebuild the local Noto Sans SC subset after copy changes.
python scripts/subset_font.py path/to/full/NotoSansSC.ttf
Requires fonttools and brotli. The full source font is not a runtime dependency.
"""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
cached_tools=ROOT/'work/font-subset-tools'
if cached_tools.exists(): sys.path.insert(0,str(cached_tools))
from fontTools import subset

source=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'work/NotoSansSC.ttf'
if not source.is_file(): raise SystemExit('Provide the full Noto Sans SC source font as the first argument.')
paths=[ROOT/p for p in ['index.html','game-rules.js','localization-ui.js','i18n.js']]
paths.extend((ROOT/'locales').glob('*.json'))
text=''.join(p.read_text(encoding='utf-8') for p in paths)
options=subset.Options();options.flavor='woff2'
font=subset.load_font(str(source),options)
subsetter=subset.Subsetter(options=options);subsetter.populate(text=text);subsetter.subset(font)
destination=ROOT/'assets/fonts/NotoSansSC.woff2'
subset.save_font(font,str(destination),options)
print(f'Wrote {destination.name}: {destination.stat().st_size} bytes')
