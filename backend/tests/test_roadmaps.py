"""Tests for roadmaps — roadmap.sh-style learning paths over concepts and challenges."""

import pytest
from fastapi.testclient import TestClient

from backend.models.learn import RoadmapNode
from backend.services import curriculum_service

ROADMAPS = [curriculum_service.get_roadmap(r.id) for r in curriculum_service.list_roadmaps()]
ALL_CHALLENGE_IDS = {c.id for t in curriculum_service.list_tracks() for c in t.challenges}


@pytest.fixture
def client():
    from backend.main import app

    return TestClient(app, raise_server_exceptions=False)


def test_has_general_core_and_field_roadmaps():
    categories = {r.category for r in ROADMAPS}
    assert {"start", "core", "field"} <= categories
    assert sum(r.category == "field" for r in ROADMAPS) >= 4
    assert ROADMAPS[0].id == "prompt-engineering"  # "start here" sorts first


def test_every_challenge_belongs_to_a_roadmap():
    used = {n.challenge_id for r in ROADMAPS for s in r.sections for n in s.nodes if n.challenge_id}
    assert ALL_CHALLENGE_IDS - used == set()


@pytest.mark.parametrize("roadmap", ROADMAPS, ids=lambda r: r.id)
def test_roadmap_is_well_formed(roadmap):
    node_ids = [n.id for s in roadmap.sections for n in s.nodes]
    assert len(node_ids) == len(set(node_ids))
    assert len(roadmap.sections) >= 3
    for section in roadmap.sections:
        assert section.nodes, f"empty section {section.id}"
        for node in section.nodes:
            assert node.title and node.summary
            if node.kind == "challenge":
                assert node.challenge_id in ALL_CHALLENGE_IDS
                assert node.difficulty and node.technique  # enriched from the challenge


def test_agentic_roadmap_starts_by_leaving_vibe_coding():
    roadmap = curriculum_service.get_roadmap("agentic-development")
    first = roadmap.sections[0].nodes[0]
    assert first.kind == "concept" and "vibe" in first.title.lower()


def test_node_validation_rejects_incomplete_nodes():
    with pytest.raises(ValueError):
        RoadmapNode(id="x", kind="challenge")
    with pytest.raises(ValueError):
        RoadmapNode(id="y", kind="concept", title="No summary")


def test_list_roadmaps_endpoint(client):
    response = client.get("/api/roadmaps")
    assert response.status_code == 200
    data = response.json()
    assert [r["id"] for r in data][:2] == ["prompt-engineering", "agentic-development"]
    agentic = data[1]
    assert agentic["challenge_nodes"]["vibe-to-spec"] == "vibe-to-spec"
    assert len(agentic["node_ids"]) >= len(agentic["challenge_nodes"])
    assert "ad-multi" in agentic["optional_node_ids"]


def test_get_roadmap_endpoint(client):
    response = client.get("/api/roadmaps/data")
    assert response.status_code == 200
    data = response.json()
    nodes = [n for s in data["sections"] for n in s["nodes"]]
    sql = next(n for n in nodes if n["id"] == "text-to-sql")
    assert sql["title"] == "Text to SQL" and sql["difficulty"] == "intermediate"
    assert "reference_prompt" not in response.text and "golden_output" not in response.text


def test_unknown_roadmap_404(client):
    assert client.get("/api/roadmaps/nope").status_code == 404
