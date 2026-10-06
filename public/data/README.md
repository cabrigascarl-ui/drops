# Samar Island administrative boundaries

Boundaries for Samar Island: Samar Province, Northern Samar, and Eastern Samar. They are built from the PSA/NAMRIA 2023 boundaries by `npm run build:geo` (`scripts/build-samar-geometry.cjs`).

- Provinces: 3 (Samar, Northern Samar, Eastern Samar)
- Cities and municipalities: 73 (3 cities, 70 municipalities; 26 / 24 / 23 per province)
- Barangays: 2,117 (951 Samar, 569 Northern Samar, 597 Eastern Samar)

## Sources

- **Geometry:** the 2023 "hires" barangay boundaries from [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps/tree/master/2023/geojson/municities/hires). They are derived from the PSA PSGC and NAMRIA administrative boundary shapefiles.
- **Names, PSGC codes and land areas:** the [Barangay Boundaries Repository v2026.4.13.0](https://github.com/bendlikeabamboo/barangay-boundaries-repository/releases/tag/v2026.4.13.0), 2023-10-24 PSGC snapshot.

## Processing

1. All barangay polygons are merged. Barangay 1 (Pob.) in Maslog (PSGC 0802614008) has no polygon in the hires set, because its area is folded into Barangay 2 (Pob.). It is carved out of Barangay 2 using its PSA/NAMRIA footprint from the PSGC release. Its outline is therefore approximate.
2. Slivers between neighboring barangays are filled. The shapes are then simplified along shared edges, with a 15 m interval and 5-decimal coordinates.
3. Cities, municipalities and provinces are dissolved from the barangays. As a result, every level shares identical edges, with no gaps or overlaps.
4. Each feature gets a `labelPoint`, the visual center of its main landmass. For a municipality, this is the part that holds most of its barangays. For example, Guiuan is labeled on the mainland, not on Homonhon Island.

## Accuracy

The simplified shapes match the official PSA land areas within 10% for 99.4% of barangays larger than 0.3 km². `areaKm2` holds the official PSGC figure. The shapes are suitable for interactive maps, not for survey-grade decisions. Use official LGU GIS data for those.

To rebuild, place the source files in `.geo-source/` (see the header of the build script), then run `npm run build:geo`.

The map's water coverage colors and percentages are illustrative demo data, not measurements of water service or supply.

Attribution: PSGC data © Philippine Statistics Authority; boundaries © NAMRIA. Map tiles © OpenStreetMap contributors.
