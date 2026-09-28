import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Badge, Button, LoadingPage, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { renderResumeHtml, printResume, downloadResumeHtml } from '../../utils/resumeTemplate';

const TABS = [
  { key: 'profile', label: '👤 Profile' },
  { key: 'resume', label: '📝 Resume builder' },
  { key: 'upload', label: '📎 Upload resume' },
];

const joinList = (a) => (Array.isArray(a) ? a.join(', ') : '');
const splitList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const joinLines = (a) => (Array.isArray(a) ? a.join('\n') : '');
const splitLines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

const EMPTY = {
  experience: { company: '', role: '', location: '', start: '', end: '', current: false, bullets: '' },
  projects: { title: '', role: '', tech: '', link: '', bullets: '' },
  education: { degree: '', institution: '', location: '', year: '', score: '' },
  certifications: { name: '', issuer: '', year: '', link: '' },
};

function toForm(r = {}) {
  return {
    fullName: r.fullName || '',
    headline: r.headline || '',
    email: r.email || '',
    phone: r.phone || '',
    location: r.location || '',
    linkedin: r.linkedin || '',
    github: r.github || '',
    portfolio: r.portfolio || '',
    totalExperience: r.totalExperience || '',
    summary: r.summary || '',
    technicalSkills: joinList(r.technicalSkills),
    tools: joinList(r.tools),
    softSkills: joinList(r.softSkills),
    languages: joinList(r.languages),
    achievements: joinLines(r.achievements),
    experience: (r.experience || []).map((e) => ({ ...EMPTY.experience, ...e, bullets: joinLines(e.bullets) })),
    projects: (r.projects || []).map((p) => ({ ...EMPTY.projects, ...p, bullets: joinLines(p.bullets) })),
    education: (r.education || []).map((e) => ({ ...EMPTY.education, ...e })),
    certifications: (r.certifications || []).map((c) => ({ ...EMPTY.certifications, ...c })),
  };
}

function toPayload(f) {
  return {
    ...f,
    technicalSkills: splitList(f.technicalSkills),
    tools: splitList(f.tools),
    softSkills: splitList(f.softSkills),
    languages: splitList(f.languages),
    achievements: splitLines(f.achievements),
    experience: f.experience.map((e) => ({ ...e, bullets: splitLines(e.bullets) })),
    projects: f.projects.map((p) => ({ ...p, bullets: splitLines(p.bullets) })),
  };
}

function completion(f) {
  const checks = [
    f.fullName && f.headline,
    f.email && f.phone,
    f.summary.length >= 60,
    splitList(f.technicalSkills).length >= 3,
    f.education.length > 0,
    f.projects.length > 0 || f.experience.length > 0,
    f.linkedin || f.github || f.portfolio,
    f.certifications.length > 0 || splitLines(f.achievements).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function Field({ label, children, hint, span }) {
  return (
    <div className="field" style={{ margin: 0, gridColumn: span ? '1 / -1' : undefined }}>
      <label>{label}</label>
      {children}
      {hint ? <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>{children}</div>;
}

function Block({ title, subtitle, children, action }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--navy)' }}>{title}</div>
          {subtitle ? <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const { toast, toastError } = useToast();
  const [form, setForm] = useState({
    preferredLocation: user.preferredLocation || '',
    contactNumber: user.contactNumber || '',
    skills: joinList(user.skills),
  });
  const [busy, setBusy] = useState(false);
  const skills = splitList(form.skills);

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.updateMyProfile({
        preferredLocation: form.preferredLocation,
        contactNumber: form.contactNumber,
        skills,
      });
      setUser({ ...user, ...res.user });
      toast('Profile updated');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <Block title="Account" subtitle="These details are managed by your admin.">
        <Grid>
          <Field label="Name"><input className="input" value={user.name} disabled /></Field>
          <Field label="Email"><input className="input" value={user.email} disabled /></Field>
          <Field label="Employee ID"><input className="input" value={user.employeeCode || '—'} disabled /></Field>
        </Grid>
      </Block>
      <Block title="Profile details" subtitle="Visible to your trainer, BU and admin.">
        <Grid>
          <Field label="Preferred work location">
            <input className="input" value={form.preferredLocation} placeholder="e.g. Bengaluru, Hyderabad, Remote"
              onChange={(e) => setForm({ ...form, preferredLocation: e.target.value })} />
          </Field>
          <Field label="Contact number">
            <input className="input" value={form.contactNumber} placeholder="+91 98765 43210"
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
          </Field>
          <Field label="Skills" hint="Separate skills with commas, e.g. STA, Synthesis, Python" span>
            <input className="input" value={form.skills} placeholder="STA, PNR, Verilog, TCL"
              onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          </Field>
        </Grid>
        {skills.length > 0 && (
          <div className="row gap-8" style={{ flexWrap: 'wrap', marginTop: 10 }}>
            {skills.map((s) => <Badge key={s} kind="info">{s}</Badge>)}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <Button variant="cyan" onClick={save} disabled={busy}>{busy ? <Spinner sm /> : 'Save profile'}</Button>
        </div>
      </Block>
    </div>
  );
}

function ListEditor({ title, subtitle, items, onChange, emptyItem, addLabel, render }) {
  const update = (i, patch) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <Block
      title={title}
      subtitle={subtitle}
      action={<Button size="sm" variant="ghost" onClick={() => onChange([...items, { ...emptyItem }])}>+ {addLabel}</Button>}
    >
      {items.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Nothing added yet.</div>}
      {items.map((it, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
          {render(it, (patch) => update(i, patch))}
          <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
            <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
            <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</Button>
            <Button size="sm" variant="danger" onClick={() => remove(i)}>Remove</Button>
          </div>
        </div>
      ))}
    </Block>
  );
}

function ResumeTab({ resume, onSaved }) {
  const { toast, toastError } = useToast();
  const [form, setForm] = useState(() => toForm(resume));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const payload = useMemo(() => toPayload(form), [form]);
  const html = useMemo(() => renderResumeHtml(payload), [payload]);
  const pct = completion(form);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const bind = (key) => ({ value: form[key], onChange: (e) => set({ [key]: e.target.value }) });

  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    if (!form.fullName.trim()) return toastError('Full name is required');
    setSaving(true);
    try {
      const res = await api.saveMyResume(payload);
      onSaved(res.resume);
      setForm(toForm(res.resume));
      setDirty(false);
      toast('Resume saved');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid resume-layout" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
      <div>
        <div className="card" style={{ padding: 14, marginBottom: 14, position: 'sticky', top: 0, zIndex: 2 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 180, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>Resume strength: {pct}%</div>
              <div style={{ height: 8, background: '#eef1f7', borderRadius: 6, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
            <div className="row gap-8">
              <Button variant="ghost" size="sm" onClick={() => printResume(payload)}>⬇ Download PDF</Button>
              <Button variant="cyan" size="sm" onClick={save} disabled={saving}>
                {saving ? <Spinner sm /> : dirty ? 'Save changes' : 'Saved ✓'}
              </Button>
            </div>
          </div>
        </div>

        <Block title="Personal details">
          <Grid>
            <Field label="Full name *"><input className="input" {...bind('fullName')} /></Field>
            <Field label="Headline" hint="e.g. Physical Design Engineer"><input className="input" {...bind('headline')} /></Field>
            <Field label="Email"><input className="input" type="email" {...bind('email')} /></Field>
            <Field label="Phone"><input className="input" {...bind('phone')} /></Field>
            <Field label="Current location"><input className="input" {...bind('location')} /></Field>
            <Field label="Total experience" hint="e.g. 2 years, Fresher"><input className="input" {...bind('totalExperience')} /></Field>
            <Field label="LinkedIn"><input className="input" placeholder="linkedin.com/in/…" {...bind('linkedin')} /></Field>
            <Field label="GitHub"><input className="input" placeholder="github.com/…" {...bind('github')} /></Field>
            <Field label="Portfolio / website"><input className="input" {...bind('portfolio')} /></Field>
          </Grid>
        </Block>

        <Block title="Professional summary" subtitle="3–4 lines about your strengths and what you are looking for.">
          <textarea className="textarea" rows={4} maxLength={2000} {...bind('summary')} />
        </Block>

        <Block title="Skills" subtitle="Separate each item with a comma.">
          <Grid>
            <Field label="Technical skills" span><input className="input" placeholder="STA, Synthesis, Verilog, Python" {...bind('technicalSkills')} /></Field>
            <Field label="Tools" span><input className="input" placeholder="Innovus, PrimeTime, Genus" {...bind('tools')} /></Field>
            <Field label="Soft skills"><input className="input" placeholder="Communication, Teamwork" {...bind('softSkills')} /></Field>
            <Field label="Languages"><input className="input" placeholder="English, Hindi, Kannada" {...bind('languages')} /></Field>
          </Grid>
        </Block>

        <ListEditor
          title="Experience"
          subtitle="Internships and jobs, most recent first."
          items={form.experience}
          onChange={(experience) => set({ experience })}
          emptyItem={EMPTY.experience}
          addLabel="Add experience"
          render={(e, up) => (
            <Grid>
              <Field label="Role"><input className="input" value={e.role} onChange={(x) => up({ role: x.target.value })} /></Field>
              <Field label="Company"><input className="input" value={e.company} onChange={(x) => up({ company: x.target.value })} /></Field>
              <Field label="Location"><input className="input" value={e.location} onChange={(x) => up({ location: x.target.value })} /></Field>
              <Field label="Start"><input className="input" placeholder="Jan 2024" value={e.start} onChange={(x) => up({ start: x.target.value })} /></Field>
              <Field label="End">
                <input className="input" placeholder="Dec 2024" value={e.current ? '' : e.end} disabled={e.current} onChange={(x) => up({ end: x.target.value })} />
                <label className="row gap-8" style={{ fontSize: 12.5, marginTop: 6, fontWeight: 500 }}>
                  <input type="checkbox" checked={!!e.current} onChange={(x) => up({ current: x.target.checked })} /> I currently work here
                </label>
              </Field>
              <Field label="What you did" hint="One point per line" span>
                <textarea className="textarea" rows={4} value={e.bullets} onChange={(x) => up({ bullets: x.target.value })} />
              </Field>
            </Grid>
          )}
        />

        <ListEditor
          title="Projects"
          subtitle="Training, academic or personal projects."
          items={form.projects}
          onChange={(projects) => set({ projects })}
          emptyItem={EMPTY.projects}
          addLabel="Add project"
          render={(p, up) => (
            <Grid>
              <Field label="Project title"><input className="input" value={p.title} onChange={(x) => up({ title: x.target.value })} /></Field>
              <Field label="Your role"><input className="input" value={p.role} onChange={(x) => up({ role: x.target.value })} /></Field>
              <Field label="Technologies / tools"><input className="input" value={p.tech} onChange={(x) => up({ tech: x.target.value })} /></Field>
              <Field label="Link (optional)"><input className="input" value={p.link} onChange={(x) => up({ link: x.target.value })} /></Field>
              <Field label="Details" hint="One point per line" span>
                <textarea className="textarea" rows={3} value={p.bullets} onChange={(x) => up({ bullets: x.target.value })} />
              </Field>
            </Grid>
          )}
        />

        <ListEditor
          title="Education"
          items={form.education}
          onChange={(education) => set({ education })}
          emptyItem={EMPTY.education}
          addLabel="Add education"
          render={(e, up) => (
            <Grid>
              <Field label="Degree / course"><input className="input" placeholder="B.E. Electronics & Communication" value={e.degree} onChange={(x) => up({ degree: x.target.value })} /></Field>
              <Field label="Institution"><input className="input" value={e.institution} onChange={(x) => up({ institution: x.target.value })} /></Field>
              <Field label="Location"><input className="input" value={e.location} onChange={(x) => up({ location: x.target.value })} /></Field>
              <Field label="Year"><input className="input" placeholder="2020 – 2024" value={e.year} onChange={(x) => up({ year: x.target.value })} /></Field>
              <Field label="CGPA / %"><input className="input" value={e.score} onChange={(x) => up({ score: x.target.value })} /></Field>
            </Grid>
          )}
        />

        <ListEditor
          title="Certifications"
          items={form.certifications}
          onChange={(certifications) => set({ certifications })}
          emptyItem={EMPTY.certifications}
          addLabel="Add certification"
          render={(c, up) => (
            <Grid>
              <Field label="Certification"><input className="input" value={c.name} onChange={(x) => up({ name: x.target.value })} /></Field>
              <Field label="Issued by"><input className="input" value={c.issuer} onChange={(x) => up({ issuer: x.target.value })} /></Field>
              <Field label="Year"><input className="input" value={c.year} onChange={(x) => up({ year: x.target.value })} /></Field>
              <Field label="Link (optional)"><input className="input" value={c.link} onChange={(x) => up({ link: x.target.value })} /></Field>
            </Grid>
          )}
        />

        <Block title="Achievements" subtitle="One per line.">
          <textarea className="textarea" rows={4} {...bind('achievements')} />
        </Block>
      </div>

      <div style={{ position: 'sticky', top: 0 }}>
        <div className="card" style={{ padding: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between', padding: '2px 4px 8px' }}>
            <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--navy)' }}>Live preview</div>
            <Button size="sm" variant="ghost" onClick={() => downloadResumeHtml(payload)}>Download HTML</Button>
          </div>
          <iframe
            title="Resume preview"
            srcDoc={html}
            sandbox="allow-same-origin"
            style={{ width: '100%', height: '80vh', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .resume-layout { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function UploadTab({ resume, onSaved }) {
  const { toast, toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const file = resume.file || {};

  const upload = async (f) => {
    if (!f) return;
    if (!/\.(pdf|docx?|DOCX?|PDF)$/.test(f.name)) return toastError('Only PDF, DOC or DOCX files are allowed');
    if (f.size > 5 * 1024 * 1024) return toastError('Resume must be 5 MB or smaller');
    setBusy(true);
    try {
      const res = await api.uploadResumeFile(f);
      onSaved(res.resume);
      toast('Resume uploaded');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove your uploaded resume?')) return;
    setBusy(true);
    try {
      const res = await api.deleteResumeFile();
      onSaved(res.resume);
      toast('Uploaded resume removed');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <Block title="Your own resume file" subtitle="Optional. Upload a resume you already have (PDF, DOC or DOCX, up to 5 MB).">
        {file.url ? (
          <div className="list-row">
            <span style={{ fontSize: 26 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div className="li-title">{file.name || 'Resume'}</div>
              <div className="li-sub">Uploaded {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString('en-IN') : ''}</div>
            </div>
            <a className="btn ghost sm" href={file.url} target="_blank" rel="noreferrer">Open</a>
            <Button size="sm" variant="danger" onClick={remove} disabled={busy}>Remove</Button>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>No file uploaded yet.</div>
        )}
        <div className="row gap-8" style={{ marginTop: 12 }}>
          <input ref={input} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => upload(e.target.files[0])} />
          <Button variant="cyan" onClick={() => input.current && input.current.click()} disabled={busy}>
            {busy ? <Spinner sm /> : file.url ? 'Replace file' : 'Choose file'}
          </Button>
        </div>
      </Block>
    </div>
  );
}

export default function MyProfile() {
  const { toastError } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'profile';
  const [resume, setResume] = useState(null);

  useEffect(() => {
    api.getMyResume().then((r) => setResume(r.resume)).catch((e) => { toastError(e); setResume({}); });
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>My Profile & Resume</h1>
        <p>Keep your details up to date and build a professional resume using the standard template.</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div className="tabs" style={{ width: 'max-content' }}>
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setParams(t.key === 'profile' ? {} : { tab: t.key })}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'profile' && <ProfileTab />}
      {tab !== 'profile' && !resume && <LoadingPage />}
      {tab === 'resume' && resume && <ResumeTab resume={resume} onSaved={setResume} />}
      {tab === 'upload' && resume && <UploadTab resume={resume} onSaved={setResume} />}
    </>
  );
}
