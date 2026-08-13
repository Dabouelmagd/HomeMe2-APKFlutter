import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { refreshTranslations } from '../i18n/index';
import { toast } from 'sonner';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PencilSquareIcon,
  FunnelIcon,
  LanguageIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TranslationManager = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState({ key: '', en: '', ar: '', fr: '' });
  const [importing, setImporting] = useState(null);
  const [autoTranslating, setAutoTranslating] = useState(null);

  const fetchTranslations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/translations`, {
        ...getToken(),
        params: { search, page, per_page: 30, filter_type: filterType }
      });
      setRows(res.data.rows);
      setStats(res.data.stats);
      setTotalPages(res.data.total_pages);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(t('tm_load_failed', 'Failed to load translations'));
    } finally {
      setLoading(false);
    }
  }, [search, page, filterType, t]);

  useEffect(() => { fetchTranslations(); }, [fetchTranslations]);

  useEffect(() => { setPage(1); }, [search, filterType]);

  const handleSave = async (key, lang, value) => {
    try {
      await axios.put(`${API}/translations`, { key, lang, value }, getToken());
      setRows(prev => prev.map(r => r.key === key ? { ...r, [lang]: value, missing: r.missing.filter(m => m !== lang) } : r));
      setEditingCell(null);
      toast.success(t('tm_saved', 'Saved'));
    } catch {
      toast.error(t('tm_save_failed', 'Failed to save'));
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm(t('tm_confirm_delete', 'Delete this key from all languages?'))) return;
    try {
      await axios.delete(`${API}/translations/${encodeURIComponent(key)}`, getToken());
      setRows(prev => prev.filter(r => r.key !== key));
      toast.success(t('tm_deleted', 'Deleted'));
    } catch {
      toast.error(t('tm_delete_failed', 'Failed to delete'));
    }
  };

  const handleAdd = async () => {
    if (!newKey.key.trim()) return;
    try {
      await axios.post(`${API}/translations/add`, newKey, getToken());
      setShowAddModal(false);
      setNewKey({ key: '', en: '', ar: '', fr: '' });
      fetchTranslations();
      toast.success(t('tm_added', 'Key added'));
    } catch {
      toast.error(t('tm_add_failed', 'Failed to add'));
    }
  };

  const handleExport = (lang) => {
    window.open(`${API}/translations/export/${lang}`, '_blank');
  };

  const handleImport = async (lang, file) => {
    setImporting(lang);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/translations/import/${lang}`, formData, {
        headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${t('tm_imported', 'Imported')} ${res.data.keys_imported} ${t('tm_keys', 'keys')}`);
      fetchTranslations();
    } catch {
      toast.error(t('tm_import_failed', 'Failed to import'));
    } finally {
      setImporting(null);
    }
  };

  const handleAutoTranslate = async (lang) => {
    setAutoTranslating(lang);
    try {
      const res = await axios.post(`${API}/translations/auto-translate`, {
        target_lang: lang,
        max_keys: 25,
      }, getToken());
      const count = res.data.translated || 0;
      if (count > 0) {
        toast.success(`${t('tm_auto_translated', 'تم ترجمة')} ${count} ${t('tm_keys', 'مفتاح')} → ${langLabel[lang]}`);
        fetchTranslations();
      } else {
        toast.info(t('tm_no_missing', 'لا توجد نصوص ناقصة لهذه اللغة'));
      }
    } catch (err) {
      toast.error(t('tm_auto_failed', 'فشل الترجمة التلقائية'));
    } finally {
      setAutoTranslating(null);
    }
  };

  const handleAutoTranslateSingle = async (key, targetLang) => {
    try {
      toast.loading(t('tm_translating_key', 'جاري ترجمة المفتاح...'), { id: `translate-${key}` });
      const res = await axios.post(`${API}/translations/auto-translate-single`, {
        key,
        target_lang: targetLang,
      }, getToken());
      if (res.data.value) {
        setRows(prev => prev.map(r => r.key === key ? { ...r, [targetLang]: res.data.value, missing: r.missing.filter(m => m !== targetLang) } : r));
        toast.success(t('tm_translated_key', 'تم ترجمة المفتاح'), { id: `translate-${key}` });
      }
    } catch {
      toast.error(t('tm_auto_failed', 'فشل الترجمة'), { id: `translate-${key}` });
    }
  };

  const langLabel = { en: 'English', ar: 'العربية', fr: 'Français' };
  const langFlag = { en: '🇺🇸', ar: '🇪🇬', fr: '🇫🇷' };

  return (
    <div className="space-y-6" data-testid="translation-manager">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <LanguageIcon className="w-6 h-6 text-purple-200" />
              <span className="text-purple-200 text-sm font-medium">{t('tm_total_keys', 'Total Keys')}</span>
            </div>
            <p className="text-3xl font-black text-white">{stats.total_keys}</p>
          </div>
          {['en', 'ar', 'fr'].map(lang => {
            const s = stats[lang];
            const pct = s.total > 0 ? Math.round((s.translated / s.total) * 100) : 0;
            return (
              <div key={lang} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">{langFlag[lang]} {langLabel[lang]}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-green-500/20 text-green-400' : pct > 80 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{pct}%</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.translated}<span className="text-sm text-gray-500">/{s.total}</span></p>
                <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                </div>
                {s.missing > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3 h-3" />{s.missing} {t('tm_missing', 'missing')}
                    </p>
                    <button
                      onClick={() => handleAutoTranslate(lang)}
                      disabled={autoTranslating === lang}
                      className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                      data-testid={`tm-auto-translate-${lang}`}
                    >
                      {autoTranslating === lang ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-300"></div>
                      ) : (
                        <SparklesIcon className="w-3 h-3" />
                      )}
                      {autoTranslating === lang ? t('tm_translating', 'جاري...') : t('tm_auto_translate', 'ترجمة تلقائية')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('tm_search', 'Search keys or values...')}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            data-testid="tm-search"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {[
            { id: 'all', label: t('tm_all', 'All') },
            { id: 'missing', label: t('tm_missing_only', 'Missing') },
            { id: 'complete', label: t('tm_complete', 'Complete') },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === f.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
              data-testid={`tm-filter-${f.id}`}>
              {f.id === 'missing' && <ExclamationTriangleIcon className="w-3 h-3 inline mr-1" />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Add Key */}
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500"
          data-testid="tm-add-key">
          <PlusIcon className="w-4 h-4" />{t('tm_add_key', 'Add Key')}
        </button>

        {/* Export/Import */}
        <div className="flex items-center gap-2">
          {['en', 'ar', 'fr'].map(lang => (
            <div key={lang} className="flex items-center">
              <button onClick={() => handleExport(lang)}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-l-lg text-xs font-medium text-gray-300 hover:bg-gray-700 flex items-center gap-1"
                title={`${t('tm_export', 'Export')} ${langLabel[lang]}`}
                data-testid={`tm-export-${lang}`}>
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />{langFlag[lang]}
              </button>
              <label className="px-3 py-2.5 bg-gray-800 border border-gray-700 border-l-0 rounded-r-lg text-xs font-medium text-gray-300 hover:bg-gray-700 cursor-pointer flex items-center gap-1"
                title={`${t('tm_import', 'Import')} ${langLabel[lang]}`}
                data-testid={`tm-import-${lang}`}>
                <ArrowUpTrayIcon className="w-3.5 h-3.5" />{importing === lang ? '...' : ''}
                <input type="file" accept=".json" className="hidden" onChange={e => e.target.files[0] && handleImport(lang, e.target.files[0])} />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{total} {t('tm_results', 'results')}</span>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="px-4 py-3 text-left text-gray-400 font-medium w-[280px]">{t('tm_key', 'Key')}</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">{langFlag.en} English</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">{langFlag.ar} العربية</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">{langFlag.fr} Français</th>
                <th className="px-4 py-3 text-center text-gray-400 font-medium w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">{t('tm_loading', 'Loading...')}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">{t('tm_no_results', 'No results')}</td></tr>
              ) : rows.map(row => (
                <tr key={row.key} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  {/* Key */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.missing.length > 0 && (
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0" title={`Missing: ${row.missing.join(', ')}`} />
                      )}
                      <code className="text-xs text-purple-400 font-mono bg-gray-900/50 px-2 py-0.5 rounded max-w-[240px] truncate block" title={row.key}>{row.key}</code>
                    </div>
                  </td>

                  {/* EN, AR, FR cells */}
                  {['en', 'ar', 'fr'].map(lang => {
                    const cellId = `${row.key}:${lang}`;
                    const isEditing = editingCell === cellId;
                    const isEmpty = !row[lang];
                    const isAr = lang === 'ar';

                    return (
                      <td key={lang} className={`px-4 py-2.5 ${isAr ? 'text-right' : 'text-left'}`}>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSave(row.key, lang, editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className={`w-full bg-gray-900 border border-purple-500 rounded px-2 py-1 text-sm text-white focus:outline-none ${isAr ? 'text-right' : 'text-left'}`}
                              dir={isAr ? 'rtl' : 'ltr'}
                              data-testid={`tm-edit-input-${lang}`}
                            />
                            <button onClick={() => handleSave(row.key, lang, editValue)} className="p-1 text-green-400 hover:bg-green-500/20 rounded">
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingCell(null)} className="p-1 text-gray-400 hover:bg-gray-600 rounded">
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => { setEditingCell(cellId); setEditValue(row[lang] || ''); }}
                            className={`cursor-pointer group flex items-center gap-1 min-h-[28px] ${isEmpty ? 'text-red-400/60 italic' : 'text-gray-200'}`}
                            dir={isAr ? 'rtl' : 'ltr'}
                            title={row[lang] || t('tm_click_to_edit', 'Click to edit')}
                          >
                            <span className="truncate max-w-[300px] text-xs">{row[lang] || `[${t('tm_empty', 'empty')}]`}</span>
                            <PencilSquareIcon className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                            {isEmpty && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAutoTranslateSingle(row.key, lang);
                                }}
                                className="p-0.5 text-purple-400 opacity-0 group-hover:opacity-100 hover:bg-purple-500/20 rounded flex-shrink-0"
                                title={t('tm_auto_translate', 'ترجمة تلقائية')}
                              >
                                <SparklesIcon className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Actions */}
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => handleDelete(row.key)} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title={t('tm_delete', 'Delete')}>
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <span className="text-xs text-gray-500">{t('tm_page', 'Page')} {page} / {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusIcon className="w-5 h-5 text-green-400" />{t('tm_add_new_key', 'Add New Translation Key')}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('tm_key', 'Key')}</label>
              <input value={newKey.key} onChange={e => setNewKey({ ...newKey, key: e.target.value })}
                placeholder="e.g. my_new_key"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                data-testid="tm-new-key-input" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">{langFlag.en} English</label>
              <input value={newKey.en} onChange={e => setNewKey({ ...newKey, en: e.target.value })}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                data-testid="tm-new-en-input" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">{langFlag.ar} العربية</label>
              <input value={newKey.ar} onChange={e => setNewKey({ ...newKey, ar: e.target.value })} dir="rtl"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white text-right focus:border-purple-500 focus:outline-none"
                data-testid="tm-new-ar-input" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">{langFlag.fr} Français</label>
              <input value={newKey.fr} onChange={e => setNewKey({ ...newKey, fr: e.target.value })}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                data-testid="tm-new-fr-input" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">
                {t('tm_cancel', 'Cancel')}
              </button>
              <button onClick={handleAdd} disabled={!newKey.key.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-30"
                data-testid="tm-add-confirm">
                {t('tm_add', 'Add Key')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationManager;
