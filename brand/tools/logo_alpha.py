"""Make brand/logo_transparent.png from brand/logo.png: the flat brown background becomes transparent, the white and
orange lettering keeps its colour, with soft (anti-aliased) edges. Cropped to the lettering plus a small margin."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

here = Path(__file__).resolve().parent.parent
im = np.asarray(Image.open(here / "logo.png").convert("RGB")).astype(np.float32)
bg = np.median(im[:40, :40].reshape(-1, 3), axis=0)                 # the background colour (top-left corner)
d = np.sqrt(((im - bg) ** 2).sum(-1))
alpha = np.clip((d - 18) / 60, 0, 1)                                  # soft edge between background and lettering
# un-mix the background from the edge pixels so they do not keep a brown fringe
a = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((im - bg * (1 - a)) / a, 0, 255)
out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
ys, xs = np.where(alpha > 0.05)
m = 24
out = out[max(0, ys.min() - m): ys.max() + m, max(0, xs.min() - m): xs.max() + m]
Image.fromarray(out, "RGBA").save(here / "logo_transparent.png")
print("background", bg.round(), "-> logo_transparent.png", out.shape[1], "x", out.shape[0])
