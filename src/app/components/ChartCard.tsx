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
} from 'recharts';
import { Edit, X, Save, RotateCcw, Trash2 } from 'lucide-react';

type ChartType = 'bar' | 'line' | 'pie';

export interface ChartDatum {
	label: string;
	value: number;
	count?: number;
}

interface ChartCardProps {
	type: ChartType;
	data: ChartDatum[];
	title?: string;
	height?: number;
	onEdit?: (config: any) => void;
	onSave?: (config: any) => void;
	onCancel?: () => void;
	onDelete?: (config: any) => void;
	editConfig?: any;
	isEditMode?: boolean;
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
	isEditMode = false
}: ChartCardProps) {
	const safeData = Array.isArray(data) ? data : [];
	const [isFlipped, setIsFlipped] = useState(false);
	const [localEditConfig, setLocalEditConfig] = useState(editConfig || {});

	// editConfig değiştiğinde localEditConfig'i güncelle
	useEffect(() => {
		if (editConfig) {
			setLocalEditConfig(editConfig);
		}
	}, [editConfig]);

	// Görsellik için veri sınırlandırma ve efsane (legend) yoğunluğunu azaltma
	const displayedData = useMemo(() => {
		if (type === 'pie') {
			const sorted = [...safeData].sort((a, b) => b.value - a.value);
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

	const bottomMargin = displayedData.length > 10 ? 90 : 50;
	const MIN_ITEM_WIDTH = 88; // yatay görünümde daha ferah
	const minWidth = type === 'pie' ? 720 : Math.max(960, displayedData.length * MIN_ITEM_WIDTH);

	// Scroll ile zoom/kaydırma için ölçek durumları
	const [zoomScale, setZoomScale] = useState(1);
	const minScale = 0.6;
	const maxScale = 3;
	const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
		// Chart üzerinde scroll yaparken sayfa kaymasını engelle
		e.preventDefault();
		const delta = e.deltaY;
		setZoomScale(prev => {
			const next = delta < 0 ? prev * 1.08 : prev / 1.08; // yumuşak zoom
			return Math.min(maxScale, Math.max(minScale, Number(next.toFixed(3))));
		});
	}, []);

	const scaledWidth = Math.max(minWidth, 480) * zoomScale;
	const scaledHeight = height * zoomScale;
	const formatLabel = (value: string) => (value?.length > 14 ? `${value.slice(0, 14)}…` : value);
	
	// Daha iyi görünürlük için renk ayarları
	const labelColor = '#1F2937'; // Koyu gri
	const gridColor = '#E5E7EB'; // Açık gri
	const axisColor = '#374151'; // Orta gri

	// Tooltip için özel stil
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
					<p className="text-gray-800 font-medium">{`${label}`}</p>
					<p className="text-blue-600 font-semibold">
						{`Değer: ${payload[0].value}`}
					</p>
				</div>
			);
		}
		return null;
	};

	const CustomLegend = (props: any) => {
		const { payload } = props || {};
		return (
			<div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2 text-xs">
				{(payload || []).map((entry: any, idx: number) => (
					<div key={idx} className="flex items-center gap-2">
						<span className="inline-block w-3 h-3 rounded-sm" style={{ background: entry.color }} />
						<span className="truncate text-gray-800 font-medium" title={entry.value}>{formatLabel(entry.value)}</span>
					</div>
				))}
			</div>
		);
	};

	const handleFlip = () => {
		if (isEditMode) {
			setIsFlipped(!isFlipped);
		}
	};

	const handleSave = () => {
		if (onSave) {
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
				height: localEditConfig.height || editConfig?.height || height
			};
			onSave(updatedConfig);
			setIsFlipped(false);
		}
	};

	const handleCancel = () => {
		setLocalEditConfig(editConfig || {});
		setIsFlipped(false);
		if (onCancel) onCancel();
	};

	// Edit form render
	const renderEditForm = () => (
		<div className="p-5 h-full flex flex-col min-h-[700px]">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-800">Grafik Ayarlarını Düzenle</h3>
				<button
					onClick={handleCancel}
					className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<X className="h-5 w-5" />
				</button>
			</div>
			
			<div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[500px]">
				{/* Grafik Adı */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Grafik Adı *</label>
					<input
						type="text"
						value={localEditConfig.name || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, name: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Grafik için açıklayıcı bir isim girin"
					/>
				</div>

				{/* Grafik Türü */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Grafik Türü *</label>
					<select
						value={localEditConfig.chart_type || type}
						onChange={(e) => setLocalEditConfig({...localEditConfig, chart_type: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="bar">Bar Grafik (Sütun)</option>
						<option value="line">Çizgi Grafik (Trend)</option>
						<option value="pie">Pasta Grafik (Dağılım)</option>
						<option value="area">Alan Grafik (Dolgu)</option>
						<option value="scatter">Dağılım Grafik (Korelasyon)</option>
					</select>
				</div>

				{/* X Ekseni */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">X Ekseni (Kategori/Tarih) *</label>
					<input
						type="text"
						value={localEditConfig.x_axis || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, x_axis: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Kategori veya tarih kolonu adı"
					/>
				</div>

				{/* Y Ekseni */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Y Ekseni (Sayısal Değer) *</label>
					<input
						type="text"
						value={localEditConfig.y_axis || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, y_axis: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Sayısal değer kolonu adı"
					/>
				</div>

				{/* Toplama Yöntemi */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Toplama Yöntemi *</label>
					<select
						value={localEditConfig.aggregation || 'sum'}
						onChange={(e) => setLocalEditConfig({...localEditConfig, aggregation: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="sum">Toplam (Değerleri topla)</option>
						<option value="count">Sayı (Kayıt sayısı)</option>
						<option value="average">Ortalama (Değerlerin ortalaması)</option>
						<option value="min">Minimum (En düşük değer)</option>
						<option value="max">Maksimum (En yüksek değer)</option>
					</select>
				</div>

				{/* Gruplama */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Gruplama Kolonu</label>
					<input
						type="text"
						value={localEditConfig.group_by || ''}
						onChange={(e) => setLocalEditConfig({...localEditConfig, group_by: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Boş bırakılırsa X ekseni kullanılır"
					/>
					<p className="text-xs text-gray-500 mt-1">Verileri gruplamak için kullanılacak kolon</p>
				</div>

				{/* Sıralama */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Sıralama *</label>
					<select
						value={localEditConfig.sort_by || 'desc'}
						onChange={(e) => setLocalEditConfig({...localEditConfig, sort_by: e.target.value})}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

			<div className="flex gap-3 pt-4 border-t border-gray-200">
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
			<div className="overflow-auto group relative" onWheel={handleWheel} style={{ overscrollBehavior: 'contain' }}>
				{/* Ölçekli kapsayıcı: genişlik ve yükseklik zoom ile orantılı büyütülür */}
				<div style={{ width: scaledWidth, height: scaledHeight, transition: 'width 150ms ease-out, height 150ms ease-out' }}>
					<ResponsiveContainer>
						{type === 'bar' ? (
							<BarChart data={displayedData} margin={{ top: 10, right: 20, left: 10, bottom: bottomMargin }} barCategoryGap={"25%"}>
								<CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
								<XAxis 
									dataKey="label" 
									angle={-30} 
									textAnchor="end" 
									interval={0} 
									height={bottomMargin} 
									tick={{ fontSize: 12, fill: axisColor, fontWeight: 500 }} 
									tickFormatter={formatLabel}
									axisLine={{ stroke: axisColor }}
								/>
								<YAxis 
									tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }} 
									axisLine={{ stroke: axisColor }}
								/>
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
							</BarChart>
						) : type === 'line' ? (
							<LineChart data={displayedData} margin={{ top: 10, right: 20, left: 10, bottom: bottomMargin }}>
								<CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
								<XAxis 
									dataKey="label" 
									angle={-30} 
									textAnchor="end" 
									interval={0} 
									height={bottomMargin} 
									tick={{ fontSize: 12, fill: axisColor, fontWeight: 500 }} 
									tickFormatter={formatLabel}
									axisLine={{ stroke: axisColor }}
								/>
								<YAxis 
									tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }} 
									axisLine={{ stroke: axisColor }}
								/>
								<Tooltip content={<CustomTooltip />} />
								<Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ r: 3, fill: '#3B82F6' }} />
							</LineChart>
						) : (
							<PieChart>
								<Tooltip content={<CustomTooltip />} />
								<Legend content={<CustomLegend />} />
								<Pie 
									data={displayedData} 
									dataKey="value" 
									nameKey="label" 
									cx="50%" 
									cy="45%" 
									innerRadius={60} 
									outerRadius={100} 
									paddingAngle={2} 
									labelLine={{ stroke: axisColor, strokeWidth: 1 }}
									label={({ percent, name }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
								>
									{displayedData.map((_, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
									))}
								</Pie>
							</PieChart>
						)}
					</ResponsiveContainer>
				</div>
				{/* Zoom göstergesi */}
				<div className="absolute right-3 bottom-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
					<span className="text-xs bg-gray-800 text-white px-2 py-1 rounded-md font-medium">{Math.round(zoomScale * 100)}%</span>
				</div>
			</div>
			
			{/* Action buttons - only show when in edit mode */}
			{isEditMode && (
				<div className="absolute top-3 right-3 flex gap-2">
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
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden relative">
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
				{/* Front side - Chart */}
				<div className="w-full h-full backface-hidden">
					{renderChart()}
				</div>
				
				{/* Back side - Edit form */}
				<div 
					className="absolute inset-0 w-full h-full backface-hidden"
					style={{ transform: 'rotateY(180deg)' }}
				>
					{renderEditForm()}
				</div>
			</div>
		</div>
	);
}


