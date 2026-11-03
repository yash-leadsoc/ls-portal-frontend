import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminRequest } from './adminApi';
import ExamForm from './components/ExamForm';
import { Alert, Button, Icon, Loading, PageHeader, StatusBadge, useToast } from './components/ExamUI';

export default function ExamEditor() {
  const { examId } = useParams();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => adminRequest(`admin/exams/${examId}`).then(setExam).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(body) {
    setBusy(true);
    try { await adminRequest(`admin/exams/${examId}`, { method: 'PUT', body }); toast('Exam saved'); load(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  }
  async function setStatus(status) {
    try { await adminRequest(`admin/exams/${examId}/status`, { method: 'PATCH', body: { status } }); toast(`Exam is now ${status}`); load(); }
    catch (e) { toast(e.message, 'error'); }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!exam) return <Loading />;
  const ready = exam.activeSetCount > 0 && exam.questionCount > 0;

  return (
    <>
      <PageHeader crumbs={[{ label: 'Exams', to: '/exam/admin/exams' }, { label: exam.name }]} title={exam.name}
        subtitle={<StatusBadge status={exam.status} />}
        actions={<>
          <Link to={`/exam/admin/exams/${examId}/sets`}><Button variant="secondary" icon="layers">Question sets</Button></Link>
          {exam.status === 'Live'
            ? <Button variant="secondary" icon="pause" onClick={() => setStatus('Paused')}>Pause</Button>
            : ['Draft', 'Scheduled', 'Paused'].includes(exam.status) && <Button variant="success" icon="play" onClick={() => setStatus('Live')}>Go live</Button>}
        </>} />
      <div className="ex-two-col">
        <section className="ex-card"><ExamForm key={exam.updatedAt} exam={exam} onSubmit={save} busy={busy} submitLabel="Save changes" /></section>
        <aside className="ex-stack">
          <div className="ex-card">
            <div className="ex-card__head"><h2>Readiness</h2></div>
            <ul className="ex-checklist">
              <li className={exam.setCount ? 'ok' : ''}><span className="ex-tick"><Icon name="check" size={13} /></span>{exam.setCount} question set{exam.setCount === 1 ? '' : 's'}</li>
              <li className={exam.activeSetCount ? 'ok' : ''}><span className="ex-tick"><Icon name="check" size={13} /></span>{exam.activeSetCount} active set{exam.activeSetCount === 1 ? '' : 's'}</li>
              <li className={exam.questionCount ? 'ok' : ''}><span className="ex-tick"><Icon name="check" size={13} /></span>{exam.questionCount} question{exam.questionCount === 1 ? '' : 's'} in total</li>
            </ul>
            {!ready && <div style={{ marginTop: 14 }}><Alert tone="warn">Add an active set with at least one question before going live.</Alert></div>}
          </div>
          <div className="ex-card">
            <div className="ex-card__head"><h2>Tab-switch policy</h2></div>
            <p className="ex-muted ex-small">{exam.proctoringEnabled !== false
              ? `Candidates get ${exam.maxWarnings ?? 3} warnings for leaving the exam window. The next time they leave, the exam is submitted automatically.`
              : 'Monitoring is turned off for this exam.'}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
