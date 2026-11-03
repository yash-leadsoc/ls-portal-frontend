import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminRequest } from './adminApi';
import QuestionEditor from './components/QuestionEditor';
import { Alert, Badge, Button, ConfirmDialog, Empty, Loading, Modal, PageHeader, TYPE_LABELS, useToast } from './components/ExamUI';

export default function QuestionManagement() {
  const { examId, setId } = useParams();
  const toast = useToast();
  const [set, setSet] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null); // null | {} | question
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminRequest(`admin/sets/${setId}`).then(setSet).catch((e) => setError(e.message));
    adminRequest(`admin/sets/${setId}/questions`).then(setItems).catch((e) => setError(e.message));
  }, [setId]);
  useEffect(() => { load(); }, [load]);

  async function save(body) {
    setBusy(true);
    try {
      if (edit._id) await adminRequest(`admin/questions/${edit._id}`, { method: 'PUT', body });
      else await adminRequest(`admin/sets/${setId}/questions`, { method: 'POST', body });
      toast('Question saved');
      setEdit(null);
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await adminRequest(`admin/questions/${del._id}`, { method: 'DELETE' }); toast('Question deleted'); setDel(null); load(); }
    catch (e) { toast(e.message, 'error'); setDel(null); } finally { setBusy(false); }
  }
  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    try {
      // normalise every position so gaps/duplicates from earlier deletes can't break the order
      await Promise.all(next.map((q, idx) => (q.order === idx ? null : adminRequest(`admin/questions/${q._id}`, { method: 'PUT', body: { order: idx } }))).filter(Boolean));
      load();
    } catch (e) { toast(e.message, 'error'); load(); }
  }

  const total = (items || []).reduce((n, q) => n + (q.marks || 0), 0);
  return (
    <>
      <PageHeader crumbs={[{ label: 'Exams', to: '/exam/admin/exams' }, { label: set?.exam?.name || '…', to: `/exam/admin/exams/${examId}` }, { label: 'Sets', to: `/exam/admin/exams/${examId}/sets` }, { label: set?.name || '…' }]}
        title={set ? `${set.name} · Questions` : 'Questions'}
        subtitle={items ? `${items.length} question${items.length === 1 ? '' : 's'} · ${total} total marks` : ''}
        actions={<Button icon="plus" onClick={() => setEdit({})}>Add question</Button>} />
      <Alert>{error}</Alert>
      {!items && !error ? <Loading /> : !items?.length ? (
        <div className="ex-card"><Empty icon="list" title="No questions in this set" action={<Button icon="plus" onClick={() => setEdit({})}>Add the first question</Button>}>
          Supports single choice, multiple choice, true/false, short and long answers.</Empty></div>
      ) : (
        <div className="ex-qlist">
          {items.map((q, i) => (
            <article className="ex-qitem" key={q._id}>
              <div className="ex-qitem__no">{i + 1}</div>
              <div className="ex-qitem__body">
                <div className="ex-row ex-row--wrap" style={{ marginBottom: 6, gap: 8 }}>
                  <Badge tone="brand">{TYPE_LABELS[q.type]}</Badge><Badge>{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
                  {q.negativeMarks > 0 && <Badge tone="danger">−{q.negativeMarks}</Badge>}{q.topic && <Badge tone="info">{q.topic}</Badge>}
                </div>
                <div className="ex-qitem__title">{q.title}</div>
                {['MCQ', 'MULTI_SELECT', 'TRUE_FALSE'].includes(q.type) && (
                  <div className="ex-qitem__opts">{q.options.map((o) => (
                    <div key={o.value} className={`ex-qopt ${q.correctAnswers.includes(o.value) ? 'is-correct' : ''}`}><b>{o.value === 'true' || o.value === 'false' ? '•' : o.value}</b>{o.label}{q.correctAnswers.includes(o.value) && ' ✓'}</div>))}</div>)}
              </div>
              <div className="ex-actions" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                <div className="ex-row" style={{ gap: 2 }}>
                  <Button size="sm" variant="ghost" className="ex-btn--icon" icon="up" disabled={!i} onClick={() => move(i, -1)} aria-label="Move up" />
                  <Button size="sm" variant="ghost" className="ex-btn--icon" icon="down" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down" />
                </div>
                <div className="ex-row" style={{ gap: 2 }}>
                  <Button size="sm" variant="secondary" className="ex-btn--icon" icon="edit" onClick={() => setEdit(q)} aria-label="Edit" />
                  <Button size="sm" variant="ghost" className="ex-btn--icon" icon="trash" onClick={() => setDel(q)} aria-label="Delete" />
                </div>
              </div>
            </article>))}
        </div>
      )}
      <Modal open={!!edit} wide title={edit?._id ? 'Edit question' : 'Add question'} onClose={() => setEdit(null)} dismissible={!busy}>
        {edit && <QuestionEditor initial={edit._id ? edit : null} onSave={save} onCancel={() => setEdit(null)} busy={busy} />}
      </Modal>
      <ConfirmDialog open={!!del} danger title="Delete this question?" confirmLabel="Delete" busy={busy} onCancel={() => setDel(null)} onConfirm={remove}>
        This cannot be undone.
      </ConfirmDialog>
    </>
  );
}
