import { useState, useRef } from 'react';
import { X, Upload, Check, Loader2, AlertCircle, FileImage, Pencil, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const token = () => localStorage.getItem('expenses_token');
const API = '/api/poultry';

const FIELDS = [
  { section: 'Voucher', fields: [
    { key: 'voucher_no',   label: 'Voucher No',      type: 'text' },
    { key: 'bill_date',    label: 'Bill Date',        type: 'text', hint: 'DD.MM.YYYY' },
    { key: 'hatch_date',   label: 'Hatch Date',       type: 'text', hint: 'DD.MM.YYYY' },
    { key: 'farmer_name',  label: 'Farmer Name',      type: 'text' },
  ]},
  { section: 'Production', fields: [
    { key: 'chick_housed',      label: 'Chick Housed',     type: 'number' },
    { key: 'mean_age',          label: 'Mean Age (days)',   type: 'number' },
    { key: 'day_gain',          label: 'Day Gain',          type: 'number' },
    { key: 'mortality',         label: 'Mortality (birds)', type: 'number' },
    { key: 'mortality_pct',     label: 'Mortality %',       type: 'number' },
    { key: 'first_wk_mort_pct', label: '1st Wk Mort %',    type: 'number' },
    { key: 'bird_sold_no',      label: 'Birds Sold (No)',   type: 'number' },
    { key: 'bird_sold_kgs',     label: 'Birds Sold (Kgs)',  type: 'number' },
    { key: 'feed_cons_kgs',     label: 'Feed Consumed (Kgs)', type: 'number' },
    { key: 'avg_body_wt',       label: 'Avg Body Wt (Kg)', type: 'number' },
    { key: 'fcr',               label: 'FCR',               type: 'number' },
    { key: 'converted_fcr',     label: 'Converted FCR',     type: 'number' },
    { key: 'eef',               label: 'EEF',               type: 'number' },
    { key: 'grade',             label: 'Grade',             type: 'text' },
    { key: 'standard_rc',       label: 'Standard RC',       type: 'number' },
    { key: 'std_prod_cost',     label: 'Std Prod Cost',     type: 'number' },
    { key: 'basic_gc_amt',      label: 'Basic GC Amount',   type: 'number' },
  ]},
  { section: 'Costs (Total / Rs per Kg)', fields: [
    { key: 'chick_cost',      label: 'Chick Total',       type: 'number' },
    { key: 'chick_rs_kg',     label: 'Chick Rs/Kg',       type: 'number' },
    { key: 'feed_cost',       label: 'Feed Total',        type: 'number' },
    { key: 'feed_rs_kg',      label: 'Feed Rs/Kg',        type: 'number' },
    { key: 'medicine_cost',   label: 'Medicine Total',    type: 'number' },
    { key: 'medicine_rs_kg',  label: 'Medicine Rs/Kg',    type: 'number' },
    { key: 'vaccine_cost',    label: 'Vaccine Total',     type: 'number' },
    { key: 'vaccine_rs_kg',   label: 'Vaccine Rs/Kg',     type: 'number' },
    { key: 'admin_cost',      label: 'Admin Total',       type: 'number' },
    { key: 'admin_rs_kg',     label: 'Admin Rs/Kg',       type: 'number' },
    { key: 'overhead_cost',   label: 'Overhead Total',    type: 'number' },
    { key: 'prod_cost_total', label: 'Prod Cost Total',   type: 'number' },
    { key: 'prod_cost_rs_kg', label: 'Prod Cost Rs/Kg',   type: 'number' },
    { key: 'ern_rc_kg',       label: 'Earned RC/Kg',      type: 'number' },
  ]},
  { section: 'Financials', fields: [
    { key: 'avg_sale_rate', label: 'Avg Sale Rate',  type: 'number' },
    { key: 'prod_reco',     label: 'Prod Reco',      type: 'number' },
    { key: 'mort_reco',     label: 'Mort Reco',      type: 'number' },
    { key: 'fcr_reco',      label: 'FCR Reco',       type: 'number' },
    { key: 'bird_sh_rec',   label: 'Bird Short Rec', type: 'number' },
    { key: 'prod_incent',   label: 'Prod Incent',    type: 'number' },
    { key: 'mort_inc',      label: 'Mort Inc',       type: 'number' },
    { key: 'total_rc',      label: 'Total RC',       type: 'number' },
    { key: 'tds',           label: 'TDS',            type: 'number' },
    { key: 'net_pay',       label: 'Net Pay',        type: 'number' },
  ]},
];

function fmt(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(n);
}

export default function PoultryBillModal({ flockId, existingBill, onClose, onSaved }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState(existingBill ? 'review' : 'upload'); // upload | ocr | review
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(existingBill?.image_path ? `/uploads/${existingBill.image_path}` : null);
  const [rawText, setRawText] = useState('');
  const [form, setForm] = useState(() => {
    if (existingBill) {
      const f = {};
      FIELDS.forEach(s => s.fields.forEach(field => { f[field.key] = existingBill[field.key] ?? ''; }));
      return f;
    }
    const f = {};
    FIELDS.forEach(s => s.fields.forEach(field => { f[field.key] = ''; }));
    return f;
  });
  const [ocrError, setOcrError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageFileName, setImageFileName] = useState(null);

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrError('');
  }

  async function runOcr() {
    if (!imageFile) return;
    setStep('ocr');
    setOcrError('');
    const fd = new FormData();
    fd.append('bill', imageFile);
    try {
      const r = await fetch(`${API}/bills/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'OCR failed');
      const { parsed, raw_text, image_file } = j.data;
      setRawText(raw_text);
      setImageFileName(image_file);
      // Populate form with parsed values
      setForm(prev => {
        const next = { ...prev };
        Object.entries(parsed).forEach(([k, v]) => {
          if (v !== null && v !== undefined) next[k] = String(v);
        });
        return next;
      });
      setStep('review');
    } catch (err) {
      setOcrError(err.message);
      setStep('upload');
    }
  }

  async function save() {
    setSaving(true);
    const payload = { flock_id: flockId, raw_text: rawText, image_file: imageFileName };
    FIELDS.forEach(s => s.fields.forEach(field => {
      const v = form[field.key];
      payload[field.key] = v === '' ? null : field.type === 'number' ? (isNaN(parseFloat(v)) ? null : parseFloat(v)) : v || null;
    }));

    let r, j;
    if (existingBill) {
      r = await fetch(`${API}/bills/${existingBill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
    } else {
      r = await fetch(`${API}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
    }
    j = await r.json();
    setSaving(false);
    if (j.data) onSaved(j.data);
  }

  const [deleting, setDeleting] = useState(false);

  async function deleteBill() {
    if (!confirm('Delete this bill? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`${API}/bills/${existingBill.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    setDeleting(false);
    onSaved(null);
  }

  const [showRaw, setShowRaw] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl shadow-xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{existingBill ? 'Edit Bill' : 'Upload Rearing Charge Bill'}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {step === 'upload' && 'Upload the voucher image — OCR will extract the data'}
              {step === 'ocr' && 'Running OCR on image…'}
              {step === 'review' && 'Review extracted data, correct any errors, then save'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Upload step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              {!imagePreview ? (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 flex flex-col items-center gap-3 hover:border-amber-400 dark:hover:border-amber-600 transition-colors">
                  <FileImage size={36} className="text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Click to select the bill image</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, WEBP — up to 15 MB</p>
                </button>
              ) : (
                <div className="space-y-3">
                  <img src={imagePreview} alt="Bill preview" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 object-contain max-h-64" />
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Change image</button>
                </div>
              )}
              {ocrError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
                  <AlertCircle size={15} /> {ocrError}
                </div>
              )}
            </div>
          )}

          {/* OCR running */}
          {step === 'ocr' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 size={36} className="text-amber-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Reading bill with OCR… this takes ~15 seconds</p>
              {imagePreview && <img src={imagePreview} alt="Bill" className="w-48 rounded-lg opacity-40" />}
            </div>
          )}

          {/* Review form */}
          {step === 'review' && (
            <div className="space-y-6">
              {imagePreview && (
                <div className="relative group">
                  <img src={imagePreview} alt="Bill" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 object-contain max-h-48" />
                  {!existingBill && (
                    <button onClick={() => fileRef.current?.click()}
                      className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil size={13} />
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                </div>
              )}

              {FIELDS.map(({ section, fields }) => (
                <div key={section}>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{section}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {fields.map(({ key, label, type, hint }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                        <input
                          type={type === 'number' ? 'number' : 'text'}
                          step="any"
                          value={form[key]}
                          onChange={e => f(key, e.target.value)}
                          placeholder={hint ?? ''}
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                            form[key] ? 'border-gray-200 dark:border-gray-700' : 'border-orange-200 dark:border-orange-800/40'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Raw OCR text — for debugging missed fields */}
              {rawText && (
                <div>
                  <button onClick={() => setShowRaw(p => !p)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                    {showRaw ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {showRaw ? 'Hide' : 'Show'} raw OCR text
                  </button>
                  {showRaw && (
                    <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                      {rawText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancel
          </button>
          {step === 'upload' && (
            <button onClick={runOcr} disabled={!imageFile}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              <Upload size={15} /> Extract Data
            </button>
          )}
          {step === 'review' && existingBill && (
            <button onClick={deleteBill} disabled={deleting}
              className="py-2.5 px-4 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 rounded-xl text-sm font-medium flex items-center gap-2">
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          )}
          {step === 'review' && (
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Saving…' : 'Save Bill'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
