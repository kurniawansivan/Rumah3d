from generation_engine.domain.enums import RoomType
from generation_engine.templates_library.loader import load_template_files


def test_at_least_one_template_loads() -> None:
    templates = load_template_files()
    assert len(templates) > 0


def test_every_template_has_required_fields() -> None:
    required = {
        "code",
        "name",
        "floors_min",
        "floors_max",
        "min_lot_length_m",
        "min_lot_width_m",
        "style_tags",
        "room_program_fit",
        "zoning_graph",
    }
    for template in load_template_files():
        missing = required - template.keys()
        assert not missing, f"{template.get('code')} missing fields: {missing}"


def test_room_program_fit_keys_are_valid_room_types() -> None:
    valid_room_types = {room_type.value for room_type in RoomType}
    for template in load_template_files():
        invalid = set(template["room_program_fit"]) - valid_room_types
        assert not invalid, f"{template['code']} has unknown room types: {invalid}"


def test_zoning_graph_nodes_and_edges_match_room_program_fit() -> None:
    for template in load_template_files():
        fit_keys = set(template["room_program_fit"])
        nodes = set(template["zoning_graph"]["nodes"])
        assert nodes.issubset(fit_keys), (
            f"{template['code']}: zoning_graph nodes not declared in "
            f"room_program_fit: {nodes - fit_keys}"
        )
        for edge in template["zoning_graph"]["edges"]:
            for node in edge:
                assert node in nodes, (
                    f"{template['code']}: edge references undeclared node '{node}'"
                )


def test_template_codes_are_unique() -> None:
    codes = [template["code"] for template in load_template_files()]
    assert len(codes) == len(set(codes))
