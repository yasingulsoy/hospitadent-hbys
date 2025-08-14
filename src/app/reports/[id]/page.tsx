'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  ArrowLeft, 
  Play, 
  Download, 
  Share2, 
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface SavedQuery {
  id: number;
  name: string;
  description: string;
  sql_query: string;
  category: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

interface QueryResult {
  success: boolean;
  results: any[];
  message: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [savedQuery, setSavedQuery] = useState<SavedQuery | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadSavedQuery(params.id as string);
    }
  }, [params.id]);

  const loadSavedQuery = async (id: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/database/save-query');
      const data = await response.json();
      
      if (data.success) {
        const query = data.queries.find((q: SavedQuery) => q.id === parseInt(id));
        if (query) {
          setSavedQuery(query);
          executeQuery(query);
        } else {
          setError('Rapor bulunamadı');
        }
      }
    } catch (error) {
      setError('Rapor yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async (query: SavedQuery) => {
    setExecuting(true);
    setError(null);
    
    try {
      setLoadingConnection(true);
      const connectionResponse = await fetch('http://localhost:5000/api/admin/database-connections');
      const connectionData = await connectionResponse.json();
      
      if (!connectionData.success || connectionData.connections.length === 0) {
        setError('Aktif veritabanı bağlantısı bulunamadı. Lütfen admin sayfasından bağlantı ekleyin.');
        setExecuting(false);
        setLoadingConnection(false);
        return;
      }
      
      const connection = connectionData.connections[0];
      setLoadingConnection(false);
      
      const response = await fetch('http://localhost:5000/api/admin/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.sql_query,
          host: connection.host,
          port: parseInt(connection.port),
          database: connection.database_name,
          username: connection.username,
          password: connection.password,
          type: connection.type
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQueryResult(data);
      } else {
        setError(data.message || 'Sorgu çalıştırılamadı');
      }
    } catch (error: any) {
      setError('Sorgu çalıştırılırken hata oluştu: ' + (error?.message || 'Bilinmeyen hata'));
    } finally {
      setExecuting(false);
      setLoadingConnection(false);
    }
  };

  const handleRefresh = () => {
    if (savedQuery) {
      executeQuery(savedQuery);
    }
  };

  const handleExport = () => {
    if (queryResult?.results) {
      const csvContent = convertToCSV(queryResult.results);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${savedQuery?.name || 'rapor'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ];
    
    return csvRows.join('\n');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Rapor yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !savedQuery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Hata</h3>
            <p className="text-gray-500 mb-6">{error || 'Rapor bulunamadı'}</p>
            <Link
              href="/reports"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center space-x-2 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Raporlara Dön</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              href="/reports"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              ← Geri
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rapor Detayı</h1>
              <p className="text-gray-600 mt-2">Kayıtlı sorguyu çalıştırın ve sonuçları görüntüleyin</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={executing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
            >
              {executing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>{executing ? 'Çalıştırılıyor...' : 'Yenile'}</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={!queryResult?.results}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>CSV İndir</span>
            </button>
            
            <Link
              href={`/admin/database?tab=query&edit=${savedQuery.id}`}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Düzenle</span>
            </Link>
          </div>
        </div>
        
        {/* Meta Bilgiler */}
        <div className="mt-6 flex items-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Oluşturulma: {new Date(savedQuery.created_at).toLocaleDateString('tr-TR')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Kategori: {savedQuery.category}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Oluşturan: {savedQuery.created_by}</span>
          </div>
        </div>

        {/* SQL Sorgu */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SQL Sorgusu</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <code className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{savedQuery.sql_query}</code>
            </div>
          </div>
        </div>

        {/* Sonuçlar */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Sorgu Sonuçları</h3>
              <div className="flex items-center space-x-2">
                {executing && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Çalıştırılıyor...</span>
                  </div>
                )}
                {queryResult && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loadingConnection ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Veritabanı bağlantısı kuruluyor...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Hata</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center space-x-2 transition-colors"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Tekrar Dene</span>
                </button>
              </div>
            ) : queryResult?.results ? (
              <div className="space-y-4">
                <div className="text-sm text-green-600 font-medium">
                  {queryResult.message}
                </div>
                
                {queryResult.results && Array.isArray(queryResult.results) && queryResult.results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(queryResult.results[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {queryResult.results.map((row: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value: any, cellIndex: number) => (
                              <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-4 text-sm text-gray-500 text-center">
                      Toplam {queryResult.results.length} satır bulundu
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Sorgu başarıyla çalıştırıldı. Sonuç: {queryResult.results}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Sonuçları görmek için "Yenile" butonuna tıklayın</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
