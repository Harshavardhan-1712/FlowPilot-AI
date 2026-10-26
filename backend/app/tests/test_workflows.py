def test_list_workflows(client, auth_headers):
    res = client.get("/api/v1/workflows", headers=auth_headers)
    assert res.status_code == 200
    workflows = res.json()
    assert len(workflows) >= 1
    assert any(wf["name"] == "Customer Feedback Intelligence" for wf in workflows)


def test_validate_cyclic_graph_fails(client, auth_headers):
    # Definition with cyclic loop node A -> node B -> node A
    cyclic_definition = {
        "nodes": [
            {"id": "node-A", "type": "manualTrigger", "position": {"x": 0, "y": 0}, "data": {}},
            {"id": "node-B", "type": "llmProcessing", "position": {"x": 100, "y": 0}, "data": {}},
        ],
        "edges": [
            {"id": "e1", "source": "node-A", "target": "node-B"},
            {"id": "e2", "source": "node-B", "target": "node-A"},  # Cycle!
        ]
    }
    res = client.post("/api/v1/workflows/validate", json=cyclic_definition)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert any("Cyclic" in issue["message"] for issue in data["issues"])


def test_validate_unknown_node_type_fails(client, auth_headers):
    invalid_definition = {
        "nodes": [
            {"id": "node-1", "type": "unrestrictedShellExecution", "position": {"x": 0, "y": 0}, "data": {}},
        ],
        "edges": []
    }
    res = client.post("/api/v1/workflows/validate", json=invalid_definition)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert any("Unknown node type" in issue["message"] for issue in data["issues"])


def test_ai_workflow_plan_generation(client, auth_headers):
    prompt = "Read customer complaints, search company refund policy, categorize sentiment, and alert manager."
    res = client.post("/api/v1/workflows/generate-plan", json={"prompt": prompt}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert "definition" in data
    assert len(data["definition"]["nodes"]) >= 4
    assert len(data["definition"]["edges"]) >= 3
    assert data["suggested_name"] is not None
