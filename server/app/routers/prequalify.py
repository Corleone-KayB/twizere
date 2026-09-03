from fastapi import APIRouter

from ..schemas import PrequalifyRequest
from ..scoring import score_seed

router = APIRouter()


@router.post("/prequalify")
def prequalify(body: PrequalifyRequest):
    seed = f"{body.phone}|{body.telco}"
    _profile, result = score_seed(seed)
    return {
        "band": result["band"],
        "recommendation": result["recommendation"],
        "score": result["score"],
        "affordableInstallment": result["affordableInstallment"],
        "maxAmount": result["maxAmount"],
        "evidence": result["evidence"],
        "monthly": result["monthly"],
    }
