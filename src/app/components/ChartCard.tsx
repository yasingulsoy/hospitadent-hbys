'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ComposedChart,
	Area,
} from 'recharts';
import { Edit, X, Save, RotateCcw, Trash2 } from 'lucide-react';

type ChartType = 'bar' | 'line' | 'pie' | 'multi-line' | 'area' | 'grouped-bar';

export interface ChartDatum {
	label: string;
	value: number;
	count?: number;
}

// Çoklu seri için yeni interface
export interface MultiSeriesDatum {
	label: string;
	[key: string]: number | string;
}

interface ChartCardProps {
	type: ChartType;
	data: ChartDatum[] | MultiSeriesDatum[];
	title?: string;
	height?: number;
	onEdit?: (config: any) => void;
	onSave?: (config: any) => void;
	onCancel?: () => void;
	onDelete?: (config: any) => void;
	editConfig?: {
		name?: string;
		chart_type?: string;
		x_axis?: string;
		y_axis?: string;
		aggregation?: 'sum' | 'count' | 'count_nonzero' | 'average' | 'min' | 'max' | 'distinct';
		group_by?: string;
		sort_by?: 'asc' | 'desc';
		height?: number;
		distinctColumn?: string;
	};
	isEditMode?: boolean;
	analyzeData?: any; // Mevcut veri kolonları için
	seriesKeys?: string[]; // Çoklu seri için anahtar dizisi
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export default function ChartCard({
	type,
	data,
	title,
	height = 560,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	editConfig,
	isEditMode = false,
	analyzeData,
	seriesKeys
}: ChartCardProps) {
	const safeData = Array.isArray(data) ? data : [];
	const [isFlipped, setIsFlipped] = useState(false);
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [localEditConfig, setLocalEditConfig] = useState<{
		name?: string;
		chart_type?: string;
		x_axis?: string;
		y_axis?: string;
		aggregation?: 'sum' | 'count' | 'count_nonzero' | 'average' | 'min' | 'max' | 'distinct';
		group_by?: string;
		sort_by?: 'asc' | 'desc';
		height?: number;
		distinctColumn?: string;
	}>(editConfig || {});

	// editConfig değiştiğinde localEditConfig'i güncelle
	useEffect(() => {
		if (editConfig) {
			setLocalEditConfig(editConfig);
		}
	}, [editConfig]);

	// Görsellik için veri sınırlandırma ve efsane (legend) yoğunluğunu azaltma
	const displayedData = useMemo(() => {
		if (type === 'pie') {
			// ChartDatum tipindeki veriler için sıralama
			const chartData = safeData as ChartDatum[];
			const sorted = [...chartData].sort((a, b) => (b.value || 0) - (a.value || 0));
			if (sorted.length > 12) {
				const top = sorted.slice(0, 11);
				const other = sorted.slice(11).reduce((sum, d) => sum + (d.value || 0), 0);
				return [...top, { label: 'Diğer', value: other }];
			}
			return sorted;
		}
		// bar/line için üst sınır
		return safeData.slice(0, 20);
	}, [safeData, type]);

	const bottomMargin = displayedData.length > 10 ? 130 : 80;
	const MIN_ITEM_WIDTH = 120; // Yatay görünümde daha ferah, isimler net görünsün
	const minWidth = type === 'pie' ? 1200 : Math.max(1200, displayedData.length * MIN_ITEM_WIDTH); // Pie chart için daha geniş

	// Pie chart için özel yükseklik ayarı
	const chartHeight = type === 'pie' ? Math.max(height, 600) : Math.max(height, 480);

	// Yatay genişlik ölçeği: X ekseni sıkışıklığını kullanıcı genişletebilsin
	const [widthScale, setWidthScale] = useState(1);
	const minWidthScale = 1; // minimum: mevcut minWidth
	const maxWidthScale = 6; // maksimum: 6x genişlik (daha fazla genişletme imkanı)

	// Zoom ve pan için state'ler
	const [zoomScale, setZoomScale] = useState(1);
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	
	const minScale = 0.5;
	const maxScale = 4;
	
	// Zoom fonksiyonları
	const handleZoomIn = () => {
		setZoomScale(prev => Math.min(maxScale, prev * 1.2));
		// Zoom sonrası pan'i sıfırla
		setTimeout(() => setPanOffset({ x: 0, y: 0 }), 150);
	};
	
	const handleZoomOut = () => {
		setZoomScale(prev => Math.max(minScale, prev / 1.2));
		// Zoom sonrası pan'i sıfırla
		setTimeout(() => setPanOffset({ x: 0, y: 0 }), 150);
	};
	
	const handleResetZoom = () => {
		setZoomScale(1);
		setPanOffset({ x: 0, y: 0 });
		setWidthScale(1);
	};
	
	// Mouse ile sürükleme fonksiyonları
	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button === 0) { // Sol tık
			setIsDragging(true);
			setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
		}
	};
	
	const handleMouseMove = (e: React.MouseEvent) => {
		if (isDragging) {
			const newX = e.clientX - dragStart.x;
			const newY = e.clientY - dragStart.y;
			
			// Pan sınırlarını kontrol et
			const maxPanX = Math.max(0, (scaledWidth - 480) / 2);
			const maxPanY = Math.max(0, (scaledHeight - height) / 2);
			
			setPanOffset({
				x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
				y: Math.max(-maxPanY, Math.min(maxPanY, newY))
			});
		}
	};
	
	const handleMouseUp = () => {
		setIsDragging(false);
	};

	// Genişletme tutamacı: sadece genişliği ölçekler
	const [isResizing, setIsResizing] = useState(false);
	const [resizeStartX, setResizeStartX] = useState(0);

	const handleResizeMouseDown = (e: React.MouseEvent) => {
		setIsResizing(true);
		setResizeStartX(e.clientX);
		e.stopPropagation();
	};

	const handleResizeMouseMove = (e: React.MouseEvent) => {
		if (!isResizing) return;
		const deltaX = e.clientX - resizeStartX;
		const containerBaseWidth = Math.max(minWidth, 480) * zoomScale;
		const nextScale = containerBaseWidth > 0 ? (containerBaseWidth + deltaX) / containerBaseWidth : 1;
		const clamped = Math.min(maxWidthScale, Math.max(minWidthScale, Number(nextScale.toFixed(3))));
		setWidthScale(clamped);
	};

	const handleResizeMouseUp = () => {
		setIsResizing(false);
	};
	
	// Mouse wheel ile zoom (sayfa kaymasını engellemeden)
	const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
		if (e.ctrlKey || e.metaKey) { // Ctrl/Cmd + wheel ile zoom
			e.preventDefault();
			const delta = e.deltaY;
			setZoomScale(prev => {
				const next = delta < 0 ? prev * 1.1 : prev / 1.1;
				return Math.min(maxScale, Math.max(minScale, Number(next.toFixed(3))));
			});
			// Zoom sonrası pan'i sıfırla
			setTimeout(() => setPanOffset({ x: 0, y: 0 }), 150);
		}
	}, []);

	const scaledWidth = Math.max(minWidth, 600) * zoomScale * widthScale; // Minimum genişliği artırdım
	const scaledHeight = chartHeight * zoomScale; // Pie chart için özel yükseklik
	const formatLabel = (value: string) => (value ?? '');
	
	// Daha iyi görünürlük için renk ayarları
	const labelColor = '#1F2937'; // Koyu gri
	const gridColor = 'rgba(229, 231, 235, 0.2)'; // Daha şeffaf açık gri
	const axisColor = '#1F2937'; // Daha koyu gri

	// X ekseni için özel tick: etiketi -60° eğik ve çubuğun altına hizalı
	const CustomTick = (props: any) => {
		const { x, y, payload } = props || {};
		const label = String(payload?.value ?? '');
		return (
			<g transform={`translate(${x},${y})`}>
				<text
					transform="rotate(-60)"
					x={0}
					y={0}
					dx={-6}
					dy={10}
					textAnchor="end"
					fill={axisColor}
					fontSize={12}
					fontWeight={600}
					fontFamily="Arial, Helvetica, sans-serif"					dominantBaseline="middle"
					style={{ 
						pointerEvents: 'none',
						textRendering: 'optimizeLegibility',
						fontFeatureSettings: '"liga" 1, "kern" 1',
						userSelect: 'none'
					}}
				>
					<title>{label}</title>
					{label}
				</text>
			</g>
		);
	};

	// Tooltip için özel stil
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
					<p className="text-gray-800 font-medium">{`${label}`}</p>
					{payload.map((entry: any, index: number) => (
						<p key={index} className="text-blue-600 font-semibold" style={{ color: entry.color }}>
							{`${entry.name}: ${entry.value}`}
						</p>
					))}
				</div>
			);
		}
		return null;
	};

	// Zoom ile Y ekseni hassasiyetini artırmak için yardımcılar
	const generateTicks = (minValue: number, maxValue: number, scale: number) => {
		if (!isFinite(minValue) || !isFinite(maxValue)) return undefined as undefined | number[];
		const range = maxValue - minValue || Math.abs(maxValue) || 1;
		const baseCount = 6;
		const count = Math.min(20, Math.max(4, Math.round(baseCount * scale)));
		const step = range / count;
		const decimals = step < 1 ? 2 : step < 5 ? 1 : 0;
		const nice = (n: number) => Number(n.toFixed(decimals));
		const start = Math.floor(minValue / step) * step;
		const end = Math.ceil(maxValue / step) * step;
		const ticks: number[] = [];
		for (let v = start; v <= end + step / 2; v += step) ticks.push(nice(v));
		return ticks;
	};

	const yRange = useMemo(() => {
		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		if (type === 'bar' || type === 'line') {
			(safeData as any[]).forEach((d: any) => {
				const val = Number(d?.value ?? 0);
				if (!Number.isNaN(val)) { min = Math.min(min, val); max = Math.max(max, val); }
			});
		} else if (type === 'multi-line' || type === 'grouped-bar') {
			const keys = seriesKeys && seriesKeys.length > 0 ? seriesKeys : Object.keys((safeData[0] as any) || {}).filter(k => k !== 'label');
			(safeData as any[]).forEach((row: any) => {
				keys.forEach((k: string) => {
					const val = Number(row[k]);
					if (!Number.isNaN(val)) { min = Math.min(min, val); max = Math.max(max, val); }
				});
			});
		}
		if (!isFinite(min) || !isFinite(max)) return undefined as undefined | [number, number];
		return [min, max] as [number, number];
	}, [safeData, type, seriesKeys]);

	const yTicks = useMemo(() => {
		if (!yRange) return undefined as undefined | number[];
		const [min, max] = yRange;
		return generateTicks(min, max, zoomScale);
	}, [yRange, zoomScale]);

	// Tek veri/sabit seri durumunda Y eksenini görünür tutmak için güvenli domain hesapla
	const yAxisProps = useMemo(() => {
		if (!yRange) return {} as Record<string, any>;
		const [min, max] = yRange;
		if (min === max) {
			const upper = Math.max(1, Math.ceil(max * 1.2));
			const lower = Math.min(0, Math.floor(min * 0.8));
			return { domain: [lower, upper], allowDecimals: false } as Record<string, any>;
		}
		if (yTicks && yTicks.length >= 2) {
			return { ticks: yTicks, domain: [yTicks[0], yTicks[yTicks.length - 1]] } as Record<string, any>;
		}
		return {} as Record<string, any>;
	}, [yRange, yTicks]);

	const CustomLegend = (props: any) => {
		const { payload } = props || {};
		return (
			<div className={`grid gap-2 max-h-40 overflow-y-auto pr-2 text-xs ${
				type === 'pie' ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8' : 'grid-cols-2 md:grid-cols-3'
			}`}>
				{(payload || []).map((entry: any, idx: number) => (
					<div key={idx} className="flex items-center gap-2">
						<span className="inline-block w-3 h-3 rounded-sm" style={{ background: entry.color }} />
						<span className="truncate text-gray-800 font-medium" title={entry.value}>{formatLabel(entry.value)}</span>
					</div>
				))}
			</div>
		);
	};

	const handleOpenEditor = () => {
		if (isEditMode) setIsEditorOpen(true);
	};

	const handleCloseEditor = () => {
		setIsEditorOpen(false);
	};

	const handleSave = () => {
		if (onSave) {
			try {
				// Tüm düzenlenen alanları onSave'e gönder
				const updatedConfig = {
					...editConfig, // Mevcut konfigürasyonu koru
					...localEditConfig, // Düzenlenen alanları üzerine yaz
					// Özel alanları manuel olarak ayarla
					name: localEditConfig.name || editConfig?.name || '',
					chart_type: localEditConfig.chart_type || editConfig?.chart_type || type,
					x_axis: localEditConfig.x_axis || editConfig?.x_axis || '',
					y_axis: localEditConfig.y_axis || editConfig?.y_axis || '',
					aggregation: localEditConfig.aggregation || editConfig?.aggregation || 'sum',
					group_by: localEditConfig.group_by || editConfig?.group_by || '',
					sort_by: localEditConfig.sort_by || editConfig?.sort_by || 'desc',
					height: localEditConfig.height || editConfig?.height || height,
					distinctColumn: localEditConfig.distinctColumn || editConfig?.distinctColumn || ''
				};
				
				console.log('Grafik konfigürasyonu güncelleniyor:', updatedConfig);
				console.log('🔍 Distinct kolon:', localEditConfig.distinctColumn);
				console.log('🔍 EditConfig distinct kolon:', editConfig?.distinctColumn);
				onSave(updatedConfig);
				setIsEditorOpen(false);
			} catch (error) {
				console.error('Grafik kaydetme hatası:', error);
				const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
				alert('Grafik kaydedilirken hata oluştu: ' + errorMessage);
			}
		}
	};

	const handleCancel = () => {
		setLocalEditConfig(editConfig || {});
		setIsEditorOpen(false);
		if (onCancel) onCancel();
	};

	// Edit form render
	const renderEditForm = () => (
		<div className="p-5 h-full flex flex-col">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-800">Grafik Ayarlarını Düzenle</h3>
				<button
					onClick={handleCancel}
					className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<X className="h-5 w-5" />
				</button>
			</div>

			{/* Form içeriği - kendi içinde kaydırılabilir */}
			<div className="flex-1 space-y-4 overflow-y-auto pr-2">
				{/* Grafik Adı */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Grafik Adı *</label>
					<input
						type="text"
						value={localEditConfig.name || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, name: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
						placeholder="Grafik için açıklayıcı bir isim girin"
					/>
				</div>

				{/* Grafik Türü */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Grafik Türü *</label>
					<select
						value={localEditConfig.chart_type || type}
						onChange={(e) => setLocalEditConfig({...localEditConfig, chart_type: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
						<option value="bar">Bar Grafik (Sütun)</option>
						<option value="line">Çizgi Grafik (Trend)</option>
						<option value="pie">Pasta Grafik (Dağılım)</option>
						<option value="area">Alan Grafik (Dolgu)</option>
						<option value="scatter">Dağılım Grafik (Korelasyon)</option>
						<option value="multi-line">Çoklu Seri Çizgi Grafik</option>
					</select>
				</div>

				{/* X Ekseni */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">X Ekseni (Kategori/Tarih) *</label>
					<select
						value={localEditConfig.x_axis || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, x_axis: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
						<option value="">Kategori veya tarih kolonu seçin</option>
						{analyzeData?.categoricalColumns?.map((col: string) => (
							<option key={col} value={col}>{col}</option>
						))}
						{analyzeData?.dateColumns?.map((col: string) => (
							<option key={col} value={col}>{col} (Tarih)</option>
						))}
					</select>
				</div>

				{/* Y Ekseni */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Y Ekseni (Sayısal Değer) *</label>
					<select
						value={localEditConfig.y_axis || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, y_axis: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
						<option value="">Sayısal değer kolonu seçin</option>
						{analyzeData?.numericColumns?.map((col: string) => (
							<option key={col} value={col}>{col}</option>
						))}
					</select>
				</div>

				{/* Toplama Yöntemi */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Toplama Yöntemi *</label>
					<select
						value={localEditConfig.aggregation || 'sum'}
						onChange={(e) => setLocalEditConfig({
							...localEditConfig, 
							aggregation: e.target.value as 'sum' | 'count' | 'count_nonzero' | 'average' | 'min' | 'max' | 'distinct',
							// Distinct seçilirse distinctColumn'u temizle
							distinctColumn: e.target.value === 'distinct' ? '' : localEditConfig.distinctColumn
						})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
						<option value="sum">Toplam (Değerleri topla)</option>
						<option value="count">Sayı (Kayıt sayısı)</option>
						<option value="count_nonzero">Sıfırdan Farklı Say (count_nonzero)</option>
						<option value="average">Ortalama (Değerlerin ortalaması)</option>
						<option value="min">Minimum (En düşük değer)</option>
						<option value="max">Maksimum (En yüksek değer)</option>
						<option value="distinct">Benzersiz Sayı (Distinct)</option>
					</select>
				</div>

				{/* Gruplama */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Gruplama Kolonu</label>
					<select
						value={localEditConfig.group_by || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, group_by: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
						<option value="">Boş bırakılırsa X ekseni kullanılır</option>
						{analyzeData?.categoricalColumns?.map((col: string) => (
							<option key={col} value={col}>{col}</option>
						))}
					</select>
					<p className="text-xs text-gray-500 mt-1">Verileri gruplamak için kullanılacak kolon</p>
				</div>

				{/* Distinct Kolon Seçimi - sadece distinct seçildiğinde göster */}
				{localEditConfig.aggregation === 'distinct' && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Distinct Yapılacak Kolon *</label>
						<select
							value={localEditConfig.distinctColumn || ''}
							onChange={(e) => setLocalEditConfig({...localEditConfig, distinctColumn: e.target.value})}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
						>
							<option value="">Kolon Seçin</option>
							{analyzeData?.categoricalColumns?.map((col: string) => (
								<option key={col} value={col}>{col}</option>
							))}
							{analyzeData?.numericColumns?.map((col: string) => (
								<option key={col} value={col}>{col}</option>
							))}
						</select>
						<p className="text-xs text-gray-500 mt-1">Benzersiz değerleri saymak için kullanılacak kolon</p>
					</div>
				)}

				{/* Sıralama */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Sıralama *</label>
					<select
						value={localEditConfig.sort_by || 'desc'}
						onChange={(e) => setLocalEditConfig({...localEditConfig, sort_by: e.target.value as 'asc' | 'desc'})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
						<option value="desc">Azalan (Büyükten Küçüğe)</option>
						<option value="asc">Artan (Küçükten Büyüğe)</option>
					</select>
				</div>

				{/* Yükseklik */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Grafik Yüksekliği</label>
					<input
						type="number"
						value={localEditConfig.height || height}
						onChange={(e) => setLocalEditConfig({...localEditConfig, height: parseInt(e.target.value)})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
						min="200"
						max="800"
						step="20"
					/>
					<p className="text-xs text-gray-500 mt-1">Piksel cinsinden grafik yüksekliği</p>
				</div>
			</div>
			
			{/* Bilgi Notu */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
				<div className="flex items-start gap-2">
					<div className="text-blue-600 mt-0.5">
						<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
						</svg>
					</div>
					<div className="text-sm text-blue-800">
						<p className="font-medium">Grafik Ayarları</p>
						<p className="text-xs mt-1">
							* işaretli alanlar zorunludur. Değişiklikler kaydedildikten sonra grafik otomatik olarak güncellenecektir.
						</p>
					</div>
				</div>
			</div>

			{/* Alt aksiyon çubuğu - her zaman görünür */}
			<div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white mt-4">
				<button
					onClick={handleSave}
					className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
				>
					<Save className="h-4 w-4" />
					Kaydet
				</button>
				<button
					onClick={handleCancel}
					className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					İptal
				</button>
			</div>
		</div>
	);

	// Chart render
	const renderChart = () => (
		<>
			{title && (
				<h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
			)}
			<div 
				className="overflow-visible group relative" 
				onWheel={handleWheel}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				onMouseMoveCapture={handleResizeMouseMove}
				onMouseUpCapture={handleResizeMouseUp}
				style={{ 
					overscrollBehavior: 'contain',
					cursor: isDragging ? 'grabbing' : 'grab'
				}}
			>
				{/* Ölçekli kapsayıcı: genişlik ve yükseklik zoom ile orantılı büyütülür */}
				<div style={{ 
					width: scaledWidth, 
					height: scaledHeight, 
					transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
					transition: isDragging ? 'none' : 'width 150ms ease-out, height 150ms ease-out',
					transformOrigin: 'center'
				}}>
					{type === 'pie' ? (
						<div style={{ 
							width: '100%', 
							height: '100%', 
							display: 'flex', 
							flexDirection: 'column',
							alignItems: 'center', 
							justifyContent: 'space-between',
							padding: '20px'
						}}>
							<div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
										<Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 10000 }} />
										<Pie 
											data={displayedData} 
											dataKey="value" 
											nameKey="label" 
											cx="50%" 
											cy="50%" 
											innerRadius="20%" 
											outerRadius="85%" 
											paddingAngle={2} 
											labelLine={{ stroke: axisColor, strokeWidth: 1.5 }}
											label={({ percent, name, value }) => `${name}: ${value} (${Math.round((percent || 0) * 100)}%)`}
										>
											{displayedData.map((_, index) => (
												<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
											))}
										</Pie>
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div style={{ width: '100%', marginTop: '20px' }}>
								<CustomLegend payload={displayedData.map((item, index) => ({
									value: item.label,
									color: COLORS[index % COLORS.length]
								}))} />
							</div>
						</div>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							{type === 'bar' ? (
								<BarChart data={displayedData} margin={{ top: 10, right: 30, left: 20, bottom: bottomMargin }} barCategoryGap={"20%"} barGap={2}>
									<CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeWidth={0.5} />
									<XAxis 
										dataKey="label" 
										interval={0} 
										height={bottomMargin} 
										angle={-60}
										tick={{ fill: axisColor, fontSize: 12, fontWeight: 600, textAnchor: 'end' }}
										tickFormatter={formatLabel}
										axisLine={{ stroke: axisColor }}
										tickMargin={20}
										dy={10}
										dx={-6}
									/>
									<YAxis 
										tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }} 
										axisLine={{ stroke: axisColor }} 
										tickMargin={10} 
										allowDecimals 
										{...yAxisProps} 
									/>
									<Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ zIndex: 10000 }} />
									<Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
								</BarChart>
							) : type === 'line' ? (
								<LineChart data={displayedData} margin={{ top: 10, right: 30, left: 20, bottom: bottomMargin }}>
									<CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeWidth={0.5} />
									<XAxis 
										dataKey="label" 
										interval={0} 
										height={bottomMargin} 
										angle={-60}
										tick={{ fill: axisColor, fontSize: 12, fontWeight: 600, textAnchor: 'end' }}
										tickFormatter={formatLabel}
										axisLine={{ stroke: axisColor }}
										tickMargin={20}
										dy={10}
										dx={-6}
									/>
									<YAxis 
										tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }} 
										axisLine={{ stroke: axisColor }} 
										tickMargin={10} 
										allowDecimals 
										{...yAxisProps} 
									/>
									<Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ zIndex: 10000 }} />
									<Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} />
								</LineChart>
							) : (
								<ComposedChart data={safeData} margin={{ top: 10, right: 30, left: 20, bottom: bottomMargin }}>
									<CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeWidth={0.5} />
									<XAxis 
										dataKey="label" 
										interval={0} 
										height={bottomMargin} 
										angle={-60}
										tick={{ fill: axisColor, fontSize: 12, fontWeight: 600, textAnchor: 'end' }}
										tickFormatter={formatLabel}
										axisLine={{ stroke: axisColor }}
										tickMargin={20}
										dy={10}
										dx={-6}
									/>
									<YAxis 
										tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }} 
										axisLine={{ stroke: axisColor }} 
										tickMargin={10} 
										allowDecimals 
										{...yAxisProps} 
									/>
									<Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ zIndex: 10000 }} />
									<Legend content={<CustomLegend />} />
									{seriesKeys?.map((key, index) => (
										<Line 
											key={key}
											type="monotone" 
											dataKey={key} 
											stroke={COLORS[index % COLORS.length]} 
											strokeWidth={3} 
											dot={{ r: 4, fill: COLORS[index % COLORS.length] }} 
										/>
									))}
								</ComposedChart>
							)}
						</ResponsiveContainer>
					)}
				</div>
				{/* Yatay genişletme tutamacı - sadece bar/line grafikler için */}
				{type !== 'pie' && (
					<div 
						onMouseDown={handleResizeMouseDown}
						className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-4 rounded-full bg-gray-300 hover:bg-gray-400 cursor-ew-resize shadow-sm flex items-center justify-center"
						title="X eksenini genişletmek için sürükleyin"
					>
						<div className="w-16 h-1 bg-gray-500 rounded-full"></div>
					</div>
				)}
				{/* Zoom kontrolleri */}
				<div className="absolute right-3 bottom-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					{/* Zoom göstergesi */}
					<span className="text-xs bg-gray-800 text-white px-2 py-1 rounded-md font-medium text-center min-w-[3rem]">
						{Math.round(zoomScale * 100)}%
					</span>
					
					{/* Zoom butonları */}
					<div className="flex flex-col gap-1">
						<button
							onClick={handleZoomIn}
							className="w-8 h-8 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center text-sm font-bold shadow-lg"
							title="Yakınlaştır"
						>
							+
						</button>
						<button
							onClick={handleZoomOut}
							className="w-8 h-8 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center text-sm font-bold shadow-lg"
							title="Uzaklaştır"
						>
							−
						</button>
						<button
							onClick={handleResetZoom}
							className="w-8 h-8 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors flex items-center justify-center text-xs font-medium shadow-lg"
							title="Sıfırla"
						>
							⟲
						</button>
					</div>
				</div>
			</div>
			
			{/* Action buttons */}
			{isEditMode && (
				<div className="absolute top-3 right-3 flex gap-2">
					<button
						onClick={handleOpenEditor}
						className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
						title="Grafiği Düzenle"
					>
						<Edit className="h-4 w-4" />
					</button>
					{onDelete && (
						<button
							onClick={() => {
								if (confirm(`"${editConfig?.name || 'Bu grafik'}" grafiğini silmek istediğinizden emin misiniz?`)) {
									onDelete(editConfig);
								}
							}}
							className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
							title="Grafiği Sil"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					)}
				</div>
			)}
		</>
	);

	return (
		<div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden relative`}>
			{/* Card flip container */}
			<div 
				className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
					isFlipped ? 'rotate-y-180' : ''
				}`}
				style={{ 
					transformStyle: 'preserve-3d',
					transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
				}}
			>
				{/* Content area: chart or inline editor panel */}
				<div className="w-full h-full">
					{!isEditorOpen ? (
						renderChart()
					) : (
						<div className="min-h-[520px] h-full overflow-hidden">
							<div className="p-4 border-b flex items-center justify-between">
								<h3 className="text-lg font-semibold text-gray-800">Grafik Ayarlarını Düzenle</h3>
								<button onClick={handleCloseEditor} className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
									<X className="h-5 w-5" />
								</button>
							</div>
							<div className="p-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
								{renderEditForm()}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}


