"""
Pure decision-logic: kisi safe site ki relocation capacity nikalna.
"""


def compute_carrying_capacity(usable_area_sqkm: float, safety_buffer_pct: float,
                                existing_occupancy: int, density_per_sqkm: int = 400) -> int:
    """
    usable_area_sqkm: site ka total usable (buildable) area
    safety_buffer_pct: 0-1 ke beech, kitna area reserve rakhna hai (roads, infra, disaster margin)
    existing_occupancy: site pe already kitne log reh rahe hain
    density_per_sqkm: safe planned density (log per sq km)

    Returns: kitne aur log yahan safely accommodate ho sakte hain
    """
    effective_area = usable_area_sqkm * (1 - safety_buffer_pct)
    max_capacity = int(effective_area * density_per_sqkm)
    remaining_capacity = max(0, max_capacity - existing_occupancy)
    return remaining_capacity