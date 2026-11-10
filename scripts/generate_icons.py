import struct
import zlib
import os
import math

def create_png(width, height, draw_fn, filepath):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type None
        for x in range(width):
            r, g, b, a = draw_fn(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    png += chunk(b'IEND', b'')
    
    with open(filepath, 'wb') as f:
        f.write(png)
    print(f"Generated {filepath} ({width}x{height})")

def icon_drawer(x, y, w, h):
    # Normalized coordinates 0 to 1
    nx = x / float(w)
    ny = y / float(h)
    
    # Rounded rectangle distance check
    radius = 0.22
    dx = max(abs(nx - 0.5) - (0.5 - radius), 0)
    dy = max(abs(ny - 0.5) - (0.5 - radius), 0)
    dist = math.sqrt(dx*dx + dy*dy)
    if dist > radius:
        return (0, 0, 0, 0) # transparent outside
    
    # Background gradient: Slate 900 (#0f172a) to Emerald 700 (#047857)
    t = (nx + ny) / 2.0
    bg_r = int(15 * (1 - t) + 4 * t)
    bg_g = int(23 * (1 - t) + 120 * t)
    bg_b = int(42 * (1 - t) + 87 * t)
    
    # White card in center
    cx1, cx2 = 0.12, 0.88
    cy1, cy2 = 0.12, 0.88
    if cx1 <= nx <= cx2 and cy1 <= ny <= cy2:
        # Title bar in card
        if cy1 <= ny <= 0.26:
            return (30, 41, 59, 255) # Slate 800
        
        # Tile 1: Top Left cyan
        if 0.30 <= ny <= 0.52 and 0.20 <= nx <= 0.48:
            return (2, 132, 199, 255) # Cyan 600
        # Tile 2: Top Right amber
        if 0.30 <= ny <= 0.52 and 0.52 <= nx <= 0.80:
            return (217, 119, 6, 255) # Amber 600
        # Invoice bottom receipt
        if 0.56 <= ny <= 0.82 and 0.20 <= nx <= 0.80:
            # Green badge in right corner of receipt
            if 0.60 <= ny <= 0.78 and 0.60 <= nx <= 0.76:
                return (16, 185, 129, 255) # Emerald 500
            # Receipt lines
            if 0.62 <= ny <= 0.65 and 0.25 <= nx <= 0.55:
                return (15, 23, 42, 255)
            if 0.69 <= ny <= 0.71 and 0.25 <= nx <= 0.50:
                return (100, 116, 139, 255)
            if 0.75 <= ny <= 0.77 and 0.25 <= nx <= 0.45:
                return (148, 163, 184, 255)
            return (248, 250, 252, 255) # Slate 50
        
        return (255, 255, 255, 255)
        
    return (bg_r, bg_g, bg_b, 255)

os.makedirs('public', exist_ok=True)
create_png(192, 192, icon_drawer, 'public/pwa-192x192.png')
create_png(512, 512, icon_drawer, 'public/pwa-512x512.png')
create_png(512, 512, icon_drawer, 'public/pwa-maskable-512x512.png')
create_png(180, 180, icon_drawer, 'public/apple-touch-icon.png')
