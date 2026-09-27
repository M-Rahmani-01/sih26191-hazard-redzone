import h3
from shapely.geometry import Polygon


def build_hex_grid(min_lat: float, min_lng: float, max_lat: float, max_lng: float, resolution: int = 8) -> list[dict]:
    """
    Bounding box ko H3 hex cells mein todta hai.
    resolution 8 ~= 0.7 sq km per hex (village-level granularity ke liye theek hai)
    """
    boundary_polygon = [
        [min_lng, min_lat],
        [max_lng, min_lat],
        [max_lng, max_lat],
        [min_lng, max_lat],
        [min_lng, min_lat],
    ]

    hex_ids = h3.polygon_to_cells(h3.LatLngPoly(boundary_polygon), resolution)

    cells = []
    for hex_id in hex_ids:
        boundary = h3.cell_to_boundary(hex_id)
        center_lat, center_lng = h3.cell_to_latlng(hex_id)
        cells.append({
            "hex_id": hex_id,
            "center_lat": center_lat,
            "center_lng": center_lng,
            "polygon": Polygon([(lng, lat) for lat, lng in boundary]),
        })

    return cells


def assign_villages_to_hex(villages_df, resolution: int = 8):
    """
    Har village ko uske containing H3 hex cell mein assign karta hai.
    Ek hi hex cell mein multiple villages ke features average ho jaate hain.
    """
    villages_df = villages_df.copy()
    villages_df["hex_id"] = villages_df.apply(
        lambda row: h3.latlng_to_cell(row["latitude"], row["longitude"], resolution),
        axis=1
    )
    return villages_df