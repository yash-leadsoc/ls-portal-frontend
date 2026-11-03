import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi } from './examApi';
import { Brand } from './components/StudentShell';
import { Alert, Badge, Button, Empty, Icon, fmtDate } from './components/ExamUI';
import './exam.css';

const FEATURES = [
  { icon: 'clock', title: 'Timed & secure', text: 'A live countdown keeps you on track from the first question to the last.' },
  { icon: 'save', title: 'Auto-saved answers', text: 'Every answer is saved as you go, even if your connection drops for a moment.' },
  { icon: 'shield', title: 'Fair & monitored', text: 'Attempts are monitored so every candidate competes on equal terms.' },
  { icon: 'check', title: 'Instant confirmation', text: 'Get a confirmation and your candidate ID the moment you submit.' },
];
const STEPS = [
  { t: 'Register', d: 'Pick your exam and enter your name, email and phone number.' },
  { t: 'Read the instructions', d: 'Check the duration, marking and rules, then start when you are ready.' },
  { t: 'Take the exam', d: 'Answer at your own pace. Flag questions to revisit before you submit.' },
  { t: 'We take it from here', d: 'Your answers are evaluated and the LeadSoc team gets in touch.' },
];

function PreviewCard() {
  return (
    <div className="ex-mock" aria-hidden="true">
      <div className="ex-mock__glow" />
      <div className="ex-mock__card">
        <div className="ex-row">
          <span className="ex-mock__q">Question 4 of 20</span>
          <div className="ex-spacer" />
          <span className="ex-mock__timer"><Icon name="clock" size={14} /> 42:18</span>
        </div>
        <div className="ex-mock__bar"><i /></div>
        <div className="ex-mock__title">Sample question</div>
        <div className="ex-mock__line" style={{ width: '92%' }} />
        <div className="ex-mock__line" style={{ width: '64%' }} />
        <div className="ex-mock__opts">
          <div><b>A</b><span style={{ width: '58%' }} /></div>
          <div className="on"><b>B</b><span style={{ width: '72%' }} /></div>
          <div><b>C</b><span style={{ width: '46%' }} /></div>
        </div>
        <div className="ex-mock__cta">Save &amp; next</div>
      </div>
      <div className="ex-mock__float ex-mock__float--a"><Icon name="check" size={15} /> Answers saved</div>
      <div className="ex-mock__float ex-mock__float--b"><Icon name="shield" size={15} /> Warnings 0/3</div>
    </div>
  );
}

function ExamCard({ e, solo, onStart }) {
  return (
    <article className={`ex-examcard ${solo ? 'ex-examcard--solo' : ''}`}>
      <div className="ex-examcard__main">
        <div className="ex-row ex-row--wrap" style={{ gap: 8 }}>
          {e.category && <Badge tone="brand">{e.category}</Badge>}
          <Badge tone="success"><i className="ex-dot" /> Open now</Badge>
        </div>
        <h3>{e.name}</h3>
        <p>{e.description || 'Read the instructions, then begin when you are ready.'}</p>
        <div className="ex-meta">
          <span className="ex-badge"><Icon name="clock" size={13} /> {e.durationMinutes} min</span>
          <span className="ex-badge"><Icon name="award" size={13} /> {e.maximumMarks} marks</span>
          {e.endsAt && <span className="ex-badge"><Icon name="calendar" size={13} /> Closes {fmtDate(e.endsAt)}</span>}
        </div>
      </div>
      <div className="ex-examcard__cta">
        <Button variant={solo ? 'accent' : 'primary'} size="lg" block onClick={onStart}>Start exam <Icon name="chevron" size={16} /></Button>
        <span className="ex-small">Takes about {e.durationMinutes} minutes</span>
      </div>
    </article>
  );
}

export default function ExamLanding() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    examApi.list().then(setExams).catch((e) => { setError(e.message); setExams([]); });
  }, []);

  const warnings = exams?.find((e) => e.proctoringEnabled !== false)?.maxWarnings ?? 3;
  const goExams = () => document.getElementById('exams')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const solo = exams?.length === 1;

  return (
    <div className="ex-root ex-student ex-landing">
      <header className="ex-topbar ex-topbar--wide">
        <Brand />
        <div className="ex-spacer" />
        <span className="ex-chip ex-chip--ghost"><Icon name="lock" size={14} /> Secure examination portal</span>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="ex-wrap ex-hero2">
          <div className="ex-hero2__text">
            <span className="ex-kicker"><Icon name="zap" size={13} /> LEARNING • ASSESSMENT • GROWTH</span>
            <h1>Show what you know.<br /><em>Take the next step.</em></h1>
            <p>Welcome to the LeadSoc Exam Portal — a calm, distraction-free place to take your assessment and show your skills.</p>
            <div className="ex-row ex-row--wrap" style={{ gap: 12, marginTop: 28 }}>
              <Button variant="primary" size="lg" onClick={goExams}>Browse exams <Icon name="down" size={17} /></Button>
              <Button variant="secondary" size="lg" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How it works</Button>
            </div>
            <div className="ex-trust">
              <span><Icon name="check" size={15} /> No account needed</span>
              <span><Icon name="check" size={15} /> Works on any device</span>
              <span><Icon name="check" size={15} /> Quick to get started</span>
            </div>
          </div>
          <PreviewCard />
        </section>

        {/* ---------- Feature tiles ---------- */}
        <section className="ex-wrap">
          <div className="ex-featgrid">
            {FEATURES.map((f) => (
              <div className="ex-feat" key={f.title}>
                <div className="ex-feat__ico"><Icon name={f.icon} size={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Exams ---------- */}
        <section className="ex-wrap" id="exams" style={{ scrollMarginTop: 20 }}>
          <div className="ex-sechead">
            <span className="ex-eyebrow">Ready when you are</span>
            <h2>Available examinations</h2>
            <p className="ex-muted">Choose an exam below to register and read the instructions.</p>
          </div>
          <Alert>{error}</Alert>
          {exams === null && <div className="ex-skel" style={{ height: 230, borderRadius: 22 }} />}
          {exams && !exams.length && !error && (
            <div className="ex-card"><Empty icon="calendar" title="No examinations are open right now">Please check back later or contact your LeadSoc examination coordinator.</Empty></div>
          )}
          {exams && exams.length > 0 && (
            <div className={`ex-examlist ${solo ? 'is-solo' : ''}`}>
              {exams.map((e) => <ExamCard key={e._id} e={e} solo={solo} onStart={() => nav(`/exam/register/${e._id}`)} />)}
            </div>
          )}
        </section>

        {/* ---------- How it works ---------- */}
        <section className="ex-wrap" id="how" style={{ scrollMarginTop: 20 }}>
          <div className="ex-sechead">
            <span className="ex-eyebrow">Simple &amp; quick</span>
            <h2>How it works</h2>
          </div>
          <ol className="ex-steps4">
            {STEPS.map((s, i) => (
              <li key={s.t}><span className="ex-steps4__n">{i + 1}</span><h3>{s.t}</h3><p>{s.d}</p></li>
            ))}
          </ol>
        </section>

        {/* ---------- Guidelines ---------- */}
        <section className="ex-wrap" style={{ paddingBottom: 56 }}>
          <div className="ex-guide">
            <div className="ex-guide__head">
              <div className="ex-feat__ico"><Icon name="info" size={22} /></div>
              <div><h2>Before you begin</h2><p className="ex-muted">A few things that help your exam go smoothly.</p></div>
            </div>
            <ul>
              <li><span className="ex-tick"><Icon name="check" size={14} /></span>Use a stable internet connection for the whole exam.</li>
              <li><span className="ex-tick"><Icon name="check" size={14} /></span>Read each question carefully — answers are saved automatically.</li>
              <li><span className="ex-tick"><Icon name="check" size={14} /></span>Submit before the timer ends; it submits for you when time is up.</li>
              <li><span className="ex-tick"><Icon name="check" size={14} /></span>Please don&apos;t refresh or close the exam window.</li>
            </ul>
            <div className="ex-guide__warn">
              <Icon name="alert" size={20} />
              <div><b>Stay on the exam screen.</b> Minimising the window or switching tabs/apps gives a warning. After {warnings} warnings your exam is submitted automatically.</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="ex-footer">
        <div className="ex-wrap ex-row ex-row--wrap">
          <span>© {new Date().getFullYear()} LeadSoc. All rights reserved.</span>
          <div className="ex-spacer" />
          <span>Need help? Contact your LeadSoc examination coordinator.</span>
        </div>
      </footer>
    </div>
  );
}
