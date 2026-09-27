import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, uid } from '../../api/client';
import { Button, LoadingPage, Empty, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

const SECTION_META = {
  tool: { label: 'Tool Understanding', code: 'PTTUT' },
  concepts: { label: 'Concepts', code: '' },
  practical: { label: 'Practical', code: '' },
  advanced: { label: 'Advanced', code: '' },
};
const SECTION_ORDER = ['tool', 'concepts', 'practical', 'advanced'];

const sectionKeyOf = (it) => String(it.section || it.category || 'tool').toLowerCase();
const sectionLabelOf = (key) =>
  SECTION_META[key]?.label || key.charAt(0).toUpperCase() + key.slice(1);
const sectionCodeOf = (it, key) => it.sectionCode || it.code || SECTION_META[key]?.code || '';
const topicOf = (it) => it.topic || it.scenario || 'Single scenario';

export default function DoChecklist() {
  const { id } = useParams();
  const nav = useNavigate();
  const [checklist, setChecklist] = useState(null);
  const [domainName, setDomainName] = useState('');
  const [resp, setResp] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, toastError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.myChecklistResponse(id);
        const cl = data.checklist;

        const map = {};
        (data.response?.responses || []).forEach((r) => {
          map[r.item.toString()] = {
            tried: r.tried,
            understood: r.understood,
            proficiency: r.proficiency,
          };
        });
        cl.items.forEach((it) => {
          const iid = uid(it);
          if (!map[iid]) map[iid] = { tried: false, understood: false, proficiency: 0 };
        });

        setChecklist(cl);
        setResp(map);

        try {
          const d = await api.listDomains();
          const list = d?.domains || d || [];
          const dom = list.find((x) => String(x._id || x.id) === String(cl.domain));
          if (dom) setDomainName(dom.name);
        } catch {}
      } catch (e) {
        toastError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const sections = useMemo(() => {
    if (!checklist) return [];

    const byKey = new Map();
    checklist.items.forEach((it) => {
      const key = sectionKeyOf(it);
      if (!byKey.has(key)) byKey.set(key, { key, code: sectionCodeOf(it, key), items: [] });
      byKey.get(key).items.push(it);
    });

    const list = Array.from(byKey.values()).sort((a, b) => {
      const ai = SECTION_ORDER.indexOf(a.key);
      const bi = SECTION_ORDER.indexOf(b.key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    list.forEach((sec) => {
      const topics = new Map();
      sec.items.forEach((it) => {
        const t = topicOf(it);
        if (!topics.has(t)) topics.set(t, []);
        topics.get(t).push(it);
      });
      sec.topics = Array.from(topics.entries()).map(([topic, items]) => ({ topic, items }));
    });

    return list;
  }, [checklist]);

  if (loading) return <LoadingPage />;
  if (!checklist) return <Empty>Checklist not found.</Empty>;

  const set = (iid, k, v) => setResp((r) => ({ ...r, [iid]: { ...r[iid], [k]: v } }));

  const understoodIn = (items) => items.filter((it) => resp[uid(it)]?.understood).length;

  const save = async () => {
    setSaving(true);
    try {
      const payload = checklist.items.map((it) => {
        const iid = uid(it);
        return { item: iid, ...resp[iid] };
      });
      await api.saveChecklistResponse(id, payload);
      toast('Progress saved');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checklist-page">
      <div className="cl-crumb">
        Domains
        {domainName ? <> › {domainName}</> : null} › <strong>{checklist.title}</strong>
      </div>

      <div className="cl-head">
        <div>
          <h1 className="cl-title">{checklist.title}</h1>
          <p className="cl-sub">
            Tick Tried / Understood as you work through each item.
            {domainName ? ` Content sourced from the ${domainName} skill-up form.` : ''}
          </p>
        </div>
        <Button variant="cyan" onClick={save} disabled={saving}>
          {saving ? <Spinner sm /> : 'Save progress'}
        </Button>
      </div>

      <div className="cl-pills">
        {sections.map((sec) => (
          <div key={sec.key} className="cl-pill">
            {sectionLabelOf(sec.key)}: <strong>{understoodIn(sec.items)} / {sec.items.length}</strong>
          </div>
        ))}
      </div>

      {sections.map((sec, si) => {
        const code = sec.code ? ` (${sec.code})` : '';
        return (
          <div key={sec.key} className="cl-section">
            <div className="cl-section-title">
              Section {si + 1} — {sectionLabelOf(sec.key)}{code}, {sec.items.length} items
            </div>

            {sec.topics.map((tp) => (
              <div key={tp.topic} className="cl-topic-block">
                <div className="cl-topic-label">{String(tp.topic).toUpperCase()}</div>

                <div className="cl-table-wrap">
                  <table className="cl-table">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Tried</th>
                        <th style={{ width: 96 }}>Understood</th>
                        <th>Checklist item</th>
                        <th style={{ width: 120, textAlign: 'right' }}>Proficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tp.items.map((it) => {
                        const iid = uid(it);
                        const r = resp[iid] || {};
                        return (
                          <tr key={iid}>
                            <td className="cl-center">
                              <input
                                type="checkbox"
                                checked={!!r.tried}
                                onChange={(e) => set(iid, 'tried', e.target.checked)}
                              />
                            </td>
                            <td className="cl-center">
                              <input
                                type="checkbox"
                                checked={!!r.understood}
                                onChange={(e) => set(iid, 'understood', e.target.checked)}
                              />
                            </td>
                            <td className="cl-item-text">{it.text}</td>
                            <td style={{ textAlign: 'right' }}>
                              <select
                                className="cl-select"
                                value={r.proficiency || 0}
                                onChange={(e) => set(iid, 'proficiency', Number(e.target.value))}
                              >
                                {[0, 1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>{n === 0 ? '–' : n}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <style>{`
        .checklist-page { max-width: 1000px; }
        .cl-crumb { font-size: 12.5px; color: #64748b; margin-bottom: 8px; }
        .cl-crumb strong { color: #102a56; }
        .cl-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .cl-title { margin: 0; color: var(--navy); font-size: 22px; font-weight: 780; }
        .cl-sub { margin: 4px 0 0; color: #52658a; font-size: 13px; }

        .cl-pills { display: flex; gap: 12px; flex-wrap: wrap; margin: 18px 0 6px; }
        .cl-pill {
          border: 1px solid #dbe3ec; background: #fff; border-radius: 10px;
          padding: 10px 16px; font-size: 13px; color: #334155;
        }
        .cl-pill strong { color: #102a56; }

        .cl-section { margin-top: 22px; }
        .cl-section-title { font-size: 15px; font-weight: 750; color: #102a56; margin-bottom: 10px; }
        .cl-topic-block { margin-top: 10px; }
        .cl-topic-label {
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.06em;
          color: #08a6c7; margin-bottom: 8px;
        }

        .cl-table-wrap { overflow-x: auto; border-radius: 10px; }
        .cl-table { width: 100%; border-collapse: collapse; background: #fff; }
        .cl-table thead th {
          background: #0aa7c5; color: #fff; font-size: 12.5px; font-weight: 700;
          text-align: left; padding: 12px 14px; white-space: nowrap;
        }
        .cl-table thead th:first-child { border-top-left-radius: 8px; }
        .cl-table thead th:last-child  { border-top-right-radius: 8px; }
        .cl-table tbody td {
          padding: 14px; font-size: 13.5px; color: #1e293b;
          border-bottom: 1px solid #e6ecf3; vertical-align: middle;
        }
        .cl-table tbody tr:nth-child(even) td { background: #fbfdff; }
        .cl-center { text-align: center; }
        .cl-item-text { line-height: 1.5; }
        .cl-table input[type="checkbox"] { width: 17px; height: 17px; cursor: pointer; accent-color: #0aa7c5; }
        .cl-select {
          height: 32px; min-width: 62px; border: 1px solid #cbd5e1; border-radius: 7px;
          padding: 0 8px; font-size: 13px; background: #fff; cursor: pointer;
        }

        @media (max-width: 640px) {
          .cl-table tbody td, .cl-table thead th { padding: 10px; }
        }
      `}</style>
    </div>
  );
}
