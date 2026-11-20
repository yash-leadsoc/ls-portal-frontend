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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const startTime = exam?.startsAt
    ? new Date(exam.startsAt).getTime()
    : null;

  const endTime = exam?.endsAt
    ? new Date(exam.endsAt).getTime()
    : null;

  const isEnded = endTime && now > endTime;

  const isLive =
    exam &&
    !isEnded &&
    (!startTime || now >= startTime) &&
    ['Live', 'Scheduled'].includes(exam.status);

  const remaining = startTime
    ? Math.max(0, startTime - now)
    : 0;

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

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

          {/* <section className="ex-split__form">


            {exam && (
              <div className="ex-card" style={{ padding: 24, marginBottom: 24 }}>
                {isEnded ? (
                  <>
                    <h2>Examination has ended</h2>
                    <p>This examination is no longer accepting registrations.</p>
                  </>
                ) 
                
                : isLive ? (
                  <>
                    <h2 style={{ color: '#16a34a' }}>Examination is Live!</h2>
                    <p>Registration is now open.</p>
                  </>
                ) : (
                  <>
                    <h2>Examination starts soon</h2>
                    <p>Registration will open at the scheduled start time.</p>

                    <div style={{
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap',
                      marginTop: 20
                    }}>
                      {[
                        ['Days', days],
                        ['Hours', hours],
                        ['Minutes', minutes],
                        ['Seconds', seconds]
                      ].map(([label, value]) => (
                        <div key={label} style={{
                          background: '#eef2ff',
                          padding: '16px 20px',
                          borderRadius: 12,
                          minWidth: 75,
                          textAlign: 'center'
                        }}>
                          <h2 style={{ margin: 0 }}>
                            {String(value).padStart(2, '0')}
                          </h2>
                          <small>{label}</small>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

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

              {/* <Button
                type="submit"
                variant="primary"
                size="lg"
                busy={busy}
                block
                disabled={!exam || busy}
              >
                Continue to instructions
              </Button>*/}

              {/* <Button
                type="submit"
                variant="primary"
                size="lg"
                busy={busy}
                block
                disabled={!exam || !isLive || isEnded || busy}
              >
                {isEnded
                  ? 'Examination Ended'
                  : isLive
                    ? 'Continue to instructions'
                    : 'Registration opens at exam time'}
              </Button>
            </form>
          </section>  */}


<section className="ex-split__form">

  {isEnded ? (
    // EXAMINATION ENDED SCREEN
    <div
      className="ex-card"
      style={{
        width: '100%',
        maxWidth: 520,
        margin: 'auto',
        padding: '48px 32px',
        textAlign: 'center',
        borderRadius: 20
      }}
    >
      <div
        style={{
          width: 82,
          height: 82,
          borderRadius: '50%',
          background: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}
      >
        <Icon name="calendar-x" size={38} />
      </div>

      <span
        style={{
          color: '#dc2626',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 1.5
        }}
      >
        EXAMINATION CLOSED
      </span>

      <h1 style={{ marginTop: 12 }}>
        Examination Over
      </h1>

      <p
        className="ex-muted"
        style={{
          marginTop: 12,
          lineHeight: 1.7
        }}
      >
        This examination has ended. Registration and examination
        access are now closed.
      </p>

      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          marginTop: 24
        }}
      >
        <small style={{ color: '#64748b' }}>
          EXAMINATION
        </small>
        <h3 style={{ marginTop: 6 }}>
          {exam?.name}
        </h3>
      </div>

      <p
        style={{
          color: '#64748b',
          fontSize: 13,
          marginTop: 24
        }}
      >
        Thank you for your interest in LeadSoc Technologies.
      </p>
    </div>

  ) : (
    <>
      {/* COUNTDOWN AND EXAM STATUS */}

      {exam && (
        <div
          className="ex-card"
          style={{
            padding: 24,
            marginBottom: 24
          }}
        >
          {isLive ? (
            <>
              <h2 style={{ color: '#16a34a' }}>
                Examination is Live!
              </h2>
              <p>Registration is now open.</p>
            </>
          ) : (
            <>
              <h2>Examination starts soon</h2>
              <p>Registration will open at the scheduled start time.</p>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 20
                }}
              >
                {[
                  ['Days', days],
                  ['Hours', hours],
                  ['Minutes', minutes],
                  ['Seconds', seconds]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: '#eef2ff',
                      padding: '16px 20px',
                      borderRadius: 12,
                      minWidth: 75,
                      textAlign: 'center'
                    }}
                  >
                    <h2 style={{ margin: 0 }}>
                      {String(value).padStart(2, '0')}
                    </h2>
                    <small>{label}</small>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* REGISTRATION FORM */}

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
              disabled={!isLive || busy}
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
              disabled={!isLive || busy}
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
              disabled={!isLive || busy}
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
              disabled={!isLive || busy}
              style={{
                cursor: 'pointer',
                backgroundColor: 'transparent'
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

        {error && (
          <Alert title="Registration error">
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          busy={busy}
          block
          disabled={!exam || !isLive || busy}
        >
          {isLive
            ? 'Continue to instructions'
            : 'Registration opens at exam time'}
        </Button>

      </form>
    </>
  )}

</section>

        </div>
      )}
    </StudentShell>
  );
}
