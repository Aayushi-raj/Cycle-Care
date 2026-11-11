'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { aiService, EducationalResource } from '@/services/aiService';

interface Insights {
  averageCycleLength: number;
  predictedNextPeriod: string | null;
  frequentSymptoms: string[];
  recentCycles: any[];
}

const DashboardPage = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Semantic Health Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EducationalResource[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSemanticSearch = async (queryText?: string) => {
    const q = queryText !== undefined ? queryText : searchQuery;
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const data = await aiService.searchResources(q, token);
      setSearchResults(data.results);
    } catch (err: any) {
      console.error(err);
      setSearchError('Search service temporarily unavailable');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/dashboard/insights`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setInsights(data);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInsights();
    }
  }, [token]);

  if (authLoading || loading) {
    return <div className="loading">Loading your dashboard...</div>;
  }

  const isPeriodApproaching = () => {
    if (!insights?.predictedNextPeriod) return false;
    const predicted = new Date(insights.predictedNextPeriod);
    const today = new Date();
    const diffTime = predicted.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  const wellnessArticles = [
    {
      title: "Nutrition for your Cycle",
      excerpt: "Discover what to eat during your period to naturally reduce cramps and boost energy levels.",
      category: "Diet",
      emoji: "🥗",
      bgColor: "rgba(255, 107, 129, 0.1)",
      color: "var(--primary)",
      url: "https://www.healthline.com/health/womens-health/what-to-eat-during-period"
    },
    {
      title: "10 Fast Facts on Menstrual Health",
      excerpt: "Did you know? Learn crucial facts about menstrual hygiene and health globally from UNICEF.",
      category: "Education",
      emoji: "🌍",
      bgColor: "rgba(249, 202, 36, 0.15)",
      color: "#f0932b",
      url: "https://www.unicef.org/press-releases/10-fast-facts-menstrual-health-schools"
    },
    {
      title: "Yoga for Menstruation",
      excerpt: "A comprehensive guide to yoga practices that soothe cramps and restore balance during your cycle.",
      category: "Fitness",
      emoji: "🧘‍♀️",
      bgColor: "rgba(104, 109, 224, 0.1)",
      color: "#686de0",
      url: "https://www.yogapoint.com/yoga-poses/yoga-for-menstruation.htm"
    }
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <h1>Welcome, {user?.name || 'Friend'} 🌸</h1>
        <p>Your Health at a Glance</p>
      </header>

      <div className="dashboard-grid">
        {/* Prediction Card */}
        <div className={`glass-card prediction-card ${isPeriodApproaching() ? 'glowing-alert' : ''}`}>
          <div className="card-header">
            <h3>Predicted Next Period</h3>
            <span className="badge">AI Insight</span>
          </div>
          <div className="prediction-date">
            {insights?.predictedNextPeriod 
              ? new Date(insights.predictedNextPeriod).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
              : 'Log your first cycle to get predictions'}
          </div>
          <div className="average-info">
            Your average cycle is <strong>{insights?.averageCycleLength || 28}</strong> days
          </div>
          {isPeriodApproaching() && (
            <div className="reminder-alert animate-pulse">
               🔔 Reminder: Your period is predicted to start soon!
            </div>
          )}
        </div>

        {/* Symptoms Overview */}
        <div className="glass-card symptoms-card">
          <h3>Common Symptoms</h3>
          <div className="symptom-tags">
            {insights?.frequentSymptoms && insights.frequentSymptoms.length > 0 ? (
              insights.frequentSymptoms.map((s) => (
                <span key={s} className="tag">{s}</span>
              ))
            ) : (
              <p className="empty-text">No symptoms logged yet</p>
            )}
          </div>
          <button className="btn btn-secondary" onClick={() => router.push('/symptoms')}>Log Symptoms</button>
        </div>

        {/* Quick Actions */}
        <div className="glass-card actions-card">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => router.push('/assistant')}>AI Assistant ✨</button>
            <button className="btn btn-secondary" onClick={() => router.push('/cycles')}>Log New Cycle</button>
            <button className="btn btn-outline" onClick={() => router.push('/symptoms')}>Log Symptoms</button>
          </div>
        </div>
      </div>

      {/* Visual Insights Chart */}
      {insights?.recentCycles && insights.recentCycles.length > 0 && (
        <div className="glass-card insights-card">
          <h3>Cycle Length History</h3>
          <div className="chart-container">
            {insights.recentCycles.slice().reverse().map((c, i) => {
               const length = c.length || insights.averageCycleLength;
               const heightRatio = Math.min(100, (length / 40) * 100); // Normalize height assuming max cycle is ~40 days
               return (
                <div key={i} className="chart-bar-wrapper">
                  <div className="chart-bar" style={{ height: `${heightRatio}%` }}>
                    <span className="bar-value">{length}</span>
                  </div>
                  <div className="bar-date">{new Date(c.startDate).toLocaleDateString(undefined, { month: 'short' })}</div>
                </div>
               );
            })}
          </div>
        </div>
      )}

      {/* Wellness & Semantic Health Search Section */}
      <div className="wellness-section animate-fade-in">
        <div className="section-header">
           <div className="section-title-wrap">
             <h3>Semantic Health Knowledge Search 🔍</h3>
             <p>Search evidence-based clinical guides and cycle wellness resources by everyday meaning</p>
           </div>
        </div>

        {/* Semantic Search Bar */}
        <div className="search-bar-wrap glass-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSemanticSearch();
            }}
            className="search-form"
          >
            <input
              type="text"
              className="search-input"
              placeholder="Search by concept (e.g., 'what should I eat when bleeding heavily?', 'foods for period cramps', 'how to sleep better')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={searching || !searchQuery.trim()}>
              {searching ? 'Searching...' : 'Search Guides'}
            </button>
            {searchResults && (
              <button type="button" className="btn btn-outline" onClick={handleClearSearch}>
                Clear
              </button>
            )}
          </form>

          <div className="sample-searches">
            <span>Popular topics:</span>
            {[
              "what to eat when bleeding heavily",
              "how to relieve severe cramps",
              "fatigue and iron loss",
              "yoga poses for period pain"
            ].map((topic, i) => (
              <button
                key={i}
                type="button"
                className="sample-chip"
                onClick={() => {
                  setSearchQuery(topic);
                  handleSemanticSearch(topic);
                }}
              >
                {topic}
              </button>
            ))}
          </div>

          {searchError && <div className="search-error">{searchError}</div>}
        </div>

        {/* Search Results or Default Curated Guides */}
        {searchResults ? (
          <div className="search-results-section animate-fade-in">
            <div className="results-status">
              <h4>Matched Resources ({searchResults.length})</h4>
              <span className="results-badge">Semantic Cosine Similarity</span>
            </div>

            {searchResults.length === 0 ? (
              <p className="no-results">No specific guides matched that query. Try rephrasing your question.</p>
            ) : (
              <div className="articles-grid">
                {searchResults.map((article, idx) => (
                  <div key={idx} className="glass-card article-card semantic-card">
                    <div className="card-badge-row">
                      <span className="article-category">{article.category}</span>
                      {article.relevance_score !== undefined && (
                        <span className="similarity-tag">
                          {Math.round(article.relevance_score * 100)}% Match
                        </span>
                      )}
                    </div>
                    <h4>{article.title}</h4>
                    <p>{article.summary}</p>
                    {article.tags && article.tags.length > 0 && (
                      <div className="tags-row">
                        {article.tags.slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className="mini-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="read-more-btn">
                      Read Guide &rarr;
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="articles-grid">
            {wellnessArticles.map((article, idx) => (
              <div key={idx} className="glass-card article-card">
                <div className="article-icon" style={{ backgroundColor: article.bgColor }}>
                  {article.emoji}
                </div>
                <div className="article-content">
                  <span className="article-category" style={{ color: article.color }}>{article.category}</span>
                  <h4>{article.title}</h4>
                  <p>{article.excerpt}</p>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="read-more-btn" style={{ textDecoration: 'none' }}>Read More &rarr;</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-container {
          padding-bottom: 4rem;
        }
        .dashboard-header {
          margin-bottom: 3rem;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .dashboard-header p {
          color: var(--text-muted);
          font-size: 1.1rem;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }
        .prediction-card {
          grid-column: span 1;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .badge {
          background: var(--primary-light);
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .prediction-date {
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 1rem;
        }
        .average-info {
          color: var(--text-muted);
        }
        .symptoms-card, .actions-card {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .symptom-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
        }
        .tag {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: 0.9rem;
        }
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .btn-outline {
          background: transparent;
          border: 2px solid var(--secondary);
          color: var(--secondary);
        }
        .loading {
          text-align: center;
          padding: 5rem;
          font-size: 1.2rem;
        }
        .empty-text {
            color: var(--text-muted);
            font-style: italic;
        }

        @media (min-width: 1024px) {
            .prediction-card {
                grid-column: span 2;
            }
        }
        .glowing-alert {
          box-shadow: 0 0 15px rgba(255, 71, 87, 0.4);
          border: 1px solid rgba(255, 71, 87, 0.5);
        }
        .reminder-alert {
          margin-top: 1.5rem;
          padding: 0.8rem;
          background: rgba(255, 71, 87, 0.1);
          color: var(--primary);
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .insights-card {
           margin-top: 2rem;
        }
        .insights-card h3 { margin-bottom: 1.5rem; }
        .chart-container {
           display: flex;
           align-items: flex-end;
           gap: 1.5rem;
           height: 250px;
           padding-top: 20px;
           border-bottom: 1px solid var(--glass-border);
           overflow-x: auto;
           padding-bottom: 10px;
        }
        .chart-bar-wrapper {
           display: flex;
           flex-direction: column;
           align-items: center;
           justify-content: flex-end;
           height: 100%;
           min-width: 40px;
        }
        .chart-bar {
           width: 40px;
           background: linear-gradient(to top, var(--primary), var(--primary-light));
           border-radius: 6px 6px 0 0;
           display: flex;
           justify-content: center;
           align-items: flex-start;
           position: relative;
           transition: height 0.5s ease-out;
        }
        .bar-value {
           position: absolute;
           top: -25px;
           font-size: 0.85rem;
           font-weight: 600;
           color: var(--primary-dark);
        }
        .bar-date {
           margin-top: 0.8rem;
           font-size: 0.85rem;
           color: var(--text-muted);
        }
        
        /* Wellness Section Styles */
        .wellness-section {
           margin-top: 3rem;
        }
        .section-header {
           margin-bottom: 1.5rem;
        }
        .section-header h3 {
           font-size: 1.5rem;
           margin-bottom: 0.2rem;
        }
        .section-header p {
           color: var(--text-muted);
           font-size: 1rem;
        }
        .articles-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
           gap: 1.5rem;
        }
        .article-card {
           display: flex;
           flex-direction: column;
           gap: 1.2rem;
           transition: transform 0.3s ease, box-shadow 0.3s ease;
           padding: 2rem;
        }
        .article-card:hover {
           transform: translateY(-5px);
           box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        }
        .article-icon {
           width: 50px;
           height: 50px;
           border-radius: 12px;
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 1.5rem;
        }
        .article-category {
           font-size: 0.8rem;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.5px;
           margin-bottom: 0.5rem;
           display: inline-block;
        }
        .article-content h4 {
           font-size: 1.2rem;
           margin-bottom: 0.8rem;
           color: var(--primary-dark);
           line-height: 1.4;
        }
        .article-content p {
           font-size: 0.95rem;
           color: var(--text-muted);
           margin-bottom: 1.5rem;
           line-height: 1.5;
        }
        .read-more-btn {
           background: transparent;
           border: none;
           color: var(--foreground);
           font-weight: 600;
           font-size: 0.9rem;
           padding: 0;
           cursor: pointer;
           display: flex;
           align-items: center;
           transition: color 0.2s ease;
        }
        .read-more-btn:hover {
           color: var(--primary);
        }
        .search-bar-wrap {
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        .search-form {
          display: flex;
          gap: 0.8rem;
          flex-wrap: wrap;
        }
        .search-input {
          flex: 1;
          min-width: 280px;
          padding: 0.8rem 1.2rem;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.8);
          font-family: inherit;
          font-size: 0.95rem;
          outline: none;
        }
        .search-input:focus {
          border-color: var(--primary);
        }
        .sample-searches {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .sample-chip {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 0.25rem 0.7rem;
          font-size: 0.8rem;
          cursor: pointer;
          color: var(--foreground);
          transition: all 0.2s ease;
        }
        .sample-chip:hover {
          background: var(--primary-light);
          color: white;
        }
        .search-error {
          margin-top: 0.8rem;
          color: var(--error);
          font-size: 0.85rem;
        }
        .results-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .results-badge {
          font-size: 0.75rem;
          background: #dbeafe;
          color: #1e40af;
          padding: 0.2rem 0.6rem;
          border-radius: 14px;
          font-weight: 600;
        }
        .no-results {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
        }
        .semantic-card {
          border-top: 4px solid var(--secondary);
        }
        .card-badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .similarity-tag {
          font-size: 0.75rem;
          background: #dcfce7;
          color: #15803d;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          font-weight: 700;
        }
        .tags-row {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .mini-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(0, 0, 0, 0.04);
          padding: 0.15rem 0.4rem;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
