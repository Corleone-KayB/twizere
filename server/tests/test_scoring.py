import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.scoring import score_seed  # noqa: E402


def test_determinism_same_seed_same_score():
    seed = "0788112233|MTN"
    _profile1, result1 = score_seed(seed)
    _profile2, result2 = score_seed(seed)
    assert result1["score"] == result2["score"]
    assert result1["band"] == result2["band"]
    assert result1["evidence"] == result2["evidence"]
    assert result1["monthly"] == result2["monthly"]


def test_different_seeds_can_differ():
    seed_a = "0788112233|MTN"
    seed_b = "0722334455|AIRTEL"
    _p1, r1 = score_seed(seed_a)
    _p2, r2 = score_seed(seed_b)
    # Not a strict requirement that they differ, but with these two seeds
    # they should (different persona/hash), sanity-checking the seed is used.
    assert (r1["score"], r1["monthly"]) != (r2["score"], r2["monthly"])


def test_risky_scores_worse_than_salaried():
    seed = "0700000000|MTN"
    _p_risky, risky_result = score_seed(seed, persona_override="risky")
    _p_salaried, salaried_result = score_seed(seed, persona_override="salaried")
    assert risky_result["score"] < salaried_result["score"]
    assert risky_result["band"] in ("MEDIUM", "HIGH")
    assert salaried_result["band"] == "LOW"


def test_evidence_has_five_items_with_valid_signals():
    _p, result = score_seed("0733889900|AIRTEL", persona_override="vendor")
    assert len(result["evidence"]) == 5
    for item in result["evidence"]:
        assert item["signal"] in ("pos", "neu", "neg")
        assert "label" in item and "detail" in item


def test_monthly_has_twelve_entries():
    _p, result = score_seed("0788556677|MTN", persona_override="boda")
    assert len(result["monthly"]) == 12


def test_band_recommendation_consistency():
    for persona in ("vendor", "boda", "salaried", "risky"):
        _p, result = score_seed("0788999999|MTN", persona_override=persona)
        if result["band"] == "LOW":
            assert result["recommendation"] == "APPROVE"
        elif result["band"] == "HIGH":
            assert result["recommendation"] == "DECLINE"
        else:
            assert result["recommendation"] == "REVIEW"
