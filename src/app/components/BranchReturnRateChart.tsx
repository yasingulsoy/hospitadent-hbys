'use client';

import React, { useState, useEffect } from 'react';
import { Building2, TrendingUp, Calendar } from 'lucide-react';
import ChartCard, { MultiSeriesDatum } from './ChartCard';
import { apiGet } from '../../lib/api';

interface BranchReturnRateData {
	plan_date: number;
	branch_name: string;
	donus_orani: number;
	muayene_sayisi: number;
	odeme_yapan_hasta_sayisi: number;
	clinic_id: number;
}

interface Branch {
	id: number;
	name: string;
	code: string;
}

export default function BranchReturnRateChart() {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranch, setSelectedBranch] = useState<string>('');
	const [chartData, setChartData] = useState<MultiSeriesDatum[]>([]);
	const [loading, setLoading] = useState(false);
	const [availableYears, setAvailableYears] = useState<number[]>([]);

	// Şubeleri yükle
	useEffect(() => {
		const loadBranches = async () => {
			try {
				const response = await apiGet('/branches');
				if (response.success) {
					setBranches(response.data);
				}
			} catch (error) {
				console.error('Şubeler yüklenirken hata:', error);
			}
		};
		loadBranches();
	}, []);

	// Örnek veri - gerçek uygulamada API'den gelecek
	const mockData: BranchReturnRateData[] = [
		{ plan_date: 2017, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 420.00, muayene_sayisi: 195, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2018, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 18.42, muayene_sayisi: 1140, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2019, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 10.29, muayene_sayisi: 1762, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2020, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 12.28, muayene_sayisi: 79, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2021, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 16.03, muayene_sayisi: 5, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2022, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 43.75, muayene_sayisi: 114, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2023, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 65.63, muayene_sayisi: 204, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2024, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 42.00, muayene_sayisi: 171, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
		{ plan_date: 2025, branch_name: 'Ağız, Diş, Çene Hastalıkları ve Cerrahisi', donus_orani: 161.54, muayene_sayisi: 131, odeme_yapan_hasta_sayisi: 21, clinic_id: 1 },
	];

	// Mevcut yılları al
	useEffect(() => {
		const years = [...new Set(mockData.map(item => item.plan_date))].sort((a, b) => a - b);
		setAvailableYears(years);
	}, []);

	// Branch seçimi değiştiğinde grafik verisini güncelle
	useEffect(() => {
		if (selectedBranch) {
			generateChartData(selectedBranch);
		}
	}, [selectedBranch]);

	// Grafik verisi oluştur
	const generateChartData = (branchName: string) => {
		setLoading(true);
		
		try {
			// Seçilen branch için verileri filtrele
			const branchData = mockData.filter(item => item.branch_name === branchName);
			
			// Yıllara göre dönüş oranı verisi oluştur
			const chartData: MultiSeriesDatum[] = branchData.map(item => ({
				label: item.plan_date.toString(),
				dönüş_oranı: item.donus_orani,
				muayene_sayısı: item.muayene_sayisi,
				ödeme_yapan_hasta: item.odeme_yapan_hasta_sayisi
			}));

			setChartData(chartData);
		} catch (error) {
			console.error('Grafik verisi oluşturulurken hata:', error);
		} finally {
			setLoading(false);
		}
	};

	// Tüm branch'ler için genel trend grafiği
	const generateGeneralTrendData = () => {
		const generalData: MultiSeriesDatum[] = availableYears.map(year => {
			const yearData = mockData.filter(item => item.plan_date === year);
			const avgReturnRate = yearData.length > 0 
				? yearData.reduce((sum, item) => sum + item.donus_orani, 0) / yearData.length 
				: 0;
			
			return {
				label: year.toString(),
				ortalama_dönüş_oranı: Math.round(avgReturnRate * 100) / 100
			};
		});

		setChartData(generalData);
		setSelectedBranch('');
	};

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-blue-100 rounded-lg">
						<TrendingUp className="h-6 w-6 text-blue-600" />
					</div>
					<div>
						<h3 className="text-xl font-semibold text-gray-900">Şube Dönüş Oranı Trendi</h3>
						<p className="text-sm text-gray-600">Yıllara göre şube performans analizi</p>
					</div>
				</div>
			</div>

			{/* Kontroller */}
			<div className="flex flex-wrap gap-4 mb-6">
				{/* Branch Seçimi */}
				<div className="flex-1 min-w-[300px]">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						<Building2 className="h-4 w-4 inline mr-2" />
						Şube Seçin
					</label>
					<select
						value={selectedBranch}
						onChange={(e) => setSelectedBranch(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="">Şube seçin...</option>
						{branches.map((branch) => (
							<option key={branch.id} value={branch.name}>
								{branch.name}
							</option>
						))}
					</select>
				</div>

				{/* Genel Trend Butonu */}
				<div className="flex items-end">
					<button
						onClick={generateGeneralTrendData}
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
					>
						<TrendingUp className="h-4 w-4" />
						Genel Trend
					</button>
				</div>

				{/* Mevcut Yıllar Bilgisi */}
				<div className="flex items-end">
					<div className="text-sm text-gray-600">
						<Calendar className="h-4 w-4 inline mr-1" />
						Mevcut Yıllar: {availableYears.join(', ')}
					</div>
				</div>
			</div>

			{/* Grafik */}
			{loading ? (
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			) : chartData.length > 0 ? (
				<ChartCard
					type="multi-line"
					data={chartData}
					title={selectedBranch ? `${selectedBranch} - Yıllara Göre Dönüş Oranı` : 'Genel Dönüş Oranı Trendi'}
					height={400}
					seriesKeys={selectedBranch ? ['dönüş_oranı', 'muayene_sayısı', 'ödeme_yapan_hasta'] : ['ortalama_dönüş_oranı']}
				/>
			) : (
				<div className="flex items-center justify-center h-64 text-gray-500">
					<div className="text-center">
						<TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
						<p>Grafik verisi görüntülemek için bir şube seçin</p>
					</div>
				</div>
			)}

			{/* Veri Tablosu */}
			{chartData.length > 0 && (
				<div className="mt-6">
					<h4 className="text-lg font-medium text-gray-900 mb-3">Veri Detayları</h4>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Yıl
									</th>
									{selectedBranch && (
										<>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Dönüş Oranı (%)
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Muayene Sayısı
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Ödeme Yapan Hasta
											</th>
										</>
									)}
									{!selectedBranch && (
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Ortalama Dönüş Oranı (%)
										</th>
									)}
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{chartData.map((item, index) => (
									<tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{item.label}
										</td>
										{selectedBranch ? (
											<>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.dönüş_oranı}%
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.muayene_sayısı}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.ödeme_yapan_hasta}
												</td>
											</>
										) : (
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{item.ortalama_dönüş_oranı}%
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
