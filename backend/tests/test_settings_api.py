def test_get_settings_returns_seeded_default_prompt(client):
    body = client.get("/api/settings").json()
    assert "extraction_prompt" in body
    assert len(body["extraction_prompt"]) > 50  # the built-in default, seeded on demand


def test_patch_settings_updates_prompt(client):
    resp = client.patch("/api/settings", json={"extraction_prompt": "Custom base prompt."})
    assert resp.status_code == 200
    assert resp.json()["extraction_prompt"] == "Custom base prompt."
    assert client.get("/api/settings").json()["extraction_prompt"] == "Custom base prompt."


def test_patch_settings_blank_resets_to_default(client):
    client.patch("/api/settings", json={"extraction_prompt": "temp"})
    resp = client.patch("/api/settings", json={"extraction_prompt": "   "})
    assert resp.status_code == 200
    assert len(resp.json()["extraction_prompt"]) > 50  # reset to the built-in default
