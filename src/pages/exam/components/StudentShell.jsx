import React from 'react';
import { Link } from 'react-router-dom';
import '../exam.css';

export function Brand() {
  return (
    <Link to="/exam" className="ex-row" style={{ textDecoration: 'none' }}>
      <div className="ex-logo">LS</div>
      <div className="ex-brand">LEADSOC<span>EXAM PORTAL</span></div>
    </Link>
  );
}

export default function StudentShell({ children, narrow }) {
  return (
    <div className="ex-root ex-student">
      <header className="ex-topbar"><Brand /></header>
      <main className={`ex-container ${narrow ? 'ex-container--narrow' : ''}`}>{children}</main>
    </div>
  );
}

export function Stepper({ step }) {
  const items = ['Register', 'Instructions', 'Examination'];
  return (
    <div className="ex-stepper" aria-label="Progress">
      {items.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && <hr />}
          <span className={`ex-step ${i < step ? 'is-done' : i === step ? 'is-active' : ''}`}><i>{i < step ? '✓' : i + 1}</i>{label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
