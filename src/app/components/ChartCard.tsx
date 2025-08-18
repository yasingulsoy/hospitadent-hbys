'use client';

import React from 'react';
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
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export default function ChartCard({ type, data, title, height = 480 }: ChartCardProps) {
	const safeData = Array.isArray(data) ? data : [];

	return (
		<div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
			{title && (
				<h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
			)}
			<div style={{ width: '100%', height }}>
				<ResponsiveContainer>
					{type === 'bar' ? (
						<BarChart data={safeData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="label" angle={-45} textAnchor="end" interval={0} height={60} tick={{ fontSize: 12 }} />
							<YAxis />
							<Tooltip />
							<Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
						</BarChart>
					) : type === 'line' ? (
						<LineChart data={safeData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="label" angle={-45} textAnchor="end" interval={0} height={60} tick={{ fontSize: 12 }} />
							<YAxis />
							<Tooltip />
							<Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ r: 3 }} />
						</LineChart>
					) : (
						<PieChart>
							<Tooltip />
							<Legend />
							<Pie data={safeData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} fill="#3B82F6" label>
								{safeData.map((_, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
						</PieChart>
					)}
				</ResponsiveContainer>
			</div>
		</div>
	);
}


