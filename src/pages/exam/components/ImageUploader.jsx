import React, { useRef, useState } from 'react';
import { uploadImage } from '../adminApi';
import { Alert, Button, Icon } from './ExamUI';

/** Controlled: value = array of image URLs, onChange(newArray). */
export default function ImageUploader({ value = [], onChange, max = 4 }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  async function pick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    setBusy(true);
    try {
      const next = [...value];
      for (const f of files) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error('Only JPG, PNG or WEBP images are allowed');
        if (f.size > 5 * 1024 * 1024) throw new Error('Each image must be smaller than 5 MB');
        if (next.length >= max) break;
        next.push(await uploadImage(f));
      }
      onChange(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function addUrl() {
    if (!/^https?:\/\/\S+$/i.test(url.trim())) return setError('Enter a valid image link starting with http:// or https://');
    setError('');
    onChange([...value, url.trim()].slice(0, max));
    setUrl('');
  }

  return (
    <div className="ex-stack" style={{ gap: 10 }}>
      <div className="ex-dropzone">
        <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp" multiple hidden onChange={pick} />
        <Button variant="secondary" size="sm" icon="upload" busy={busy} disabled={value.length >= max} onClick={() => input.current?.click()}>Upload image</Button>
        <span className="ex-small ex-muted">or</span>
        <input className="ex-input" style={{ flex: 1, minWidth: 180, padding: '8px 11px' }} placeholder="Paste image URL" value={url}
          onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
        <Button variant="ghost" size="sm" onClick={addUrl} disabled={!url}>Add</Button>
      </div>
      <Alert tone="error">{error}</Alert>
      {value.length > 0 && (
        <div className="ex-thumbs">
          {value.map((src, i) => (
            <div className="ex-thumb" key={src + i}>
              <img src={src} alt={`Attachment ${i + 1}`} />
              <button type="button" aria-label="Remove image" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="x" size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
