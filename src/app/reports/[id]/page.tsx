'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Clock,
  Filter,
  BarChart,
  PieChart,
  TrendingUp,
  Calendar,
  Search,
  Eye,
  EyeOff,
  Target,
  Grid3X3,
  ScatterChart,
  Zap,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Check,
  X
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

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'radar' | 'table';
  xAxis: string;
  yAxis: string;
  series: string[];
  title: string;
}

interface FilterOption {
  column: string;
  values: string[];
  type: 'single' | 'multiple' | 'range' | 'search';
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
  
  // Grafik ve filtreleme state'leri
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [multiSelectFilters, setMultiSelectFilters] = useState<Record<string, string[]>>({});
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'radar' | 'table'>('bar');
  const [showFilters, setShowFilters] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showChartSuggestions, setShowChartSuggestions] = useState(false);

  // Minimize/maximize state'leri
  const [minimizedSuggestions, setMinimizedSuggestions] = useState(false);
  const [minimizedDataTable, setMinimizedDataTable] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadSavedQuery(params.id as string);
    }
  }, [params.id]);

  // Veri analizi ve grafik konfigürasyonu
  const analyzeData = useMemo(() => {
    if (!queryResult?.results || queryResult.results.length === 0) return null;

    const data = queryResult.results;
    const columns = Object.keys(data[0]);
    
    // Sayısal kolonları bul
    const numericColumns = columns.filter(col => {
      const sampleValue = data[0][col];
      if (sampleValue === null || sampleValue === undefined) return false;
      
      // ID kolonlarını sayısal olarak kabul et ama grafik için kullanma
      if (col.toLowerCase().includes('id') && col !== 'id') return false;
      
      const numValue = Number(sampleValue);
      return !isNaN(numValue) && numValue >= 0;
    });

    // Tarih kolonlarını bul
    const dateColumns = columns.filter(col => {
      const sampleValue = data[0][col];
      if (sampleValue === null || sampleValue === undefined) return false;
      
      const strValue = String(sampleValue);
      // Tarih formatlarını kontrol et
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
        /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
        /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
      ];
      
      return datePatterns.some(pattern => pattern.test(strValue));
    });

    // Kategorik kolonları bul
    const categoricalColumns = columns.filter(col => 
      !numericColumns.includes(col) && !dateColumns.includes(col)
    );

    // Grafik önerileri
    const chartSuggestions = [];
    
    if (numericColumns.length >= 2 && categoricalColumns.length >= 1) {
      chartSuggestions.push({
        type: 'bar' as const,
        reason: 'Kategorik veriler ile sayısal değerleri karşılaştırmak için ideal',
        icon: '📊'
      });
    }
    
    if (dateColumns.length >= 1 && numericColumns.length >= 1) {
      chartSuggestions.push({
        type: 'line' as const,
        reason: 'Zaman serisi verilerini trend olarak göstermek için mükemmel',
        icon: '📈'
      });
    }
    
    if (numericColumns.length >= 2) {
      chartSuggestions.push({
        type: 'scatter' as const,
        reason: 'İki sayısal değişken arasındaki ilişkiyi analiz etmek için',
        icon: '🎯'
      });
    }
    
    if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
      chartSuggestions.push({
        type: 'pie' as const,
        reason: 'Oranları ve dağılımları görselleştirmek için uygun',
        icon: '🥧'
      });
    }
    
    if (numericColumns.length >= 3) {
      chartSuggestions.push({
        type: 'heatmap' as const,
        reason: 'Çoklu sayısal değişkenler arasındaki korelasyonu göstermek için',
        icon: '🔥'
      });
    }

    // Otomatik grafik türü belirleme
    let chartType: ChartConfig['type'] = 'table';
    let xAxis = '';
    let yAxis = '';
    let series: string[] = [];

    if (numericColumns.length >= 1 && categoricalColumns.length >= 1) {
      chartType = 'bar';
      xAxis = categoricalColumns[0];
      yAxis = numericColumns[0];
      series = numericColumns.slice(0, 3);
    } else if (dateColumns.length >= 1 && numericColumns.length >= 1) {
      chartType = 'line';
      xAxis = dateColumns[0];
      yAxis = numericColumns[0];
      series = numericColumns.slice(0, 2);
    } else if (numericColumns.length >= 1 && categoricalColumns.length >= 1) {
      chartType = 'pie';
      xAxis = categoricalColumns[0];
      yAxis = numericColumns[0];
    }

    return {
      columns,
      numericColumns,
      dateColumns,
      categoricalColumns,
      chartSuggestions,
      suggestedChart: {
        type: chartType,
        xAxis,
        yAxis,
        series,
        title: savedQuery?.name || 'Rapor Grafiği'
      }
    };
  }, [queryResult, savedQuery]);

  // Filtreleme fonksiyonu
  const applyFilters = useMemo(() => {
    if (!queryResult?.results) return [];

    let filtered = [...queryResult.results];

    // Tekli filtreler
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        filtered = filtered.filter(item => {
          const itemValue = item[key];
          if (itemValue === null || itemValue === undefined) return false;
          
          if (typeof value === 'string') {
            return String(itemValue).toLowerCase().includes(value.toLowerCase());
          }
          return String(itemValue) === String(value);
        });
      }
    });

    // Çoklu seçim filtreleri
    Object.entries(multiSelectFilters).forEach(([key, values]) => {
      if (values && values.length > 0) {
        filtered = filtered.filter(item => {
          const itemValue = item[key];
          if (itemValue === null || itemValue === undefined) return false;
          return values.includes(String(itemValue));
        });
      }
    });

    return filtered;
  }, [queryResult?.results, filters, multiSelectFilters]);

  // filteredData'yı güncelle
  useEffect(() => {
    setFilteredData(applyFilters);
  }, [applyFilters]);

  // Filtreleme seçeneklerini oluştur
  const getFilterOptions = (column: string) => {
    if (!queryResult?.results) return [];
    
    const uniqueValues = [...new Set(queryResult.results.map(item => item[column]))];
    return uniqueValues.filter(v => v !== null && v !== undefined).slice(0, 50);
  };

  // Çoklu seçim filtre ekleme/çıkarma
  const toggleMultiSelectFilter = (column: string, value: string) => {
    setMultiSelectFilters(prev => {
      const currentValues = prev[column] || [];
      if (currentValues.includes(value)) {
        return {
          ...prev,
          [column]: currentValues.filter(v => v !== value)
        };
      } else {
        return {
          ...prev,
          [column]: [...currentValues, value]
        };
      }
    });
  };

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
          password: connection.password
        }),
      });

      const data: QueryResult = await response.json();
      
      if (data.success) {
        setQueryResult(data);
        // Grafik konfigürasyonunu ayarla
        setTimeout(() => {
          if (analyzeData?.suggestedChart) {
            setChartConfig(analyzeData.suggestedChart);
            setSelectedChartType(analyzeData.suggestedChart.type);
          }
        }, 100);
      } else {
        setError(data.message || 'Sorgu çalıştırılamadı');
      }
    } catch (error) {
      setError('Sorgu çalıştırılırken hata oluştu');
    } finally {
      setExecuting(false);
    }
  };

  // Grafik render fonksiyonu
  const renderChart = () => {
    if (!chartConfig || !filteredData.length) return null;

    const { type, xAxis, yAxis } = chartConfig;

    // Güvenli değer çıkarma fonksiyonu
    const getSafeValue = (item: any, key: string) => {
      const value = item[key];
      if (value === null || value === undefined) return 0;
      const numValue = Number(value);
      return isNaN(numValue) ? 0 : numValue;
    };

    // Güvenli string değer çıkarma
    const getSafeString = (item: any, key: string) => {
      const value = item[key];
      return value !== null && value !== undefined ? String(value) : '';
    };

    switch (type) {
      case 'bar':
        const maxBarValue = Math.max(...filteredData.map(d => getSafeValue(d, yAxis)));
        const barData = filteredData.slice(0, 10);
        
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Bar Grafik - {yAxis} vs {xAxis}</h3>
            <div className="h-64 flex items-end justify-center space-x-3">
              {barData.map((item, index) => {
                const value = getSafeValue(item, yAxis);
                const barHeight = maxBarValue > 0 ? (value / maxBarValue) * 200 : 0;
                const label = getSafeString(item, xAxis).substring(0, 12);
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="relative">
                      <div 
                        className="w-10 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t shadow-md transition-all duration-300 hover:from-blue-700 hover:to-blue-500 hover:scale-105"
                        style={{ height: `${Math.max(barHeight, 4)}px` }}
                      ></div>
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 bg-white px-1 rounded shadow-sm">
                        {value}
                      </div>
                    </div>
                    <span className="text-xs mt-2 text-gray-600 text-center w-16 font-medium">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'line':
        const maxLineValue = Math.max(...filteredData.map(d => getSafeValue(d, yAxis)));
        const lineData = filteredData.slice(0, 20);
        
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Çizgi Grafik - {yAxis} Trendi</h3>
            <div className="h-64 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2"/>
                  </linearGradient>
                </defs>
                <polyline
                  fill="url(#lineGradient)"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={lineData.map((item, index) => {
                    const x = (index / (lineData.length - 1)) * 400;
                    const y = maxLineValue > 0 ? 200 - (getSafeValue(item, yAxis) / maxLineValue) * 180 : 200;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                {/* Noktalar */}
                {lineData.map((item, index) => {
                  const x = (index / (lineData.length - 1)) * 400;
                  const y = maxLineValue > 0 ? 200 - (getSafeValue(item, yAxis) / maxLineValue) * 180 : 200;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        );

      case 'scatter':
        const scatterData = filteredData.slice(0, 50);
        const maxX = Math.max(...scatterData.map(d => getSafeValue(d, xAxis)));
        const maxY = Math.max(...scatterData.map(d => getSafeValue(d, yAxis)));
        
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Scatter Plot - {xAxis} vs {yAxis}</h3>
            <div className="h-64 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map(i => (
                  <g key={i}>
                    <line x1={i * 100} y1="0" x2={i * 100} y2="200" stroke="#e5e7eb" strokeWidth="1"/>
                    <line x1="0" y1={i * 50} x2="400" y2={i * 50} stroke="#e5e7eb" strokeWidth="1"/>
                  </g>
                ))}
                {/* Scatter points */}
                {scatterData.map((item, index) => {
                  const x = maxX > 0 ? (getSafeValue(item, xAxis) / maxX) * 400 : 0;
                  const y = maxY > 0 ? 200 - (getSafeValue(item, yAxis) / maxY) * 180 : 200;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="6"
                      fill="#3b82f6"
                      opacity="0.7"
                      className="hover:r-8 transition-all duration-200"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        );

      case 'heatmap':
        const heatmapData = filteredData.slice(0, 20);
        const heatmapColumns = analyzeData?.numericColumns.slice(0, 5) || [];
        const maxHeatmapValue = Math.max(...heatmapData.flatMap(row => 
          heatmapColumns.map(col => getSafeValue(row, col))
        ));
        
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Heatmap - Sayısal Değişkenler</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${heatmapColumns.length}, 1fr)` }}>
                {heatmapData.map((row, rowIndex) => 
                  heatmapColumns.map((col, colIndex) => {
                    const value = getSafeValue(row, col);
                    const intensity = maxHeatmapValue > 0 ? value / maxHeatmapValue : 0;
                    const color = `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`;
                    
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center text-xs text-white font-bold"
                        style={{ backgroundColor: color }}
                        title={`${col}: ${value}`}
                      >
                        {value > 0 ? Math.round(value) : ''}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-2">
                <span>Düşük</span>
                <div className="w-20 h-3 bg-gradient-to-r from-blue-300 to-blue-600 rounded"></div>
                <span>Yüksek</span>
              </div>
            </div>
          </div>
        );

      case 'pie':
        const pieData = filteredData.slice(0, 8);
        const totalValue = pieData.reduce((sum, item) => sum + getSafeValue(item, yAxis), 0);
        
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Pasta Grafik - {yAxis} Dağılımı</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="w-48 h-48 relative">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {pieData.map((item, index) => {
                    const value = getSafeValue(item, yAxis);
                    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    const startAngle = pieData.slice(0, index).reduce((sum, prevItem) => 
                      sum + (getSafeValue(prevItem, yAxis) / totalValue) * 360, 0
                    );
                    const endAngle = startAngle + (value / totalValue) * 360;
                    
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <g key={index}>
                        <path
                          d={`M 50 50 L ${50 + 40 * Math.cos(startAngle * Math.PI / 180)} ${50 + 40 * Math.sin(startAngle * Math.PI / 180)} A 40 40 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${50 + 40 * Math.cos(endAngle * Math.PI / 180)} ${50 + 40 * Math.sin(endAngle * Math.PI / 180)} Z`}
                          fill={color}
                          stroke="white"
                          strokeWidth="0.5"
                        />
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{totalValue}</div>
                    <div className="text-sm text-gray-600">Toplam</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {pieData.map((item, index) => {
                const value = getSafeValue(item, yAxis);
                const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="text-gray-700 font-medium">
                      {getSafeString(item, xAxis).substring(0, 15)}: {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'area':
        const maxAreaValue = Math.max(...filteredData.map(d => getSafeValue(d, yAxis)));
        const areaData = filteredData.slice(0, 20);
        
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Alan Grafik - {yAxis} Trendi</h3>
            <div className="h-64 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>
                <path
                  fill="url(#areaGradient)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  d={`M 0,200 ${areaData.map((item, index) => {
                    const x = (index / (areaData.length - 1)) * 400;
                    const y = maxAreaValue > 0 ? 200 - (getSafeValue(item, yAxis) / maxAreaValue) * 180 : 200;
                    return `L ${x},${y}`;
                  }).join(' ')} L 400,200 Z`}
                />
              </svg>
            </div>
          </div>
        );

      default:
        return null;
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Hata</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/reports"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Raporlara Dön
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
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/reports"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                ← Raporlara Dön
              </Link>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{savedQuery?.name}</h1>
                <p className="text-gray-600 mt-1">{savedQuery?.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => executeQuery(savedQuery!)}
                disabled={executing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${executing ? 'animate-spin' : ''}`} />
                {executing ? 'Çalıştırılıyor...' : 'Yeniden Çalıştır'}
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showFilters 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? '✔ Filtreler' : 'Filtreler'}
              </button>

              <button
                onClick={() => setShowChartSuggestions(!showChartSuggestions)}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Öneriler
              </button>

              <button
                onClick={() => setShowChart(!showChart)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showChart 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showChart ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showChart ? 'Grafik Göster' : 'Grafik Gizle'}
              </button>
            </div>
          </div>
        </div>

        {/* Grafik Önerileri */}
        {showChartSuggestions && analyzeData && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
            {/* Header with minimize button */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Grafik Önerileri
                </h3>
                <button
                  onClick={() => setMinimizedSuggestions(!minimizedSuggestions)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={minimizedSuggestions ? "Genişlet" : "Küçült"}
                >
                  {minimizedSuggestions ? (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Content - conditionally rendered */}
            {!minimizedSuggestions && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analyzeData.chartSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{suggestion.icon}</span>
                        <h4 className="font-semibold text-gray-800 capitalize">{suggestion.type}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                      <button
                        onClick={() => {
                          setSelectedChartType(suggestion.type);
                          if (analyzeData.suggestedChart) {
                            setChartConfig({
                              ...analyzeData.suggestedChart,
                              type: suggestion.type
                            });
                          }
                          setShowChartSuggestions(false);
                        }}
                        className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Bu Grafiği Kullan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtreler */}
        {showFilters && analyzeData && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
              <Filter className="h-5 w-5" />
              Filtreler
            </h3>
            
            {/* Tekli Filtreler */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Tekli Seçim Filtreleri</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analyzeData.categoricalColumns.slice(0, 6).map(column => (
                  <div key={column}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {column}
                    </label>
                    <select
                      value={filters[column] || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, [column]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tümü</option>
                      {getFilterOptions(column).map((value, index) => (
                        <option key={index} value={value}>
                          {String(value).substring(0, 30)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Çoklu Seçim Filtreleri */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Çoklu Seçim Filtreleri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analyzeData.categoricalColumns.slice(0, 4).map(column => (
                  <div key={column} className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {column} (Çoklu Seçim)
                    </label>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {getFilterOptions(column).map((value, index) => {
                        const isSelected = (multiSelectFilters[column] || []).includes(String(value));
                        return (
                          <label key={index} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMultiSelectFilter(column, String(value))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {String(value).substring(0, 25)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {/* Seçili değerler */}
                    {(multiSelectFilters[column] || []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {multiSelectFilters[column].map((value, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            {value.substring(0, 20)}
                            <button
                              onClick={() => toggleMultiSelectFilter(column, value)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setFilters({});
                  setMultiSelectFilters({});
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Tüm Filtreleri Temizle
              </button>
            </div>
          </div>
        )}

        {/* Grafik Türü Seçimi */}
        {analyzeData && showChart && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Grafik Türü</h3>
            <div className="flex flex-wrap gap-3">
              {['bar', 'line', 'pie', 'area', 'scatter', 'heatmap'].map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedChartType(type as any);
                    if (analyzeData.suggestedChart) {
                      setChartConfig({
                        ...analyzeData.suggestedChart,
                        type: type as any
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedChartType === type
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'bar' && <BarChart className="h-4 w-4" />}
                  {type === 'line' && <TrendingUp className="h-4 w-4" />}
                  {type === 'pie' && <PieChart className="h-4 w-4" />}
                  {type === 'area' && <BarChart3 className="h-4 w-4" />}
                  {type === 'scatter' && <Target className="h-4 w-4" />}
                  {type === 'heatmap' && <Grid3X3 className="h-4 w-4" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grafik ve Veri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Grafik */}
          {showChart && (
            <div className="space-y-6">
              {renderChart()}
              
              {/* İstatistikler */}
              {filteredData.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Özet İstatistikler</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
                      <div className="text-sm text-gray-600">Toplam Kayıt</div>
                    </div>
                    {analyzeData && analyzeData.numericColumns && analyzeData.numericColumns.length > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(filteredData.reduce((sum, item) => {
                            const value = item[analyzeData.numericColumns[0]];
                            return sum + (value !== null && value !== undefined ? Number(value) || 0 : 0);
                          }, 0))}
                        </div>
                        <div className="text-sm text-gray-600">Toplam {analyzeData.numericColumns[0]}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Veri Tablosu */}
          <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${!showChart ? 'lg:col-span-2' : ''}`}>
            {/* Header with minimize button */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Veri Tablosu</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredData.length} kayıt bulundu
                  </p>
                </div>
                <button
                  onClick={() => setMinimizedDataTable(!minimizedDataTable)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={minimizedDataTable ? "Genişlet" : "Küçült"}
                >
                  {minimizedDataTable ? (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Table content - conditionally rendered */}
            {!minimizedDataTable && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {queryResult?.results[0] && Object.keys(queryResult.results[0]).map((column) => (
                          <th key={column} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.slice(0, 100).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          {Object.values(row).map((value: any, cellIndex: number) => (
                            <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {value !== null && value !== undefined ? String(value) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredData.length > 100 && (
                  <div className="p-4 border-t border-gray-100 text-center text-sm text-gray-600">
                    İlk 100 kayıt gösteriliyor. Toplam {filteredData.length} kayıt var.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
