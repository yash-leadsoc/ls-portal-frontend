const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const url = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const shortUrl = (v) => String(v || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

const has = (arr) => Array.isArray(arr) && arr.length > 0;

function section(title, body) {
  if (!body) return '';
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function bullets(list) {
  return has(list) ? `<ul>${list.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
}

export function renderResumeHtml(r = {}) {
  const name = r.fullName || 'Your Name';
  const contact = [
    r.email && `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`,
    r.phone && esc(r.phone),
    r.location && esc(r.location),
    r.linkedin && `<a href="${esc(url(r.linkedin))}">${esc(shortUrl(r.linkedin))}</a>`,
    r.github && `<a href="${esc(url(r.github))}">${esc(shortUrl(r.github))}</a>`,
    r.portfolio && `<a href="${esc(url(r.portfolio))}">${esc(shortUrl(r.portfolio))}</a>`,
  ].filter(Boolean);

  const skillRows = [
    ['Technical', r.technicalSkills],
    ['Tools', r.tools],
    ['Soft skills', r.softSkills],
    ['Languages', r.languages],
  ].filter(([, list]) => has(list));

  const skills = skillRows.length
    ? `<table class="skills">${skillRows
        .map(([label, list]) => `<tr><th>${esc(label)}</th><td>${list.map(esc).join(' · ')}</td></tr>`)
        .join('')}</table>`
    : '';

  const experience = has(r.experience)
    ? r.experience
        .map(
          (e) => `<div class="entry">
          <div class="row"><div><b>${esc(e.role)}</b>${e.company ? ` — ${esc(e.company)}` : ''}</div>
          <div class="date">${esc(e.start)}${e.start || e.end || e.current ? ' – ' : ''}${e.current ? 'Present' : esc(e.end)}</div></div>
          ${e.location ? `<div class="sub">${esc(e.location)}</div>` : ''}
          ${bullets(e.bullets)}
        </div>`
        )
        .join('')
    : '';

  const projects = has(r.projects)
    ? r.projects
        .map(
          (p) => `<div class="entry">
          <div class="row"><div><b>${esc(p.title)}</b>${p.role ? ` — ${esc(p.role)}` : ''}</div>
          ${p.link ? `<div class="date"><a href="${esc(url(p.link))}">${esc(shortUrl(p.link))}</a></div>` : ''}</div>
          ${p.tech ? `<div class="sub">${esc(p.tech)}</div>` : ''}
          ${bullets(p.bullets)}
        </div>`
        )
        .join('')
    : '';

  const education = has(r.education)
    ? r.education
        .map(
          (e) => `<div class="entry">
          <div class="row"><div><b>${esc(e.degree)}</b>${e.institution ? ` — ${esc(e.institution)}` : ''}</div>
          <div class="date">${esc(e.year)}</div></div>
          ${e.location || e.score ? `<div class="sub">${[e.location, e.score && `Score: ${e.score}`].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
        </div>`
        )
        .join('')
    : '';

  const certs = has(r.certifications)
    ? `<ul>${r.certifications
        .map(
          (c) =>
            `<li><b>${esc(c.name)}</b>${c.issuer ? ` — ${esc(c.issuer)}` : ''}${c.year ? ` (${esc(c.year)})` : ''}${
              c.link ? ` · <a href="${esc(url(c.link))}">link</a>` : ''
            }</li>`
        )
        .join('')}</ul>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(name)} - Resume</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Calibri, Arial, sans-serif; color: #1f2937; font-size: 10.5pt; line-height: 1.45; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 28px 34px; }
  header { border-bottom: 3px solid #102a56; padding-bottom: 10px; margin-bottom: 6px; }
  h1 { margin: 0; font-size: 22pt; color: #102a56; letter-spacing: .3px; }
  .headline { font-size: 11.5pt; color: #0284a8; font-weight: 600; margin-top: 2px; }
  .contact { margin-top: 6px; font-size: 9.5pt; color: #475569; }
  .contact span + span::before { content: "  |  "; color: #cbd5e1; }
  a { color: #0369a1; text-decoration: none; }
  section { margin-top: 12px; page-break-inside: auto; }
  h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: 1.2px; color: #102a56; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 0 0 6px; }
  p { margin: 0; }
  .entry { margin-bottom: 8px; page-break-inside: avoid; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .date { white-space: nowrap; color: #475569; font-size: 9.5pt; }
  .sub { color: #64748b; font-size: 9.5pt; font-style: italic; }
  ul { margin: 3px 0 0; padding-left: 18px; }
  li { margin: 1px 0; }
  table.skills { border-collapse: collapse; width: 100%; }
  table.skills th { text-align: left; vertical-align: top; width: 105px; padding: 2px 8px 2px 0; color: #102a56; font-size: 9.5pt; }
  table.skills td { padding: 2px 0; }
  @media print { .page { padding: 0; max-width: none; } }
</style></head>
<body><div class="page">
  <header>
    <h1>${esc(name)}</h1>
    ${r.headline || r.totalExperience ? `<div class="headline">${[r.headline, r.totalExperience && `${r.totalExperience} experience`].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
    ${contact.length ? `<div class="contact">${contact.map((c) => `<span>${c}</span>`).join('')}</div>` : ''}
  </header>
  ${section('Professional Summary', r.summary ? `<p>${esc(r.summary).replace(/\n/g, '<br>')}</p>` : '')}
  ${section('Skills', skills)}
  ${section('Experience', experience)}
  ${section('Projects', projects)}
  ${section('Education', education)}
  ${section('Certifications', certs)}
  ${section('Achievements', bullets(r.achievements))}
</div></body></html>`;
}

export function printResume(resume) {
  const html = renderResumeHtml(resume);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.onafterprint = cleanup;
    frame.contentWindow.print();
    setTimeout(cleanup, 60000);
  }, 300);
}

export function downloadResumeHtml(resume) {
  const blob = new Blob([renderResumeHtml(resume)], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(resume.fullName || 'resume').replace(/[^\w\s-]/g, '').trim() || 'resume'} - Resume.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
