from pathlib import Path
import cairosvg
from PIL import Image
from io import BytesIO
root=Path(__file__).resolve().parent.parent
svg=(root/'favicon.svg').read_bytes()
for name,size in [('favicon-32.png',32),('apple-touch-icon.png',180),('icon-192.png',192),('icon-512.png',512)]:
    blob=cairosvg.svg2png(bytestring=svg,output_width=size,output_height=size)
    im=Image.open(BytesIO(blob)).convert('RGBA')
    im.save(root/name,optimize=True)
    print(name,(root/name).stat().st_size,'bytes')
