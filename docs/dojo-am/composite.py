"""Monta tótems (PNG) sobre una foto con perspectiva.
Uso: python3 composite.py foto.jpg salida.jpg placements.json
placements.json: [{"png":"totems/t1_am.png","quad":[[x1,y1],[x2,y2],[x3,y3],[x4,y4]]}, ...]
quad = esquinas del PANEL en la foto: sup-izq, sup-der, inf-der, inf-izq (en píxeles de la foto).
Debajo del panel se dibujan dos patas y una base, y una sombra suave sobre el piso.
"""
import sys, json, cv2, numpy as np

def warp_layer(src_rgba, quad, out_shape):
    h, w = src_rgba.shape[:2]
    src = np.float32([[0,0],[w,0],[w,h],[0,h]])
    M = cv2.getPerspectiveTransform(src, np.float32(quad))
    return cv2.warpPerspective(src_rgba, M, (out_shape[1], out_shape[0]), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))

def over(base, layer):
    a = layer[:,:,3:4].astype(np.float32)/255.0
    base[:] = (layer[:,:,:3].astype(np.float32)*a + base.astype(np.float32)*(1-a)).astype(np.uint8)

def framed(png_path, border=18, leg_ratio=0.22):
    """Panel con marco oscuro + patas + base, en un lienzo RGBA (el alto incluye las patas)."""
    p = cv2.imread(png_path, cv2.IMREAD_UNCHANGED)
    if p.shape[2] == 3: p = cv2.cvtColor(p, cv2.COLOR_BGR2BGRA)
    h, w = p.shape[:2]
    legs = int(h*leg_ratio)
    canvas = np.zeros((h+2*border+legs, w+2*border, 4), np.uint8)
    cv2.rectangle(canvas, (0,0), (w+2*border-1, h+2*border-1), (30,32,38,255), -1)
    canvas[border:border+h, border:border+w] = p
    lw = max(6, w//40)
    for x in (w//6, w - w//6):
        cv2.rectangle(canvas, (border+x-lw//2, h+2*border), (border+x+lw//2, h+2*border+legs-lw), (150,155,165,255), -1)
    cv2.rectangle(canvas, (border, h+2*border+legs-lw), (w+border, h+2*border+legs), (30,32,38,255), -1)
    return canvas

def main(photo, out, placements):
    base = cv2.imread(photo)
    H, W = base.shape[:2]
    for pl in placements:
        layer = framed(pl["png"])
        q = np.float32(pl["quad"])  # panel corners in photo
        # extend quad downward for the legs (proportional to the panel's vertical edges)
        lh, lw = layer.shape[:2]
        panel_h = lh - int(lh*0)  # full layer maps to quad extended by legs
        ratio = lh / (lh - int((lh - 36) * 0))  # placeholder
        # compute extended bottom corners: move along the vertical edge direction by legs fraction
        frac = (lh / (lh - (lh - 2*18) * 0.22 / (1 + 0.22)))  # fallback if not used
        top_l, top_r, bot_r, bot_l = q
        panel_frac = (lh - int((lh-36)/(1.22))*0.22) / lh
        ext = pl.get("leg_extend", 0.22)
        bot_l2 = bot_l + (bot_l - top_l) * ext
        bot_r2 = bot_r + (bot_r - top_r) * ext
        quad_full = [top_l, top_r, bot_r2, bot_l2]
        # soft shadow on the floor
        sh = np.zeros((H, W), np.float32)
        poly = np.int32([bot_l2 + (bot_l2-top_l)*0.02, bot_r2 + (bot_r2-top_r)*0.02, bot_r2 + np.float32([ (bot_r2[0]-bot_l2[0])*0.35, 0]) + (bot_r2-top_r)*0.10, bot_l2 + np.float32([ (bot_r2[0]-bot_l2[0])*0.35, 0]) + (bot_l2-top_l)*0.10])
        cv2.fillPoly(sh, [poly], 1.0)
        sh = cv2.GaussianBlur(sh, (0,0), max(8, W//150))
        base[:] = (base.astype(np.float32) * (1 - 0.45*sh[:,:,None])).astype(np.uint8)
        warped = warp_layer(layer, quad_full, base.shape)
        over(base, warped)
    cv2.imwrite(out, base, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print("wrote", out)

if __name__ == "__main__":
    photo, out, pj = sys.argv[1:4]
    main(photo, out, json.load(open(pj)))
