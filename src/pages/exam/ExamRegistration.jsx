// import React, { useEffect, useState } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { attemptSession, examApi } from './examApi';
// import StudentShell, { Stepper } from './components/StudentShell';
// import { Alert, Button, Field, Icon } from './components/ExamUI';

// export default function ExamRegistration() {
//   const { examId } = useParams();
//   const nav = useNavigate();
//   const [exam, setExam] = useState(null);
//   const [form, setForm] = useState({ name: '', email: '', phone: '', interestedDomain: '' });
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');
//   const [loadError, setLoadError] = useState('');

//   useEffect(() => {
//     examApi.exam(examId).then(setExam).catch((e) => setLoadError(e.message));
//   }, [examId]);

//   const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   async function submit(e) {
//     e.preventDefault();
//     setBusy(true);
//     setError('');
//     try {
//       const r = await examApi.register({ ...form, examId });
//       attemptSession.set(r.attemptToken, r.candidateId);
//       nav(`/exam/instructions/${r.attemptId}`);
//     } catch (x) {
//       setError(x.message);
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <StudentShell>
//       <Stepper step={0} />
//       {loadError ? (
//         <div className="ex-card ex-container--narrow" style={{ margin: '0 auto' }}>
//           <Alert title="This examination is not available">{loadError}</Alert>
//           <Button variant="secondary" style={{ marginTop: 16 }} onClick={() => nav('/exam')}>Back to exams</Button>
//         </div>
//       ) : (
//         <div className="ex-split">
//           <aside className="ex-split__side">
//             <span className="ex-kicker">CANDIDATE REGISTRATION</span>
//             <h2>{exam ? exam.name : 'Loading…'}</h2>
//             {exam?.description && <p style={{ position: 'relative', zIndex: 1 }}>{exam.description}</p>}
//             {exam && (
//               <>
//                 <div className="ex-side-stat"><span className="ex-ico"><Icon name="clock" /></span><div><small>Duration</small><b>{exam.durationMinutes} minutes</b></div></div>
//                 <div className="ex-side-stat"><span className="ex-ico"><Icon name="award" /></span><div><small>Maximum marks</small><b>{exam.maximumMarks}</b></div></div>
//                 <div className="ex-side-stat"><span className="ex-ico"><Icon name="shield" /></span><div><small>Monitoring</small><b>{exam.proctoringEnabled === false ? 'Standard' : 'Tab-switch monitoring on'}</b></div></div>
//               </>
//             )}
//           </aside>
//           <section className="ex-split__form">
//             <div>
//               <h1>Enter your details</h1>
//               <p className="ex-muted" style={{ marginTop: 6 }}>We use these to identify your attempt and send your confirmation.</p>
//             </div>
//             <form className="ex-form" onSubmit={submit}>
//               <Field label="Full name"><div className="ex-input-wrap"><Icon name="users" size={17} /><input className="ex-input" name="name" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={change} placeholder="As it should appear on your result" /></div></Field>
//               <Field label="Email address"><div className="ex-input-wrap"><Icon name="mail" size={17} /><input className="ex-input" name="email" type="email" autoComplete="email" required value={form.email} onChange={change} placeholder="you@example.com" /></div></Field>
//               <Field label="Phone number" hint="Include country code if outside India, e.g. +91 98765 43210"><div className="ex-input-wrap"><Icon name="phone" size={17} /><input className="ex-input" name="phone" type="tel" autoComplete="tel" required  pattern="[+]?[0-9]{8,15}"  title="8–20 digits; spaces, +, - and brackets allowed" value={form.phone} onChange={change} placeholder="+91 98765 43210" /></div></Field>
//               <Field label="Interested Domain">
//   <div className="ex-input-wrap">
//     <select
//       className="ex-input"
//       name="interestedDomain"
//       value={form.interestedDomain}
//       onChange={change}
//       required
//     >
//       <option value="">Select Interested Domain</option>
//       <option value="Analogy Layout">Analogy Layout</option>
//       <option value="Analog Design">Analog Design</option>
//       <option value="Memory Layout">Memory Layout</option>
//       <option value="Memory Design">Memory Design</option>
//     </select>
//   </div>
// </Field>
//               <Alert>{error}</Alert>
//               <Button type="submit" variant="primary" size="lg" busy={busy} block disabled={!exam}>Continue to instructions</Button>
//             </form>
//           </section>
//         </div>
//       )}
//     </StudentShell>
//   );
// }



import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { attemptSession, examApi } from './examApi';
import StudentShell, { Stepper } from './components/StudentShell';
import { Alert, Button, Field, Icon } from './components/ExamUI';

const INTERESTED_DOMAINS = [
  'Analogy Layout',
  'Analog Design',
  'Memory Layout',
  'Memory Design',
];

export default function ExamRegistration() {
  const { examId } = useParams();
  const nav = useNavigate();

  const [exam, setExam] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    interestedDomain: '',
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    examApi.exam(examId)
      .then((data) => {
        if (active) setExam(data);
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      });

    return () => {
      active = false;
    };
  }, [examId]);

  const change = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  async function submit(e) {
    e.preventDefault();

    if (!INTERESTED_DOMAINS.includes(form.interestedDomain)) {
      setError('Please select your interested domain.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        interestedDomain: form.interestedDomain,
        examId,
      };

      const r = await examApi.register(payload);

      attemptSession.set(r.attemptToken, r.candidateId);

      nav(`/exam/instructions/${r.attemptId}`);
    } catch (x) {
      setError(x.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudentShell>
      <Stepper step={0} />

      {loadError ? (
        <div
          className="ex-card ex-container--narrow"
          style={{ margin: '0 auto' }}
        >
          <Alert title="This examination is not available">
            {loadError}
          </Alert>

          <Button
            variant="secondary"
            style={{ marginTop: 16 }}
            onClick={() => nav('/exam')}
          >
            Back to exams
          </Button>
        </div>
      ) : (
        <div className="ex-split">
          <aside className="ex-split__side">
            <span className="ex-kicker">CANDIDATE REGISTRATION</span>

            <h2>{exam ? exam.name : 'Loading…'}</h2>

            {exam?.description && (
              <p style={{ position: 'relative', zIndex: 1 }}>
                {exam.description}
              </p>
            )}

            {exam && (
              <>
                <div className="ex-side-stat">
                  <span className="ex-ico">
                    <Icon name="clock" />
                  </span>
                  <div>
                    <small>Duration</small>
                    <b>{exam.durationMinutes} minutes</b>
                  </div>
                </div>

                <div className="ex-side-stat">
                  <span className="ex-ico">
                    <Icon name="award" />
                  </span>
                  <div>
                    <small>Maximum marks</small>
                    <b>{exam.maximumMarks}</b>
                  </div>
                </div>

                <div className="ex-side-stat">
                  <span className="ex-ico">
                    <Icon name="shield" />
                  </span>
                  <div>
                    <small>Monitoring</small>
                    <b>
                      {exam.proctoringEnabled === false
                        ? 'Standard'
                        : 'Tab-switch monitoring on'}
                    </b>
                  </div>
                </div>
              </>
            )}
          </aside>

          <section className="ex-split__form">
            <div>
              <h1>Enter your details</h1>
              <p className="ex-muted" style={{ marginTop: 6 }}>
                We use these to identify your attempt and send your confirmation.
              </p>
            </div>

            <form className="ex-form" onSubmit={submit}>
              <Field label="Full name">
                <div className="ex-input-wrap">
                  <Icon name="users" size={17} />
                  <input
                    className="ex-input"
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.name}
                    onChange={change}
                    placeholder="As it should appear on your result"
                  />
                </div>
              </Field>

              <Field label="Email address">
                <div className="ex-input-wrap">
                  <Icon name="mail" size={17} />
                  <input
                    className="ex-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={change}
                    placeholder="you@example.com"
                  />
                </div>
              </Field>

              <Field
                label="Phone number"
                hint="Include country code if outside India, e.g. +91 98765 43210"
              >
                <div className="ex-input-wrap">
                  <Icon name="phone" size={17} />
                  <input
                    className="ex-input"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    pattern="[+]?[0-9]{8,15}"
                    title="Enter 8–15 digits, optionally starting with +"
                    value={form.phone}
                    onChange={change}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </Field>

              <Field
                label="Interested Domain"
                hint="Select the domain you are interested in."
              >
                <div className="ex-input-wrap">
                  <Icon name="layers" size={17} />

                  <select
                    className="ex-input"
                    name="interestedDomain"
                    value={form.interestedDomain}
                    onChange={change}
                    required
                    style={{
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                    }}
                  >
                    <option value="" disabled>
                      Select Interested Domain
                    </option>

                    {INTERESTED_DOMAINS.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {error && <Alert title="Registration error">{error}</Alert>}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                busy={busy}
                block
                disabled={!exam || busy}
              >
                Continue to instructions
              </Button>
            </form>
          </section>
        </div>
      )}
    </StudentShell>
  );
}
