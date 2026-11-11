const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Calculates current cycle day and menstrual phase based on user's last cycle start date
 */
function calculateCurrentPhase(lastCycleStart, averageCycleLength = 28) {
  if (!lastCycleStart) {
    return { phase: 'follicular', cycleDay: 7 };
  }
  const today = new Date();
  const start = new Date(lastCycleStart);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays <= 0) {
    return { phase: 'menstrual', cycleDay: 1 };
  }

  const cycleDay = ((diffDays - 1) % averageCycleLength) + 1;

  let phase = 'follicular';
  if (cycleDay >= 1 && cycleDay <= 5) {
    phase = 'menstrual';
  } else if (cycleDay >= 6 && cycleDay <= 13) {
    phase = 'follicular';
  } else if (cycleDay >= 14 && cycleDay <= 16) {
    phase = 'ovulatory';
  } else {
    phase = 'luteal';
  }

  return { phase, cycleDay };
}

/**
 * 1. Semantic Symptom Understanding
 * Translates natural language descriptions into standardized symptoms and graph pathways
 */
const analyzeSymptomText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Symptom description text is required' });
    }

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/symptom-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      return res.status(aiResponse.status).json({ message: 'AI Semantic Service error', error: err });
    }

    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Analyze Symptom Text Error:', error);
    res.status(503).json({
      message: 'AI Semantic Service is temporarily unavailable',
      error: error.message
    });
  }
};

/**
 * 2. Semantic Health Search
 * Searches educational resources using sentence similarity
 */
const semanticHealthSearch = async (req, res) => {
  try {
    const { q, top_k } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Search query "q" is required' });
    }

    const queryParams = new URLSearchParams({
      q: q.trim(),
      top_k: top_k || '5',
    });

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/semantic-search?${queryParams.toString()}`);

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      return res.status(aiResponse.status).json({ message: 'AI Search error', error: err });
    }

    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Semantic Health Search Error:', error);
    res.status(503).json({
      message: 'AI Search Service is temporarily unavailable',
      error: error.message
    });
  }
};

/**
 * 3. Context-Aware Recommendations
 * Combines user's cycle records from PostgreSQL + symptoms + Neo4j Knowledge Graph
 */
const getContextAwareRecommendations = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { text, symptoms: requestedSymptoms, phase: userOverridePhase } = req.body;

    let computedPhase = 'menstrual';
    let computedCycleDay = 1;
    let userRecentSymptoms = [];

    // If user is authenticated, retrieve their real cycle context from database
    if (userId) {
      const recentCycles = await prisma.cycle.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: 3,
      });

      if (recentCycles.length > 0) {
        // Calculate average cycle length if available
        let avgLength = 28;
        const recordedLengths = recentCycles.map(c => c.cycleLength).filter(Boolean);
        if (recordedLengths.length > 0) {
          avgLength = Math.round(recordedLengths.reduce((a, b) => a + b, 0) / recordedLengths.length);
        }

        const phaseInfo = calculateCurrentPhase(recentCycles[0].startDate, avgLength);
        computedPhase = phaseInfo.phase;
        computedCycleDay = phaseInfo.cycleDay;
      }

      // Fetch symptoms logged in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogs = await prisma.symptomLog.findMany({
        where: {
          userId,
          date: { gte: sevenDaysAgo },
        },
        select: { symptomType: true },
      });

      userRecentSymptoms = recentLogs.map(l => l.symptomType);
    }

    // Merge requested symptoms with user's recent symptoms
    const mergedSymptoms = Array.from(new Set([
      ...(requestedSymptoms || []),
      ...userRecentSymptoms,
    ]));

    const targetPhase = userOverridePhase || computedPhase;

    // Call Python Semantic & Graph Engine
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text || undefined,
        symptoms: mergedSymptoms,
        phase: targetPhase,
        cycle_day: computedCycleDay,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      return res.status(aiResponse.status).json({ message: 'AI Recommender error', error: err });
    }

    const data = await aiResponse.json();
    res.json({
      ...data,
      user_cycle_context: {
        computed_phase: computedPhase,
        computed_cycle_day: computedCycleDay,
        recent_logged_symptoms: userRecentSymptoms,
      },
    });
  } catch (error) {
    console.error('Context-Aware Recommendations Error:', error);
    res.status(503).json({
      message: 'AI Recommendation Service is temporarily unavailable',
      error: error.message
    });
  }
};

/**
 * 4. Knowledge Graph Visualizer / Explorer
 */
const exploreKnowledgeGraph = async (req, res) => {
  try {
    const { symptom, phase } = req.query;
    const queryParams = new URLSearchParams();
    if (symptom) queryParams.append('symptom', symptom);
    if (phase) queryParams.append('phase', phase);

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/graph/explore?${queryParams.toString()}`);

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      return res.status(aiResponse.status).json({ message: 'Graph Explorer error', error: err });
    }

    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Explore Knowledge Graph Error:', error);
    res.status(503).json({
      message: 'Knowledge Graph Service is temporarily unavailable',
      error: error.message
    });
  }
};

module.exports = {
  analyzeSymptomText,
  semanticHealthSearch,
  getContextAwareRecommendations,
  exploreKnowledgeGraph,
};

