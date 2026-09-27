import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button, LoadingPage, Empty, Spinner, initials } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';

const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', employee: 'Engineer' };

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function Community() {
  const { user } = useAuth();
  const { toast, toastError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [asking, setAsking] = useState(false);

  const [openId, setOpenId] = useState(null);
  const [threads, setThreads] = useState({});
  const [answerText, setAnswerText] = useState({});
  const [answering, setAnswering] = useState({});

  const loadQuestions = async () => {
    try {
      const res = await api.listQuestions();
      setQuestions(res.questions || []);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const ask = async () => {
    if (!title.trim()) {
      toastError('Please enter a question title');
      return;
    }
    setAsking(true);
    try {
      await api.createQuestion(title.trim(), body.trim());
      setTitle('');
      setBody('');
      toast('Question posted');
      await loadQuestions();
    } catch (e) {
      toastError(e);
    } finally {
      setAsking(false);
    }
  };

  const openThread = async (qId) => {
    if (openId === qId) {
      setOpenId(null);
      return;
    }
    setOpenId(qId);
    if (!threads[qId]) {
      setThreads((t) => ({ ...t, [qId]: { loading: true, answers: [] } }));
      try {
        const res = await api.getQuestion(qId);
        setThreads((t) => ({ ...t, [qId]: { loading: false, answers: res.answers || [] } }));
      } catch (e) {
        setThreads((t) => ({ ...t, [qId]: { loading: false, answers: [] } }));
        toastError(e);
      }
    }
  };

  const postAnswer = async (qId) => {
    const text = (answerText[qId] || '').trim();
    if (!text) {
      toastError('Please write an answer');
      return;
    }
    setAnswering((a) => ({ ...a, [qId]: true }));
    try {
      const res = await api.createAnswer(qId, text);
      setThreads((t) => ({
        ...t,
        [qId]: { loading: false, answers: [...(t[qId]?.answers || []), res.answer] },
      }));
      setAnswerText((a) => ({ ...a, [qId]: '' }));
      setQuestions((qs) =>
        qs.map((q) => (q.id === qId ? { ...q, answerCount: (q.answerCount || 0) + 1 } : q))
      );
      toast('Answer posted');
    } catch (e) {
      toastError(e);
    } finally {
      setAnswering((a) => ({ ...a, [qId]: false }));
    }
  };

  const removeQuestion = async (qId) => {
    if (!window.confirm('Delete this question and all its answers?')) return;
    try {
      await api.deleteQuestion(qId);
      setQuestions((qs) => qs.filter((q) => q.id !== qId));
      if (openId === qId) setOpenId(null);
      toast('Question deleted');
    } catch (e) {
      toastError(e);
    }
  };

  const removeAnswer = async (qId, aId) => {
    if (!window.confirm('Delete this answer?')) return;
    try {
      await api.deleteAnswer(aId);
      setThreads((t) => ({
        ...t,
        [qId]: { ...t[qId], answers: (t[qId]?.answers || []).filter((a) => a.id !== aId) },
      }));
      setQuestions((qs) =>
        qs.map((q) => (q.id === qId ? { ...q, answerCount: Math.max(0, (q.answerCount || 1) - 1) } : q))
      );
      toast('Answer deleted');
    } catch (e) {
      toastError(e);
    }
  };

  if (loading) return <LoadingPage />;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-head">
        <h1>Community Q&amp;A</h1>
        <p>Ask a question and help each other out. Anyone can answer.</p>
      </div>

      <section className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 750, color: '#102a56', marginBottom: 10 }}>
          Ask a question
        </div>
        <input
          className="input"
          placeholder="Question title (e.g. How do I fix setup violations on the clock path?)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <textarea
          className="textarea"
          placeholder="Add more detail (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: 70 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <Button variant="cyan" onClick={ask} disabled={asking}>
            {asking ? <Spinner sm /> : 'Post question'}
          </Button>
        </div>
      </section>

      <div style={{ marginTop: 18 }}>
        {questions.length === 0 ? (
          <Empty>No questions yet. Be the first to ask!</Empty>
        ) : (
          questions.map((q) => {
            const open = openId === q.id;
            const thread = threads[q.id];
            return (
              <section key={q.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="avatar" style={{ flexShrink: 0 }} title={q.author?.name}>
                    {initials(q.author?.name || '?')}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 750, color: '#102a56', lineHeight: 1.4 }}>
                      {q.title}
                    </div>
                    {q.body ? (
                      <div style={{ fontSize: 13, color: '#334155', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                        {q.body}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}>
                      {q.author?.name || 'Unknown'} · {ROLE_LABEL[q.author?.role] || q.author?.role || ''} ·{' '}
                      {timeAgo(q.createdAt)}
                    </div>
                  </div>

                  {isAdmin && (
                    <Button variant="danger" size="sm" onClick={() => removeQuestion(q.id)}>
                      Delete
                    </Button>
                  )}
                </div>

                <button
                  onClick={() => openThread(q.id)}
                  style={{
                    marginTop: 12,
                    border: '1px solid #dbe3ec',
                    background: '#fff',
                    color: '#0284a8',
                    borderRadius: 7,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {open ? 'Hide answers' : `${q.answerCount || 0} answer${q.answerCount === 1 ? '' : 's'} ▾`}
                </button>

                {open && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #eef2f7', paddingTop: 12 }}>
                    {thread?.loading ? (
                      <div className="muted" style={{ fontSize: 12 }}>Loading answers…</div>
                    ) : (thread?.answers || []).length === 0 ? (
                      <div className="muted" style={{ fontSize: 12 }}>No answers yet. Add the first one.</div>
                    ) : (
                      thread.answers.map((a) => (
                        <div
                          key={a.id}
                          style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}
                        >
                          <div className="avatar" style={{ flexShrink: 0, width: 30, height: 30, fontSize: 11 }} title={a.author?.name}>
                            {initials(a.author?.name || '?')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap' }}>{a.body}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                              {a.author?.name || 'Unknown'} · {ROLE_LABEL[a.author?.role] || a.author?.role || ''} ·{' '}
                              {timeAgo(a.createdAt)}
                            </div>
                          </div>
                          {isAdmin && (
                            <Button variant="danger" size="sm" onClick={() => removeAnswer(q.id, a.id)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      ))
                    )}

                    <div style={{ marginTop: 12 }}>
                      <textarea
                        className="textarea"
                        placeholder="Write an answer…"
                        value={answerText[q.id] || ''}
                        onChange={(e) => setAnswerText((s) => ({ ...s, [q.id]: e.target.value }))}
                        style={{ minHeight: 56 }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Button variant="cyan" size="sm" onClick={() => postAnswer(q.id)} disabled={answering[q.id]}>
                          {answering[q.id] ? <Spinner sm /> : 'Post answer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
