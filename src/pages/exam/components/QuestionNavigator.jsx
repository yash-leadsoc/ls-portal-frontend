import React from 'react';
import { isAnswered } from './ExamUI';

export default function QuestionNavigator({ questions, responses, current, onSelect, onSubmit }) {
  const answered = questions.filter((q) => isAnswered(responses[q.id]?.answer)).length;
  const review = questions.filter((q) => responses[q.id]?.markedForReview).length;
  return (
    <aside className="ex-nav" aria-label="Question navigator">
      <div className="ex-card">
        <h3 style={{ marginBottom: 14 }}>Question navigator</h3>
        <div className="ex-navgrid">
          {questions.map((q, i) => {
            const r = responses[q.id];
            const cls = i === current ? 'is-current' : r?.markedForReview ? 'is-review' : isAnswered(r?.answer) ? 'is-answered' : '';
            return (
              <button key={q.id} type="button" className={`ex-navbtn ${cls}`} onClick={() => onSelect(i)}
                aria-label={`Question ${i + 1}${isAnswered(r?.answer) ? ', answered' : ''}${r?.markedForReview ? ', marked for review' : ''}`}
                aria-current={i === current ? 'true' : undefined}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="ex-legend" style={{ marginTop: 16 }}>
          <span><i className="a" /> Answered</span>
          <span><i /> Not answered</span>
          <span><i className="r" /> For review</span>
          <span><i className="c" /> Current</span>
        </div>
      </div>
      <div className="ex-card">
        <div className="ex-tally">
          <div><b>{answered}</b><small>Answered</small></div>
          <div><b>{questions.length - answered}</b><small>Left</small></div>
          <div><b>{review}</b><small>Review</small></div>
        </div>
        <button type="button" className="ex-btn ex-btn--primary ex-btn--block" style={{ marginTop: 14 }} onClick={onSubmit}>
          Submit examination
        </button>
      </div>
    </aside>
  );
}
