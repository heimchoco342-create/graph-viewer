"""Tests for workspace template Pydantic schema validation."""
import json
import pytest
from pathlib import Path

from app.schemas.template import TemplateCreate, TemplateUpdate, LevelDefinition, EdgeRule


DOMAINS_DIR = Path(__file__).resolve().parent.parent / "domains"


class TestTemplateLevelValidation:
    """Test level structure validation."""

    def _make_levels(self, overrides=None):
        """Build valid levels list with optional overrides."""
        levels = [
            LevelDefinition(level=0, node_type="user", label="사용자", color="#6366f1", badge_color="#818cf8", fixed=True),
            LevelDefinition(level=1, node_type="group", label="그룹", color="#3b82f6", badge_color="#60a5fa", fixed=True),
            LevelDefinition(level=2, node_type="task", label="태스크", color="#10b981", badge_color="#34d399", fixed=False),
        ]
        if overrides:
            for i, override in overrides.items():
                levels[i] = LevelDefinition(**{**levels[i].model_dump(), **override})
        return levels

    def test_valid_template(self):
        t = TemplateCreate(name="test", levels=self._make_levels())
        assert t.name == "test"
        assert len(t.levels) == 3
        assert t.levels[0].node_type == "user"

    def test_level_0_must_be_user(self):
        with pytest.raises(ValueError, match="Level 0 must be node_type='user'"):
            TemplateCreate(
                name="bad",
                levels=[
                    LevelDefinition(level=0, node_type="admin", label="A", color="#000000", badge_color="#111111", fixed=True),
                    LevelDefinition(level=1, node_type="group", label="G", color="#000000", badge_color="#111111", fixed=True),
                ],
            )

    def test_level_0_must_be_fixed(self):
        with pytest.raises(ValueError, match="Level 0.*must be fixed"):
            TemplateCreate(
                name="bad",
                levels=[
                    LevelDefinition(level=0, node_type="user", label="U", color="#000000", badge_color="#111111", fixed=False),
                    LevelDefinition(level=1, node_type="group", label="G", color="#000000", badge_color="#111111", fixed=True),
                ],
            )

    def test_level_1_must_be_group(self):
        with pytest.raises(ValueError, match="Level 1 must be node_type='group'"):
            TemplateCreate(
                name="bad",
                levels=[
                    LevelDefinition(level=0, node_type="user", label="U", color="#000000", badge_color="#111111", fixed=True),
                    LevelDefinition(level=1, node_type="team", label="T", color="#000000", badge_color="#111111", fixed=True),
                ],
            )

    def test_level_numbers_must_be_consecutive(self):
        with pytest.raises(ValueError, match="consecutive"):
            TemplateCreate(
                name="bad",
                levels=[
                    LevelDefinition(level=0, node_type="user", label="U", color="#000000", badge_color="#111111", fixed=True),
                    LevelDefinition(level=1, node_type="group", label="G", color="#000000", badge_color="#111111", fixed=True),
                    LevelDefinition(level=3, node_type="task", label="T", color="#000000", badge_color="#111111", fixed=False),
                ],
            )

    def test_node_type_must_be_unique(self):
        with pytest.raises(ValueError, match="unique"):
            TemplateCreate(
                name="bad",
                levels=[
                    LevelDefinition(level=0, node_type="user", label="U", color="#000000", badge_color="#111111", fixed=True),
                    LevelDefinition(level=1, node_type="group", label="G", color="#000000", badge_color="#111111", fixed=True),
                    LevelDefinition(level=2, node_type="user", label="U2", color="#000000", badge_color="#111111", fixed=False),
                ],
            )

    def test_minimum_two_levels_required(self):
        with pytest.raises(Exception):
            TemplateCreate(
                name="bad",
                levels=[
                    LevelDefinition(level=0, node_type="user", label="U", color="#000000", badge_color="#111111", fixed=True),
                ],
            )

    def test_color_must_be_hex(self):
        with pytest.raises(Exception):
            LevelDefinition(level=0, node_type="user", label="U", color="red", badge_color="#111111", fixed=True)


class TestTemplateEdgeRuleValidation:
    """Test edge rule validation."""

    def _base_levels(self):
        return [
            LevelDefinition(level=0, node_type="user", label="U", color="#000000", badge_color="#111111", fixed=True),
            LevelDefinition(level=1, node_type="group", label="G", color="#000000", badge_color="#111111", fixed=True),
            LevelDefinition(level=2, node_type="task", label="T", color="#000000", badge_color="#111111", fixed=False),
        ]

    def test_valid_edge_rule(self):
        t = TemplateCreate(
            name="test",
            levels=self._base_levels(),
            edge_rules=[EdgeRule(source_type="group", target_type="task")],
        )
        assert len(t.edge_rules) == 1

    def test_edge_rule_unknown_source_type(self):
        with pytest.raises(ValueError, match="source_type.*not in defined levels"):
            TemplateCreate(
                name="bad",
                levels=self._base_levels(),
                edge_rules=[EdgeRule(source_type="unknown", target_type="task")],
            )

    def test_edge_rule_unknown_target_type(self):
        with pytest.raises(ValueError, match="target_type.*not in defined levels"):
            TemplateCreate(
                name="bad",
                levels=self._base_levels(),
                edge_rules=[EdgeRule(source_type="group", target_type="unknown")],
            )


class TestTemplateSeedFiles:
    """Test that seed JSON files are valid."""

    def test_org_management_json(self):
        path = DOMAINS_DIR / "org_management.json"
        assert path.exists()
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        t = TemplateCreate.model_validate(raw)
        assert t.name == "조직관리"
        assert len(t.levels) == 4
        assert t.levels[0].node_type == "user"
        assert t.levels[1].node_type == "group"

    def test_infra_json(self):
        path = DOMAINS_DIR / "infra.json"
        assert path.exists()
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        t = TemplateCreate.model_validate(raw)
        assert t.name == "인프라"
        assert len(t.levels) == 6
        assert t.levels[2].node_type == "cluster"
        assert t.levels[5].node_type == "pod"

    def test_all_seed_colors_are_hex(self):
        for json_file in DOMAINS_DIR.glob("*.json"):
            if json_file.name == "default.json":
                continue
            with open(json_file, encoding="utf-8") as f:
                raw = json.load(f)
            t = TemplateCreate.model_validate(raw)
            for lvl in t.levels:
                assert lvl.color.startswith("#"), f"{json_file.name}: {lvl.node_type} color must be hex"


class TestTemplateUpdate:
    """Test TemplateUpdate validation."""

    def test_partial_update_name_only(self):
        u = TemplateUpdate(name="new name")
        assert u.name == "new name"
        assert u.levels is None

    def test_update_with_invalid_levels_fails(self):
        with pytest.raises(ValueError):
            TemplateUpdate(
                levels=[
                    LevelDefinition(level=0, node_type="admin", label="A", color="#000000", badge_color="#111111", fixed=True),
                    LevelDefinition(level=1, node_type="group", label="G", color="#000000", badge_color="#111111", fixed=True),
                ],
            )
