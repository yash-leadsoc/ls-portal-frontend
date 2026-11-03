import React from 'react';
import { Badge, TYPE_LABELS } from './ExamUI';

const letter = (i) => String.fromCharCode(65 + i);

export default function QuestionCard({ question, index, value, onChange }) {
  const multi = question.type === 'MULTI_SELECT';
  const choice = ['MCQ', 'MULTI_SELECT', 'TRUE_FALSE'].includes(question.type);
  const options = question.type === 'TRUE_FALSE'
    ? [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }]
    : question.options || [];
  const selected = (v) => (multi ? (value || []).includes(v) : value === v);
  const toggle = (v, checked) =>
    onChange(multi ? (checked ? [...(value || []), v] : (value || []).filter((x) => x !== v)) : v);
  const max = question.type === 'SHORT_ANSWER' ? 1000 : 10000;

  return (
    <article className="ex-qcard" aria-labelledby={`q-${question.id}`}>
      <div className="ex-qhead">
        <span className="ex-qnum">{index + 1}</span>
        <Badge tone="brand">{TYPE_LABELS[question.type] || question.type}</Badge>
        <Badge tone="neutral">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</Badge>
        {multi && <span className="ex-small ex-muted">Select all that apply</span>}
      </div>
      <h2 id={`q-${question.id}`}>{question.title}</h2>
      {question.description && <p className="ex-qdesc">{question.description}</p>}
      {(question.images || []).map((src, i) => (
        <img className="ex-qimg" key={i} src={src} alt={`Reference ${i + 1} for question ${index + 1}`} loading="lazy" />
      ))}

      {choice ? (
        <div className="ex-options" role={multi ? 'group' : 'radiogroup'} aria-labelledby={`q-${question.id}`}>
          {options.map((o, i) => (
            <label key={o.value} className={`ex-option ${selected(o.value) ? 'is-selected' : ''}`}>
              <input type={multi ? 'checkbox' : 'radio'} name={`q-${question.id}`} checked={selected(o.value)}
                onChange={(e) => toggle(o.value, e.target.checked)} />
              <span className="ex-option__key">{multi && selected(o.value) ? '✓' : letter(i)}</span>
              <span className="ex-option__text">{o.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <>
          <textarea className="ex-textarea ex-textarea--answer" rows={question.type === 'LONG_ANSWER' ? 10 : 4}
            maxLength={max} value={value || ''} onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer here…" aria-label="Your answer" />
          <div className="ex-counter ex-tnum">{(value || '').length} / {max}</div>
        </>
      )}
    </article>
  );
}
