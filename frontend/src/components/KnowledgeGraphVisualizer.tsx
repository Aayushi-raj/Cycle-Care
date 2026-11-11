'use client';

import React, { useState } from 'react';
import { KnowledgeGraphData, GraphNode } from '@/services/aiService';

interface Props {
  data: KnowledgeGraphData;
  activeSymptomId?: string | null;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Symptom: { bg: '#ffeef5', border: '#ff4d94', text: '#e6006e' },
  MenstrualPhase: { bg: '#f3e8ff', border: '#9333ea', text: '#7e22ce' },
  HealthCondition: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
  Nutrition: { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
  EducationalResource: { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1' },
};

export const KnowledgeGraphVisualizer: React.FC<Props> = ({ data, activeSymptomId }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const filteredNodes = data.nodes.filter(n => filterType === 'all' || n.type === filterType);
  const nodeMap = new Map(data.nodes.map(n => [n.id, n]));

  // Find connections for the selected or active node
  const focusNodeId = selectedNode?.id || activeSymptomId;
  const connectedLinks = focusNodeId
    ? data.links.filter(l => l.source === focusNodeId || l.target === focusNodeId)
    : [];

  return (
    <div className="kg-container">
      <div className="kg-header">
        <div>
          <h4>Health Knowledge Graph Explorer</h4>
          <span className="backend-badge">Engine: {data.backend}</span>
        </div>
        <div className="filter-chips">
          {['all', 'Symptom', 'MenstrualPhase', 'Nutrition', 'HealthCondition', 'EducationalResource'].map(type => (
            <button
              key={type}
              className={`chip-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? 'All Entities' : type}
            </button>
          ))}
        </div>
      </div>

      <div className="kg-body">
        <div className="graph-grid">
          {filteredNodes.map(node => {
            const colors = TYPE_COLORS[node.type] || { bg: '#f1f5f9', border: '#64748b', text: '#334155' };
            const isSelected = selectedNode?.id === node.id || activeSymptomId === node.id;

            return (
              <div
                key={node.id}
                className={`graph-node-card ${isSelected ? 'selected' : ''}`}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: isSelected ? 'var(--primary)' : colors.border,
                }}
                onClick={() => setSelectedNode(node)}
              >
                <div className="node-type" style={{ color: colors.text }}>
                  {node.type}
                </div>
                <div className="node-label">{node.label}</div>
              </div>
            );
          })}
        </div>

        {/* Selected Node Details & Connected Relationships */}
        {selectedNode && (
          <div className="node-inspector animate-fade-in">
            <div className="inspector-header">
              <h5>{selectedNode.label}</h5>
              <span className="badge" style={{ backgroundColor: TYPE_COLORS[selectedNode.type]?.border || '#64748b', color: '#fff' }}>
                {selectedNode.type}
              </span>
            </div>

            <h6>Connected Knowledge Relationships ({connectedLinks.length}):</h6>
            {connectedLinks.length === 0 ? (
              <p className="empty-connections">No direct relationships found for this view.</p>
            ) : (
              <ul className="links-list">
                {connectedLinks.map((link, idx) => {
                  const isSource = link.source === selectedNode.id;
                  const partnerId = isSource ? link.target : link.source;
                  const partner = nodeMap.get(partnerId);

                  return (
                    <li key={idx} className="link-item">
                      <span className="rel-tag">{link.type.replace(/_/g, ' ')}</span>
                      <span className="arrow">{isSource ? '→' : '←'}</span>
                      <strong className="partner-name">{partner?.label || partnerId}</strong>
                      <span className="partner-type">({partner?.type})</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .kg-container {
          background: var(--card-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius);
          padding: 1.5rem;
          margin-top: 1.5rem;
        }
        .kg-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding-bottom: 1rem;
        }
        .backend-badge {
          display: inline-block;
          font-size: 0.75rem;
          background: rgba(16, 185, 129, 0.15);
          color: #047857;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-weight: 600;
          margin-top: 0.3rem;
        }
        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .chip-btn {
          background: transparent;
          border: 1px solid var(--glass-border);
          padding: 0.35rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          cursor: pointer;
          color: var(--foreground);
          transition: all 0.2s ease;
        }
        .chip-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .graph-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .graph-node-card {
          border: 2px solid;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .graph-node-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .graph-node-card.selected {
          border-width: 3px;
          box-shadow: 0 0 0 3px rgba(255, 77, 148, 0.25);
        }
        .node-type {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.2rem;
        }
        .node-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #1e293b;
        }
        .node-inspector {
          margin-top: 1.5rem;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 1.2rem;
        }
        .inspector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .inspector-header h5 {
          font-size: 1.1rem;
          color: var(--primary-dark);
        }
        .links-list {
          list-style: none;
          padding: 0;
          margin-top: 0.6rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 0.8rem;
        }
        .link-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          background: #ffffff;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .rel-tag {
          font-size: 0.7rem;
          background: #f1f5f9;
          color: #475569;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 600;
        }
        .arrow {
          color: var(--primary);
          font-weight: bold;
        }
        .partner-name {
          color: #0f172a;
        }
        .partner-type {
          font-size: 0.75rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

