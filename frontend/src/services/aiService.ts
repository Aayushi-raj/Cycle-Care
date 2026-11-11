const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface SymptomMatch {
  symptom_id: string;
  name: string;
  confidence: number;
  matched_concept: string;
  associated_phases?: string[];
  alleviating_nutrition?: string[];
  knowledge_graph?: {
    symptom: {
      id: string;
      name: string;
      category: string;
      description: string;
    };
    associated_phases: Array<{ id: string; name: string; day_range: string }>;
    possible_conditions: Array<{ id: string; name: string; description: string; clinical_note: string }>;
    alleviating_nutrition: Array<{ id: string; name: string; food_sources: string[]; mechanism: string }>;
    connected_resources: Array<{ id: string; title: string; category: string; summary: string; url: string }>;
  };
}

export interface SemanticAnalysisResponse {
  input_text: string;
  detected_symptoms: SymptomMatch[];
  suggested_discrete_log: string[];
  disclaimer: string;
}

export interface EducationalResource {
  id: string;
  title: string;
  category: string;
  phase?: string;
  summary: string;
  tags?: string[];
  url: string;
  relevance_score?: number;
}

export interface SemanticSearchResponse {
  query: string;
  total_results: number;
  results: EducationalResource[];
  disclaimer: string;
}

export interface NutritionGuidance {
  id: string;
  name: string;
  food_sources: string[];
  mechanism: string;
  targets: string[];
  efficacy_score?: number;
}

export interface RecommendationResponse {
  query_analyzed: string;
  detected_symptoms: SymptomMatch[];
  resolved_symptoms: Array<{ id: string; name: string; category: string; description: string }>;
  phase_context?: {
    id: string;
    name: string;
    day_range: string;
    description: string;
    care_focus: string;
  };
  cycle_day?: number;
  nutrition_guidance: NutritionGuidance[];
  wellness_actions: string[];
  associated_conditions: Array<{
    id: string;
    name: string;
    description: string;
    clinical_note: string;
    associated_symptoms: string[];
  }>;
  educational_resources: EducationalResource[];
  graph_backend: string;
  medical_disclaimer: string;
  user_cycle_context?: {
    computed_phase: string;
    computed_cycle_day: number;
    recent_logged_symptoms: string[];
  };
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

export interface KnowledgeGraphData {
  backend: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

export const aiService = {
  async analyzeSymptoms(text: string, token?: string | null): Promise<SemanticAnalysisResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/ai/symptom-analysis`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to analyze symptoms');
    }
    return res.json();
  },

  async searchResources(query: string, token?: string | null): Promise<SemanticSearchResponse> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/ai/semantic-search?q=${encodeURIComponent(query)}`, {
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to perform semantic health search');
    }
    return res.json();
  },

  async getRecommendations(
    payload: { text?: string; symptoms?: string[]; phase?: string },
    token?: string | null
  ): Promise<RecommendationResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/ai/recommendations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to retrieve recommendations');
    }
    return res.json();
  },

  async getKnowledgeGraph(params?: { symptom?: string; phase?: string }, token?: string | null): Promise<KnowledgeGraphData> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const query = new URLSearchParams();
    if (params?.symptom) query.append('symptom', params.symptom);
    if (params?.phase) query.append('phase', params.phase);

    const res = await fetch(`${API_URL}/api/ai/graph/explore?${query.toString()}`, {
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to explore knowledge graph');
    }
    return res.json();
  },
};

