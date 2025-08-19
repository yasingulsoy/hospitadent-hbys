'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost } from '../../../lib/api';
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
  X,
  FileText,
  FileDown,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import ChartCard from '../../components/ChartCard';

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

// Yeni grafik konfigürasyonu interface'i
interface AdvancedChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'radar' | 'table';
  xAxis: string;
  yAxis: string;
  series: string[];
  title: string;
  // Yeni özellikler
  xAxisType: 'categorical' | 'numeric' | 'date';
  yAxisType: 'categorical' | 'numeric' | 'date';
  aggregation: 'sum' | 'count' | 'average' | 'min' | 'max';
  groupBy?: string; // Gruplama için
  sortBy?: 'asc' | 'desc'; // Sıralama
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
  const [userRole, setUserRole] = useState<string>('user'); // Kullanıcı rolü
  
  // Grafik ve filtreleme state'leri
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [advancedChartConfig, setAdvancedChartConfig] = useState<AdvancedChartConfig | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [multiSelectFilters, setMultiSelectFilters] = useState<Record<string, string[]>>({});
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'radar' | 'table'>('bar');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showChartSuggestions, setShowChartSuggestions] = useState(false);
  const [showAdvancedChartConfig, setShowAdvancedChartConfig] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialChartConfig, setInitialChartConfig] = useState<any | null>(null);
  // Sunucu taraflı filtreler (DB tabanlı)
  const [dbFilters, setDbFilters] = useState<any[]>([]);
  const [assignedFilters, setAssignedFilters] = useState<any[]>([]);
  const [serverFilterParams, setServerFilterParams] = useState<Record<string, any>>({});
  const [showAddFilterModal, setShowAddFilterModal] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  // Daha kapsamlı admin kontrolü
  const isAdminOrSuper = (
    role === '1' || role === '2' ||
    role === 'ADMIN' || role === 'SUPER_ADMIN' ||
    role === 'admin' || role === 'superadmin' ||
    userRole === 'admin' || userRole === 'superadmin' || userRole === 'SUPER_ADMIN'
  );

  // Minimize/maximize state'leri
  const [minimizedSuggestions, setMinimizedSuggestions] = useState(false);
  const [minimizedDataTable, setMinimizedDataTable] = useState(true);
  const [allChartConfigs, setAllChartConfigs] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      loadSavedQuery(params.id as string);
      loadUserRole();
    }
  }, [params.id]);

  // Kullanıcı rolünü yükle
  const loadUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // JWT token'dan rol bilgisini çıkar (basit decode)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'user');
      }
    } catch (error) {
      console.log('Kullanıcı rolü yüklenemedi, varsayılan: user');
      setUserRole('user');
    }
  };

  // Cookie'den rol oku
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|; )role=([^;]+)/);
      setRole(m ? decodeURIComponent(m[1]) : null);
    }
  }, []);

  // Sayfa açılışında varsayılan grafik konfigürasyonunu yükle (önce belleğe al)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (!params.id) return;
        const res = await apiGet(`http://localhost:5000/api/reports/${params.id}/chart-config`);
        const data = await res.json();
        if (data.success && data.config) {
          setInitialChartConfig(data.config);
        }
      } catch (e) {
        // sessiz geç
      }
    };
    fetchConfig();
  }, [params.id]);

  // Tüm grafik konfigürasyonlarını yükle (okuma tüm kullanıcılar için serbest)
  useEffect(() => {
    const loadAllConfigs = async () => {
      try {
        if (!params.id) return;
        const res = await apiGet(`http://localhost:5000/api/reports/${params.id}/chart-configs`);
        const data = await res.json();
        if (data.success && Array.isArray(data.configs)) {
          setAllChartConfigs(data.configs);
        }
      } catch {}
    };
    loadAllConfigs();
  }, [params.id]);

  // analyzeData tanımından sonra taşındı

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
        // Aralık filtreleri için özel kontrol
        if (key.includes('_min') || key.includes('_max') || key.includes('_start') || key.includes('_end') || key.includes('_search')) {
          return; // Bu filtreler ayrı işlenecek
        }
        
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

    // Sayısal aralık filtreleri
    analyzeData?.numericColumns.forEach(column => {
      const minValue = filters[`${column}_min`];
      const maxValue = filters[`${column}_max`];
      
      if (minValue || maxValue) {
        filtered = filtered.filter(item => {
          const itemValue = Number(item[column]);
          if (isNaN(itemValue)) return false;
          
          if (minValue && maxValue) {
            return itemValue >= Number(minValue) && itemValue <= Number(maxValue);
          } else if (minValue) {
            return itemValue >= Number(minValue);
          } else if (maxValue) {
            return itemValue <= Number(maxValue);
          }
          return true;
        });
      }
    });

    // Tarih aralık filtreleri
    analyzeData?.dateColumns.forEach(column => {
      const startDate = filters[`${column}_start`];
      const endDate = filters[`${column}_end`];
      
      if (startDate || endDate) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[column]);
          if (isNaN(itemDate.getTime())) return false;
          
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            return itemDate >= start && itemDate <= end;
          } else if (startDate) {
            const start = new Date(startDate);
            return itemDate >= start;
          } else if (endDate) {
            const end = new Date(endDate);
            return itemDate <= end;
          }
          return true;
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

    // Sıralama uygula
    if (sortColumn && filtered.length > 0) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        // Null/undefined değerleri sona al
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        // Sayısal değerler için
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Tarih değerleri için
        const aDate = new Date(aVal);
        const bDate = new Date(bVal);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return sortDirection === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
        }
        
        // String değerler için
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr, 'tr');
        } else {
          return bStr.localeCompare(aStr, 'tr');
        }
      });
    }

    return filtered;
  }, [queryResult?.results, filters, multiSelectFilters, analyzeData, sortColumn, sortDirection]);

  // Veri analizi hazır olduğunda başlangıç konfigini uygula
  useEffect(() => {
    if (!advancedChartConfig && initialChartConfig && analyzeData) {
      const cfg = initialChartConfig;
      const advCfg = createAdvancedChartConfig(cfg.chart_type, cfg.x_axis, cfg.y_axis);
      if (advCfg) {
        advCfg.aggregation = cfg.aggregation;
        advCfg.sortBy = cfg.sort_by;
        advCfg.groupBy = cfg.group_by || cfg.x_axis;
        setAdvancedChartConfig(advCfg);
        setSelectedChartType(cfg.chart_type);
      }
    }
  }, [advancedChartConfig, initialChartConfig, analyzeData]);

  // filteredData'yı güncelle
  useEffect(() => {
    setFilteredData(applyFilters);
  }, [applyFilters]);

  // Grafik verilerini filtreleme değişikliklerinde güncelle
  useEffect(() => {
    if (advancedChartConfig && filteredData.length > 0) {
      // Grafik verileri otomatik olarak güncellenir
      // prepareChartData() fonksiyonu filteredData'yı kullanır
    }
  }, [filteredData, advancedChartConfig]);

  // Filtreleme seçeneklerini oluştur
  const getFilterOptions = (column: string) => {
    if (!queryResult?.results) return [];
    
    const uniqueValues = [...new Set(queryResult.results.map(item => item[column]))]
      .filter(v => v !== null && v !== undefined)
      .sort((a, b) => String(a).localeCompare(String(b), 'tr', { sensitivity: 'base' }));
    return uniqueValues;
  };

  // Sıralama fonksiyonu
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Aynı kolonda tıklandı, yönü değiştir
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Farklı kolonda tıklandı, yeni kolonu seç ve ASC ile başla
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Gelişmiş grafik konfigürasyonu oluştur
  const createAdvancedChartConfig = (type: string, xAxis: string, yAxis: string): AdvancedChartConfig | null => {
    if (!analyzeData) return null;

    const xAxisType: 'categorical' | 'numeric' | 'date' = analyzeData.numericColumns.includes(xAxis) ? 'numeric' : 
                     analyzeData.dateColumns.includes(xAxis) ? 'date' : 'categorical';
    
    const yAxisType: 'categorical' | 'numeric' | 'date' = analyzeData.numericColumns.includes(yAxis) ? 'numeric' : 
                     analyzeData.dateColumns.includes(yAxis) ? 'date' : 'categorical';

    return {
      type: type as any,
      xAxis,
      yAxis,
      series: [yAxis],
      title: `${savedQuery?.name || 'Rapor'} - ${type.toUpperCase()} Grafik`,
      xAxisType,
      yAxisType,
      aggregation: 'sum' as const,
      groupBy: xAxis,
      sortBy: 'desc' as const
    };
  };

  // Grafik verilerini hazırla (filtrelenmiş veriye göre)
  const prepareChartData = () => {
    if (!advancedChartConfig || !filteredData.length) return null;

    const { type, xAxis, yAxis, aggregation, groupBy, sortBy } = advancedChartConfig;

    // Gruplama ve toplama
    const groupedData = new Map();
    
    filteredData.forEach(item => {
      const groupKey = item[groupBy || xAxis];
      const value = Number(item[yAxis]) || 0;
      
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, { count: 0, sum: 0, values: [] });
      }
      
      const group = groupedData.get(groupKey);
      group.count++;
      group.sum += value;
      group.values.push(value);
    });

    // Sonuçları hesapla
    const chartData = Array.from(groupedData.entries()).map(([key, data]: [string, any]) => {
      let aggregatedValue = 0;
      
      switch (aggregation) {
        case 'sum':
          aggregatedValue = data.sum;
          break;
        case 'count':
          aggregatedValue = data.count;
          break;
        case 'average':
          aggregatedValue = data.sum / data.count;
          break;
        case 'min':
          aggregatedValue = Math.min(...data.values);
          break;
        case 'max':
          aggregatedValue = Math.max(...data.values);
          break;
      }

      return {
        label: String(key).substring(0, 20),
        value: aggregatedValue,
        originalKey: key,
        count: data.count
      };
    });

    // Sıralama
    if (sortBy === 'asc') {
      chartData.sort((a, b) => a.value - b.value);
    } else {
      chartData.sort((a, b) => b.value - a.value);
    }

    return chartData.slice(0, 20); // En fazla 20 veri
  };

  // Kayıtlı grafik konfigürasyonu için veri hazırla (çoklu render desteği)
  const prepareChartDataForConfig = (cfg: any) => {
    if (!cfg || !filteredData.length) return null;

    const xAxisKey = cfg.group_by || cfg.x_axis;
    const yAxisKey = cfg.y_axis;
    const aggregation: 'sum' | 'count' | 'average' | 'min' | 'max' = cfg.aggregation || 'sum';
    const sortBy: 'asc' | 'desc' = cfg.sort_by || 'desc';

    const grouped = new Map<string, { count: number; sum: number; values: number[] }>();

    filteredData.forEach((item: any) => {
      const groupKey = item[xAxisKey];
      const rawValue = item[yAxisKey];
      const numericValue = Number(rawValue);

      if (!grouped.has(groupKey)) {
        grouped.set(String(groupKey), { count: 0, sum: 0, values: [] });
      }

      const g = grouped.get(String(groupKey))!;
      g.count += 1;
      if (!Number.isNaN(numericValue)) {
        g.sum += numericValue;
        g.values.push(numericValue);
      }
    });

    const data = Array.from(grouped.entries()).map(([key, g]) => {
      let value = 0;
      switch (aggregation) {
        case 'count':
          value = g.count;
          break;
        case 'average':
          value = g.count > 0 ? g.sum / g.count : 0;
          break;
        case 'min':
          value = g.values.length ? Math.min(...g.values) : 0;
          break;
        case 'max':
          value = g.values.length ? Math.max(...g.values) : 0;
          break;
        default:
          value = g.sum;
      }
      return { label: String(key).substring(0, 20), value, count: g.count };
    });

    data.sort((a, b) => (sortBy === 'asc' ? a.value - b.value : b.value - a.value));
    return data.slice(0, 30);
  };

  const mapChartType = (t: string): 'bar' | 'line' | 'pie' => {
    if (t === 'line') return 'line';
    if (t === 'pie') return 'pie';
    return 'bar';
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

  // CSV İndirme Fonksiyonu
  const downloadCSV = () => {
    if (!filteredData.length) return;
    
    // Türkçe karakter desteği için BOM ekle
    const BOM = '\uFEFF';
    
    // CSV başlıkları (Türkçe)
    const headers = Object.keys(filteredData[0]);
    const csvHeaders = headers.map(header => `"${header}"`).join(';');
    
    // CSV satırları
    const csvRows = filteredData.map(row => 
      headers.map(header => {
        const value = row[header];
        // Türkçe karakterleri koru ve özel karakterleri escape et
        const escapedValue = String(value || '').replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(';')
    );
    
    // CSV içeriği
    const csvContent = BOM + csvHeaders + '\n' + csvRows.join('\n');
    
    // Dosya indirme
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${savedQuery?.name || 'rapor'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF İndirme Fonksiyonu
  const downloadPDF = async () => {
    if (!filteredData.length || !analyzeData) return;
    
    try {
      // PDF oluşturma için html2canvas ve jsPDF kullan
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let currentY = 20;
      
      // Başlık - Daha büyük ve güzel
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80); // Koyu mavi
      pdf.text(savedQuery?.name || 'Rapor', pageWidth / 2, currentY, { align: 'center' });
      currentY += 20;
      
      // Tarih - Daha şık
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(52, 73, 94); // Orta mavi
      pdf.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      // Özet İstatistikler - Kutu içinde
      pdf.setFillColor(236, 240, 241); // Açık gri arka plan
      pdf.rect(15, currentY - 5, pageWidth - 30, 25, 'F');
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.text('📊 Özet İstatistikler', 20, currentY);
      currentY += 12;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(52, 73, 94);
      pdf.text(`• Toplam Kayıt: ${filteredData.length.toLocaleString('tr-TR')}`, 20, currentY);
      currentY += 7;
      
      if (analyzeData.numericColumns.length > 0) {
        const totalValue = filteredData.reduce((sum, item) => {
          const value = item[analyzeData.numericColumns[0]];
          return sum + (value !== null && value !== undefined ? Number(value) || 0 : 0);
        }, 0);
        pdf.text(`• Toplam ${analyzeData.numericColumns[0]}: ${totalValue.toLocaleString('tr-TR')}`, 20, currentY);
        currentY += 7;
      }
      
      // Kategori kolonları için özet
      if (analyzeData.categoricalColumns.length > 0) {
        const firstCatColumn = analyzeData.categoricalColumns[0];
        const uniqueValues = [...new Set(filteredData.map(item => item[firstCatColumn]))];
        pdf.text(`• ${firstCatColumn} Çeşitliliği: ${uniqueValues.length} farklı değer`, 20, currentY);
        currentY += 7;
      }
      
      currentY += 15;
      
      // Grafik ekleme (eğer varsa)
      if (showChart && chartConfig) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(44, 62, 80);
        pdf.text('📈 Grafik Analizi', 20, currentY);
        currentY += 10;
        
        // Grafik container'ını bul ve canvas'a çevir
        const chartContainer = document.querySelector('.chart-container') || document.querySelector('[data-chart]');
        if (chartContainer && chartContainer instanceof HTMLElement) {
          try {
            const canvas = await html2canvas.default(chartContainer, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 170;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Sayfa kontrolü
            if (currentY + imgHeight > pageHeight - 30) {
              pdf.addPage();
              currentY = 20;
            }
            
            // Grafik için çerçeve
            pdf.setDrawColor(189, 195, 199);
            pdf.setLineWidth(0.5);
            pdf.rect(15, currentY - 5, imgWidth + 10, imgHeight + 10);
            
            pdf.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 15;
          } catch (error) {
            pdf.setTextColor(231, 76, 60); // Kırmızı
            pdf.text('⚠️ Grafik yüklenemedi', 20, currentY);
            currentY += 10;
          }
        }
      }
      
      // Veri tablosu - Daha profesyonel
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.text('📋 Veri Özeti (İlk 50 Kayıt)', 20, currentY);
      currentY += 12;
      
      const tableData = filteredData.slice(0, 50);
      const columns = Object.keys(tableData[0] || {});
      
      // Tablo başlıkları - Renkli arka plan
      pdf.setFillColor(52, 152, 219); // Mavi arka plan
      pdf.rect(15, currentY - 3, pageWidth - 30, 8, 'F');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255); // Beyaz yazı
      let xPos = 20;
      columns.forEach((column, index) => {
        if (xPos < pageWidth - 25) {
          const columnName = column.length > 12 ? column.substring(0, 12) + '...' : column;
          pdf.text(columnName, xPos, currentY);
          xPos += 35;
        }
      });
      currentY += 8;
      
      // Tablo satırları - Zebra striping
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      tableData.forEach((row, rowIndex) => {
        if (currentY > pageHeight - 25) {
          pdf.addPage();
          currentY = 20;
        }
        
        // Zebra striping
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(15, currentY - 2, pageWidth - 30, 6, 'F');
        }
        
        xPos = 20;
        pdf.setTextColor(52, 73, 94);
        columns.forEach((column, colIndex) => {
          if (xPos < pageWidth - 25) {
            const value = String(row[column] || '').substring(0, 15);
            pdf.text(value, xPos, currentY);
            xPos += 35;
          }
        });
        currentY += 6;
      });
      
      // Filtre bilgileri - Özel kutu
      currentY += 15;
      pdf.setFillColor(236, 240, 241);
      pdf.rect(15, currentY - 5, pageWidth - 30, 20, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.text('🔍 Uygulanan Filtreler:', 20, currentY);
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(52, 73, 94);
      const activeFilters = Object.keys(filters).filter(key => filters[key] && filters[key] !== '');
      const activeMultiFilters = Object.keys(multiSelectFilters).filter(key => multiSelectFilters[key] && multiSelectFilters[key].length > 0);
      
      if (activeFilters.length === 0 && activeMultiFilters.length === 0) {
        pdf.text('• Filtre uygulanmadı', 20, currentY);
      } else {
        activeFilters.forEach(filter => {
          pdf.text(`• ${filter}: ${filters[filter]}`, 20, currentY);
          currentY += 5;
        });
        
        activeMultiFilters.forEach(filter => {
          pdf.text(`• ${filter}: ${multiSelectFilters[filter].join(', ')}`, 20, currentY);
          currentY += 5;
        });
      }
      
      // Alt bilgi
      currentY += 10;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(149, 165, 166);
      pdf.text(`HBYS Rapor Sistemi tarafından oluşturuldu - ${new Date().toLocaleString('tr-TR')}`, pageWidth / 2, currentY, { align: 'center' });
      
      // PDF'i indir
      pdf.save(`${savedQuery?.name || 'rapor'}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken hata oluştu!');
    }
  };

  const loadSavedQuery = async (id: string) => {
    try {
      const response = await apiGet('http://localhost:5000/api/reports/public-queries');
      const data = await response.json();
      
      if (data.success) {
        const query = data.queries.find((q: SavedQuery) => q.id === parseInt(id));
        if (query) {
          setSavedQuery(query);
          // Otomatik çalıştırmayı kaldırdık; filtrelerle çalıştırılacak
          // Rapor filtrelerini getir
          try {
            await fetchAssignedReportFilters(String(query.id));
          } catch (e) {}
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

  // Raporun atanmış filtrelerini getir
  const fetchAssignedReportFilters = async (reportKey: string) => {
    const res = await apiGet(`http://localhost:5000/api/reports/report/${reportKey}/filters`);
    const data = await res.json();
    if (data?.success) {
      setAssignedFilters((data.filters || []).map((f: any) => ({
        ...f,
        // content string gelebilir; objeye çevir
        content: typeof f.content === 'string' ? (() => { try { return JSON.parse(f.content); } catch { return f.content; } })() : f.content
      })));
    }
  };

  // Tüm filtreleri getir (Admin/SuperAdmin için Filtre Ekle modalında listelemek amacıyla)
  const fetchAllDbFilters = async () => {
    const res = await apiGet('http://localhost:5000/api/reports/filters');
    const data = await res.json();
    if (data?.success) {
      setDbFilters((data.filters || []).map((f: any) => ({
        ...f,
        content: typeof f.content === 'string' ? (() => { try { return JSON.parse(f.content); } catch { return f.content; } })() : f.content
      })));
    }
  };

  // Rapora filtre ekle
  const addFilterToReport = async (filterId: number) => {
    if (!savedQuery) return;
    await apiPost(`http://localhost:5000/api/reports/report/${savedQuery.id}/filters`, {
      filter_id: filterId,
      is_required: false,
      display_order: (assignedFilters?.length || 0) + 1
    });
    await fetchAssignedReportFilters(String(savedQuery.id));
  };

  // Filtre girişleri değiştiğinde paramları güncelle
  const updateServerFilterParam = (key: string, value: any) => {
    setServerFilterParams(prev => ({ ...prev, [key]: value }));
  };

  // Yeni: Filtrelerle çalıştır
  const executeWithFilters = async () => {
    if (!savedQuery) return;
    setExecuting(true);
    setError(null);
    try {
      const response = await apiPost(`http://localhost:5000/api/reports/execute/${savedQuery.id}/with-filters`, {
        params: serverFilterParams
      });
      const data = await response.json();
      if (data?.success) {
        const rows = data.results || [];
        setQueryResult({ success: true, results: rows, message: 'Rapor çalıştırıldı' });
        setFilteredData(rows);
      } else {
        setError(data?.message || 'Sorgu çalıştırılamadı');
      }
    } catch (err) {
      setError('Sorgu çalıştırılırken hata oluştu');
    } finally {
      setExecuting(false);
    }
  };

  const executeQuery = async (query: SavedQuery) => {
    setExecuting(true);
    setError(null);
    
    try {
      // Önce public endpoint'i dene
      try {
        const publicResponse = await apiPost(`http://localhost:5000/api/reports/run/${query.id}`, {});
        const publicData = await publicResponse.json();
        
        if (publicData.success) {
          setQueryResult({
            success: true,
            results: publicData.results || [],
            message: publicData.message || 'Rapor başarıyla çalıştırıldı'
          });
          setLoadingConnection(false);
          setExecuting(false);
          // Grafik konfigürasyonunu ayarla
          setTimeout(() => {
            if (analyzeData?.suggestedChart) {
              setChartConfig(analyzeData.suggestedChart);
              setSelectedChartType(analyzeData.suggestedChart.type);
            }
          }, 100);
          return;
        }
      } catch (publicError) {
        console.log('Public endpoint başarısız, admin endpoint deneniyor...');
        // Admin olmayan kullanıcılar için admin fallback çağrısını durdur
        if (!isAdminOrSuper) {
          setError('Rapor şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
          setExecuting(false);
          return;
        }
      }

      // Fallback: Admin endpoint'i dene
      setLoadingConnection(true);
      const connectionResponse = await apiGet('http://localhost:5000/api/admin/database-connections');
      const connectionData = await connectionResponse.json();
      
             if (!connectionData.success || connectionData.connections.length === 0) {
         // Normal kullanıcılar için admin mesajı gösterme
         if (isAdminOrSuper) {
           setError('Aktif veritabanı bağlantısı bulunamadı. Lütfen admin sayfasından bağlantı ekleyin.');
         } else {
           setError('Rapor şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin veya sistem yöneticisi ile iletişime geçin.');
         }
         setExecuting(false);
         setLoadingConnection(false);
         return;
       }
      
      const connection = connectionData.connections[0];
      setLoadingConnection(false);
      
      const response = await apiPost('http://localhost:5000/api/admin/database/query', {
        query: query.sql_query,
        host: connection.host,
        port: parseInt(connection.port),
        database: connection.database_name,
        username: connection.username,
        password: connection.password
      });

      const data: QueryResult = await response.json();
      
      if (data.success) {
        setQueryResult(data);
        // Grafik konfigürasyonunu ayarla
        setTimeout(() => {
          if (analyzeData?.suggestedChart) {
            setChartConfig(analyzeData.suggestedChart);
            setSelectedChartType(analyzeData.suggestedChart.type);
            
            // Gelişmiş grafik konfigürasyonunu da oluştur
            if (analyzeData.categoricalColumns.length > 0 && analyzeData.numericColumns.length > 0) {
              const advancedConfig = createAdvancedChartConfig(
                'bar',
                analyzeData.categoricalColumns[0],
                analyzeData.numericColumns[0]
              );
              setAdvancedChartConfig(advancedConfig);
            }
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
    // Önce gelişmiş konfigürasyonu kontrol et
    if (advancedChartConfig && filteredData.length) {
      const chartData = prepareChartData();
      if (!chartData) return null;

      const { type, xAxis, yAxis, aggregation } = advancedChartConfig;
      
      switch (type) {
        case 'bar':
          return <ChartCard type="bar" data={chartData} title={`${yAxis} - ${xAxis}`} />;
        case 'pie':
          return <ChartCard type="pie" data={chartData} title={`${yAxis} Dağılımı`} />;
        case 'line':
          return <ChartCard type="line" data={chartData} title={`${yAxis} Trendi`} />;
        default:
          return <ChartCard type="bar" data={chartData} title={`${yAxis} - ${xAxis}`} />;
      }
    }

    // Eski grafik sistemi (geriye uyumluluk için)
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
            <div className="h-64 flex items-end justify-center space-x-3 relative overflow-x-auto">
              {/* Y ekseni etiketleri */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-700 pr-2 bg-white bg-opacity-80 rounded-r px-1">
                {[0, 25, 50, 75, 100].map(percent => (
                  <span key={percent} className="transform -translate-y-1/2 font-medium">
                    {Math.round((maxBarValue * percent) / 100)}
                  </span>
                ))}
              </div>
              
              {/* Grid çizgileri */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 25, 50, 75, 100].map(percent => (
                  <div key={percent} className="border-t border-gray-100 w-full opacity-30"></div>
                ))}
              </div>
              
              {/* Bar'lar */}
              <div className="flex items-end space-x-3 min-w-max px-8">
                {barData.map((item, index) => {
                  const value = getSafeValue(item, yAxis);
                  const barHeight = maxBarValue > 0 ? (value / maxBarValue) * 200 : 0;
                  const label = getSafeString(item, xAxis).substring(0, 15);
                  const percentage = maxBarValue > 0 ? (value / maxBarValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center relative group">
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 border border-gray-600">
                        <div className="text-center">
                          <div className="font-semibold text-white">{label}</div>
                          <div className="text-gray-200">{value} ({percentage.toFixed(1)}%)</div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
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
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-800 bg-white bg-opacity-95 px-2 py-1 rounded shadow-lg border border-gray-300 backdrop-blur-sm">
                          {value}
                        </div>
                      </div>
                      
                      {/* X ekseni etiketi */}
                      <div className="mt-3 text-center">
                        <span 
                          className="text-xs text-gray-800 font-semibold leading-tight block max-w-20 truncate bg-white bg-opacity-90 px-1 py-0.5 rounded" 
                          title={label}
                          style={{
                            transform: 'rotate(-45deg)',
                            transformOrigin: 'top left',
                            marginTop: '8px',
                            marginLeft: '10px'
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-700 pr-2 bg-white bg-opacity-80 rounded-r px-1">
                {[0, 25, 50, 75, 100].map(percent => (
                  <span key={percent} className="transform -translate-y-1/2 font-medium">
                    {Math.round((maxLineValue * percent) / 100)}
                  </span>
                ))}
              </div>
              
              {/* Grid çizgileri */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 25, 50, 75, 100].map(percent => (
                  <div key={percent} className="border-t border-gray-100 w-full opacity-30"></div>
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
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-700 pr-2 bg-white bg-opacity-80 rounded-r px-1">
                {[0, 25, 50, 75, 100].map(percent => (
                  <span key={percent} className="transform -translate-y-1/2 font-medium">
                    {Math.round((maxAreaValue * percent) / 100)}
                  </span>
                ))}
              </div>
              
              {/* Grid çizgileri */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 25, 50, 75, 100].map(percent => (
                  <div key={percent} className="border-t border-gray-100 w-full opacity-30"></div>
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
    <div className="min-h-screen bg-gray-50 p-4 overflow-x-hidden">
      <div className="w-full max-w-none transform-gpu">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/reports"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                ← Raporlara Dön
              </Link>
              <div className="bg-blue-600 p-3 rounded-lg shadow-sm">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{savedQuery?.name}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={executeWithFilters}
                disabled={executing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${executing ? 'animate-spin' : ''}`} />
                {executing ? 'Çalıştırılıyor...' : 'Uygula'}
              </button>
              
              {/* CSV İndirme Butonu */}
              <button
                onClick={downloadCSV}
                disabled={!filteredData.length}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="CSV olarak indir (Türkçe karakter desteği ile)"
              >
                <FileDown className="h-4 w-4" />
                CSV İndir
              </button>
              
              {/* PDF İndirme Butonu */}
              <button
                onClick={downloadPDF}
                disabled={!filteredData.length}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="PDF olarak indir (Özet analiz ve grafikler ile)"
              >
                <FileText className="h-4 w-4" />
                PDF İndir
              </button>
              
              {/* Eski client-side filtre butonu kaldırıldı */}

              {/* Kaydet */}
              {isAdminOrSuper && (
                <button
                  onClick={async () => {
                    try {
                      if (!advancedChartConfig) {
                        alert('Önce grafik ayarlarını seçin');
                        return;
                      }
                      const timeSuffix = new Date().toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                      const payload = {
                        name: `Grafik ${timeSuffix}`,
                        chart_type: advancedChartConfig.type,
                        x_axis: advancedChartConfig.xAxis,
                        y_axis: advancedChartConfig.yAxis,
                        x_axis_type: advancedChartConfig.xAxisType,
                        y_axis_type: advancedChartConfig.yAxisType,
                        series: advancedChartConfig.series,
                        aggregation: advancedChartConfig.aggregation,
                        sort_by: advancedChartConfig.sortBy,
                        group_by: advancedChartConfig.groupBy,
                        height: 520,
                        chart_options: {},
                        filters: filters,
                        is_default: true
                      };
                      const res = await apiPost(`http://localhost:5000/api/reports/${params.id}/chart-config`, payload);
                      const data = await res.json();
                      if (!res.ok || !data.success) throw new Error(data.message || 'Kaydedilemedi');
                      alert('Grafik konfigürasyonu kaydedildi');
                      setIsEditMode(false);
                      // listeyi yenile
                      try {
                        const listRes = await apiGet(`http://localhost:5000/api/reports/${params.id}/chart-configs`);
                        const listData = await listRes.json();
                        if (listData.success) setAllChartConfigs(listData.configs || []);
                      } catch {}
                    } catch (err: any) {
                      alert(`Kaydetme hatası: ${err.message}`);
                    }
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Grafik Ekle / Kaydet
                </button>
              )}

              {/* Gelişmiş Ayarlar toggle: sadece edit modunda göster */}
              {isAdminOrSuper && (
                <button
                  onClick={() => setShowAdvancedChartConfig(prev => !prev)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isEditMode && showAdvancedChartConfig
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Gelişmiş Ayarlar
                </button>
              )}

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

              {isAdminOrSuper && (
                <button
                  onClick={() => setIsEditMode(prev => !prev)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isEditMode 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Grafik ayarlarını düzenle"
                >
                  <Settings className="h-4 w-4" />
                  {isEditMode ? 'Düzenlemeyi Kapat' : 'Grafik Ekle / Düzenle'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grafik Önerileri (sadece edit modunda) */}
        {isEditMode && showChartSuggestions && analyzeData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            {/* Header with minimize button */}
            <div className="p-5 border-b border-gray-100">
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
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analyzeData.chartSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
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
        {/* Yeni: Sunucu Taraflı Filtreler (DB tabanlı) */}
        {savedQuery && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                <Filter className="h-5 w-5" /> Sunucu Filtreleri
              </h3>
              {isAdminOrSuper && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => { await fetchAllDbFilters(); setShowAddFilterModal(true); }}
                    className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Filtre Ekle
                  </button>
                </div>
              )}
            </div>

            {/* Atanmış filtrelerin giriş alanları */}
            {assignedFilters.length === 0 ? (
              <div className="text-sm text-gray-500">Bu rapora henüz filtre atanmadı.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedFilters.map((af: any) => {
                  const key = af.content?.param || af.content?.params?.start || af.filter_name;
                  const type = af.content?.type;
                  return (
                    <div key={`${af.filter_id}-${key}`} className="p-4 border border-gray-200 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">{af.filter_name}</div>
                      {type === 'select' && (
                        <select
                          multiple={!!af.content?.multiple}
                          value={serverFilterParams[af.content?.param] || (af.content?.multiple ? [] : '')}
                          onChange={(e) => {
                            if (af.content?.multiple) {
                              const vals = Array.from(e.target.selectedOptions).map(o => (o as HTMLOptionElement).value);
                              updateServerFilterParam(af.content.param, vals.map(v => isNaN(Number(v)) ? v : Number(v)));
                            } else {
                              const v = e.target.value;
                              updateServerFilterParam(af.content.param, isNaN(Number(v)) ? v : Number(v));
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          {!af.content?.multiple && <option value="">Seçiniz</option>}
                          {(af.content?.options || []).map((opt: any) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                      )}
                      {type === 'date_range' && (
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={serverFilterParams[af.content?.params?.start] || ''}
                            onChange={(e) => updateServerFilterParam(af.content?.params?.start, e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          />
                          <input
                            type="date"
                            value={serverFilterParams[af.content?.params?.end] || ''}
                            onChange={(e) => updateServerFilterParam(af.content?.params?.end, e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filtre Ekle Modalı */}
            {showAddFilterModal && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-semibold">Filtre Ekle</div>
                    <button onClick={() => setShowAddFilterModal(false)} className="text-gray-500 hover:text-gray-700">Kapat</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y">
                    {dbFilters
                      .filter(f => !assignedFilters.some((af: any) => af.filter_id === f.id))
                      .map((f: any) => (
                        <button
                          key={f.id}
                          onClick={async () => { await addFilterToReport(f.id); setShowAddFilterModal(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                        >
                          {f.filter_name}
                        </button>
                      ))}
                    {dbFilters.filter(f => !assignedFilters.some((af: any) => af.filter_id === f.id)).length === 0 && (
                      <div className="text-sm text-gray-500 p-3">Eklenecek filtre kalmadı.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Grafik Türü Seçimi (sadece edit modunda) */}
        {isEditMode && analyzeData && showChart && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Grafik Türü</h3>
              <button
                onClick={() => setShowAdvancedChartConfig(!showAdvancedChartConfig)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Settings className="h-4 w-4" />
                Gelişmiş Ayarlar
              </button>
            </div>
            
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
                      ? 'bg-blue-600 text-white shadow-sm'
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

        {/* Gelişmiş Grafik Konfigürasyonu (sadece edit modunda) */}
        {isEditMode && showAdvancedChartConfig && analyzeData && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100 showAdvancedChartConfig">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Gelişmiş Grafik Ayarları
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* X Ekseni Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">X Ekseni (Kategori/Tarih)</label>
                <select
                  value={advancedChartConfig?.xAxis || ''}
                  onChange={(e) => {
                    const newConfig = createAdvancedChartConfig(
                      selectedChartType,
                      e.target.value,
                      advancedChartConfig?.yAxis || analyzeData.numericColumns[0] || ''
                    );
                    setAdvancedChartConfig(newConfig);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">X Ekseni Seçin</option>
                  {analyzeData.categoricalColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                  {analyzeData.dateColumns.map(col => (
                    <option key={col} value={col}>{col} (Tarih)</option>
                  ))}
                </select>
              </div>

              {/* Y Ekseni Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Y Ekseni (Sayısal Değer)</label>
                <select
                  value={advancedChartConfig?.yAxis || ''}
                  onChange={(e) => {
                    const newConfig = createAdvancedChartConfig(
                      selectedChartType,
                      advancedChartConfig?.xAxis || analyzeData.categoricalColumns[0] || '',
                      e.target.value
                    );
                    setAdvancedChartConfig(newConfig);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Y Ekseni Seçin</option>
                  {analyzeData.numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Toplama Yöntemi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Toplama Yöntemi</label>
                <select
                  value={advancedChartConfig?.aggregation || 'sum'}
                  onChange={(e) => {
                    if (advancedChartConfig) {
                      setAdvancedChartConfig({
                        ...advancedChartConfig,
                        aggregation: e.target.value as any
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sum">Toplam</option>
                  <option value="count">Sayı</option>
                  <option value="average">Ortalama</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maksimum</option>
                </select>
              </div>

              {/* Sıralama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sıralama</label>
                <select
                  value={advancedChartConfig?.sortBy || 'desc'}
                  onChange={(e) => {
                    if (advancedChartConfig) {
                      setAdvancedChartConfig({
                        ...advancedChartConfig,
                        sortBy: e.target.value as any
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Azalan (Büyükten Küçüğe)</option>
                  <option value="asc">Artan (Küçükten Büyüğe)</option>
                </select>
              </div>

              {/* Grafik Türü */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grafik Türü</label>
                <select
                  value={advancedChartConfig?.type || selectedChartType}
                  onChange={(e) => {
                    if (advancedChartConfig) {
                      setAdvancedChartConfig({
                        ...advancedChartConfig,
                        type: e.target.value as any
                      });
                      setSelectedChartType(e.target.value as any);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="bar">Bar Grafik</option>
                  <option value="line">Çizgi Grafik</option>
                  <option value="pie">Pasta Grafik</option>
                  <option value="area">Alan Grafik</option>
                  <option value="scatter">Dağılım Grafik</option>
                </select>
              </div>

                             {/* Uygula Butonu */}
               <div className="md:col-span-2 lg:col-span-3 flex gap-3">
                 <button
                   onClick={() => {
                     if (advancedChartConfig?.xAxis && advancedChartConfig?.yAxis) {
                       setShowAdvancedChartConfig(false);
                     } else {
                       alert('Lütfen X ve Y eksenlerini seçin!');
                     }
                   }}
                   disabled={!advancedChartConfig?.xAxis || !advancedChartConfig?.yAxis}
                   className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                 >
                   ✅ Grafiği Uygula
                 </button>
                 
                 {/* Güncelleme Butonu - sadece düzenleme modunda göster */}
                 {isEditMode && (
                   <button
                     onClick={async () => {
                       try {
                         if (!advancedChartConfig) {
                           alert('Önce grafik ayarlarını seçin');
                           return;
                         }
                         
                         // Mevcut grafik ID'sini bul (düzenlenen grafik)
                         const currentConfig = allChartConfigs.find(cfg => 
                           cfg.x_axis === advancedChartConfig.xAxis && 
                           cfg.y_axis === advancedChartConfig.yAxis &&
                           cfg.chart_type === advancedChartConfig.type
                         );
                         
                         if (!currentConfig) {
                           alert('Güncellenecek grafik bulunamadı');
                           return;
                         }
                         
                         const payload = {
                           name: currentConfig.name,
                           chart_type: advancedChartConfig.type,
                           x_axis: advancedChartConfig.xAxis,
                           y_axis: advancedChartConfig.yAxis,
                           x_axis_type: advancedChartConfig.xAxisType,
                           y_axis_type: advancedChartConfig.yAxisType,
                           series: advancedChartConfig.series,
                           aggregation: advancedChartConfig.aggregation,
                           sort_by: advancedChartConfig.sortBy,
                           group_by: advancedChartConfig.groupBy,
                           height: currentConfig.height || 520,
                           chart_options: currentConfig.chart_options || {},
                           filters: filters,
                           is_default: currentConfig.is_default || false
                         };
                         
                         const res = await fetch(`http://localhost:5000/api/reports/${params.id}/chart-config/${currentConfig.id}`, {
                           method: 'PUT',
                           headers: {
                             'Content-Type': 'application/json'
                           },
                           credentials: 'include',
                           body: JSON.stringify(payload)
                         });
                         
                         if (res.ok) {
                           // Listeyi yenile
                           const listRes = await fetch(`http://localhost:5000/api/reports/${params.id}/chart-configs`, {
                             method: 'GET',
                             credentials: 'include'
                           });
                           const listData = await listRes.json();
                           if (listData.success) {
                             setAllChartConfigs(listData.configs || []);
                             alert('Grafik başarıyla güncellendi!');
                           }
                         } else {
                           const errorData = await res.json();
                           alert(`Grafik güncellenirken hata oluştu: ${errorData.message || 'Bilinmeyen hata'}`);
                         }
                       } catch (error) {
                         console.error('Grafik güncelleme hatası:', error);
                         alert('Grafik güncellenirken hata oluştu!');
                       }
                     }}
                     disabled={!advancedChartConfig?.xAxis || !advancedChartConfig?.yAxis}
                     className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                   >
                     🔄 Grafiği Güncelle
                   </button>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* Grafik ve Veri */}
        <div className="grid grid-cols-1 gap-6 transform-gpu will-change-transform">
          {/* Grafikler Grid */}
          {showChart && (
            <div className="space-y-6">
              {/* Tüm kayıtlı grafikler: aktif grafik ilk sırada */}
              <div className="grid grid-cols-1 gap-6">
                                 {[...(allChartConfigs || [])].map((cfg: any) => {
                   const chartData = prepareChartDataForConfig(cfg);
                   const type = mapChartType(cfg.chart_type);
                   return (
                     <div key={cfg.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                       <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                         <span className="text-sm font-medium text-gray-700 truncate">{cfg.name}</span>
                                                  {/* Edit and delete functionality now handled by ChartCard component */}
                       </div>
                       <div className="p-3 transform-gpu will-change-transform">
                         {chartData && chartData.length > 0 ? (
                           <ChartCard 
                             type={type} 
                             data={chartData} 
                             title={cfg.name || `${cfg.y_axis} - ${cfg.x_axis}`} 
                             height={cfg.height || 480}
                             isEditMode={isAdminOrSuper}
                             editConfig={cfg}
                             analyzeData={analyzeData}
                             onSave={async (updatedConfig) => {
                               try {
                                 const payload = {
                                   name: updatedConfig.name || cfg.name,
                                   chart_type: updatedConfig.chart_type || cfg.chart_type,
                                   x_axis: updatedConfig.x_axis || cfg.x_axis,
                                   y_axis: updatedConfig.y_axis || cfg.y_axis,
                                   x_axis_type: cfg.x_axis_type,
                                   y_axis_type: cfg.y_axis_type,
                                   series: cfg.series,
                                   aggregation: updatedConfig.aggregation || cfg.aggregation,
                                   sort_by: updatedConfig.sort_by || cfg.sort_by,
                                   group_by: updatedConfig.group_by || cfg.group_by,
                                   height: updatedConfig.height || cfg.height || 520,
                                   chart_options: cfg.chart_options || {},
                                   filters: filters,
                                   is_default: cfg.is_default || false
                                 };
                                 
                                 // Mevcut grafik ID'si ile PUT endpoint'ini kullan
                                 const res = await fetch(`http://localhost:5000/api/reports/${params.id}/chart-config/${cfg.id}`, {
                                   method: 'PUT',
                                   headers: {
                                     'Content-Type': 'application/json'
                                   },
                                   credentials: 'include',
                                   body: JSON.stringify(payload)
                                 });
                                 
                                 if (res.ok) {
                                   // Listeyi yenile
                                   const listRes = await fetch(`http://localhost:5000/api/reports/${params.id}/chart-configs`, {
                                     method: 'GET',
                                     credentials: 'include'
                                   });
                                   const listData = await listRes.json();
                                   if (listData.success) {
                                     setAllChartConfigs(listData.configs || []);
                                     alert('Grafik başarıyla güncellendi!');
                                   }
                                 } else {
                                   const errorData = await res.json();
                                   alert(`Grafik güncellenirken hata oluştu: ${errorData.message || 'Bilinmeyen hata'}`);
                                 }
                               } catch (error) {
                                 console.error('Grafik güncelleme hatası:', error);
                                 alert('Grafik güncellenirken hata oluştu!');
                               }
                             }}
                             onCancel={() => {
                               // Cancel işlemi için gerekirse ek kod
                             }}
                             onDelete={async (cfg) => {
                               try {
                                 const res = await fetch(`http://localhost:5000/api/reports/chart-config/${cfg.id}`, {
                                   method: 'DELETE',
                                   headers: {
                                     'Content-Type': 'application/json'
                                   },
                                   credentials: 'include'
                                 });
                                 if (res.ok) {
                                   // Listeyi yenile
                                   const listRes = await fetch(`http://localhost:5000/api/reports/${params.id}/chart-configs`, {
                                     method: 'GET',
                                     credentials: 'include'
                                   });
                                   const listData = await listRes.json();
                                   if (listData.success) {
                                     setAllChartConfigs(listData.configs || []);
                                     alert('Grafik başarıyla silindi!');
                                   }
                                 } else {
                                   alert('Grafik silinirken hata oluştu!');
                                 }
                               } catch (error) {
                                 console.error('Grafik silme hatası:', error);
                                 alert('Grafik silinirken hata oluştu!');
                               }
                             }}
                           />
                         ) : (
                           <div className="h-[480px] flex items-center justify-center text-sm text-gray-500 border border-dashed rounded-md">
                             Veri bulunamadı
                           </div>
                         )}
                       </div>
                     </div>
                   );
                 })}
                {/* Eğer hiç kayıtlı yoksa aktif grafiği tek başına göster */}
                {(!allChartConfigs || allChartConfigs.length === 0) && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div data-chart="true" className="chart-container transform-gpu will-change-transform">
                      {renderChart()}
                    </div>
                  </div>
                )}
              </div>

              {/* Özet İstatistikler */}
              {filteredData.length > 0 && (
                <div className="bg-white p-5 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Özet İstatistikler</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          {/* Veri Tablosu - aşağıya geniş blok */}
          <div className={`bg-white rounded-xl shadow-sm border border-gray-100 2xl:col-span-2`}>
            {/* Header with minimize button */}
            <div className="p-5 border-b border-gray-100">
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
                <div className="overflow-x-auto max-w-full transform-gpu will-change-transform">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {queryResult?.results[0] && Object.keys(queryResult.results[0]).map((column) => (
                          <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 border-b border-gray-200">
                            <button
                              onClick={() => handleSort(column)}
                              className="flex items-center gap-1 hover:text-gray-700 transition-colors group w-full text-left"
                              title={`${column} kolununu sırala`}
                            >
                              <span className="truncate">{column}</span>
                              <div className="flex flex-col opacity-50 group-hover:opacity-100 transition-opacity">
                                <svg 
                                  className={`w-3 h-3 ${sortColumn === column && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} 
                                  fill="currentColor" 
                                  viewBox="0 0 20 20"
                                >
                                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                                <svg 
                                  className={`w-3 h-3 -mt-1 ${sortColumn === column && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} 
                                  fill="currentColor" 
                                  viewBox="0 0 20 20"
                                >
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.slice(0, 100).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          {Object.values(row).map((value: any, cellIndex: number) => (
                            <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate border-b border-gray-100" title={String(value || '')}>
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
