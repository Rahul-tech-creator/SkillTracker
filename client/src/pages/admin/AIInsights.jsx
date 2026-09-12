import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconBrain, IconTarget, IconBarChart, IconBookOpen, IconDollarSign, IconCheckCircle, IconZap } from '../../components/common/Icons';

export const AdminAIInsights = () => {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconBrain size={26} color="#a78bfa" /> Grok AI Intelligence Hub
          </h1>
          <p className="page-subtitle">
            Centralized evidence-grounded intelligence overview for vocational skills, curriculum optimization, and grant funding
          </p>
        </div>
      </div>

      {/* Model & Architecture Overview Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(15, 23, 42, 0.7) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(139, 92, 246, 0.2)', borderRadius: '12px', color: '#a78bfa' }}>
            <IconBrain size={32} />
          </div>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                Evidence-Grounded AI Engine
              </h2>
              <span className="badge badge-primary" style={{ backgroundColor: '#8b5cf6' }}>xAI Grok Active</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '6px 0 12px 0' }}>
              Our architecture enforces strict anti-hallucination protocols: <strong>Real Database Records → Deterministic Mathematical Calculation → Grok AI Interpretation → Human Administrator Decision.</strong> AI outputs never invent numerical benchmarks or override calculated provider rankings.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconCheckCircle size={14} color="#10b981" /> No fake/hardcoded scores
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconCheckCircle size={14} color="#10b981" /> Sample-size aware benchmarking
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconCheckCircle size={14} color="#10b981" /> In-memory 24h caching with input hashing
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Modules Grid */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
        AI Intelligence Modules
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Skill Gap Intelligence */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
              <div style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#ef4444' }}>
                <IconTarget size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Skill Gap Intelligence</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Evaluates individual and cohort question responses to isolate specific sub-topic deficiencies and prescribe targeted remedial action plans.
            </p>
          </div>
          <Link to="/admin/skill-gaps" className="btn btn-secondary btn-block">
            Open Skill Gap Analytics →
          </Link>
        </div>

        {/* Module 2: Provider Benchmarking */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
              <div style={{ padding: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: '8px', color: '#3b82f6' }}>
                <IconBarChart size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Provider Comparative Intelligence</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Synthesizes multi-dimensional provider metrics into transparent comparative rankings with data confidence indicators.
            </p>
          </div>
          <Link to="/admin/provider-comparison" className="btn btn-secondary btn-block">
            Open Provider Benchmarking →
          </Link>
        </div>

        {/* Module 3: Course Curriculum Auditing */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
              <div style={{ padding: '8px', backgroundColor: 'rgba(139, 92, 246, 0.15)', borderRadius: '8px', color: '#8b5cf6' }}>
                <IconBookOpen size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Curriculum & Outcome Audit</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Analyzes employment retention and training relevance across different courses to recommend curriculum updates.
            </p>
          </div>
          <Link to="/admin/course-comparison" className="btn btn-secondary btn-block">
            Open Course Benchmarking →
          </Link>
        </div>

        {/* Module 4: Scheme Funding Allocation */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
              <div style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#10b981' }}>
                <IconDollarSign size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Funding & Grant Optimization</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Recommends provider grant allocations backed by historical track records, with hard mathematical budget limits.
            </p>
          </div>
          <Link to="/admin/funding-schemes" className="btn btn-secondary btn-block">
            Open Scheme Funding →
          </Link>
        </div>
      </div>
    </div>
  );
};
