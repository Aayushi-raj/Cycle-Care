const express = require('express');
const router = express.Router();
const {
  analyzeSymptomText,
  semanticHealthSearch,
  getContextAwareRecommendations,
  exploreKnowledgeGraph,
} = require('../controllers/ai.controller');
const authenticateToken = require('../middleware/auth.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');

// 1. Semantic Symptom Understanding (NLP & Sentence Embeddings)
router.post('/symptom-analysis', optionalAuth, analyzeSymptomText);

// 2. Semantic Health Search (Meaning-based query across knowledge base)
router.get('/semantic-search', optionalAuth, semanticHealthSearch);

// 3. Context-Aware Recommendations (User cycle + graph traversal + nutrition)
router.post('/recommendations', optionalAuth, getContextAwareRecommendations);

// 4. Knowledge Graph Exploration (Neo4j / in-memory graph explorer)
router.get('/graph/explore', optionalAuth, exploreKnowledgeGraph);

module.exports = router;

