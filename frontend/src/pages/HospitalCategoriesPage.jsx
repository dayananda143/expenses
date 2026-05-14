import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Utensils, Car, ShoppingBag, Film, HeartPulse, Zap, Home, BookOpen, Plane, Circle, Coffee, Music, Gamepad2, Dumbbell, Baby, Gift, PawPrint, Briefcase, Smartphone, Shirt, Syringe, Pill, FlaskConical, Microscope, Stethoscope, Ambulance, Eye, Ear, Brain, Bone, Activity } from 'lucide-react';

function FertilityIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Uterus body */}
      <path d="M8.5 10.5 C7 10.5 6 12 6 13.5 C6 16.5 8.5 19 12 19 C15.5 19 18 16.5 18 13.5 C18 12 17 10.5 15.5 10.5 C15.2 8.5 14 7 12 7 C10 7 8.8 8.5 8.5 10.5 Z" />
      {/* Cervix */}
      <line x1="12" y1="19" x2="12" y2="21.5" />
      {/* Left fallopian tube */}
      <path d="M8.5 10.5 C6.5 10 4.5 9 3 7.5" />
      {/* Left ovary */}
      <ellipse cx="2.5" cy="6.8" rx="1.5" ry="1.2" />
      {/* Right fallopian tube */}
      <path d="M15.5 10.5 C17.5 10 19.5 9 21 7.5" />
      {/* Right ovary */}
      <ellipse cx="21.5" cy="6.8" rx="1.5" ry="1.2" />
    </svg>
  );
}

function ToothIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Crown with two cusps */}
      <path d="M8.5 3C7 3 5.5 4.5 5.5 6.5c0 1.3.4 2.7.9 4C7.2 12.5 7 15 7 17c0 2 .8 3.5 2 3.5.7 0 1.3-.5 1.6-1.4L11 17l.4 2.1c.3.9.9 1.4 1.6 1.4 1.2 0 2-1.5 2-3.5 0-2-.2-4.5.6-6.5.5-1.3.9-2.7.9-4C16.5 4.5 15 3 13.5 3c-1 0-1.8.5-2.2 1.3L11 5l-.3-.7C10.3 3.5 9.5 3 8.5 3z" />
      {/* Center groove line on crown */}
      <line x1="11" y1="5.5" x2="11" y2="11" />
    </svg>
  );
}
import {
  useHospitalCategories,
  useCreateHospitalCategory,
  useUpdateHospitalCategory,
  useDeleteHospitalCategory,
} from '../hooks/useHospitalExpenses';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const ICON_MAP = {
  'tooth': ToothIcon,
  'fertility': FertilityIcon,
  'heart-pulse': HeartPulse, 'syringe': Syringe, 'pill': Pill, 'flask': FlaskConical,
  'microscope': Microscope, 'stethoscope': Stethoscope, 'ambulance': Ambulance,
  'eye': Eye, 'ear': Ear, 'brain': Brain, 'bone': Bone, 'activity': Activity,
  'baby': Baby, 'dumbbell': Dumbbell, 'circle': Circle,
  'utensils': Utensils, 'car': Car, 'shopping-bag': ShoppingBag,
  'home': Home, 'briefcase': Briefcase, 'gift': Gift,
};

const ICONS = [
  'tooth', 'fertility', 'heart-pulse', 'syringe', 'pill', 'flask',
  'microscope', 'stethoscope', 'ambulance', 'eye', 'ear',
  'brain', 'bone', 'activity', 'baby', 'dumbbell',
  'circle', 'utensils', 'car', 'home', 'briefcase',
];

const PRESET_COLORS = [
  '#e11d48', '#3b82f6', '#10b981', '#8b5cf6',
  '#f97316', '#14b8a6', '#6b7280', '#eab308',
  '#ec4899', '#ef4444', '#06b6d4', '#84cc16',
];

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500';

function CategoryIcon({ icon, color, size = 18 }) {
  const I = ICON_MAP[icon];
  if (I) return <I size={size} />;
  return <span className="text-xs font-bold">{icon?.[0]?.toUpperCase() ?? '?'}</span>;
}

function CategoryModal({ category, onClose }) {
  const { toast } = useToast();
  const create = useCreateHospitalCategory();
  const update = useUpdateHospitalCategory();
  const isEdit = !!category;

  const [name, setName]   = useState(category?.name  ?? '');
  const [color, setColor] = useState(category?.color ?? '#e11d48');
  const [icon, setIcon]   = useState(category?.icon  ?? 'circle');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await update.mutateAsync({ id: category.id, name: name.trim(), color, icon });
        toast('Category updated');
      } else {
        await create.mutateAsync({ name: name.trim(), color, icon });
        toast('Category created');
      }
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Fertility, General, Dental"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={`mt-2 ${inputCls} w-32`}
              placeholder="#hex"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => {
                const I = ICON_MAP[ic];
                return (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    title={ic}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-all ${icon === ic ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}
                  >
                    {I ? <I size={16} /> : <span className="text-xs">{ic[0]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-rose-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HospitalCategoriesPage() {
  const { toast } = useToast();
  const { data, isLoading, error } = useHospitalCategories();
  const deleteCategory = useDeleteHospitalCategory();
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const categories = data?.data ?? [];

  async function handleDelete() {
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast('Category deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hospital Categories</h1>
        <button
          onClick={() => { setEditCat(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          <Plus size={15} /> New Category
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {categories.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
              No categories yet. Create one to tag hospital expenses.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ background: c.color }}
                    >
                      <CategoryIcon icon={c.icon} color={c.color} size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{c.icon}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditCat(c); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editCat}
          onClose={() => { setShowModal(false); setEditCat(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete category "${deleteTarget.name}"? Hospital expenses using it will become uncategorised.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteCategory.isPending}
        />
      )}
    </div>
  );
}
