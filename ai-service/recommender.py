import logging
from typing import List, Dict, Any, Optional
from knowledge_graph import HealthKnowledgeGraph
from semantic_engine import SemanticEngine

logger = logging.getLogger("cyclecare.recommender")

MEDICAL_DISCLAIMER = (
    "Disclaimer: CycleCare provides general wellness guidance and educational information derived from "
    "clinical literature and knowledge graph relationships. This is NOT medical advice, diagnosis, or "
    "treatment. Always consult a qualified physician or healthcare provider for persistent, severe, or "
    "concerning symptoms."
)


class ContextAwareRecommender:
    def __init__(self, kg: HealthKnowledgeGraph, semantic_engine: SemanticEngine):
        self.kg = kg
        self.semantic_engine = semantic_engine

    def recommend(
        self,
        user_input: Optional[str] = None,
        symptom_ids: Optional[List[str]] = None,
        phase: Optional[str] = None,
        cycle_day: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes user symptoms, cycle phase, and knowledge graph connections
        into actionable, evidence-based wellness recommendations.
        """
        detected_symptoms = []
        resolved_symptom_ids = set(symptom_ids or [])

        # 1. Semantic parsing if user provided natural language
        if user_input and user_input.strip():
            matches = self.semantic_engine.analyze_symptoms(user_input)
            detected_symptoms = matches
            for m in matches:
                resolved_symptom_ids.add(m["symptom_id"])

        # Determine phase if not explicitly provided
        effective_phase = (phase or "menstrual").lower()
        phase_context = self.kg.get_phase_context(effective_phase)

        # 2. Graph Traversal for all identified symptoms
        symptom_details = []
        nutrition_map: Dict[str, Dict[str, Any]] = {}
        condition_map: Dict[str, Dict[str, Any]] = {}
        resource_map: Dict[str, Dict[str, Any]] = {}

        for s_id in resolved_symptom_ids:
            connections = self.kg.get_symptom_connections(s_id)
            if "error" not in connections:
                symptom_node = connections["symptom"]
                symptom_details.append(symptom_node)

                # Collect nutrition that alleviates this symptom
                for nut in connections.get("alleviating_nutrition", []):
                    nut_id = nut["id"]
                    if nut_id not in nutrition_map:
                        nutrition_map[nut_id] = {
                            "id": nut["id"],
                            "name": nut["name"],
                            "food_sources": nut.get("food_sources", []),
                            "mechanism": nut.get("mechanism", ""),
                            "targets": [symptom_node["name"]],
                            "efficacy_score": nut.get("efficacy_score", 0.8)
                        }
                    else:
                        nutrition_map[nut_id]["targets"].append(symptom_node["name"])

                # Collect conditions indicated by this symptom
                for cond in connections.get("possible_conditions", []):
                    c_id = cond["id"]
                    if c_id not in condition_map:
                        condition_map[c_id] = {
                            "id": cond["id"],
                            "name": cond["name"],
                            "description": cond.get("description", ""),
                            "clinical_note": cond.get("clinical_note", ""),
                            "associated_symptoms": [symptom_node["name"]],
                            "relevance_weight": cond.get("relevance_weight", 0.7)
                        }
                    else:
                        condition_map[c_id]["associated_symptoms"].append(symptom_node["name"])

                # Collect connected educational resources
                for res in connections.get("connected_resources", []):
                    resource_map[res["id"]] = res

        # Add phase-relevant resources
        if phase_context and "resources" in phase_context:
            for r in phase_context["resources"]:
                resource_map[r["id"]] = r

        # 3. Compile wellness action steps based on phase and symptoms
        wellness_actions = []
        if effective_phase == "menstrual":
            wellness_actions.append("Apply local heat (heating pad or hot water bottle at ~40°C) to relax uterine muscles.")
            wellness_actions.append("Prioritize gentle restorative movement such as pelvic opening yoga or light walking.")
            wellness_actions.append("Ensure continuous hydration with warm fluids, herbal teas, or broths.")
        elif effective_phase == "follicular":
            wellness_actions.append("Support emerging energy with clean proteins, fresh greens, and strength-building exercise.")
        elif effective_phase == "ovulatory":
            wellness_actions.append("Support liver clearance of peak estrogen with cruciferous vegetables (broccoli, cabbage).")
        elif effective_phase == "luteal":
            wellness_actions.append("Stabilize blood sugar with fiber-rich complex carbohydrates to curb PMS cravings.")
            wellness_actions.append("Limit excessive caffeine and sodium intake to minimize premenstrual breast tenderness and bloating.")
            wellness_actions.append("Practice sleep hygiene: maintain a cool bedroom and unwind with magnesium-rich foods.")

        # Sort nutrition suggestions by number of target symptoms addressed
        sorted_nutrition = sorted(
            nutrition_map.values(),
            key=lambda n: (len(n["targets"]), n["efficacy_score"]),
            reverse=True
        )

        # Sort conditions by number of associated symptoms
        sorted_conditions = sorted(
            condition_map.values(),
            key=lambda c: (len(c["associated_symptoms"]), c["relevance_weight"]),
            reverse=True
        )

        # Compile final response package
        return {
            "query_analyzed": user_input or "Structured symptom query",
            "detected_symptoms": detected_symptoms,
            "resolved_symptoms": symptom_details,
            "phase_context": phase_context["phase"] if phase_context else None,
            "cycle_day": cycle_day,
            "nutrition_guidance": sorted_nutrition,
            "wellness_actions": wellness_actions,
            "associated_conditions": sorted_conditions,
            "educational_resources": list(resource_map.values()),
            "graph_backend": "Neo4j" if self.kg.is_neo4j_connected else "In-Memory Knowledge Graph",
            "medical_disclaimer": MEDICAL_DISCLAIMER
        }

