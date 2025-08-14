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
            <div className="h-64 flex items-end justify-center space-x-3 relative">
              {/* Y ekseni etiketleri */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                {[0, 25, 50, 75, 100].map(percent => (
                  <span key={percent} className="transform -translate-y-1/2">
                    {Math.round((maxBarValue * percent) / 100)}
                  </span>
                ))}
              </div>
              
              {/* Grid çizgileri */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 25, 50, 75, 100].map(percent => (
                  <div key={percent} className="border-t border-gray-200 w-full"></div>
                ))}
              </div>
              
              {/* Bar'lar */}
              {barData.map((item, index) => {
                const value = getSafeValue(item, yAxis);
                const barHeight = maxBarValue > 0 ? (value / maxBarValue) * 200 : 0;
                const label = getSafeString(item, xAxis).substring(0, 12);
                const percentage = maxBarValue > 0 ? (value / maxBarValue) * 100 : 0;
                
                return (
                  <div key={index} className="flex flex-col items-center relative group">
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      <div className="text-center">
                        <div className="font-semibold">{label}</div>
                        <div>{value} ({percentage.toFixed(1)}%)</div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                    
                    {/* Bar */}
                    <div className="relative">
                      <div 
                        className="w-12 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 rounded-t shadow-lg transition-all duration-500 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 hover:shadow-xl hover:scale-105 cursor-pointer"
                        style={{ 
                          height: `${Math.max(barHeight, 4)}px`,
                          animationDelay: `${index * 100}ms`
                        }}
                      >
                        {/* Bar içi desen */}
                        <div className="w-full h-full bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 rounded-t opacity-90"></div>
                      </div>
                      
                      {/* Değer etiketi */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700 bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
                        {value}
                      </div>
                    </div>
                    
                    {/* X ekseni etiketi */}
                    <span className="text-xs mt-3 text-gray-600 text-center w-16 font-medium leading-tight">
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
            <div className="h-64 flex items-center justify-center relative">
              {/* Y ekseni etiketleri */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                {[0, 25, 50, 75, 100].map(percent => (
                  <span key={percent} className="transform -translate-y-1/2">
                    {Math.round((maxLineValue * percent) / 100)}
                  </span>
                ))}
              </div>
              
              {/* Grid çizgileri */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 25, 50, 75, 100].map(percent => (
                  <div key={percent} className="border-t border-gray-200 w-full"></div>
                ))}
              </div>
              
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Alan dolgusu */}
                <path
                  fill="url(#lineGradient)"
                  d={`M 0,200 ${lineData.map((item, index) => {
                    const x = (index / (lineData.length - 1)) * 400;
                    const y = maxLineValue > 0 ? 200 - (getSafeValue(item, yAxis) / maxLineValue) * 180 : 200;
                    return `L ${x},${y}`;
                  }).join(' ')} L 400,200 Z`}
                  opacity="0.3"
                />
                
                {/* Ana çizgi */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
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
                  const value = getSafeValue(item, yAxis);
                  
                  return (
                    <g key={index}>
                      {/* Hover alanı */}
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="transparent"
                        className="cursor-pointer hover:fill-blue-100 hover:fill-opacity-30 transition-all duration-200"
                      />
                      {/* Ana nokta */}
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="3"
                        className="transition-all duration-200 hover:r-8"
                      />
                      {/* Tooltip */}
                      <text
                        x={x}
                        y={y - 15}
                        textAnchor="middle"
                        className="text-xs font-medium fill-gray-700 opacity-0 hover:opacity-100 transition-opacity duration-200"
                      >
                        {value}
                      </text>
                    </g>
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
            <div className="h-64 flex items-center justify-center relative">
              {/* Grid çizgileri */}
              <div className="absolute inset-0">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="absolute w-full h-full">
                    <div 
                      className="absolute top-0 w-full border-t border-gray-200"
                      style={{ top: `${i * 25}%` }}
                    ></div>
                    <div 
                      className="absolute left-0 h-full border-l border-gray-200"
                      style={{ left: `${i * 25}%` }}
                    ></div>
                  </div>
                ))}
              </div>
              
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Eksen etiketleri */}
                <text x="200" y="195" textAnchor="middle" className="text-xs fill-gray-600 font-medium">
                  {xAxis}
                </text>
                <text x="10" y="100" textAnchor="middle" className="text-xs fill-gray-600 font-medium transform rotate-90">
                  {yAxis}
                </text>
                
                {/* Scatter noktaları */}
                {scatterData.map((item, index) => {
                  const x = maxX > 0 ? (getSafeValue(item, xAxis) / maxX) * 400 : 0;
                  const y = maxY > 0 ? 200 - (getSafeValue(item, yAxis) / maxY) * 180 : 200;
                  const value = getSafeValue(item, yAxis);
                  
                  return (
                    <g key={index} className="cursor-pointer group">
                      {/* Hover alanı */}
                      <circle
                        cx={x}
                        cy={y}
                        r="15"
                        fill="transparent"
                        className="hover:fill-blue-100 hover:fill-opacity-30 transition-all duration-200"
                      />
                      {/* Ana nokta */}
                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill="#3b82f6"
                        opacity="0.8"
                        className="transition-all duration-300 group-hover:r-12 group-hover:opacity-100 group-hover:fill-blue-500"
                        stroke="white"
                        strokeWidth="2"
                      />
                      {/* Tooltip */}
                      <text
                        x={x}
                        y={y - 20}
                        textAnchor="middle"
                        className="text-xs font-medium fill-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        {value}
                      </text>
                    </g>
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
              <div className="space-y-2">
                {/* Kolon başlıkları */}
                <div className="flex gap-1 mb-2">
                  {heatmapColumns.map((col, colIndex) => (
                    <div key={colIndex} className="w-8 text-center text-xs font-medium text-gray-600">
                      {col.substring(0, 8)}
                    </div>
                  ))}
                </div>
                
                {/* Heatmap grid */}
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${heatmapColumns.length}, 1fr)` }}>
                  {heatmapData.map((row, rowIndex) => 
                    heatmapColumns.map((col, colIndex) => {
                      const value = getSafeValue(row, col);
                      const intensity = maxHeatmapValue > 0 ? value / maxHeatmapValue : 0;
                      const color = `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`;
                      
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-white font-bold cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg group relative"
                          style={{ backgroundColor: color }}
                          title={`${col}: ${value}`}
                        >
                          {value > 0 ? Math.round(value) : ''}
                          
                          {/* Tooltip */}
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            <div className="text-center">
                              <div className="font-semibold">{col}</div>
                              <div>Değer: {value}</div>
                              <div>Yoğunluk: {(intensity * 100).toFixed(1)}%</div>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Satır numaraları */}
                <div className="flex gap-1 mt-2">
                  {heatmapData.slice(0, 5).map((_, rowIndex) => (
                    <div key={rowIndex} className="w-8 text-center text-xs font-medium text-gray-600">
                      {rowIndex + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Renk skalası */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-sm text-gray-600">Düşük</span>
                <div className="w-32 h-4 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 rounded-lg shadow-inner"></div>
                <span className="text-sm text-gray-600">Yüksek</span>
              </div>
              <div className="text-xs text-gray-500">
                Maksimum değer: {Math.round(maxHeatmapValue)}
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
                      <g key={index} className="cursor-pointer group">
                        <path
                          d={`M 50 50 L ${50 + 40 * Math.cos(startAngle * Math.PI / 180)} ${50 + 40 * Math.sin(startAngle * Math.PI / 180)} A 40 40 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${50 + 40 * Math.cos(endAngle * Math.PI / 180)} ${50 + 40 * Math.sin(endAngle * Math.PI / 180)} Z`}
                          fill={color}
                          stroke="white"
                          strokeWidth="1"
                          className="transition-all duration-300 group-hover:stroke-2 group-hover:stroke-gray-800"
                        />
                      </g>
                    );
                  })}
                </svg>
                
                {/* Merkez bilgi */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{Math.round(totalValue)}</div>
                    <div className="text-sm text-gray-600">Toplam</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {pieData.map((item, index) => {
                const value = getSafeValue(item, yAxis);
                const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700 truncate" title={getSafeString(item, xAxis)}>
                        {getSafeString(item, xAxis).substring(0, 15)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {value} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
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
            <div className="h-64 flex items-center justify-center relative">
              {/* Y ekseni etiketleri */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                {[0, 25, 50, 75, 100].map(percent => (
                  <span key={percent} className="transform -translate-y-1/2">
                    {Math.round((maxAreaValue * percent) / 100)}
                  </span>
                ))}
              </div>
              
              {/* Grid çizgileri */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 25, 50, 75, 100].map(percent => (
                  <div key={percent} className="border-t border-gray-200 w-full"></div>
                ))}
              </div>
              
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7"/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                  </linearGradient>
                  <filter id="areaGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Alan dolgusu */}
                <path
                  fill="url(#areaGradient)"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  filter="url(#areaGlow)"
                  d={`M 0,200 ${areaData.map((item, index) => {
                    const x = (index / (areaData.length - 1)) * 400;
                    const y = maxAreaValue > 0 ? 200 - (getSafeValue(item, yAxis) / maxAreaValue) * 180 : 200;
                    return `L ${x},${y}`;
                  }).join(' ')} L 400,200 Z`}
                />
                
                {/* Noktalar */}
                {areaData.map((item, index) => {
                  const x = (index / (areaData.length - 1)) * 400;
                  const y = maxAreaValue > 0 ? 200 - (getSafeValue(item, yAxis) / maxAreaValue) * 180 : 200;
                  const value = getSafeValue(item, yAxis);
                  
                  return (
                    <g key={index} className="cursor-pointer group">
                      {/* Hover alanı */}
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="transparent"
                        className="hover:fill-blue-100 hover:fill-opacity-30 transition-all duration-200"
                      />
                      {/* Ana nokta */}
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover:r-7 group-hover:fill-blue-500"
                      />
                      {/* Tooltip */}
                      <text
                        x={x}
                        y={y - 15}
                        textAnchor="middle"
                        className="text-xs font-medium fill-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}
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
