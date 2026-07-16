# Decision log & provenance

## Map (the saga, condensed)
Three failed approaches before the current one: hand-drawn stylized SVG (inaccurate + ugly),
AI-generated basemaps (beautiful + geometrically unusable: rubber-sheet calibration showed
3–6.5km anchor errors and internally inconsistent scale — image models paint map-*statistics*,
not geography), and a real-geometry SVG built from Natural Earth roads (accurate, but the user
called the whole stylized direction a mess). Final: Leaflet + CARTO light tiles, official Denver
neighborhood polygons (dissolved to single rings via shapely), road-bounded suburb boxes.
NE data bug worth remembering: ne_10m_roads contained a bogus segment gluing C-470 across Denver.

## Geometry rules
All 40 shapes pass pairwise `shapely` overlap audit (intersection area < 2e-6 deg²) and
representative-point-inside checks. RiNo has no separate polygon because the official Five Points
statistical hood (already used by Curtis Park/Cole) IS RiNo's territory — merged as one entry
rather than inventing a boundary the city doesn't draw.

## Scores
1–10 editorial, rebuilt by hand (not doubled) when migrating from the 1–5 scale.
Proximity re-scored when the anchor changed from "NW Denver" to computed commute anchors.
Hazard grounded in the post-Marshall insurance market (foothills premiums +150–300%,
non-renewals +77% 2018–23; HB25-1182 effective 2026-07-01 gives buyers score disclosure + appeal).
School composite: Niche CO K-12 + US News CO high schools + program-fit judgment; each of the
six type×level views contains ≥15 schools (verified counts: pubE 18, pubM 17, pubH 19,
privE 19, privM 21, privH 15).

## Deployment recommendation
GitHub Pages (root index.html, zero config). Tiles need internet anyway, and Pages turns the
share-hash feature into real shareable URLs — the whole point of v4.1+.
