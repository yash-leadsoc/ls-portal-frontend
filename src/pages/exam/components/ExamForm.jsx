import React, { useState } from 'react';
import { Alert, Button, Field, Switch, fromLocalInput, toLocalInput } from './ExamUI';

const toForm = (e = {}) => ({
  name: e.name || '', category: e.category || '', description: e.description || '', instructions: e.instructions || '',
  durationMinutes: e.durationMinutes ?? 60, maximumMarks: e.maximumMarks ?? 100, passingMarks: e.passingMarks ?? 40,
  startsAt: toLocalInput(e.startsAt), endsAt: toLocalInput(e.endsAt),
  proctoringEnabled: e.proctoringEnabled ?? true, maxWarnings: e.maxWarnings ?? 3,
  randomizeQuestions: !!e.randomizeQuestions, randomizeOptions: !!e.randomizeOptions,
  aiEvaluation: e.aiEvaluation ?? true, showResultToCandidate: !!e.showResultToCandidate, negativeMarking: !!e.negativeMarking, negativeMarkValue: e.negativeMarkValue ?? 0, allowMultipleAttempts: !!e.allowMultipleAttempts,
});

export default function ExamForm({ exam, onSubmit, onCancel, busy, submitLabel = 'Save exam' }) {
  const [f, setF] = useState(() => toForm(exam));
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const flag = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  function submit(e) {
    e.preventDefault();
    setError('');
    if (Number(f.passingMarks) > Number(f.maximumMarks)) return setError('Passing marks cannot be more than maximum marks.');
    if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt)) return setError('The end time must be after the start time.');
    onSubmit({
      ...f,
      durationMinutes: Number(f.durationMinutes), maximumMarks: Number(f.maximumMarks), passingMarks: Number(f.passingMarks),
      maxWarnings: Number(f.maxWarnings), negativeMarkValue: Number(f.negativeMarkValue) || 0,
      startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt),
    });
  }

  return (
    <form className="ex-stack" style={{ gap: 18 }} onSubmit={submit}>
      <div className="ex-grid-2">
        <Field label="Exam name"><input className="ex-input" required maxLength={200} value={f.name} onChange={set('name')} placeholder="e.g. Java Developer Screening" autoFocus /></Field>
        <Field label="Category" hint="Optional"><input className="ex-input" value={f.category} onChange={set('category')} placeholder="e.g. Technical" /></Field>
      </div>
      <Field label="Short description" hint="Shown on the exam card."><textarea className="ex-textarea" rows={2} maxLength={2000} value={f.description} onChange={set('description')} /></Field>
      <Field label="Instructions for candidates"><textarea className="ex-textarea" rows={4} value={f.instructions} onChange={set('instructions')} /></Field>

      <div className="ex-grid-3">
        <Field label="Duration (minutes)"><input className="ex-input" type="number" min="1" max="1440" required value={f.durationMinutes} onChange={set('durationMinutes')} /></Field>
        <Field label="Maximum marks"><input className="ex-input" type="number" min="0" required value={f.maximumMarks} onChange={set('maximumMarks')} /></Field>
        <Field label="Passing marks"><input className="ex-input" type="number" min="0" required value={f.passingMarks} onChange={set('passingMarks')} /></Field>
      </div>
      <div className="ex-grid-2">
        <Field label="Opens at" hint="Leave empty to open as soon as the exam is Live."><input className="ex-input" type="datetime-local" value={f.startsAt} onChange={set('startsAt')} /></Field>
        <Field label="Closes at" hint="Leave empty for no closing time."><input className="ex-input" type="datetime-local" value={f.endsAt} onChange={set('endsAt')} /></Field>
      </div>

      <div className="ex-stack" style={{ gap: 10 }}>
        <Switch checked={f.aiEvaluation} onChange={flag('aiEvaluation')} title="AI evaluation of written answers"
          desc="Short and long answers are graded automatically right after submission. Single/multiple choice and true/false are always matched against the answer key." />
        <Switch checked={f.showResultToCandidate} onChange={flag('showResultToCandidate')} title="Show score to candidates"
          desc="Candidates see their score and pass/fail on the thank-you page once evaluation is complete." />
        <Switch checked={f.proctoringEnabled} onChange={flag('proctoringEnabled')} title="Tab-switch monitoring"
          desc="Warn candidates when they minimise the window or switch tab/app; auto-submit once the warnings are used up." />
        {f.proctoringEnabled && (
          <Field label="Warnings allowed before auto-submit" hint={`Candidates see warnings 1 to ${f.maxWarnings || 0}; the next time they leave, the exam is submitted automatically.`}>
            <input className="ex-input" type="number" min="0" max="10" style={{ maxWidth: 140 }} value={f.maxWarnings} onChange={set('maxWarnings')} />
          </Field>
        )}
        <div className="ex-grid-2">
          <Switch checked={f.randomizeQuestions} onChange={flag('randomizeQuestions')} title="Shuffle questions" desc="Each candidate gets a different order." />
          <Switch checked={f.randomizeOptions} onChange={flag('randomizeOptions')} title="Shuffle options" desc="For single/multiple choice questions." />
          <Switch checked={f.allowMultipleAttempts} onChange={flag('allowMultipleAttempts')} title="Allow multiple attempts" desc="Same email can register again." />
          <Switch checked={f.negativeMarking} onChange={flag('negativeMarking')} title="Negative marking" desc="Deduct marks for wrong answers." />
        </div>
        {f.negativeMarking && (
          <Field label="Default penalty per wrong answer" hint="Used when a question has no negative marks of its own.">
            <input className="ex-input" type="number" min="0" step="0.25" style={{ maxWidth: 140 }} value={f.negativeMarkValue} onChange={set('negativeMarkValue')} />
          </Field>
        )}
      </div>

      <Alert>{error}</Alert>
      <div className="ex-row" style={{ justifyContent: 'flex-end' }}>
        {onCancel && <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>}
        <Button type="submit" busy={busy} icon="save">{submitLabel}</Button>
      </div>
    </form>
  );
}
