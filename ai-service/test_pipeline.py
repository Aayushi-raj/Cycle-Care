import sys
from knowledge_graph import HealthKnowledgeGraph
from semantic_engine import SemanticEngine
from recommender import ContextAwareRecommender

def test_pipeline():
    print("=== Testing Knowledge Graph ===")
    kg = HealthKnowledgeGraph()
    print(f"Total nodes: {len(kg.nodes)}")
    print(f"Total edges: {len(kg.edges)}")
    cramps_conn = kg.get_symptom_connections("cramps")
    print("Cramps symptom name:", cramps_conn["symptom"]["name"])
    print("Alleviating nutrition count:", len(cramps_conn["alleviating_nutrition"]))
    assert len(cramps_conn["alleviating_nutrition"]) > 0

    print("\n=== Testing Semantic Engine ===")
    engine = SemanticEngine()
    test_phrase = "My stomach hurts during periods"
    matches = engine.analyze_symptoms(test_phrase)
    print(f"Query: '{test_phrase}'")
    for m in matches:
        print(f" -> Matched: {m['symptom_id']} ({m['name']}), Confidence: {m['confidence']}, Concept: {m['matched_concept']}")
    assert any(m["symptom_id"] == "cramps" for m in matches), "Expected 'cramps' to be detected!"

    print("\n=== Testing Semantic Health Search ===")
    search_query = "what foods help with severe cramps and blood loss"
    results = engine.semantic_search(search_query, top_k=3)
    print(f"Search: '{search_query}'")
    for r in results:
        print(f" -> Found: {r['title']} (Score: {r['relevance_score']})")
    assert len(results) > 0

    print("\n=== Testing Context-Aware Recommender ===")
    recommender = ContextAwareRecommender(kg, engine)
    rec = recommender.recommend(
        user_input="My stomach hurts and I am so tired",
        phase="menstrual",
        cycle_day=2
    )
    print("Detected symptoms:", [s["symptom_id"] for s in rec["detected_symptoms"]])
    print("Nutrition count:", len(rec["nutrition_guidance"]))
    print("Wellness actions:", rec["wellness_actions"])
    print("Disclaimer:", rec["medical_disclaimer"][:60], "...")
    assert len(rec["nutrition_guidance"]) > 0
    assert "Disclaimer" in rec["medical_disclaimer"]

    print("\nALL SEMANTIC & GRAPH PIPELINE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_pipeline()

