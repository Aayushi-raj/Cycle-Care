'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { aiService, SymptomMatch } from '@/services/aiService';

interface Log {
  id: string;
  date: string;
  symptomType: string;
  severity: number;
}

const SymptomPage = () => {
    const { user, token, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'symptoms' | 'moods'>('symptoms');
    const [symptoms, setSymptoms] = useState<Log[]>([]);
    const [moods, setMoods] = useState<any[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [symptomType, setSymptomType] = useState('cramps');
    const [moodType, setMoodType] = useState('happy');
    const [severity, setSeverity] = useState(1);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // AI Semantic Symptom Understanding State
    const [aiInput, setAiInput] = useState('');
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiMatches, setAiMatches] = useState<SymptomMatch[]>([]);
    const [aiNotice, setAiNotice] = useState<string | null>(null);

    const symptomOptions = ['cramps', 'headache', 'fatigue', 'bloating', 'acne', 'backache'];
    const moodOptions = ['happy', 'angry', 'sad', 'anxious', 'irritable', 'calm'];

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const fetchLogs = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/symptoms/symptoms`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setSymptoms(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMoods = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/symptoms/moods`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setMoods(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch moods:', error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchLogs();
            fetchMoods();
        }
    }, [token]);

    const handleLogSymptom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/symptoms/symptoms`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ date, symptomType, severity }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to log: Status ${response.status}`);
            }

            fetchLogs();
        } catch (err: any) {
            console.error(err.message);
        }
    };

    const handleLogMood = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/symptoms/moods`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ date, moodType }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to log: Status ${response.status}`);
            }

            fetchMoods();
        } catch (err: any) {
            console.error(err.message);
        }
    };

    const handleAiAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        setAiAnalyzing(true);
        setAiNotice(null);

        try {
            const data = await aiService.analyzeSymptoms(aiInput, token);
            setAiMatches(data.detected_symptoms);
            if (data.detected_symptoms.length === 0) {
                setAiNotice('No clear symptoms recognized. Try phrasing differently like "stomach hurts" or "throbbing headache".');
            }
        } catch (err: any) {
            console.error('AI Analysis failed:', err);
            setAiNotice('Could not connect to AI Semantic service. Please check back shortly.');
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleApplyAiMatch = async (match: SymptomMatch) => {
        // Set in manual form
        setSymptomType(match.symptom_id);
        const estimatedSeverity = Math.min(5, Math.max(1, Math.round(match.confidence * 4) + 1));
        setSeverity(estimatedSeverity);

        // Also log directly for convenient 1-click logging
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/symptoms/symptoms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    date,
                    symptomType: match.symptom_id,
                    severity: estimatedSeverity,
                }),
            });

            if (response.ok) {
                setAiNotice(`Logged "${match.name}" (Severity ${estimatedSeverity}) directly to your records!`);
                fetchLogs();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string, type: 'symptom' | 'mood') => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/symptoms/${type}s/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (type === 'symptom') fetchLogs();
            if (type === 'mood') fetchMoods();
        } catch (error) {
            console.error(`Failed to delete ${type}:`, error);
        }
    };

    if (authLoading || loading) return <div className="loading">Loading records...</div>;

    return (
        <div className="symptom-container animate-fade-in">
            <h1>Log Symptoms & Moods</h1>
            <p className="subtitle">Track how you feel throughout your cycle</p>

            <div className="tabs">
                <button 
                  className={`tab-btn ${activeTab === 'symptoms' ? 'active' : ''}`}
                  onClick={() => setActiveTab('symptoms')}
                >
                  Symptoms
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'moods' ? 'active' : ''}`}
                  onClick={() => setActiveTab('moods')}
                >
                  Moods
                </button>
            </div>

            {activeTab === 'symptoms' && (
                <div className="glass-card ai-nlp-card">
                    <div className="ai-nlp-header">
                        <span className="sparkle">✨</span>
                        <div>
                            <h3>Semantic Symptom Recognition</h3>
                            <p className="ai-nlp-desc">
                                Describe symptoms in everyday words (e.g. <em>&quot;My stomach hurts during periods&quot;</em>, <em>&quot;feeling drained and bloated&quot;</em>).
                                Our Sentence Transformers engine will identify the clinical match and retrieve alleviating nutrition from the Knowledge Graph.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleAiAnalyze} className="ai-nlp-form">
                        <input
                            type="text"
                            className="input-field ai-nlp-input"
                            placeholder="Type how you are feeling in natural language..."
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={aiAnalyzing || !aiInput.trim()}>
                            {aiAnalyzing ? 'Analyzing...' : 'Understand & Match 🔍'}
                        </button>
                    </form>

                    {aiNotice && <div className="ai-notice">{aiNotice}</div>}

                    {aiMatches.length > 0 && (
                        <div className="ai-matches-box">
                            <strong>Identified Symptoms from Graph:</strong>
                            <div className="ai-matches-grid">
                                {aiMatches.map(m => (
                                    <div key={m.symptom_id} className="ai-match-card">
                                        <div className="match-title">
                                            <strong>{m.name}</strong>
                                            <span className="confidence-tag">{Math.round(m.confidence * 100)}% match</span>
                                        </div>
                                        <div className="match-concept">Matched: &ldquo;{m.matched_concept}&rdquo;</div>
                                        {m.alleviating_nutrition && m.alleviating_nutrition.length > 0 && (
                                            <div className="match-nutrition">
                                                🥗 Graph Relief: {m.alleviating_nutrition.slice(0, 2).join(', ')}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleApplyAiMatch(m)}
                                        >
                                            + 1-Click Log This Symptom
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="symptom-layout">
                <div className="glass-card form-card">
                    <h3>Record {activeTab === 'symptoms' ? 'Symptom' : 'Mood'}</h3>
                    <form onSubmit={activeTab === 'symptoms' ? handleLogSymptom : handleLogMood}>
                        <div className="input-group">
                            <label className="input-label">Date</label>
                            <input
                                type="date"
                                className="input-field"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        
                        {activeTab === 'symptoms' ? (
                            <>
                                <div className="input-group">
                                    <label className="input-label">Symptom Type</label>
                                    <select
                                        className="input-field"
                                        value={symptomType}
                                        onChange={(e) => setSymptomType(e.target.value)}
                                    >
                                        {symptomOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Severity (1-5)</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        className="severity-slider"
                                        value={severity}
                                        onChange={(e) => setSeverity(parseInt(e.target.value))}
                                    />
                                    <div className="severity-value">Level: {severity}</div>
                                </div>
                            </>
                        ) : (
                            <div className="input-group">
                                <label className="input-label">Mood</label>
                                <select
                                    className="input-field"
                                    value={moodType}
                                    onChange={(e) => setMoodType(e.target.value)}
                                >
                                    {moodOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <button type="submit" className="btn btn-secondary full-width">
                            Save {activeTab === 'symptoms' ? 'Symptom' : 'Mood'}
                        </button>
                    </form>
                </div>

                <div className="logs-list">
                    <h3>Recent Logs</h3>
                    <div className="logs-grid">
                        {activeTab === 'symptoms' && symptoms.length === 0 && (
                            <div className="empty-state glass-card">No symptoms tracked.</div>
                        )}
                        {activeTab === 'moods' && moods.length === 0 && (
                            <div className="empty-state glass-card">No moods tracked.</div>
                        )}

                        {activeTab === 'symptoms' && symptoms.map(log => (
                            <div key={log.id} className="log-card glass-card">
                                <div className="log-info">
                                    <div className="log-date">{new Date(log.date).toLocaleDateString()}</div>
                                    <div className="log-type">{log.symptomType}</div>
                                    <div className="log-severity">Severity: <strong>{log.severity}</strong></div>
                                </div>
                                <button className="delete-btn" onClick={() => handleDelete(log.id, 'symptom')}>Delete</button>
                            </div>
                        ))}

                        {activeTab === 'moods' && moods.map(log => (
                            <div key={log.id} className="log-card glass-card">
                                <div className="log-info">
                                    <div className="log-date">{new Date(log.date).toLocaleDateString()}</div>
                                    <div className="log-type">{log.moodType}</div>
                                </div>
                                <button className="delete-btn" onClick={() => handleDelete(log.id, 'mood')}>Delete</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .symptom-container { padding-bottom: 4rem; }
                h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
                .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
                .tabs { display: flex; gap: 1rem; margin-bottom: 2rem; }
                .tab-btn { background: transparent; border: 2px solid var(--glass-border); padding: 0.5rem 2rem; border-radius: 50px; cursor: pointer; font-weight: 600; color: var(--text-muted); transition: all 0.3s ease; }
                .tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 10px rgba(255, 107, 129, 0.3); }
                .symptom-layout { display: grid; grid-template-columns: 1fr 2fr; gap: 3rem; align-items: start; }
                .form-card { padding: 2.5rem; }
                .input-field { background: var(--glass-bg); margin-top: 0.5rem; }
                .severity-slider { width: 100%; margin-top: 1rem; accent-color: var(--primary); }
                .severity-value { text-align: center; margin-top: 0.5rem; font-weight: 600; color: var(--primary); }
                .logs-grid { display: flex; flex-direction: column; gap: 1.5rem; }
                .log-card { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; }
                .log-date { font-weight: 600; font-size: 1.1rem; }
                .log-type { color: var(--primary); font-weight: 500; font-size: 0.9rem; text-transform: capitalize; }
                .log-severity { font-size: 0.85rem; color: var(--text-muted); }
                .delete-btn { background: transparent; border: none; color: var(--error); cursor: pointer; }
                .full-width { width: 100%; }
                .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }
                .ai-nlp-card { margin-bottom: 2.5rem; padding: 2rem; border-left: 4px solid var(--primary); }
                .ai-nlp-header { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1.2rem; }
                .sparkle { font-size: 1.8rem; }
                .ai-nlp-desc { font-size: 0.95rem; color: var(--text-muted); margin-top: 0.2rem; line-height: 1.5; }
                .ai-nlp-form { display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
                .ai-nlp-input { flex: 1; min-width: 280px; padding: 0.8rem 1.2rem; border-radius: 12px; border: 1px solid var(--glass-border); }
                .ai-notice { margin-top: 1rem; font-size: 0.9rem; color: var(--primary); font-weight: 500; }
                .ai-matches-box { margin-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 1rem; }
                .ai-matches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.8rem; }
                .ai-match-card { background: rgba(255, 255, 255, 0.7); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .match-title { display: flex; justify-content: space-between; align-items: center; }
                .confidence-tag { font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; }
                .match-concept { font-size: 0.82rem; color: var(--text-muted); }
                .match-nutrition { font-size: 0.8rem; color: #047857; background: rgba(16, 185, 129, 0.1); padding: 0.3rem 0.6rem; border-radius: 6px; }
                .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-top: 0.4rem; }
                @media (max-width: 900px) { .symptom-layout { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
};

export default SymptomPage;
