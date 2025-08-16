'use client';

import { useState } from 'react';
import { apiPost } from '../../../../lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Code, 
  ArrowLeft, 
  Save, 
  Play,
  Eye,
  EyeOff,
  Database,
  FileText,
  Calendar,
  User,
  Activity,
  Zap,
  Lightbulb
} from 'lucide-react';

interface QueryForm {
  name: string;
  description: string;
  category: string;
  sql_query: string;
  is_public: boolean;
  tags: string[];
}

const categories = [
  { value: 'general', label: 'Genel', icon: <FileText className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
  { value: 'financial', label: 'Finansal', icon: <Activity className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { value: 'patient', label: 'Hasta', icon: <User className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { value: 'appointment', label: 'Randevu', icon: <Calendar className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { value: 'branch', label: 'Şube', icon: <Database className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
  { value: 'treatment', label: 'Tedavi', icon: <Activity className="h-4 w-4" />, color: 'bg-red-100 text-red-800' },
  { value: 'personnel', label: 'Personel', icon: <User className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'time', label: 'Zaman', icon: <Calendar className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' }
];

const commonQueries = [
  {
    name: 'Hasta Sayısı',
    description: 'Toplam hasta sayısını getirir',
    sql: 'SELECT COUNT(*) as hasta_sayisi FROM patients WHERE aktif = 1;',
    category: 'patient'
  },
  {
    name: 'Aylık Randevu Sayısı',
    description: 'Bu ayki randevu sayısını getirir',
    sql: `SELECT COUNT(*) as randevu_sayisi 
          FROM appointments 
          WHERE MONTH(randevu_tarihi) = MONTH(CURRENT_DATE()) 
          AND YEAR(randevu_tarihi) = YEAR(CURRENT_DATE());`,
    category: 'appointment'
  },
  {
    name: 'Şube Bazında Gelir',
    description: 'Şubelere göre toplam gelir',
    sql: `SELECT s.seube_adi, SUM(f.tutar) as toplam_gelir 
          FROM invoices f 
          JOIN branches s ON f.seube_id = s.id 
          GROUP BY s.id, s.seube_adi;`,
    category: 'financial'
  },
  {
    name: 'Aktif Tedaviler',
    description: 'Devam eden tedavileri listeler',
    sql: 'SELECT * FROM treatments WHERE durum = "aktif" ORDER BY baslangic_tarihi DESC;',
    category: 'treatment'
  }
];

export default function NewQueryPage() {
  const router = useRouter();
  const [form, setForm] = useState<QueryForm>({
    name: '',
    description: '',
    category: 'general',
    sql_query: '',
    is_public: false,
    tags: []
  });
  
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.sql_query.trim()) {
      alert('Lütfen gerekli alanları doldurun!');
      return;
    }

    setLoading(true);
    
    try {
      const response = await apiPost('http://localhost:5000/api/admin/database/save-query', {
        name: form.name,
        description: form.description,
        category: form.category,
        sql_query: form.sql_query,
        is_public: form.is_public,
        tags: form.tags
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Sorgu başarıyla kaydedildi!');
          router.push('/admin/queries');
        } else {
          alert('Kaydetme hatası: ' + data.message);
        }
      } else {
        alert('Kaydetme hatası!');
      }
    } catch (error) {
      alert('Kaydetme hatası!');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const useTemplate = (template: any) => {
    setForm({
      name: template.name,
      description: template.description,
      category: template.category,
      sql_query: template.sql,
      is_public: false,
      tags: []
    });
    setShowTemplates(false);
  };

  const validateSQL = (sql: string) => {
    const basicChecks = [
      { test: sql.toLowerCase().includes('select'), message: 'SELECT ifadesi gerekli' },
      { test: sql.toLowerCase().includes('from'), message: 'FROM ifadesi gerekli' },
      { test: !sql.toLowerCase().includes('drop'), message: 'DROP komutu güvenli değil' },
      { test: !sql.toLowerCase().includes('delete'), message: 'DELETE komutu güvenli değil' },
      { test: !sql.toLowerCase().includes('update'), message: 'UPDATE komutu güvenli değil' },
      { test: !sql.toLowerCase().includes('insert'), message: 'INSERT komutu güvenli değil' }
    ];

    const failedChecks = basicChecks.filter(check => !check.test);
    return failedChecks;
  };

  const sqlValidation = validateSQL(form.sql_query);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/queries"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Geri Dön
              </Link>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Code className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Yeni Sorgu Ekle</h1>
                <p className="text-gray-600 mt-1">Veritabanında yeni sorgu oluşturun</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Şablonlar
              </button>
              
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Önizlemeyi Gizle' : 'Önizleme'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ana Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sorgu Adı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sorgu Adı *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Örn: Aylık Hasta Sayısı"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    required
                  />
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Sorgunun ne yaptığını açıklayın..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map((cat) => (
                      <label
                        key={cat.value}
                        className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          form.category === cat.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={cat.value}
                          checked={form.category === cat.value}
                          onChange={(e) => setForm({...form, category: e.target.value})}
                          className="sr-only"
                        />
                        <span className={`p-2 rounded-lg ${cat.color}`}>
                          {cat.icon}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Etiketler */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Etiketler
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Etiket ekle..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Ekle
                    </button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* SQL Sorgusu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SQL Sorgusu *
                  </label>
                  <div className="relative">
                    <textarea
                      value={form.sql_query}
                      onChange={(e) => setForm({...form, sql_query: e.target.value})}
                      placeholder="SELECT * FROM table_name WHERE condition;"
                      rows={12}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                        sqlValidation.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      required
                    />
                    {sqlValidation.length > 0 && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-red-100 border border-red-300 rounded-lg p-2 text-xs text-red-700">
                          <div className="font-semibold mb-1">⚠️ Uyarılar:</div>
                          {sqlValidation.map((check, index) => (
                            <div key={index}>• {check.message}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Genel Erişim */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={form.is_public}
                    onChange={(e) => setForm({...form, is_public: e.target.checked})}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_public" className="ml-3 block text-sm text-gray-900">
                    Bu sorguyu genel erişime aç (tüm kullanıcılar görebilsin)
                  </label>
                </div>

                {/* Kaydet Butonu */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !form.name.trim() || !form.sql_query.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Sorguyu Kaydet
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setForm({
                      name: '',
                      description: '',
                      category: 'general',
                      sql_query: '',
                      is_public: false,
                      tags: []
                    })}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                  >
                    Formu Temizle
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sağ Panel */}
          <div className="space-y-6">
            {/* Şablonlar */}
            {showTemplates && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Hazır Şablonlar
                </h3>
                <div className="space-y-3">
                  {commonQueries.map((template, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">{template.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          categories.find(c => c.value === template.category)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {categories.find(c => c.value === template.category)?.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <button
                        onClick={() => useTemplate(template)}
                        className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Bu Şablonu Kullan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Önizleme */}
            {showPreview && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-500" />
                  Sorgu Önizlemesi
                </h3>
                
                {form.name && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Sorgu Adı:</h4>
                    <p className="text-gray-800">{form.name}</p>
                  </div>
                )}
                
                {form.description && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Açıklama:</h4>
                    <p className="text-gray-600">{form.description}</p>
                  </div>
                )}
                
                {form.category && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Kategori:</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      categories.find(c => c.value === form.category)?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {categories.find(c => c.value === form.category)?.label}
                    </span>
                  </div>
                )}
                
                {form.tags.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Etiketler:</h4>
                    <div className="flex flex-wrap gap-1">
                      {form.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {form.sql_query && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">SQL:</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <code className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                        {form.sql_query}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Yardım */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                SQL Yazım İpuçları
              </h3>
              <div className="space-y-2 text-sm text-blue-700">
                <div>• Sadece SELECT sorguları güvenli</div>
                <div>• FROM, WHERE, GROUP BY kullanabilirsiniz</div>
                <div>• INSERT, UPDATE, DELETE kullanmayın</div>
                <div>• Karmaşık JOIN'ler desteklenir</div>
                <div>• Alt sorgular (subqueries) kullanabilirsiniz</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
