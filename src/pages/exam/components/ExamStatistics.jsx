import React from 'react';
import { Icon } from './ExamUI';

/** items: [{ label, value, icon, tone }] */
export default function ExamStatistics({ items = [] }) {
  return (
    <div className="ex-statgrid">
      {items.map((x) => (
        <div className="ex-stat" key={x.label}>
          <div className={`ex-stat__ico ex-stat__ico--${x.tone || 'blue'}`}><Icon name={x.icon || 'chart'} size={22} /></div>
          <div><small>{x.label}</small><strong>{x.value}</strong></div>
        </div>
      ))}
    </div>
  );
}
