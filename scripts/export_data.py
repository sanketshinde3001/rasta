"""Export the dataset + audit/planner outputs (from ../rupee-trail) into compact JSON for the Next.js app.

  ../rupee-trail/.venv/bin/python scripts/export_data.py
"""
import json, shutil
from pathlib import Path
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent.parent
SRC = HERE.parent / "rupee-trail"
D, O, OUT = SRC / "data", SRC / "out", HERE / "data"
OUT.mkdir(exist_ok=True)


def rec(df):
    return json.loads(df.replace({np.nan: None}).to_json(orient="records"))


def dump(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    print(f"{name}: {(OUT / name).stat().st_size // 1024} KB")


wards = pd.read_csv(D / "wards.csv")
ws = pd.read_csv(O / "ward_summary.csv")
wp = pd.read_csv(O / "next_rupee_wards.csv")
w = wards.merge(ws.drop(columns=["ward_name", "low_lying_index", "monsoon_repair_budget_inr_2025"]), on="ward_code", how="left")
w = w.merge(wp[["ward_code"] + [c for c in wp.columns if c not in w.columns]], on="ward_code", how="left")
dump("wards.json", rec(w))
# ward boundaries: real BMC wards, built by scripts/build_wards.py

roads = pd.read_csv(D / "roads.csv")
roads["lat"] = ((roads.start_lat + roads.end_lat) / 2).round(6)
roads["lon"] = ((roads.start_lon + roads.end_lon) / 2).round(6)
rr = pd.read_csv(O / "road_risk.csv").drop(columns=["road_name", "ward_code"])
roads = roads.merge(rr, on="road_id", how="left")
acc = pd.read_csv(D / "accidents.csv").groupby("road_id").size().rename("accidents")
roads = roads.merge(acc, on="road_id", how="left").fillna({"accidents": 0})
dump("roads.json", rec(roads))

wo = pd.read_csv(O / "work_orders_audited.csv")
wo["flags"] = wo["flags"].fillna("")
dump("work_orders.json", rec(wo[["work_order_id", "ward_code", "road_id", "road_name", "contractor_id", "contractor_name",
                                 "work_type", "repair_method", "linked_complaint_ids", "assigned_at", "completed_at",
                                 "area_sqm", "cost_inr", "expected_inr", "rate_ratio", "under_dlp", "sla_hours", "sla_met",
                                 "reopened_within_30d", "rain_7d_after_mm", "flags", "engineer_remark"]]))

# complaints: give every complaint a point on the map
c = pd.read_csv(D / "complaints.csv")
loc = pd.read_csv(O / "open_complaints_located.csv")[["complaint_id", "ward_code", "road_id"]].rename(
    columns={"ward_code": "w2", "road_id": "road_id"})
c = c.merge(loc, on="complaint_id", how="left")
link = {}
for _, r in wo.dropna(subset=["linked_complaint_ids"]).iterrows():
    for cid in r.linked_complaint_ids.split("|"):
        link[cid] = (r.work_order_id, r.road_id, r.ward_code)
c["work_order_id"] = c.complaint_id.map(lambda i: link.get(i, (None,))[0])
c["road_id"] = c.road_id.fillna(c.complaint_id.map(lambda i: link.get(i, (None, None))[1]))
c["ward_code"] = c.ward_code.fillna(c.w2).fillna(c.complaint_id.map(lambda i: link.get(i, (None, None, None))[2]))
rmid = roads.set_index("road_id")[["lat", "lon", "road_name", "ward_code"]]
locs = pd.read_csv(D / "localities.csv").drop_duplicates("locality").set_index("locality")
rng = np.random.default_rng(7)
lat, lon, road_name = [], [], []
for _, r in c.iterrows():
    la, lo, rn = r.lat, r.lon, None
    if isinstance(r.road_id, str) and r.road_id in rmid.index:
        rn = rmid.at[r.road_id, "road_name"]
        if pd.isna(la):
            la, lo = rmid.at[r.road_id, "lat"] + rng.normal(0, 4e-4), rmid.at[r.road_id, "lon"] + rng.normal(0, 4e-4)
    if pd.isna(la) and isinstance(r.locality_text, str) and r.locality_text in locs.index:
        la, lo = locs.at[r.locality_text, "lat"] + rng.normal(0, 1.5e-3), locs.at[r.locality_text, "lon"] + rng.normal(0, 1.5e-3)
    lat.append(round(float(la), 6) if not pd.isna(la) else None)
    lon.append(round(float(lo), 6) if not pd.isna(lo) else None)
    road_name.append(rn)
c["lat"], c["lon"], c["road_name"] = lat, lon, road_name
if "ward_code" not in c or c.ward_code.isna().any():
    c["ward_code"] = c.ward_code.fillna(c.locality_text.map(locs["ward_code"]))
c = c.drop(columns=["w2", "photo_url", "gps_accuracy_m"])
dump("complaints.json", rec(c))

sc = pd.read_csv(O / "contractor_scorecard.csv")
cl = {}
for name in ["scorecards", "court"]:
    p = O / "claude" / f"{name}.json"
    cl[name] = json.loads(p.read_text()) if p.exists() else {}
cons = pd.read_csv(D / "contractors.csv")[["contractor_id", "empanelled_since", "active_wards"]]
sc = sc.merge(cons, on="contractor_id", how="left")
rows = rec(sc)
for r in rows:
    r["ai_scorecard"] = cl["scorecards"].get(r["contractor_id"])
    r["ai_court"] = cl["court"].get(r["contractor_id"])
dump("contractors.json", rows)

plan = pd.read_csv(O / "next_rupee_plan.csv")
dump("plan.json", rec(plan))

briefs = O / "claude" / "briefs.json"
dump("briefs.json", json.loads(briefs.read_text()) if briefs.exists() else {})

dump("context.json", {
    "facilities": rec(pd.read_csv(D / "facilities.csv")[["facility_id", "type", "name", "ward_code", "lat", "lon", "emergency_services", "ambulance_entry_road"]]),
    "hotspots": rec(pd.read_csv(D / "flood_hotspots.csv")),
    "localities": rec(pd.read_csv(D / "localities.csv")),
    "rate_card": rec(pd.read_csv(D / "rate_card.csv")),
    "contractors_list": rec(pd.read_csv(D / "contractors.csv")),
})
dump("summary.json", {**json.loads((O / "summary.json").read_text()),
                      "plan": json.loads((O / "next_rupee_summary.json").read_text())})

# demo citizen: the complainant with the most complaints that have a work order
top = c.dropna(subset=["complainant_id"]).groupby("complainant_id").agg(n=("complaint_id", "size"),
        wo=("work_order_id", "count")).sort_values(["wo", "n"], ascending=False)
print("top citizens:\n", top.head(5))

# ---- extra signals: social media chatter and rainfall ----
import re
posts = pd.read_csv(D / "social_posts.csv")
locs_all = pd.read_csv(D / "localities.csv")
road_names = sorted(roads.road_name.unique(), key=len, reverse=True)
by_road, by_loc = {}, {}
for _, p in posts.iterrows():
    t = str(p.text).lower()
    for rn in road_names:
        if rn.lower() in t:
            by_road.setdefault(rn, []).append(p.post_id)
            break
    for _, l in locs_all.iterrows():
        names = [l.locality] + ([a.strip() for a in str(l.aliases).split(";")] if isinstance(l.aliases, str) else [])
        if any(n and n.lower() in t for n in names):
            by_loc.setdefault(l.locality, []).append(p.post_id)
            break
rain = pd.read_csv(D / "rainfall_daily.csv")
rain_sum = rain.groupby("station").agg(total_mm=("rainfall_mm", "sum"), heavy_days=("rainfall_mm", lambda s: int((s >= 64.5).sum())),
                                       red_days=("imd_alert", lambda s: int((s == "Red").sum()))).reset_index()
tides = pd.read_csv(D / "tides.csv")
dump("signals.json", {
    "social_by_road": {k: len(v) for k, v in by_road.items()},
    "social_by_locality": {k: len(v) for k, v in by_loc.items()},
    "social_posts": rec(posts[["post_id", "posted_at", "source", "text", "likes_or_forwards"]]),
    "rain": rec(rain_sum),
    "big_tide_days": int((tides.big_tide_flag == "Y").sum()),
    "rain_daily": {st: [[d, float(m)] for d, m in zip(g.date, g.rainfall_mm)] for st, g in rain.groupby("station")},
    "tides": [[d, float(h), f] for d, h, f in zip(tides.date, tides.height_m, tides.big_tide_flag)],
    "accidents": rec(pd.read_csv(D / "accidents.csv")[["accident_id", "occurred_at", "ward_code", "road_id", "vehicle_type", "severity", "probable_cause"]]),
    "max_tide_m": float(tides.height_m.max()),
})
