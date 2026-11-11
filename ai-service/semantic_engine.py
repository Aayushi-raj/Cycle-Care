import os
# Memory & Threading optimizations for cloud container environments (Render 512MB RAM)
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import logging
from typing import List, Dict, Any, Tuple
import numpy as np
import torch
torch.set_num_threads(1)
torch.set_grad_enabled(False)

from sentence_transformers import SentenceTransformer
from knowledge_graph import SEED_DATA

logger = logging.getLogger("cyclecare.semantic_engine")


class SemanticEngine:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        logger.info(f"Loading SentenceTransformer model on CPU: {model_name}...")
        try:
            with torch.inference_mode():
                self.model = SentenceTransformer(model_name, device="cpu", local_files_only=True)
        except Exception:
            with torch.inference_mode():
                self.model = SentenceTransformer(model_name, device="cpu")
        logger.info("SentenceTransformer model loaded successfully on CPU.")

        self.symptom_corpus: List[Dict[str, Any]] = []
        self.symptom_embeddings: np.ndarray = None
        self._index_symptoms()

        self.resource_corpus: List[Dict[str, Any]] = []
        self.resource_embeddings: np.ndarray = None
        self._index_resources()

    def _index_symptoms(self):
        """Indexes all symptom names, descriptions, and colloquial phrases into vector space."""
        corpus_entries = []
        phrases_to_encode = []

        for symptom in SEED_DATA["symptoms"]:
            s_id = symptom["id"]
            s_name = symptom["name"]
            s_desc = symptom["description"]

            # Main concept
            phrases_to_encode.append(f"{s_name}. {s_desc}")
            corpus_entries.append({
                "symptom_id": s_id,
                "name": s_name,
                "phrase": s_name,
                "is_primary": True
            })

            # Synonyms & natural language colloquialisms
            for synonym in symptom.get("synonyms", []):
                phrases_to_encode.append(synonym)
                corpus_entries.append({
                    "symptom_id": s_id,
                    "name": s_name,
                    "phrase": synonym,
                    "is_primary": False
                })

        self.symptom_corpus = corpus_entries
        self.symptom_embeddings = self.model.encode(
            phrases_to_encode, 
            convert_to_numpy=True, 
            normalize_embeddings=True
        )
        logger.info(f"Indexed {len(self.symptom_corpus)} symptom phrases into vector embeddings.")

    def _index_resources(self):
        """Indexes all educational resources, articles, and wellness guidance into vector space."""
        corpus = []
        texts = []

        for res in SEED_DATA["resources"]:
            text_rep = f"{res['title']} - {res['category']}. {res['summary']}. Tags: {', '.join(res.get('tags', []))}"
            texts.append(text_rep)
            corpus.append(res)

        self.resource_corpus = corpus
        self.resource_embeddings = self.model.encode(
            texts, 
            convert_to_numpy=True, 
            normalize_embeddings=True
        )
        logger.info(f"Indexed {len(self.resource_corpus)} educational resources into vector embeddings.")

    def analyze_symptoms(self, text: str, threshold: float = 0.38) -> List[Dict[str, Any]]:
        """
        Analyzes natural-language user descriptions.
        Calculates cosine similarity to map everyday phrasing to clinical/normalized symptoms.
        Example: "My stomach hurts during periods" -> maps to "cramps" (Menstrual Cramps).
        """
        if not text or not text.strip():
            return []

        # Generate normalized embedding for the input query
        query_embedding = self.model.encode(
            [text.strip()], 
            convert_to_numpy=True, 
            normalize_embeddings=True
        )[0]

        # Cosine similarity is dot product for normalized vectors
        similarities = np.dot(self.symptom_embeddings, query_embedding)

        # Aggregate top matches per distinct symptom_id
        symptom_scores: Dict[str, Dict[str, Any]] = {}
        for idx, score in enumerate(similarities):
            if score >= threshold:
                entry = self.symptom_corpus[idx]
                s_id = entry["symptom_id"]
                current = symptom_scores.get(s_id)
                if not current or score > current["confidence"]:
                    symptom_scores[s_id] = {
                        "symptom_id": s_id,
                        "name": entry["name"],
                        "confidence": float(round(score, 3)),
                        "matched_concept": entry["phrase"]
                    }

        # Sort by confidence descending
        results = sorted(symptom_scores.values(), key=lambda x: x["confidence"], reverse=True)
        return results

    def semantic_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Conducts semantic search over educational resources based on conceptual meaning.
        """
        if not query or not query.strip():
            return []

        query_embedding = self.model.encode(
            [query.strip()], 
            convert_to_numpy=True, 
            normalize_embeddings=True
        )[0]

        similarities = np.dot(self.resource_embeddings, query_embedding)
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            res = dict(self.resource_corpus[idx])
            res["relevance_score"] = round(score, 3)
            results.append(res)

        return results
