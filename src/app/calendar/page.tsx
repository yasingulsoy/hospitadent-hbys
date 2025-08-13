'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  User, 
  Phone, 
  Stethoscope, 
  Building2, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  duration: number;
  doctorName: string;
  branchName: string;
  notes: string;
  treatmentNotes: string;
  status: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [viewMode, setViewMode] = useState('day');

  // Mock randevu verileri
  const mockAppointments: Appointment[] = [
    {
      id: '1',
      patientName: 'Mehmet Demir',
      patientPhone: '0555 123 4567',
      date: '2024-01-15',
      time: '09:00',
      duration: 60,
      doctorName: 'Dr. Ayşe Kaya',
      branchName: 'İstanbul Kadıköy',
      notes: 'Kontrol randevusu',
      treatmentNotes: 'Diş temizliği gerekli',
      status: 'confirmed'
    },
    {
      id: '2',
      patientName: 'Fatma Özkan',
      patientPhone: '0555 987 6543',
      date: '2024-01-15',
      time: '10:30',
      duration: 90,
      doctorName: 'Dr. Ali Yıldız',
      branchName: 'Ankara Kızılay',
      notes: 'Dolgu tedavisi',
      treatmentNotes: 'Önceki dolgu kontrol edilecek',
      status: 'confirmed'
    },
    {
      id: '3',
      patientName: 'Can Yılmaz',
      patientPhone: '0555 456 7890',
      date: '2024-01-15',
      time: '14:00',
      duration: 45,
      doctorName: 'Dr. Ayşe Kaya',
      branchName: 'İzmir Alsancak',
      notes: 'Temizlik',
      treatmentNotes: 'Rutin temizlik',
      status: 'cancelled'
    }
  ];

  const appointmentTypes = {
    CONSULTATION: { label: 'Kontrol', color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-200' },
    TREATMENT: { label: 'Tedavi', color: 'bg-green-100 text-green-800', borderColor: 'border-green-200' },
    CLEANING: { label: 'Temizlik', color: 'bg-purple-100 text-purple-800', borderColor: 'border-purple-200' },
    EMERGENCY: { label: 'Acil', color: 'bg-red-100 text-red-800', borderColor: 'border-red-200' },
    FOLLOW_UP: { label: 'Kontrol', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-yellow-200' },
    SURGERY: { label: 'Ameliyat', color: 'bg-orange-100 text-orange-800', borderColor: 'border-orange-200' }
  };

  const appointmentStatuses = {
    SCHEDULED: { label: 'Planlandı', color: 'bg-gray-100 text-gray-800' },
    CONFIRMED: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
    IN_PROGRESS: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-purple-100 text-purple-800' },
    CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800' },
    NO_SHOW: { label: 'Gelmedi', color: 'bg-orange-100 text-orange-800' }
  };

  // Takvim navigasyonu
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
  };

  // Haftalık görünüm için günleri hesapla
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Saat dilimleri
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // Randevuları filtrele
  const filteredAppointments = mockAppointments.filter(appointment => {
    const matchesSearch = 
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDoctor = filterDoctor === 'ALL' || appointment.doctorName === filterDoctor;
    const matchesBranch = filterBranch === 'ALL' || appointment.branchName === filterBranch;

    return matchesSearch && matchesDoctor && matchesBranch;
  });

  const doctors = [...new Set(mockAppointments.map(a => a.doctorName))];
  const branches = [...new Set(mockAppointments.map(a => a.branchName))];

  // Belirli bir gün ve saatteki randevuları al
  const getAppointmentsForTimeSlot = (date: Date, time: string) => {
    return filteredAppointments.filter(appointment => 
      appointment.date === date.toISOString().split('T')[0] && 
      appointment.time === time
    );
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleAddNote = () => {
    setShowNoteModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Canlı Takvim</h1>
              <p className="text-sm text-gray-600">Gerçek zamanlı randevu yönetimi</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/appointments/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Randevu</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Hasta, doktor ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Doctor Filter */}
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Doktorlar</option>
              {doctors.map((doctor) => (
                <option key={doctor} value={doctor}>{doctor}</option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Şubeler</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>

            {/* View Mode */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="day">Günlük</option>
              <option value="week">Haftalık</option>
              <option value="month">Aylık</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterDoctor('ALL');
                setFilterBranch('ALL');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPrevious}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Bugün</span>
              </button>
              <button
                onClick={goToNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleDateString('tr-TR', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-3 bg-gray-50 border-r border-gray-200">
              <span className="text-sm font-medium text-gray-500">Saat</span>
            </div>
            {getWeekDays().map((day, index) => (
              <div key={index} className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    {day.toLocaleDateString('tr-TR', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${
                    day.toDateString() === new Date().toDateString() 
                      ? 'text-blue-600' 
                      : 'text-gray-700'
                  }`}>
                    {day.getDate()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                <div className="p-2 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">{time}</span>
                </div>
                {getWeekDays().map((day, dayIndex) => {
                  const dayAppointments = getAppointmentsForTimeSlot(day, time);
                  return (
                    <div key={dayIndex} className="p-1 border-r border-gray-200 last:border-r-0 min-h-[80px]">
                      {dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          onClick={() => handleAppointmentClick(appointment)}
                          className={`mb-1 p-2 rounded-lg cursor-pointer hover:shadow-md transition-all border-l-4 ${
                            appointmentTypes[appointment.status as keyof typeof appointmentTypes].borderColor
                          } ${appointmentTypes[appointment.status as keyof typeof appointmentTypes].color}`}
                        >
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {appointment.patientName}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {appointment.doctorName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {appointment.time} - {appointment.duration}dk
                          </div>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              appointmentStatuses[appointment.status as keyof typeof appointmentStatuses].color
                            }`}>
                              {appointmentStatuses[appointment.status as keyof typeof appointmentStatuses].label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Randevu Detayları</h3>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Hasta Bilgileri
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Ad Soyad</p>
                      <p className="font-medium">{selectedAppointment.patientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Telefon</p>
                      <p className="font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {selectedAppointment.patientPhone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Appointment Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Randevu Bilgileri
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tarih & Saat</p>
                      <p className="font-medium">{selectedAppointment.date} - {selectedAppointment.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Süre</p>
                      <p className="font-medium">{selectedAppointment.duration} dakika</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Doktor</p>
                      <p className="font-medium flex items-center">
                        <Stethoscope className="h-4 w-4 mr-1" />
                        {selectedAppointment.doctorName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Şube</p>
                      <p className="font-medium flex items-center">
                        <Building2 className="h-4 w-4 mr-1" />
                        {selectedAppointment.branchName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Randevu Notları</h4>
                  <p className="text-sm text-gray-700">{selectedAppointment.notes}</p>
                </div>

                {/* Treatment Notes */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Tedavi Notları</h4>
                  <p className="text-sm text-gray-700">{selectedAppointment.treatmentNotes}</p>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleAddNote}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Not Ekle</span>
                  </button>
                  <Link
                    href={`/appointments/${selectedAppointment.id}/edit`}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Düzenle</span>
                  </Link>
                  <button className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2">
                    <Trash2 className="h-4 w-4" />
                    <span>İptal Et</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Not Ekle</h3>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Not Türü
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="appointment">Randevu Notu</option>
                    <option value="treatment">Tedavi Notu</option>
                    <option value="medical">Tıbbi Not</option>
                    <option value="general">Genel Not</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Not İçeriği
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notunuzu buraya yazın..."
                  ></textarea>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowNoteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Kaydet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 