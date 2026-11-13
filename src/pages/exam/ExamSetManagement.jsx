import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminRequest, adminUpload } from './adminApi';
import { Alert, Badge, Button, ConfirmDialog, Empty, Field, Loading, Modal, PageHeader, useToast } from './components/ExamUI';

export default function ExamSetManagement() {
  const { examId } = useParams();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [sets, setSets] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null); // {} for new
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importBusy, setImportBusy] = useState(false);

  const load = useCallback(() => {
    adminRequest(`admin/exams/${examId}`).then(setExam).catch((e) => setError(e.message));
    adminRequest(`admin/exams/${examId}/sets`).then(setSets).catch((e) => setError(e.message));
  }, [examId]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { name: edit.name, description: edit.description, isActive: edit.isActive ?? true };
      if (edit._id) await adminRequest(`admin/sets/${edit._id}`, { method: 'PUT', body });
      else await adminRequest(`admin/exams/${examId}/sets`, { method: 'POST', body });
      toast(edit._id ? 'Set updated' : 'Set created');
      setEdit(null);
      load();
    } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
  }
  async function toggle(s) {
    try { await adminRequest(`admin/sets/${s._id}`, { method: 'PUT', body: { isActive: !s.isActive } }); load(); } catch (x) { toast(x.message, 'error'); }
  }
  async function remove() {
    setBusy(true);
    try { await adminRequest(`admin/sets/${del._id}`, { method: 'DELETE' }); toast('Set deleted'); setDel(null); load(); }
    catch (x) { toast(x.message, 'error'); setDel(null); } finally { setBusy(false); }
  }


  async function previewExcel() {
    if (!excelFile) {
      toast('Please select an Excel file', 'error');
      return;
    }

    setImportBusy(true);
    setImportPreview(null);
    setImportErrors([]);

    try {
      const result = await adminUpload(
        `admin/exams/${examId}/import-excel`,
        excelFile,
        '?preview=true'
      );

      setImportPreview(result);
      toast('Excel validation successful');
    } catch (e) {
      setImportErrors(e.data?.errors || []);
      toast(e.message, 'error');
    } finally {
      setImportBusy(false);
    }
  }

  async function importExcel() {
    if (!excelFile || !importPreview) return;

    setImportBusy(true);

    try {
      const result = await adminUpload(
        `admin/exams/${examId}/import-excel`,
        excelFile
      );

      toast(
        `Imported ${result.totalQuestions} questions in ${result.totalSets} sets`
      );

      setImportOpen(false);
      setExcelFile(null);
      setImportPreview(null);
      setImportErrors([]);
      load();
    } catch (e) {
      setImportErrors(e.data?.errors || []);
      toast(e.message, 'error');
    } finally {
      setImportBusy(false);
    }
  }


  return (
    <>
      <PageHeader crumbs={[{ label: 'Exams', to: '/exam/admin/exams' }, { label: exam?.name || '…', to: `/exam/admin/exams/${examId}` }, { label: 'Question sets' }]}
        title="Question sets" subtitle="Each candidate is randomly given one active set. Use several sets to reduce copying."
        actions={
          <div className="ex-row ex-row--wrap">
            <Button
              variant="secondary"
              icon="upload"
              onClick={() => setImportOpen(true)}
            >
              Import Excel
            </Button>

            <Button
              icon="plus"
              onClick={() => setEdit({
                name: '',
                description: '',
                isActive: true
              })}
            >
              New set
            </Button>
          </div>
        }
      />
      <Alert>{error}</Alert>
      {!sets && !error ? <Loading /> : !sets?.length ? (
        <div className="ex-card"><Empty icon="layers" title="No question sets yet" action={<Button icon="plus" onClick={() => setEdit({ name: 'Set A', description: '', isActive: true })}>Create “Set A”</Button>}>
          A set is a complete question paper. Create one, then add questions to it.</Empty></div>
      ) : (
        <div className="ex-setgrid">
          {sets.map((s) => (
            <article key={s._id} className={`ex-card ex-setcard ${s.isActive ? '' : 'is-off'}`}>
              <div className="ex-row"><h3>{s.name}</h3><div className="ex-spacer" />{s.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</div>
              <p className="ex-muted ex-small">{s.description || 'No description'}</p>
              <div className="ex-row ex-row--wrap"><Badge tone="brand">{s.questionCount} question{s.questionCount === 1 ? '' : 's'}</Badge><Badge>{s.totalMarks || 0} marks</Badge></div>
              <div className="ex-row ex-row--wrap" style={{ marginTop: 4 }}>
                <Link to={`/exam/admin/exams/${examId}/sets/${s._id}/questions`}><Button size="sm" icon="list">Questions</Button></Link>
                <Button size="sm" variant="secondary" icon="edit" onClick={() => setEdit(s)}>Rename</Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(s)}>{s.isActive ? 'Deactivate' : 'Activate'}</Button>
                <div className="ex-spacer" />
                <Button size="sm" variant="ghost" className="ex-btn--icon" icon="trash" aria-label="Delete set" onClick={() => setDel(s)} />
              </div>
            </article>))}
        </div>
      )}
      <Modal open={!!edit} title={edit?._id ? 'Edit set' : 'New question set'} onClose={() => setEdit(null)} dismissible={!busy}>
        {edit && (
          <form className="ex-stack" onSubmit={save} style={{ paddingBottom: 18 }}>
            <Field label="Set name"><input className="ex-input" required maxLength={100} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Set A" /></Field>
            <Field label="Description" hint="Optional, admin-only."><textarea className="ex-textarea" rows={2} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="ex-row" style={{ justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" busy={busy}>Save</Button></div>
          </form>)}
      </Modal>
      <ConfirmDialog open={!!del} danger title="Delete this set?" confirmLabel="Delete" busy={busy} onCancel={() => setDel(null)} onConfirm={remove}>
        “{del?.name}” and all of its questions will be deleted.
      </ConfirmDialog>


      <Modal
        open={importOpen}
        wide
        title="Import question sets from Excel"
        onClose={() => {
          if (!importBusy) {
            setImportOpen(false);
            setExcelFile(null);
            setImportPreview(null);
            setImportErrors([]);
          }
        }}
        dismissible={!importBusy}
      >
        <div className="ex-stack" style={{ paddingBottom: 18, gap: 14 }}>

          <div className="ex-card">
            <h3>Excel format</h3>
            <p className="ex-muted ex-small">
              Each worksheet will automatically become one question set.
              Every question must have four options and exactly one correct answer.
            </p>

            <p className="ex-small">
              Required columns: Question, Option A, Option B,
              Option C, Option D, Answer Key.
            </p>

            <p className="ex-small">
              Answer Key must contain A, B, C or D.
              Each imported question receives 1 mark and 0 negative marks.
            </p>
          </div>

          <div className="ex-field">
            <label className="ex-label" htmlFor="exam-excel-file">
              Select Excel file (.xlsx or .xls)
            </label>

            <input
              id="exam-excel-file"
              className="ex-input"
              type="file"
              accept=".xlsx,.xls"
              disabled={importBusy}
              onChange={e => {
                setExcelFile(e.target.files?.[0] || null);
                setImportPreview(null);
                setImportErrors([]);
              }}
            />
          </div>

          {excelFile && (
            <div className="ex-card">
              <b>{excelFile.name}</b>
              <p className="ex-muted ex-small">
                {(excelFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {importPreview && (
            <div className="ex-card">
              <div className="ex-row">
                <h3>Import preview</h3>
                <div className="ex-spacer" />
                <Badge tone="success">Validated</Badge>
              </div>

              <div className="ex-row ex-row--wrap">
                <Badge tone="brand">
                  {importPreview.totalSets} sets
                </Badge>
                <Badge tone="success">
                  {importPreview.totalQuestions} questions
                </Badge>
              </div>

              {importPreview.sets.map((s, i) => (
                <div
                  className="ex-row"
                  key={s.name}
                  style={{
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--ex-border, #e5e7eb)'
                  }}
                >
                  <span>{i + 1}. {s.name}</span>
                  <Badge>{s.questionCount} questions</Badge>
                </div>
              ))}

              <p className="ex-muted ex-small">
                Every imported question will be single-choice MCQ.
                Importing will create new sets; it will not overwrite existing sets.
              </p>
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="ex-card">
              <h3>Excel validation errors</h3>

              {importErrors.slice(0, 30).map((err, i) => (
                <p className="ex-small" key={i}>
                  <b>{err.sheet || 'Workbook'}</b>
                  {err.row ? ` · Row ${err.row}` : ''}
                  {' — '}
                  {err.message}
                </p>
              ))}

              {importErrors.length > 30 && (
                <p className="ex-muted ex-small">
                  And {importErrors.length - 30} more errors.
                </p>
              )}
            </div>
          )}

          <div className="ex-row ex-row--wrap" style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              disabled={importBusy}
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="secondary"
              icon="check"
              busy={importBusy}
              disabled={!excelFile}
              onClick={previewExcel}
            >
              Validate Excel
            </Button>

            <Button
              icon="upload"
              busy={importBusy}
              disabled={!importPreview || importErrors.length > 0}
              onClick={importExcel}
            >
              Import {importPreview?.totalQuestions || ''} Questions
            </Button>
          </div>
        </div>
      </Modal>

    </>
  );
}
