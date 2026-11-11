'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { aiService, RecommendationResponse, KnowledgeGraphData } from '@/services/aiService';
import { KnowledgeGraphVisualizer } from '@/components/KnowledgeGraphVisualizer';

const quickPrompts = [
  "My stomach hurts during periods",
  "Feeling bloated, irritable, and have severe lower back ache",
  "Pounding headache and extreme fatigue while bleeding",
  "Trouble sleeping, breast tenderness, and anxiety before my period",
];

const AssistantPage: React.FC = () => {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [inputQuery, setInputQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load initial graph data on page load
  useEffect(() => {
    aiService.getKnowledgeGraph(undefined, token)
      .then(data => setGraphData(data))
      .catch(err => console.error('Failed to load initial graph:', err));
  }, [token]);

  const handleAnalyze = async (queryText?: string) => {
    const textToAnalyze = queryText !== undefined ? queryText : inputQuery;
    if (!textToAnalyze.trim()) return;

    setAnalyzing(true);
    setErrorMessage(null);
    setLogSuccessMessage(null);

    try {
      const recData = await aiService.getRecommendations({ text: textToAnalyze }, token);
      setRecommendations(recData);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to process symptoms. Please ensure the AI service is active.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogAllDetected = async () => {
    if (!token || !recommendations?.detected_symptoms?.length) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const promises = recommendations.detected_symptoms.map(s => {
        return fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/symptoms/symptoms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            date: today,
            symptomType: s.symptom_id,
            severity: Math.round(s.confidence * 4) + 1, // Estimate severity 1-5
          })
        });
      });

      await Promise.all(promises);
      setLogSuccessMessage(`Successfully logged ${recommendations.detected_symptoms.length} symptoms to your CycleCare records!`);
    } catch (err: any) {
      console.error('Failed to auto-log symptoms:', err);
      setErrorMessage('Could not save symptoms automatically. You can log them manually on the Symptoms page.');
    }
  };

  if (authLoading) {
    return <div className="loading">Loading AI Health Assistant...</div>;
  }

  return (
    <div className="assistant-container animate-fade-in">
      <header className="assistant-header">
        <div className="badge-pill">AI Knowledge Graph & NLP</div>
        <h1>AI Health Assistant</h1>
        <p className="subtitle">
          Describe how you feel in everyday language. Our Semantic Engine & Neo4j Health Knowledge Graph
          identify connected symptoms, biological pathways, and personalized nutrition.
        </p>
      </header>

      {/* Natural Language Input Box */}
      <div className="glass-card query-card">
        <h3>How are you feeling today?</h3>
        <p className="hint-text">
          Express yourself freely. For example: &quot;My stomach hurts during periods&quot;, &quot;Feeling drained and having lower back tension&quot;.
        </p>

        <textarea
          className="symptom-textarea"
          rows={3}
          placeholder="Type your symptoms or how your body feels right now..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAnalyze();
            }
          }}
        />

        <div className="prompt-chips">
          <span className="chips-label">Try asking:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="chip"
              onClick={() => {
                setInputQuery(prompt);
                handleAnalyze(prompt);
              }}
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>

        <div className="action-row">
          <button
            className="btn btn-primary"
            onClick={() => handleAnalyze()}
            disabled={analyzing || !inputQuery.trim()}
          >
            {analyzing ? 'Analyzing with Knowledge Graph...' : 'Analyze Symptoms & Get Guidance ✨'}
          </button>

          {graphData && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowGraph(!showGraph)}
            >
              {showGraph ? 'Hide Knowledge Graph' : 'Explore Knowledge Graph 🕸️'}
            </button>
          )}
        </div>

        {errorMessage && <div className="error-alert">{errorMessage}</div>}
        {logSuccessMessage && <div className="success-alert">{logSuccessMessage}</div>}
      </div>

      {/* Interactive Graph View */}
      {showGraph && graphData && (
        <KnowledgeGraphVisualizer
          data={graphData}
          activeSymptomId={recommendations?.detected_symptoms?.[0]?.symptom_id}
        />
      )}

      {/* Recommendation Results */}
      {recommendations && (
        <div className="results-wrapper animate-fade-in">
          {/* Medical Disclaimer Banner */}
          <div className="disclaimer-banner">
            <span className="disclaimer-icon">🩺</span>
            <div>
              <strong>Medical Disclaimer:</strong> {recommendations.medical_disclaimer}
            </div>
          </div>

          <div className="results-grid">
            {/* Detected Symptoms Card */}
            <div className="glass-card detected-card">
              <div className="card-top">
                <h3>Semantic Symptom Recognition</h3>
                <span className="pill-metric">{recommendations.detected_symptoms.length} Detected</span>
              </div>
              <p className="card-sub">
                Mapped from your description using Sentence Transformers cosine matching:
              </p>

              {recommendations.detected_symptoms.length === 0 ? (
                <p className="no-symptoms">No clear symptoms matched. Try describing specific sensations like cramps, fatigue, or headache.</p>
              ) : (
                <div className="symptoms-list">
                  {recommendations.detected_symptoms.map((s, i) => (
                    <div key={i} className="symptom-item">
                      <div className="symptom-header">
                        <strong>{s.name}</strong>
                        <span className="confidence-pill">
                          {Math.round(s.confidence * 100)}% match
                        </span>
                      </div>
                      <div className="matched-from">
                        Matched concept: <em>&ldquo;{s.matched_concept}&rdquo;</em>
                      </div>
                    </div>
                  ))}

                  <button
                    className="btn btn-secondary full-width log-all-btn"
                    onClick={handleLogAllDetected}
                  >
                    📝 Log These Symptoms to My Profile
                  </button>
                </div>
              )}
            </div>

            {/* Cycle Phase Context */}
            <div className="glass-card phase-card">
              <h3>Cycle Phase & Physiology</h3>
              {recommendations.phase_context ? (
                <div className="phase-details">
                  <div className="phase-name">{recommendations.phase_context.name}</div>
                  <div className="day-range">{recommendations.phase_context.day_range}</div>
                  <p className="phase-desc">{recommendations.phase_context.description}</p>
                  <div className="care-focus-box">
                    <strong>Primary Care Focus:</strong>
                    <p>{recommendations.phase_context.care_focus}</p>
                  </div>
                </div>
              ) : (
                <p>Cycle phase context unavailable.</p>
              )}
            </div>
          </div>

          {/* Actionable Wellness Steps */}
          {recommendations.wellness_actions?.length > 0 && (
            <div className="glass-card wellness-card">
              <h3>Actionable Wellness & Care Strategies</h3>
              <ul className="wellness-list">
                {recommendations.wellness_actions.map((act, i) => (
                  <li key={i} className="wellness-item">
                    <span className="check-icon">✓</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Targeted Nutrition Suggestions */}
          {recommendations.nutrition_guidance?.length > 0 && (
            <div className="section-block">
              <h3>Targeted Nutrition Alleviating Your Symptoms</h3>
              <p className="section-sub">
                Derived from the Knowledge Graph: nutrients that counteract prostaglandins and physiological spasms.
              </p>
              <div className="nutrition-grid">
                {recommendations.nutrition_guidance.map((nut, i) => (
                  <div key={i} className="glass-card nut-card">
                    <div className="nut-header">
                      <h4>{nut.name}</h4>
                      <span className="targets-badge">Addresses: {nut.targets.join(', ')}</span>
                    </div>
                    <p className="nut-mechanism">{nut.mechanism}</p>
                    <div className="sources-box">
                      <strong>Rich Food Sources:</strong>
                      <div className="source-tags">
                        {nut.food_sources.map((src, idx) => (
                          <span key={idx} className="source-tag">{src}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relevant Conditions (Educational Patterns) */}
          {recommendations.associated_conditions?.length > 0 && (
            <div className="section-block">
              <h3>Educational Health Patterns &amp; Clinical Knowledge</h3>
              <p className="section-sub">
                Associated clinical concepts in the knowledge graph. Shown for informational context only.
              </p>
              <div className="conditions-grid">
                {recommendations.associated_conditions.map((cond, i) => (
                  <div key={i} className="glass-card cond-card">
                    <h4>{cond.name}</h4>
                    <p className="cond-desc">{cond.description}</p>
                    <div className="clinical-box">
                      <strong>Clinical Wellness Note:</strong>
                      <p>{cond.clinical_note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educational Resources */}
          {recommendations.educational_resources?.length > 0 && (
            <div className="section-block">
              <h3>Evidence-Based Educational Guides</h3>
              <div className="resources-grid">
                {recommendations.educational_resources.map((res, i) => (
                  <div key={i} className="glass-card res-card">
                    <span className="res-cat">{res.category}</span>
                    <h4>{res.title}</h4>
                    <p>{res.summary}</p>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="read-btn"
                    >
                      Read Full Clinical Guide &rarr;
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .assistant-container {
          padding-bottom: 5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .assistant-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .badge-pill {
          display: inline-block;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          padding: 0.3rem 1rem;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          margin-bottom: 0.8rem;
        }
        h1 {
          font-size: 2.8rem;
          margin-bottom: 0.8rem;
          color: var(--foreground);
        }
        .subtitle {
          font-size: 1.15rem;
          color: var(--text-muted);
          max-width: 750px;
          margin: 0 auto;
          line-height: 1.6;
        }
        .query-card {
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .query-card h3 {
          font-size: 1.4rem;
          margin-bottom: 0.4rem;
        }
        .hint-text {
          color: var(--text-muted);
          font-size: 0.95rem;
          margin-bottom: 1.2rem;
        }
        .symptom-textarea {
          width: 100%;
          padding: 1rem 1.2rem;
          border-radius: 14px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.7);
          font-family: inherit;
          font-size: 1.05rem;
          color: var(--foreground);
          resize: vertical;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .symptom-textarea:focus {
          border-color: var(--primary);
        }
        .prompt-chips {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin: 1.2rem 0;
        }
        .chips-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .chip {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 0.4rem 0.9rem;
          font-size: 0.85rem;
          cursor: pointer;
          color: var(--foreground);
          transition: all 0.2s ease;
        }
        .chip:hover {
          background: var(--primary-light);
          color: white;
          border-color: var(--primary-light);
        }
        .action-row {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        .error-alert {
          margin-top: 1rem;
          padding: 0.8rem 1rem;
          background: rgba(214, 48, 49, 0.1);
          color: var(--error);
          border-radius: 10px;
          font-size: 0.9rem;
        }
        .success-alert {
          margin-top: 1rem;
          padding: 0.8rem 1rem;
          background: rgba(0, 184, 148, 0.15);
          color: #047857;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .disclaimer-banner {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 14px;
          padding: 1.2rem;
          margin-bottom: 2rem;
          font-size: 0.9rem;
          color: #92400e;
          line-height: 1.5;
        }
        .disclaimer-icon {
          font-size: 1.6rem;
        }
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .pill-metric {
          background: rgba(255, 77, 148, 0.15);
          color: var(--primary);
          padding: 0.2rem 0.7rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .card-sub {
          font-size: 0.88rem;
          color: var(--text-muted);
          margin-bottom: 1.2rem;
        }
        .symptoms-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .symptom-item {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 0.8rem 1rem;
        }
        .symptom-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .confidence-pill {
          font-size: 0.75rem;
          background: #dcfce7;
          color: #15803d;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          font-weight: 600;
        }
        .matched-from {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.3rem;
        }
        .log-all-btn {
          margin-top: 1rem;
        }
        .phase-details {
          margin-top: 1rem;
        }
        .phase-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--secondary);
        }
        .day-range {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 0.8rem;
        }
        .phase-desc {
          font-size: 0.95rem;
          color: var(--foreground);
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        .care-focus-box {
          background: rgba(108, 92, 231, 0.1);
          border-left: 3px solid var(--secondary);
          padding: 0.8rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .wellness-card {
          padding: 1.8rem;
          margin-bottom: 2rem;
        }
        .wellness-list {
          list-style: none;
          padding: 0;
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .wellness-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-size: 1rem;
        }
        .check-icon {
          color: var(--success);
          font-weight: bold;
          font-size: 1.1rem;
        }
        .section-block {
          margin-bottom: 2.5rem;
        }
        .section-block h3 {
          font-size: 1.5rem;
          margin-bottom: 0.3rem;
        }
        .section-sub {
          color: var(--text-muted);
          font-size: 0.95rem;
          margin-bottom: 1.2rem;
        }
        .nutrition-grid, .conditions-grid, .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .nut-card, .cond-card, .res-card {
          padding: 1.5rem;
        }
        .nut-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.8rem;
        }
        .targets-badge {
          font-size: 0.72rem;
          background: rgba(255, 77, 148, 0.12);
          color: var(--primary);
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-weight: 600;
        }
        .nut-mechanism {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          line-height: 1.4;
        }
        .sources-box strong {
          font-size: 0.85rem;
          display: block;
          margin-bottom: 0.4rem;
        }
        .source-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .source-tag {
          font-size: 0.78rem;
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-weight: 500;
        }
        .clinical-box {
          margin-top: 1rem;
          background: rgba(245, 158, 11, 0.1);
          border-left: 3px solid #f59e0b;
          padding: 0.7rem 0.9rem;
          border-radius: 8px;
          font-size: 0.85rem;
        }
        .res-cat {
          font-size: 0.75rem;
          color: var(--secondary);
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 0.3rem;
          display: block;
        }
        .read-btn {
          display: inline-block;
          margin-top: 1rem;
          color: var(--primary);
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
        }
        .read-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default AssistantPage;

