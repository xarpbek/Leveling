#!/usr/bin/env python3
"""Dependency-free PNG icon generator for LEVELING.

Draws a neon lightning bolt with a soft glow on a deep dark gradient.
Uses only the Python standard library (zlib + struct) so it runs anywhere.
"""
import os
import zlib
import struct
import math

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

# Lightning bolt polygon in normalized 0..1 coordinates.
BOLT = [
    (0.585, 0.05),
    (0.305, 0.545),
    (0.475, 0.545),
    (0.405, 0.95),
    (0.745, 0.40),
    (0.560, 0.40),
    (0.700, 0.05),
]


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return (
        int(round(lerp(c1[0], c2[0], t))),
        int(round(lerp(c1[1], c2[1], t))),
        int(round(lerp(c1[2], c2[2], t))),
    )


def write_png(path, width, height, rgb_bytes):
    """rgb_bytes: bytearray of length width*height*3 (RGB)."""
    def chunk(typ, data):
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)  # filter type 0
        raw.extend(rgb_bytes[y * stride:(y + 1) * stride])
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    comp = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", comp))
        f.write(chunk(b"IEND", b""))


def fill_polygon(mask, W, H, pts):
    """Scanline fill -> mask coverage 255 inside polygon."""
    ys = [p[1] for p in pts]
    ymin = max(0, int(math.floor(min(ys))))
    ymax = min(H - 1, int(math.ceil(max(ys))))
    n = len(pts)
    for y in range(ymin, ymax + 1):
        yc = y + 0.5
        xs = []
        for i in range(n):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % n]
            if (y1 <= yc < y2) or (y2 <= yc < y1):
                t = (yc - y1) / (y2 - y1)
                xs.append(x1 + t * (x2 - x1))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            xa = int(math.ceil(xs[i] - 0.5))
            xb = int(math.floor(xs[i + 1] - 0.5))
            for x in range(max(0, xa), min(W - 1, xb) + 1):
                mask[y * W + x] = 255


def box_blur(src, W, H, radius, passes=2):
    buf = list(src)
    for _ in range(passes):
        # horizontal
        tmp = [0.0] * (W * H)
        for y in range(H):
            base = y * W
            acc = 0.0
            for x in range(-radius, W):
                add = x + radius
                if add < W:
                    acc += buf[base + add]
                rem = x - radius - 1
                if rem >= 0:
                    acc -= buf[base + rem]
                if x >= 0:
                    tmp[base + x] = acc / (2 * radius + 1)
        # vertical
        for x in range(W):
            acc = 0.0
            for y in range(-radius, H):
                add = y + radius
                if add < H:
                    acc += tmp[add * W + x]
                rem = y - radius - 1
                if rem >= 0:
                    acc -= tmp[rem * W + x]
                if y >= 0:
                    buf[y * W + x] = acc / (2 * radius + 1)
    return buf


def make_icon(size, path, scale=0.62, cy_shift=0.0):
    ss = 3
    W = H = size * ss
    # Geometry: scale + center the bolt (safe zone for maskable).
    pts = []
    for x, y in BOLT:
        nx = (x - 0.5) * scale + 0.5
        ny = (y - 0.5) * scale + 0.5 + cy_shift
        pts.append((nx * W, ny * H))

    mask = bytearray(W * H)
    fill_polygon(mask, W, H, pts)
    glow = box_blur(mask, W, H, max(2, W // 28), passes=3)
    gmax = max(glow) or 1.0

    # Colors
    bg_top = (0x12, 0x14, 0x22)
    bg_bot = (0x06, 0x07, 0x0e)
    glow_col = (0x8b, 0x5c, 0xf6)   # violet
    bolt_top = (0xa7, 0x8b, 0xfa)   # light violet
    bolt_bot = (0x3b, 0x82, 0xf6)   # electric blue
    core = (0xea, 0xf2, 0xff)       # near-white core

    out = bytearray(W * H * 3)
    cx = W / 2.0
    cy = H / 2.0
    maxd = math.hypot(cx, cy)
    for y in range(H):
        ty = y / (H - 1)
        for x in range(W):
            i = y * W + x
            # background gradient + subtle center vignette glow
            r, g, b = mix(bg_top, bg_bot, ty)
            d = math.hypot(x - cx, y - cy) / maxd
            halo = max(0.0, 1.0 - d * 1.4) * 0.18
            r = min(255, r + glow_col[0] * halo)
            g = min(255, g + glow_col[1] * halo)
            b = min(255, b + glow_col[2] * halo)
            # bolt glow
            gv = max(0.0, glow[i] / gmax) ** 0.8
            if gv > 0.01:
                r = min(255, r + glow_col[0] * gv * 0.9)
                g = min(255, g + glow_col[1] * gv * 0.9)
                b = min(255, b + glow_col[2] * gv * 0.9)
            # bolt body
            m = mask[i] / 255.0
            if m > 0:
                br, bg_, bb = mix(bolt_top, bolt_bot, ty)
                # bright core toward the center line of the bolt
                br = lerp(br, core[0], 0.35)
                bg_ = lerp(bg_, core[1], 0.35)
                bb = lerp(bb, core[2], 0.35)
                r = lerp(r, br, m)
                g = lerp(g, bg_, m)
                b = lerp(b, bb, m)
            j = i * 3
            out[j] = int(max(0, min(255, r)))
            out[j + 1] = int(max(0, min(255, g)))
            out[j + 2] = int(max(0, min(255, b)))

    # Downsample ss x ss (box average)
    final = bytearray(size * size * 3)
    for y in range(size):
        for x in range(size):
            ar = ag = ab = 0
            for dy in range(ss):
                row = (y * ss + dy) * W
                for dx in range(ss):
                    p = (row + x * ss + dx) * 3
                    ar += out[p]
                    ag += out[p + 1]
                    ab += out[p + 2]
            n = ss * ss
            k = (y * size + x) * 3
            final[k] = ar // n
            final[k + 1] = ag // n
            final[k + 2] = ab // n
    write_png(path, size, size, final)
    print("wrote", path)


if __name__ == "__main__":
    make_icon(512, os.path.join(OUT, "icon-512.png"), scale=0.66)
    make_icon(192, os.path.join(OUT, "icon-192.png"), scale=0.66)
    make_icon(180, os.path.join(OUT, "apple-touch-icon.png"), scale=0.66)
    # Maskable: smaller bolt inside the safe zone
    make_icon(512, os.path.join(OUT, "icon-maskable-512.png"), scale=0.5)
    print("done")
