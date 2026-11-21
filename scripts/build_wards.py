"""Simplify the real BMC ward boundaries (datameet Municipal_Spatial_Data, Mumbai/BMC_Wards.geojson) into data/wards.geojson.

  python scripts/build_wards.py path/to/BMC_Wards.geojson
"""
import json, math, sys
from pathlib import Path

sys.setrecursionlimit(10000)
HERE = Path(__file__).resolve().parent.parent
names = {w["ward_code"]: w["ward_name"] for w in json.load(open(HERE / "data" / "wards.json"))}


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy)
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / n if n else math.hypot(pts[i][0] - a[0], pts[i][1] - a[1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [a, b]


g = json.load(open(sys.argv[1]))
feats = []
for f in g["features"]:
    code = f["properties"]["name"]
    polys = []
    for poly in f["geometry"]["coordinates"]:
        ring = [[round(p[0], 5), round(p[1], 5)] for p in poly[0]]
        h = len(ring) // 2
        s = rdp(ring[: h + 1], 0.0001)[:-1] + rdp(ring[h:], 0.0001)
        if len(s) >= 4:
            polys.append([s])
    feats.append({"type": "Feature", "properties": {"ward_code": code, "ward_name": names.get(code, code)},
                  "geometry": {"type": "MultiPolygon", "coordinates": polys}})
json.dump({"type": "FeatureCollection", "features": feats}, open(HERE / "data" / "wards.geojson", "w"), separators=(",", ":"))
print("wrote data/wards.geojson")
