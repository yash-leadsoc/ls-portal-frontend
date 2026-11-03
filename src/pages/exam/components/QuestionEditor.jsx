import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import { Alert, Button, Field, Icon, TYPE_LABELS } from './ExamUI';

const LETTERS = 'ABCDEFGHIJ';
const blank = () => ({
  title: '', description: '', type: 'MCQ', marks: 1, negativeMarks: 0, difficulty: 'Medium', topic: '',
  images: [], options: [{ label: '', value: 'A' }, { label: '', value: 'B' }, { label: '', value: 'C' }, { label: '', value: 'D' }],
  correctAnswers: [], modelAnswer: '', evaluationGuidelines: '', explanation: '',
});

export default function QuestionEditor({ initial, onSave, onCancel, busy }) {
  const [q, setQ] = useState(() => ({ ...blank(), ...(initial || {}) }));
  const [error, setError] = useState('');
  const set = (k, v) => setQ((p) => ({ ...p, [k]: v }));
  const objective = ['MCQ', 'MULTI_SELECT'].includes(q.type);

  function changeType(type) {
    setQ((p) => {
      const next = { ...p, type };
      if (type === 'TRUE_FALSE') next.correctAnswers = ['true'];
      else if (['MCQ', 'MULTI_SELECT'].includes(type)) {
        if (!p.options.length || p.type === 'TRUE_FALSE' || !['MCQ', 'MULTI_SELECT'].includes(p.type)) next.options = blank().options;
        next.correctAnswers = type === 'MCQ' ? p.correctAnswers.slice(0, 1) : p.correctAnswers;
      } else next.correctAnswers = [];
      return next;
    });
  }
  function setOption(i, label) {
    set('options', q.options.map((o, j) => (j === i ? { ...o, label } : o)));
  }
  function addOption() {
    const used = new Set(q.options.map((o) => o.value));
    const value = [...LETTERS].find((l) => !used.has(l));
    if (value) set('options', [...q.options, { label: '', value }]);
  }
  function removeOption(i) {
    const gone = q.options[i].value;
    setQ((p) => ({ ...p, options: p.options.filter((_, j) => j !== i), correctAnswers: p.correctAnswers.filter((v) => v !== gone) }));
  }
  function toggleCorrect(v) {
    if (q.type === 'MCQ') return set('correctAnswers', [v]);
    set('correctAnswers', q.correctAnswers.includes(v) ? q.correctAnswers.filter((x) => x !== v) : [...q.correctAnswers, v]);
  }

  function submit(e) {
    e.preventDefault();
    setError('');
    if (!q.title.trim()) return setError('Enter the question text.');
    if (objective) {
      if (q.options.some((o) => !o.label.trim())) return setError('Fill in every option, or remove the empty ones.');
      if (!q.correctAnswers.length) return setError('Select the correct answer.');
    }
    onSave({
      ...q,
      marks: Number(q.marks),
      negativeMarks: Number(q.negativeMarks) || 0,
      options: objective ? q.options.map((o) => ({ label: o.label.trim(), value: o.value })) : [],
    });
  }

  return (
    <form className="ex-stack" onSubmit={submit} style={{ gap: 16 }}>
      <div className="ex-grid-2">
        <Field label="Question type">
          <select className="ex-select" value={q.type} onChange={(e) => changeType(e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <div className="ex-grid-2">
          <Field label="Marks"><input className="ex-input" type="number" min="0" step="0.5" required value={q.marks} onChange={(e) => set('marks', e.target.value)} /></Field>
          <Field label="Negative marks" hint="Optional"><input className="ex-input" type="number" min="0" step="0.25" value={q.negativeMarks} onChange={(e) => set('negativeMarks', e.target.value)} /></Field>
        </div>
      </div>

      <Field label="Question"><textarea className="ex-textarea" rows={3} required value={q.title} onChange={(e) => set('title', e.target.value)} placeholder="Type the question…" /></Field>
      <Field label="Extra details" hint="Optional – code snippets, context or constraints shown below the question."><textarea className="ex-textarea" rows={2} value={q.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="ex-field"><span className="ex-label">Images</span><ImageUploader value={q.images} onChange={(v) => set('images', v)} /></div>

      {objective && (
        <div className="ex-field">
          <span className="ex-label">Options <span className="ex-hint">— {q.type === 'MCQ' ? 'select the one correct answer' : 'tick every correct answer'}</span></span>
          <div className="ex-stack" style={{ gap: 8 }}>
            {q.options.map((o, i) => (
              <div className="ex-optrow" key={o.value}>
                <input type={q.type === 'MCQ' ? 'radio' : 'checkbox'} name="correct" checked={q.correctAnswers.includes(o.value)} onChange={() => toggleCorrect(o.value)} aria-label={`Option ${o.value} is correct`} />
                <span className="ex-key">{o.value}</span>
                <input className="ex-input" value={o.label} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${o.value}`} />
                <Button variant="ghost" size="sm" className="ex-btn--icon" icon="trash" disabled={q.options.length <= 2} onClick={() => removeOption(i)} aria-label="Remove option" />
              </div>
            ))}
          </div>
          <div><Button variant="secondary" size="sm" icon="plus" disabled={q.options.length >= 10} onClick={addOption}>Add option</Button></div>
        </div>
      )}

      {q.type === 'TRUE_FALSE' && (
        <div className="ex-field">
          <span className="ex-label">Correct answer</span>
          <div className="ex-tabs" style={{ alignSelf: 'flex-start' }}>
            {['true', 'false'].map((v) => <button type="button" key={v} className={q.correctAnswers[0] === v ? 'on' : ''} onClick={() => set('correctAnswers', [v])}>{v === 'true' ? 'True' : 'False'}</button>)}
          </div>
        </div>
      )}

      {!objective && q.type !== 'TRUE_FALSE' && (
        <>
          <Alert tone="info">Descriptive answers are evaluated manually from <b>Results → candidate report</b>.</Alert>
          <Field label="Model answer" hint="Visible to evaluators only."><textarea className="ex-textarea" rows={3} value={q.modelAnswer} onChange={(e) => set('modelAnswer', e.target.value)} /></Field>
          <Field label="Evaluation guidelines" hint="Visible to evaluators only."><textarea className="ex-textarea" rows={2} value={q.evaluationGuidelines} onChange={(e) => set('evaluationGuidelines', e.target.value)} /></Field>
        </>
      )}

      <div className="ex-grid-2">
        <Field label="Topic" hint="Optional"><input className="ex-input" value={q.topic} onChange={(e) => set('topic', e.target.value)} /></Field>
        <Field label="Difficulty">
          <select className="ex-select" value={q.difficulty} onChange={(e) => set('difficulty', e.target.value)}>{['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}</select>
        </Field>
      </div>

      <Alert tone="error">{error}</Alert>
      <div className="ex-row" style={{ justifyContent: 'flex-end', paddingBottom: 18 }}>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" busy={busy} icon="save" onClick={undefined}>Save question</Button>
      </div>
    </form>
  );
}
