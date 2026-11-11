import os
import sys
import logging
from typing import List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from knowledge_graph import HealthKnowledgeGraph
from semantic_engine import SemanticEngine
from recommender import ContextAwareRecommender, MEDICAL_DISCLAIMER

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("cyclecare.api")

app = FastAPI(
    title="CycleCare AI & Knowledge Graph Microservice",
    description="NLP Semantic Symptom Understanding, Neo4j Health Knowledge Graph, and Context-Aware Recommendations for CycleCare",
    version="1.0.0"
)

# Enable CORS for Express backend and Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
kg = HealthKnowledgeGraph()
semantic_engine = SemanticEngine()
recommender = ContextAwareRecommender(kg, semantic_engine)


# ------------------ Request / Response Schemas ------------------

class SymptomAnalysisRequest(BaseModel):
    text: str = Field(..., description="Natural language description of user symptoms")


class RecommendationRequest(BaseModel):
    text: Optional[str] = Field(None, description="Natural language text from user")
    symptoms: Optional[List[str]] = Field(default=[], description="List of discrete symptom IDs (e.g. ['cramps', 'fatigue'])")
    phase: Optional[str] = Field("menstrual", description="Menstrual phase (menstrual, follicular, ovulatory, luteal)")
    cycle_day: Optional[int] = Field(None, description="Current day in menstrual cycle")


# ------------------ Endpoints ------------------

@app.get("/")
def root_check():
    return {
        "status": "healthy",
        "service": "CycleCare AI & Knowledge Graph Microservice",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CycleCare AI & Knowledge Graph Service",
        "neo4j_connected": kg.is_neo4j_connected,
        "graph_backend": "Neo4j" if kg.is_neo4j_connected else "In-Memory Knowledge Graph Fallback",
        "total_ontology_nodes": len(kg.nodes),
        "total_ontology_edges": len(kg.edges),
        "embeddings_model": "all-MiniLM-L6-v2"
    }


@app.post("/api/ai/symptom-analysis")
def analyze_symptom_text(req: SymptomAnalysisRequest):
    """
    1. Semantic Symptom Understanding:
    Uses Sentence Transformers to identify conceptual symptoms from natural language.
    Example: 'My stomach hurts during periods' -> 'Menstrual Cramps (Dysmenorrhea)'.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text query cannot be empty")

    matches = semantic_engine.analyze_symptoms(req.text)
    
    # Enrich matches with knowledge graph connections
    enriched = []
    for m in matches:
        s_id = m["symptom_id"]
        connections = kg.get_symptom_connections(s_id)
        enriched.append({
            **m,
            "associated_phases": [p["name"] for p in connections.get("associated_phases", [])],
            "alleviating_nutrition": [n["name"] for n in connections.get("alleviating_nutrition", [])],
            "knowledge_graph": connections
        })

    return {
        "input_text": req.text,
        "detected_symptoms": enriched,
        "suggested_discrete_log": [m["symptom_id"] for m in matches],
        "disclaimer": MEDICAL_DISCLAIMER
    }


@app.get("/api/ai/semantic-search")
def search_health_resources(q: str = Query(..., description="Natural language health search query"), top_k: int = 5):
    """
    3. Semantic Health Search:
    Performs meaning-based cosine similarity search across educational resources, articles, and clinical guides.
    """
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    results = semantic_engine.semantic_search(q, top_k=top_k)
    return {
        "query": q,
        "total_results": len(results),
        "results": results,
        "disclaimer": MEDICAL_DISCLAIMER
    }


@app.post("/api/ai/recommendations")
def get_recommendations(req: RecommendationRequest):
    """
    4. Context-Aware Recommendations:
    Combines user-reported symptoms, cycle phase, and knowledge graph traversal.
    """
    recommendations = recommender.recommend(
        user_input=req.text,
        symptom_ids=req.symptoms,
        phase=req.phase,
        cycle_day=req.cycle_day
    )
    return recommendations


@app.get("/api/ai/graph/explore")
def explore_knowledge_graph(symptom: Optional[str] = None, phase: Optional[str] = None):
    """
    2. Health Knowledge Graph Explorer:
    Retrieves nodes and edges for visual interactive graph exploration.
    """
    if symptom:
        connections = kg.get_symptom_connections(symptom)
        return connections
    if phase:
        return kg.get_phase_context(phase)

    return kg.get_full_graph_data()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
