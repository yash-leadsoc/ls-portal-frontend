import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button, Spinner } from './ui';
import { useToast } from './Toast';

export default function HelpVideoSettings() {
  const { toast, toastError } = useToast();
  const [form, setForm] = useState({ link: '', title: 'How to use the portal', description: '' });
  const [video, setVideo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getHelpVideo()
      .then((r) => {
        setVideo(r.video);
        if (r.video) setForm({ link: r.video.link, title: r.video.title, description: r.video.description });
      })
      .catch(() => {});
  }, []);

  const save = async (remove) => {
    setBusy(true);
    try {
      const res = await api.saveHelpVideo(remove ? { link: '' } : form);
      setVideo(res.video);
      if (remove) setForm({ link: '', title: 'How to use the portal', description: '' });
      toast(res.message || 'Saved');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 16, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--navy)', marginBottom: 4 }}>🎬 Portal guide video</div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
        Shown to engineers under “How to use”. In Google Drive, set the video to{' '}
        <b>Anyone with the link → Viewer</b>, then paste its share link here.
      </div>
      <div className="field">
        <label>Google Drive link</label>
        <input className="input" value={form.link} placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
          onChange={(e) => setForm({ ...form, link: e.target.value })} />
      </div>
      <div className="field">
        <label>Title</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <textarea className="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      {video && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
          <iframe title="Preview" src={video.embedUrl} allow="autoplay; fullscreen" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
      )}
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        {video && <Button variant="ghost" onClick={() => save(true)} disabled={busy}>Remove</Button>}
        <Button variant="cyan" onClick={() => save(false)} disabled={busy || !form.link.trim()}>
          {busy ? <Spinner sm /> : 'Save video'}
        </Button>
      </div>
    </div>
  );
}
