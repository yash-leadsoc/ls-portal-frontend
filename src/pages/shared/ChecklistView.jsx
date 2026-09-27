import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { LoadingPage, Empty } from '../../components/ui';
import { useToast } from '../../components/Toast';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export default function ChecklistView() {
  const { id, domainId } = useParams();
  const nav = useNavigate();
  const { toastError } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.employeeProgress(id));
      } catch (e) {
        toastError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const domain = useMemo(() => {
    const progress = data?.progress || {};
    return Object.values(progress).find(
      (d) => String(d.domainId) === String(domainId) || String(d.key) === String(domainId)
    );
  }, [data, domainId]);

  const sections = useMemo(() => {
    const bySection = new Map();

    (domain?.checklists || []).forEach((c) => {
      (c.items || []).forEach((it) => {
        const key = it.section || it.category || 'General';
        if (!bySection.has(key)) {
          bySection.set(key, {
            key,
            label: it.section || cap(it.category) || 'General',
            code: it.code || '',
            topics: new Map(),
          });
        }
        const sec = bySection.get(key);
        if (!sec.code && it.code) sec.code = it.code;

        const topic = it.topic || 'Single scenario';
        if (!sec.topics.has(topic)) sec.topics.set(topic, []);
        sec.topics.get(topic).push(it);
      });
    });

    return Array.from(bySection.values()).map((s) => ({
      ...s,
      total: Array.from(s.topics.values()).reduce((n, arr) => n + arr.length, 0),
      done: Array.from(s.topics.values()).reduce(
        (n, arr) => n + arr.filter((i) => i.understood).length,
        0
      ),
      topics: Array.from(s.topics.entries()),
    }));
  }, [domain]);

  if (loading) return <LoadingPage />;
  if (!data) return <Empty>Employee not found.</Empty>;
  if (!domain) return <Empty>Checklist not found for this domain.</Empty>;

  const user = data.user || {};

  return (
    <div style={{ maxWidth: 1000 }}>
      <button className="btn link" onClick={() => nav(-1)} style={{ marginBottom: 12, paddingLeft: 0 }}>
        ← Back
      </button>

      <div style={{ fontSize: 12, color: '#64748b' }}>
        {user.name} › {domain.name} › Checklist
      </div>
      <h1 style={{ margin: '4px 0 0', color: '#102a56', fontSize: 22 }}>Full checklist</h1>
      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
        {domain.checklistCompleted ?? 0} of {domain.checklistTotal ?? 0} items understood
      </p>

      {sections.length === 0 ? (
        <Empty>No checklist items in this domain yet.</Empty>
      ) : (
        sections.map((sec, si) => {
          const sectionTitle = `Section ${si + 1} — ${sec.label}${sec.code ? ` (${sec.code})` : ''}, ${sec.total} items`;
          const groupedItems = Object.fromEntries(sec.topics);

          return (
            <div key={sec.key} className="card" style={{ padding: 18, marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#102a56', marginBottom: 12 }}>
                {sectionTitle}
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: 12, marginLeft: 8 }}>
                  · {sec.done}/{sec.total} understood
                </span>
              </div>

              {Object.entries(groupedItems).map(([topicName, topicItems]) => (
                <div key={topicName} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#52658a',
                      textTransform: 'uppercase',
                      marginBottom: 7,
                      paddingLeft: 3,
                    }}
                  >
                    {topicName}
                  </div>

                  <div style={{ border: '1px solid #dbe3ec', borderRadius: 9, overflowX: 'auto' }}>
                    <div style={{ minWidth: 650 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '70px 90px minmax(280px, 1fr) 100px',
                          background: '#08a9c7',
                          color: '#fff',
                          fontSize: 10.5,
                          fontWeight: 750,
                        }}
                      >
                        <div style={{ padding: '9px 8px', textAlign: 'center' }}>Tried</div>
                        <div style={{ padding: '9px 8px', textAlign: 'center' }}>Understood</div>
                        <div style={{ padding: '9px 10px' }}>Checklist item</div>
                        <div style={{ padding: '9px 8px', textAlign: 'center' }}>Proficiency</div>
                      </div>

                      {topicItems.map((item, itemIndex) => {
                        const tried = item?.tried === true;
                        const understood = item?.understood === true;
                        const proficiency =
                          item?.proficiency != null && item?.proficiency !== 0 ? item.proficiency : '-';
                        const itemText =
                          item?.text || item?.title || item?.name || `Checklist item ${itemIndex + 1}`;

                        return (
                          <div
                            key={item.id || item._id || itemIndex}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '70px 90px minmax(280px, 1fr) 100px',
                              borderTop: '1px solid #e2e8f0',
                              background: itemIndex % 2 === 0 ? '#fff' : '#f8fafc',
                              fontSize: 11,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 10 }}>
                              <span
                                style={{
                                  width: 17,
                                  height: 17,
                                  borderRadius: 4,
                                  border: tried ? '1px solid #08a9c7' : '1px solid #94a3b8',
                                  background: tried ? '#08a9c7' : '#fff',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 800,
                                }}
                              >
                                {tried ? '✓' : ''}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 10 }}>
                              <span
                                style={{
                                  width: 17,
                                  height: 17,
                                  borderRadius: 4,
                                  border: understood ? '1px solid #08a9c7' : '1px solid #94a3b8',
                                  background: understood ? '#08a9c7' : '#fff',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 800,
                                }}
                              >
                                {understood ? '✓' : ''}
                              </span>
                            </div>

                            <div style={{ padding: '10px 12px', lineHeight: 1.5, color: '#334155' }}>
                              {itemText}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                              <span
                                style={{
                                  minWidth: 36,
                                  padding: '5px 7px',
                                  textAlign: 'center',
                                  border: '1px solid #dbe3ec',
                                  borderRadius: 6,
                                  background: '#fff',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#334155',
                                }}
                              >
                                {proficiency}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
