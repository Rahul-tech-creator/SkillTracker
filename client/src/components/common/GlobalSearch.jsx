import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../../services/api';
import { IconSearch, IconClose, IconUsers, IconBuilding, IconBookOpen, IconBriefcase } from './Icons';

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchService.globalSearch(query.trim());
        setResults(res.data?.data || null);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const totalHits = results
    ? (results.trainees?.length || 0) +
      (results.providers?.length || 0) +
      (results.courses?.length || 0) +
      (results.outcomes?.length || 0)
    : 0;

  return (
    <>
      <button
        className="navbar-search-trigger"
        onClick={() => setIsOpen(true)}
        title="Global Search (Ctrl+K)"
        type="button"
      >
        <IconSearch size={15} />
        <span className="search-placeholder">Search trainees, providers, courses...</span>
        <kbd className="search-kbd">Ctrl K</kbd>
      </button>

      {isOpen && (
        <div className="global-search-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="global-search-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="search-dialog-header">
              <IconSearch size={18} className="search-dialog-icon" />
              <input
                ref={inputRef}
                type="text"
                className="search-dialog-input"
                placeholder="Type trainee ID (e.g. TRN-), name, provider, course or employer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="search-clear-btn"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <IconClose size={16} />
                </button>
              )}
            </div>

            <div className="search-dialog-body">
              {loading && (
                <div className="search-loading-state">
                  <span className="spinner-sm"></span> Searching platform registry...
                </div>
              )}

              {!loading && query.trim().length >= 2 && totalHits === 0 && (
                <div className="search-empty-state">
                  <p>No matching records found for "{query}".</p>
                  <small>Try searching by internal ID (TRN-...), trainee name, district, course, or provider.</small>
                </div>
              )}

              {!loading && results && (
                <div className="search-results-container">
                  {/* Trainees */}
                  {results.trainees?.length > 0 && (
                    <div className="search-result-group">
                      <div className="search-group-title">
                        <IconUsers size={14} />
                        <span>Trainees ({results.trainees.length})</span>
                      </div>
                      {results.trainees.map((t) => (
                        <div
                          key={t._id}
                          className="search-result-item"
                          onClick={() => handleSelect('/admin/trainees')}
                        >
                          <div className="item-main">
                            <span className="item-title">{t.fullName}</span>
                            <span className="item-badge">{t.internalTraineeId || 'Unassigned ID'}</span>
                          </div>
                          <div className="item-sub">
                            <span>{t.district ? `${t.district}, ${t.state}` : 'National Candidate'}</span>
                            {t.provider && <span> • Provider: {t.provider.name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Providers */}
                  {results.providers?.length > 0 && (
                    <div className="search-result-group">
                      <div className="search-group-title">
                        <IconBuilding size={14} />
                        <span>Training Providers ({results.providers.length})</span>
                      </div>
                      {results.providers.map((p) => (
                        <div
                          key={p._id}
                          className="search-result-item"
                          onClick={() => handleSelect('/admin/providers')}
                        >
                          <div className="item-main">
                            <span className="item-title">{p.name}</span>
                            <span className="item-badge">{p.code || 'PRV'}</span>
                          </div>
                          <div className="item-sub">
                            <span>{p.district}, {p.state}</span>
                            {p.tier && <span> • Tier {p.tier}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Courses */}
                  {results.courses?.length > 0 && (
                    <div className="search-result-group">
                      <div className="search-group-title">
                        <IconBookOpen size={14} />
                        <span>Curricula & Courses ({results.courses.length})</span>
                      </div>
                      {results.courses.map((c) => (
                        <div
                          key={c._id}
                          className="search-result-item"
                          onClick={() => handleSelect('/admin/courses')}
                        >
                          <div className="item-main">
                            <span className="item-title">{c.title}</span>
                            <span className="item-badge">{c.code || 'CRS'}</span>
                          </div>
                          <div className="item-sub">
                            <span>Sector: {c.sector}</span>
                            {c.competencies && <span> • {c.competencies.length} Competencies</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Outcomes */}
                  {results.outcomes?.length > 0 && (
                    <div className="search-result-group">
                      <div className="search-group-title">
                        <IconBriefcase size={14} />
                        <span>Verified Outcomes ({results.outcomes.length})</span>
                      </div>
                      {results.outcomes.map((o) => (
                        <div
                          key={o._id}
                          className="search-result-item"
                          onClick={() => handleSelect('/admin/outcomes')}
                        >
                          <div className="item-main">
                            <span className="item-title">{o.trainee?.fullName || 'Trainee'}</span>
                            <span className={`status-pill pill-${(o.status || '').toLowerCase()}`}>
                              {o.status}
                            </span>
                          </div>
                          <div className="item-sub">
                            <span>Milestone: {o.milestone}</span>
                            {o.employer && <span> • Employer: {o.employer.companyName || o.employer}</span>}
                            {o.confidenceScore !== undefined && <span> • Confidence: {o.confidenceScore}%</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="search-dialog-footer">
              <span className="footer-hint"><kbd>ESC</kbd> to close</span>
              <span className="footer-hint"><kbd>ENTER</kbd> to jump</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
