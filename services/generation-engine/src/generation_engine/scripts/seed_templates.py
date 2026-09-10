import asyncio

from generation_engine.persistence.database import get_session_factory
from generation_engine.persistence.models import RoomTypeNorm, Template
from generation_engine.templates_library.loader import load_template_files

ROOM_TYPE_NORMS = [
    ("kamar_tidur_utama", 12.0, None, 3.0),
    ("kamar_tidur", 9.0, None, 2.7),
    ("kamar_mandi", 3.0, None, 1.5),
    ("dapur", 6.0, None, 2.0),
    ("ruang_tamu", 12.0, None, 3.0),
    ("ruang_makan", 9.0, None, 2.5),
    ("carport", 12.0, None, 2.5),
]


async def seed() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        for data in load_template_files():
            session.add(
                Template(
                    code=data["code"],
                    name=data["name"],
                    floors_min=data["floors_min"],
                    floors_max=data["floors_max"],
                    room_program_fit=data["room_program_fit"],
                    zoning_graph=data["zoning_graph"],
                    style_tags=data["style_tags"],
                    min_lot_length_m=data["min_lot_length_m"],
                    min_lot_width_m=data["min_lot_width_m"],
                )
            )
        for room_type, min_area, max_area, min_width in ROOM_TYPE_NORMS:
            session.add(
                RoomTypeNorm(
                    room_type=room_type,
                    min_area_m2=min_area,
                    max_area_m2=max_area,
                    min_width_m=min_width,
                )
            )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
