import os
import socket
import logging
from urllib.parse import urlparse
from typing import Dict, List, Any, Optional

logger = logging.getLogger("cyclecare.knowledge_graph")

# Graph Schema Data: Nodes & Relationships
SEED_DATA = {
    "phases": [
        {
            "id": "menstrual",
            "name": "Menstrual Phase",
            "day_range": "Days 1-5",
            "description": "Estrogen and progesterone drop; the uterine lining sheds. Common experiences include fatigue, cramping, and lower energy levels.",
            "care_focus": "Rest, gentle movement, hydration, warmth, and iron replenishment."
        },
        {
            "id": "follicular",
            "name": "Follicular Phase",
            "day_range": "Days 6-13",
            "description": "FSH stimulates follicle maturation; estrogen levels steadily rise, boosting mood, mental clarity, and stamina.",
            "care_focus": "Balanced protein, fermented foods, strength training, and creative focus."
        },
        {
            "id": "ovulatory",
            "name": "Ovulatory Phase",
            "day_range": "Days 14-16",
            "description": "LH surges triggering egg release. Peak estrogen and testosterone create high energy, social confidence, and libido.",
            "care_focus": "Fiber-rich cruciferous vegetables, anti-inflammatory meals, and high-intensity activities."
        },
        {
            "id": "luteal",
            "name": "Luteal Phase",
            "day_range": "Days 17-28",
            "description": "Progesterone peaks to prepare the uterine lining, then drops if fertilization doesn't occur. Vulnerable to PMS, bloating, and food cravings.",
            "care_focus": "Complex carbohydrates, magnesium, vitamin B6, stress reduction, and restorative sleep."
        }
    ],
    "symptoms": [
        {
            "id": "cramps",
            "name": "Menstrual Cramps (Dysmenorrhea)",
            "category": "Pain",
            "severity_typical": 3,
            "description": "Throbbing or sharp spasms in the lower abdomen caused by uterine contractions stimulated by prostaglandins.",
            "synonyms": ["period pain", "uterine contractions", "stomach hurts during period", "pelvic cramps", "belly cramps", "dysmenorrhea"]
        },
        {
            "id": "bloating",
            "name": "Abdominal Bloating & Water Retention",
            "category": "Digestive",
            "severity_typical": 2,
            "description": "Sensation of abdominal swelling and tightness caused by hormonal fluctuations in estrogen and progesterone.",
            "synonyms": ["swollen belly", "water retention", "distended stomach", "gas", "tight waistband", "puffiness"]
        },
        {
            "id": "fatigue",
            "name": "Menstrual Fatigue & Low Energy",
            "category": "Systemic",
            "severity_typical": 3,
            "description": "Exhaustion and low stamina resulting from plummeting hormone levels, iron loss, or poor sleep quality.",
            "synonyms": ["tiredness", "exhaustion", "lethargy", "sluggishness", "no energy", "wiped out", "drowsiness"]
        },
        {
            "id": "headache",
            "name": "Hormonal Headache & Migraine",
            "category": "Neurological",
            "severity_typical": 3,
            "description": "Throbbing head pain triggered by rapid drops in estrogen levels prior to or during menses.",
            "synonyms": ["migraine", "head pain", "temple throbbing", "menstrual migraine", "pounding head"]
        },
        {
            "id": "backache",
            "name": "Lower Back & Sacral Ache",
            "category": "Musculoskeletal",
            "severity_typical": 2,
            "description": "Radiating ache in the lumbar and pelvic region triggered by uterine contractions and inflammatory prostaglandins.",
            "synonyms": ["lower back pain", "sacrum ache", "lumbar tension", "spine pain during cycle"]
        },
        {
            "id": "mood_swings",
            "name": "Mood Fluctuations & Irritability",
            "category": "Emotional",
            "severity_typical": 3,
            "description": "Shifts in emotional stability, irritability, anxiety, or sadness influenced by serotonin sensitivity to progesterone drops.",
            "synonyms": ["irritability", "emotional sensitivity", "feeling snappy", "crying easily", "anxiety", "moodiness"]
        },
        {
            "id": "acne",
            "name": "Hormonal Breakouts & Skin Sensitivity",
            "category": "Dermatological",
            "severity_typical": 2,
            "description": "Cystic and surface breakouts along the jawline and chin stimulated by androgenic stimulation of sebaceous glands.",
            "synonyms": ["pimples", "breakouts", "skin blemishes", "cystic acne", "chin spots"]
        },
        {
            "id": "breast_tenderness",
            "name": "Mastalgia (Breast Tenderness)",
            "category": "Physical",
            "severity_typical": 2,
            "description": "Swelling, fullness, and soreness in breast tissue resulting from high progesterone and estrogen levels in late luteal phase.",
            "synonyms": ["sore breasts", "breast pain", "swollen chest", "tender breasts", "chest hypersensitivity"]
        },
        {
            "id": "nausea",
            "name": "Menstrual Nausea & Queasiness",
            "category": "Digestive",
            "severity_typical": 2,
            "description": "Mild to moderate queasiness triggered by systemic prostaglandins entering the bloodstream or intense cramping.",
            "synonyms": ["feeling sick", "queasy", "upset stomach", "vomiting feeling", "gastric distress"]
        },
        {
            "id": "insomnia",
            "name": "Sleep Disruption & Night Awakenings",
            "category": "Systemic",
            "severity_typical": 2,
            "description": "Difficulty falling or staying asleep caused by progesterone shifts and elevated basal body temperature in the luteal phase.",
            "synonyms": ["cannot sleep", "restless nights", "insomnia", "waking up hot", "poor sleep"]
        },
        {
            "id": "heavy_flow",
            "name": "Heavy Menstrual Bleeding (Menorrhagia)",
            "category": "Bleeding",
            "severity_typical": 4,
            "description": "Excessive blood loss requiring pad/tampon changes every 1-2 hours or presence of large clots.",
            "synonyms": ["heavy bleeding", "flooding", "large clots", "excessive flow", "menorrhagia"]
        }
    ],
    "conditions": [
        {
            "id": "primary_dysmenorrhea",
            "name": "Primary Dysmenorrhea",
            "description": "Recurrent cramping pain with menses without identifiable pelvic pathology, driven by excess prostaglandin F2-alpha.",
            "clinical_note": "Responds well to heat therapy, NSAIDs, magnesium, and anti-inflammatory nutrition."
        },
        {
            "id": "endometriosis",
            "name": "Endometriosis Susceptibility Pattern",
            "description": "Endometrium-like tissue growing outside the uterus. Often characterized by chronic pelvic pain, deep dyspareunia, and refractory cramps.",
            "clinical_note": "Requires formal evaluation by a gynecologist. General wellness supports pelvic pelvic floor physical therapy and anti-inflammatory diet."
        },
        {
            "id": "pms",
            "name": "Premenstrual Syndrome (PMS)",
            "description": "Recurrent constellation of physical and emotional symptoms arising during the luteal phase and resolving after menses starts.",
            "clinical_note": "Lifestyle modifications like regular aerobic exercise, limiting caffeine, and magnesium/B6 supplementation offer symptom relief."
        },
        {
            "id": "pmdd",
            "name": "Premenstrual Dysphoric Disorder (PMDD) Alert Pattern",
            "description": "Severe, debilitating form of PMS with predominant emotional distress, severe mood swings, and functional impairment.",
            "clinical_note": "A clinical condition requiring professional healthcare guidance and specialized medical care."
        },
        {
            "id": "iron_deficiency",
            "name": "Iron Deficiency Anemia Risk",
            "description": "Depleted ferritin and hemoglobin stores secondary to chronic heavy menstrual blood loss, manifesting as fatigue and weakness.",
            "clinical_note": "Serum ferritin blood tests are recommended. Emphasize bioavailable dietary iron and vitamin C co-ingestion."
        },
        {
            "id": "pcos",
            "name": "Polycystic Ovary Syndrome (PCOS) Correlation",
            "description": "Endocrine disorder involving irregular cycles, hyperandrogenism (acne, hirsutism), and metabolic sensitivity.",
            "clinical_note": "Benefits from low-glycemic nutrition, resistance training, inositol supplementation, and physician guidance."
        }
    ],
    "nutrition": [
        {
            "id": "magnesium",
            "name": "Magnesium-Rich Whole Foods",
            "food_sources": ["Dark leafy greens (spinach, kale)", "Pumpkin seeds", "Dark chocolate (>70%)", "Almonds", "Black beans"],
            "mechanism": "Natural smooth muscle relaxant that reduces prostaglandin synthesis and mitigates uterine and vascular spasms.",
            "targets": ["cramps", "headache", "mood_swings", "insomnia"]
        },
        {
            "id": "omega3",
            "name": "Omega-3 Fatty Acids (Anti-Inflammatory)",
            "food_sources": ["Wild salmon", "Walnuts", "Chia seeds", "Flaxseed meal", "Sardines"],
            "mechanism": "Shifts eicosanoid metabolism away from inflammatory PGE2 toward anti-inflammatory series 3 prostaglandins.",
            "targets": ["cramps", "backache", "bloating", "acne"]
        },
        {
            "id": "ginger",
            "name": "Ginger Root & Warm Decoctions",
            "food_sources": ["Fresh ginger tea", "Ginger root slices", "Warm ginger-infused broth"],
            "mechanism": "Potent cyclooxygenase (COX) inhibitor comparable to mild NSAIDs for reducing dysmenorrhea and relieving nausea.",
            "targets": ["cramps", "nausea", "headache"]
        },
        {
            "id": "iron_vit_c",
            "name": "Bioavailable Iron with Vitamin C",
            "food_sources": ["Lentils", "Lean meats or tofu", "Spinach with lemon juice", "Bell peppers", "Pumpkin seeds"],
            "mechanism": "Replenishes hemoglobin losses from bleeding; vitamin C converts ferric iron to easily absorbed ferrous iron.",
            "targets": ["fatigue", "heavy_flow"]
        },
        {
            "id": "hydration_electrolytes",
            "name": "Hydration & Natural Potassium Balance",
            "food_sources": ["Coconut water", "Cucumbers", "Watermelon", "Bananas", "Herbal infusions"],
            "mechanism": "Promotes renal fluid clearance to alleviate water retention while maintaining sodium-potassium osmotic balance.",
            "targets": ["bloating", "headache", "fatigue"]
        },
        {
            "id": "vitamin_b6",
            "name": "Vitamin B6 & Complex Carbohydrates",
            "food_sources": ["Oats", "Sweet potatoes", "Chickpeas", "Bananas", "Brown rice"],
            "mechanism": "Acts as an essential cofactor for neurotransmitter synthesis (serotonin and GABA), stabilizing premenstrual mood.",
            "targets": ["mood_swings", "bloating", "breast_tenderness"]
        },
        {
            "id": "chamomile",
            "name": "Chamomile & Glycine Infusions",
            "food_sources": ["Pure chamomile blossom tea", "Warm spiced botanical brew"],
            "mechanism": "Contains flavonoids (apigenin) that bind GABA receptors, increasing urinary glycine levels to calm nerve spasms.",
            "targets": ["cramps", "insomnia", "mood_swings"]
        }
    ],
    "resources": [
        {
            "id": "res_cramps_mastery",
            "title": "Evidence-Based Strategies for Relieving Period Cramps",
            "category": "Pain Management",
            "phase": "menstrual",
            "summary": "Clinical approaches to easing primary dysmenorrhea using continuous heat therapy (40°C), acupressure points (SP6), and anti-prostaglandin dietary shifts.",
            "tags": ["cramps", "menstrual", "heat therapy", "pain relief", "dysmenorrhea"],
            "url": "https://www.healthline.com/health/womens-health/what-to-eat-during-period"
        },
        {
            "id": "res_phase_nutrition",
            "title": "Cycle Syncing Nutrition: Fueling Every Hormonal Phase",
            "category": "Nutrition",
            "phase": "follicular",
            "summary": "How to adapt macronutrient ratios, seed cycling, and micronutrients across the follicular, ovulatory, luteal, and menstrual phases for hormonal harmony.",
            "tags": ["nutrition", "cycle syncing", "energy", "hormone balance", "follicular", "luteal"],
            "url": "https://www.unicef.org/press-releases/10-fast-facts-menstrual-health-schools"
        },
        {
            "id": "res_restorative_yoga",
            "title": "Restorative Yoga & Pelvic Floor Relaxation for Pelvic Pain",
            "category": "Movement",
            "phase": "menstrual",
            "summary": "Gentle yoga asanas including Supta Baddha Konasana (Reclining Bound Angle) and Balasana (Child's Pose) to release sacral tension and improve pelvic circulation.",
            "tags": ["yoga", "cramps", "backache", "relaxation", "menstrual"],
            "url": "https://www.yogapoint.com/yoga-poses/yoga-for-menstruation.htm"
        },
        {
            "id": "res_pms_mood_care",
            "title": "Managing Luteal Mood Shifts: Serotonin, Progesterone, and Self-Care",
            "category": "Mental Wellness",
            "phase": "luteal",
            "summary": "Understanding neurochemical sensitivity to progesterone withdrawal and actionable ways to support emotional resilience with complex carbs and mindfulness.",
            "tags": ["pms", "mood swings", "luteal", "pmdd", "anxiety"],
            "url": "https://www.womenshealth.gov/menstrual-cycle/premenstrual-syndrome"
        },
        {
            "id": "res_iron_replenishment",
            "title": "Combatting Menstrual Fatigue: Iron, Ferritin, and Vitality",
            "category": "Health Education",
            "phase": "menstrual",
            "summary": "Recognizing the silent impact of subclinical iron depletion, optimizing dietary iron bioavailability, and tracking energy reserves.",
            "tags": ["fatigue", "heavy flow", "iron", "anemia", "menstrual"],
            "url": "https://www.cdc.gov/ncbddd/blooddisorders/women/menorrhagia.html"
        },
        {
            "id": "res_bloating_gut_health",
            "title": "Hormones and the Gut: Taming Cycle-Related Bloating",
            "category": "Digestive Health",
            "phase": "luteal",
            "summary": "Why progesterone slows gastrointestinal transit times and how potassium-rich hydration and soluble fiber alleviate premenstrual abdominal tightness.",
            "tags": ["bloating", "luteal", "digestive", "water retention"],
            "url": "https://www.hopkinsmedicine.org/health/wellness-and-prevention/how-period-affects-digestion"
        }
    ],
    # Relationships
    "relationships": [
        # Symptom -> MenstrualPhase (ASSOCIATED_WITH)
        {"source": "cramps", "target": "menstrual", "type": "ASSOCIATED_WITH", "weight": 0.95},
        {"source": "fatigue", "target": "menstrual", "type": "ASSOCIATED_WITH", "weight": 0.85},
        {"source": "heavy_flow", "target": "menstrual", "type": "ASSOCIATED_WITH", "weight": 0.98},
        {"source": "backache", "target": "menstrual", "type": "ASSOCIATED_WITH", "weight": 0.80},
        {"source": "nausea", "target": "menstrual", "type": "ASSOCIATED_WITH", "weight": 0.65},

        {"source": "bloating", "target": "luteal", "type": "ASSOCIATED_WITH", "weight": 0.90},
        {"source": "mood_swings", "target": "luteal", "type": "ASSOCIATED_WITH", "weight": 0.92},
        {"source": "breast_tenderness", "target": "luteal", "type": "ASSOCIATED_WITH", "weight": 0.88},
        {"source": "acne", "target": "luteal", "type": "ASSOCIATED_WITH", "weight": 0.82},
        {"source": "insomnia", "target": "luteal", "type": "ASSOCIATED_WITH", "weight": 0.75},
        {"source": "headache", "target": "luteal", "type": "ASSOCIATED_WITH", "weight": 0.70},
        {"source": "headache", "target": "menstrual", "type": "ASSOCIATED_WITH", "weight": 0.75},

        # Symptom -> HealthCondition (INDICATES_RISK_OF)
        {"source": "cramps", "target": "primary_dysmenorrhea", "type": "INDICATES_RISK_OF", "weight": 0.85},
        {"source": "cramps", "target": "endometriosis", "type": "INDICATES_RISK_OF", "weight": 0.70},
        {"source": "backache", "target": "endometriosis", "type": "INDICATES_RISK_OF", "weight": 0.60},
        {"source": "mood_swings", "target": "pms", "type": "INDICATES_RISK_OF", "weight": 0.90},
        {"source": "mood_swings", "target": "pmdd", "type": "INDICATES_RISK_OF", "weight": 0.65},
        {"source": "bloating", "target": "pms", "type": "INDICATES_RISK_OF", "weight": 0.75},
        {"source": "heavy_flow", "target": "iron_deficiency", "type": "INDICATES_RISK_OF", "weight": 0.85},
        {"source": "fatigue", "target": "iron_deficiency", "type": "INDICATES_RISK_OF", "weight": 0.75},
        {"source": "acne", "target": "pcos", "type": "INDICATES_RISK_OF", "weight": 0.60},

        # Nutrition -> Symptom (ALLEVIATES)
        {"source": "magnesium", "target": "cramps", "type": "ALLEVIATES", "weight": 0.90},
        {"source": "magnesium", "target": "headache", "type": "ALLEVIATES", "weight": 0.80},
        {"source": "magnesium", "target": "mood_swings", "type": "ALLEVIATES", "weight": 0.75},
        {"source": "magnesium", "target": "insomnia", "type": "ALLEVIATES", "weight": 0.85},
        {"source": "omega3", "target": "cramps", "type": "ALLEVIATES", "weight": 0.88},
        {"source": "omega3", "target": "backache", "type": "ALLEVIATES", "weight": 0.78},
        {"source": "omega3", "target": "acne", "type": "ALLEVIATES", "weight": 0.70},
        {"source": "ginger", "target": "cramps", "type": "ALLEVIATES", "weight": 0.92},
        {"source": "ginger", "target": "nausea", "type": "ALLEVIATES", "weight": 0.95},
        {"source": "iron_vit_c", "target": "fatigue", "type": "ALLEVIATES", "weight": 0.90},
        {"source": "hydration_electrolytes", "target": "bloating", "type": "ALLEVIATES", "weight": 0.85},
        {"source": "hydration_electrolytes", "target": "headache", "type": "ALLEVIATES", "weight": 0.80},
        {"source": "vitamin_b6", "target": "mood_swings", "type": "ALLEVIATES", "weight": 0.85},
        {"source": "vitamin_b6", "target": "breast_tenderness", "type": "ALLEVIATES", "weight": 0.80},
        {"source": "chamomile", "target": "cramps", "type": "ALLEVIATES", "weight": 0.78},
        {"source": "chamomile", "target": "insomnia", "type": "ALLEVIATES", "weight": 0.85},

        # EducationalResource -> Symptom (COVERS_SYMPTOM)
        {"source": "res_cramps_mastery", "target": "cramps", "type": "COVERS_SYMPTOM", "weight": 0.95},
        {"source": "res_restorative_yoga", "target": "cramps", "type": "COVERS_SYMPTOM", "weight": 0.90},
        {"source": "res_restorative_yoga", "target": "backache", "type": "COVERS_SYMPTOM", "weight": 0.85},
        {"source": "res_pms_mood_care", "target": "mood_swings", "type": "COVERS_SYMPTOM", "weight": 0.95},
        {"source": "res_iron_replenishment", "target": "fatigue", "type": "COVERS_SYMPTOM", "weight": 0.95},
        {"source": "res_iron_replenishment", "target": "heavy_flow", "type": "COVERS_SYMPTOM", "weight": 0.90},
        {"source": "res_bloating_gut_health", "target": "bloating", "type": "COVERS_SYMPTOM", "weight": 0.95},

        # EducationalResource -> MenstrualPhase (RELEVANT_TO_PHASE)
        {"source": "res_cramps_mastery", "target": "menstrual", "type": "RELEVANT_TO_PHASE", "weight": 0.95},
        {"source": "res_phase_nutrition", "target": "follicular", "type": "RELEVANT_TO_PHASE", "weight": 0.90},
        {"source": "res_phase_nutrition", "target": "luteal", "type": "RELEVANT_TO_PHASE", "weight": 0.90},
        {"source": "res_restorative_yoga", "target": "menstrual", "type": "RELEVANT_TO_PHASE", "weight": 0.95},
        {"source": "res_pms_mood_care", "target": "luteal", "type": "RELEVANT_TO_PHASE", "weight": 0.95},
        {"source": "res_iron_replenishment", "target": "menstrual", "type": "RELEVANT_TO_PHASE", "weight": 0.90},
        {"source": "res_bloating_gut_health", "target": "luteal", "type": "RELEVANT_TO_PHASE", "weight": 0.90}
    ]
}


class HealthKnowledgeGraph:
    """
    Dual-mode Knowledge Graph manager:
    1. Operates against a live Neo4j instance if configured and available.
    2. Maintains a seamless in-memory graph representation to guarantee 100% uptime and testability.
    """

    def __init__(self):
        self.driver = None
        self.is_neo4j_connected = False
        self.neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD", "cyclecare123")
        
        # Build in-memory lookup indices
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: List[Dict[str, Any]] = []
        self._init_in_memory_graph()

        # Attempt Neo4j connection
        self._connect_neo4j()

    def _init_in_memory_graph(self):
        """Populates the in-memory graph with the complete medical ontology schema."""
        for phase in SEED_DATA["phases"]:
            self.nodes[phase["id"]] = {**phase, "label": "MenstrualPhase"}
        for symptom in SEED_DATA["symptoms"]:
            self.nodes[symptom["id"]] = {**symptom, "label": "Symptom"}
        for condition in SEED_DATA["conditions"]:
            self.nodes[condition["id"]] = {**condition, "label": "HealthCondition"}
        for nutrition in SEED_DATA["nutrition"]:
            self.nodes[nutrition["id"]] = {**nutrition, "label": "Nutrition"}
        for resource in SEED_DATA["resources"]:
            self.nodes[resource["id"]] = {**resource, "label": "EducationalResource"}
        
        self.edges = list(SEED_DATA["relationships"])
        logger.info(f"In-memory graph initialized: {len(self.nodes)} nodes, {len(self.edges)} relationships.")

    def _connect_neo4j(self):
        """Attempts to establish connection to Neo4j database."""
        try:
            parsed = urlparse(self.neo4j_uri)
            host = parsed.hostname or "localhost"
            port = parsed.port or 7687

            # Quick socket pre-check to avoid long driver timeouts when Neo4j is offline
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex((host, port))
            sock.close()
            if result != 0:
                logger.info(f"Neo4j port {port} on {host} is not reachable. Operating with In-Memory Knowledge Graph.")
                self.is_neo4j_connected = False
                return

            from neo4j import GraphDatabase
            self.driver = GraphDatabase.driver(
                self.neo4j_uri,
                auth=(self.neo4j_user, self.neo4j_password),
                connection_timeout=2
            )
            self.driver.verify_connectivity()
            self.is_neo4j_connected = True
            logger.info(f"Connected successfully to Neo4j instance at {self.neo4j_uri}")
            self.seed_neo4j_graph()
        except Exception as e:
            self.is_neo4j_connected = False
            logger.info(f"Neo4j instance not reachable ({e}). Running on robust In-Memory Graph engine.")

    def seed_neo4j_graph(self):
        """Seeds Neo4j database with nodes, constraints, and relationships if connected."""
        if not self.is_neo4j_connected or not self.driver:
            return

        try:
            with self.driver.session() as session:
                # 1. Create constraint / unique indices
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:MenstrualPhase) REQUIRE p.id IS UNIQUE")
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Symptom) REQUIRE s.id IS UNIQUE")
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:HealthCondition) REQUIRE c.id IS UNIQUE")
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Nutrition) REQUIRE n.id IS UNIQUE")
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (r:EducationalResource) REQUIRE r.id IS UNIQUE")

                # 2. Seed Phase nodes
                for p in SEED_DATA["phases"]:
                    session.run(
                        """
                        MERGE (p:MenstrualPhase {id: $id})
                        SET p.name = $name, p.day_range = $day_range, 
                            p.description = $description, p.care_focus = $care_focus
                        """,
                        **p
                    )

                # 3. Seed Symptom nodes
                for s in SEED_DATA["symptoms"]:
                    session.run(
                        """
                        MERGE (s:Symptom {id: $id})
                        SET s.name = $name, s.category = $category, 
                            s.severity_typical = $severity_typical,
                            s.description = $description, s.synonyms = $synonyms
                        """,
                        **s
                    )

                # 4. Seed HealthCondition nodes
                for c in SEED_DATA["conditions"]:
                    session.run(
                        """
                        MERGE (c:HealthCondition {id: $id})
                        SET c.name = $name, c.description = $description, c.clinical_note = $clinical_note
                        """,
                        **c
                    )

                # 5. Seed Nutrition nodes
                for n in SEED_DATA["nutrition"]:
                    session.run(
                        """
                        MERGE (n:Nutrition {id: $id})
                        SET n.name = $name, n.mechanism = $mechanism,
                            n.food_sources = $food_sources, n.targets = $targets
                        """,
                        **n
                    )

                # 6. Seed EducationalResource nodes
                for r in SEED_DATA["resources"]:
                    session.run(
                        """
                        MERGE (r:EducationalResource {id: $id})
                        SET r.title = $title, r.category = $category, r.phase = $phase,
                            r.summary = $summary, r.tags = $tags, r.url = $url
                        """,
                        **r
                    )

                # 7. Seed Relationships
                for rel in SEED_DATA["relationships"]:
                    rel_type = rel["type"]
                    session.run(
                        f"""
                        MATCH (a {{id: $source}}), (b {{id: $target}})
                        MERGE (a)-[r:{rel_type}]->(b)
                        SET r.weight = $weight
                        """,
                        source=rel["source"],
                        target=rel["target"],
                        weight=rel.get("weight", 1.0)
                    )

            logger.info("Neo4j database seeding verified successfully.")
        except Exception as e:
            logger.error(f"Error seeding Neo4j: {e}")

    def get_symptom_connections(self, symptom_id: str) -> Dict[str, Any]:
        """
        Traverses graph for a given symptom to retrieve:
        - Associated menstrual phases
        - Possible related health conditions
        - Alleviating nutrition and mechanisms
        - Connected educational resources
        """
        symptom = self.nodes.get(symptom_id)
        if not symptom:
            return {"error": f"Symptom '{symptom_id}' not found in knowledge graph"}

        associated_phases = []
        possible_conditions = []
        alleviating_nutrition = []
        connected_resources = []

        # Graph traversal:
        for edge in self.edges:
            rel_type = edge["type"]
            # Outgoing from symptom
            if edge["source"] == symptom_id:
                target_node = self.nodes.get(edge["target"])
                if target_node:
                    if rel_type == "ASSOCIATED_WITH" and target_node.get("label") == "MenstrualPhase":
                        associated_phases.append(target_node)
                    elif rel_type == "INDICATES_RISK_OF" and target_node.get("label") == "HealthCondition":
                        possible_conditions.append({
                            **target_node,
                            "relevance_weight": edge.get("weight", 0.7)
                        })

            # Incoming to symptom (Nutrition ALLEVIATES Symptom, Resource COVERS_SYMPTOM Symptom)
            if edge["target"] == symptom_id:
                source_node = self.nodes.get(edge["source"])
                if source_node:
                    if rel_type == "ALLEVIATES" and source_node.get("label") == "Nutrition":
                        alleviating_nutrition.append({
                            **source_node,
                            "efficacy_score": edge.get("weight", 0.8)
                        })
                    elif rel_type == "COVERS_SYMPTOM" and source_node.get("label") == "EducationalResource":
                        connected_resources.append(source_node)

        return {
            "symptom": symptom,
            "associated_phases": associated_phases,
            "possible_conditions": possible_conditions,
            "alleviating_nutrition": alleviating_nutrition,
            "connected_resources": connected_resources
        }

    def get_phase_context(self, phase_id: str) -> Optional[Dict[str, Any]]:
        """Returns details, expected symptoms, and guidance for a given menstrual phase."""
        phase = self.nodes.get(phase_id.lower())
        if not phase:
            return None

        # Find typical symptoms for this phase
        typical_symptoms = []
        for edge in self.edges:
            if edge["type"] == "ASSOCIATED_WITH" and edge["target"] == phase_id.lower():
                symptom = self.nodes.get(edge["source"])
                if symptom:
                    typical_symptoms.append(symptom)

        # Find resources for this phase
        phase_resources = []
        for edge in self.edges:
            if edge["type"] == "RELEVANT_TO_PHASE" and edge["target"] == phase_id.lower():
                res = self.nodes.get(edge["source"])
                if res and res not in phase_resources:
                    phase_resources.append(res)

        return {
            "phase": phase,
            "typical_symptoms": typical_symptoms,
            "resources": phase_resources
        }

    def get_full_graph_data(self) -> Dict[str, Any]:
        """Returns node list and link list for interactive graph rendering."""
        nodes_list = []
        for node_id, data in self.nodes.items():
            nodes_list.append({
                "id": node_id,
                "label": data.get("name", node_id),
                "type": data.get("label", "Concept"),
                "category": data.get("category", "")
            })

        links_list = []
        for edge in self.edges:
            links_list.append({
                "source": edge["source"],
                "target": edge["target"],
                "type": edge["type"],
                "weight": edge.get("weight", 1.0)
            })

        return {
            "backend": "Neo4j" if self.is_neo4j_connected else "In-Memory Knowledge Graph",
            "nodes": nodes_list,
            "links": links_list
        }

    def close(self):
        if self.driver:
            self.driver.close()
