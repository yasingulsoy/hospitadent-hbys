'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText,
  Plus,
  Search,
  Filter,
  User,
  Stethoscope,
  Calendar,
  Tag,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Phone,
  Mail
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  status: string;
  tags: string[];
  patientName: string;
  patientPhone: string;
  doctorName: string;
  branchName: string;
  createdAt: string;
  updatedAt: string;
}

// Mock not verileri
const mockNotes: Note[] = [
  {
    id: '1',
    patientName: 'Ahmet Yılmaz',
    patientPhone: '0532 123 45 67',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    type: 'MEDICAL',
    title: 'Sol üst azı diş ağrısı',
    content: 'Hasta şikayet: Gece ağrısı var, sıcak-soğuk hassasiyeti mevcut. Röntgen sonucu: Diş çürük başlangıcı. Önerilen: Dolgu tedavisi. Hasta bilgilendirildi.',
    tags: ['ağrı', 'çürük', 'dolgu'],
    priority: 'HIGH',
    status: 'ACTIVE',
    createdAt: '2024-01-15T09:00:00',
    updatedAt: '2024-01-15T14:30:00'
  },
  {
    id: '2',
    patientName: 'Fatma Özkan',
    patientPhone: '0533 234 56 78',
    doctorName: 'Dr. Ali Yıldız',
    branchName: 'Ankara Kızılay',
    type: 'TREATMENT',
    title: 'Kanal tedavisi planı',
    content: 'Sağ alt azı diş kanal tedavisi planlandı. İlk seans: Kanal açma ve temizlik. İkinci seans: Dolgu. Hasta ağrı kesici reçetesi verildi.',
    tags: ['kanal', 'tedavi', 'plan'],
    priority: 'MEDIUM',
    status: 'ACTIVE',
    createdAt: '2024-01-14T11:00:00',
    updatedAt: '2024-01-14T16:45:00'
  },
  {
    id: '3',
    patientName: 'Mehmet Demir',
    patientPhone: '0534 345 67 89',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    type: 'APPOINTMENT',
    title: 'Randevu iptal notu',
    content: 'Hasta aradı: Acil işi çıktı, randevuyu iptal etmek istiyor. Yeni randevu için arayacak. Alternatif tarih önerildi: 18 Ocak.',
    tags: ['iptal', 'randevu', 'acil'],
    priority: 'LOW',
    status: 'ARCHIVED',
    createdAt: '2024-01-15T13:00:00',
    updatedAt: '2024-01-15T13:15:00'
  },
  {
    id: '4',
    patientName: 'Ayşe Kaya',
    patientPhone: '0535 456 78 90',
    doctorName: 'Dr. Mehmet Demir',
    branchName: 'İzmir Alsancak',
    type: 'GENERAL',
    title: 'Hasta tercihleri',
    content: 'Hasta beyaz dolgu tercih ediyor. Estetik kaygısı var. Fiyat bilgilendirmesi yapıldı. Hasta memnun.',
    tags: ['estetik', 'dolgu', 'tercih'],
    priority: 'MEDIUM',
    status: 'ACTIVE',
    createdAt: '2024-01-13T15:30:00',
    updatedAt: '2024-01-13T15:30:00'
  }
];

const noteTypes = {
  MEDICAL: { label: 'Tıbbi Not', color: 'bg-red-100 text-red-800', icon: Stethoscope },
  TREATMENT: { label: 'Tedavi Notu', color: 'bg-blue-100 text-blue-800', icon: FileText },
  APPOINTMENT: { label: 'Randevu Notu', color: 'bg-green-100 text-green-800', icon: Calendar },
  GENERAL: { label: 'Genel Not', color: 'bg-gray-100 text-gray-800', icon: FileText }
};

const noteCategories = {
  TEDAVI_NOTU: 'Tedavi Notu',
  TEDAVI_PLANI: 'Tedavi Planı',
  RANDEVU_NOTU: 'Randevu Notu',
  GENEL_NOT: 'Genel Not',
  ACIL_NOT: 'Acil Not',
  KONTROL_NOTU: 'Kontrol Notu'
};

const priorities = {
  HIGH: { label: 'Yüksek', color: 'bg-red-100 text-red-800' },
  MEDIUM: { label: 'Orta', color: 'bg-yellow-100 text-yellow-800' },
  LOW: { label: 'Düşük', color: 'bg-green-100 text-green-800' }
};

const statuses = {
  ACTIVE: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
  ARCHIVED: { label: 'Arşivlenmiş', color: 'bg-gray-100 text-gray-800' },
  URGENT: { label: 'Acil', color: 'bg-red-100 text-red-800' }
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDoctor, setFilterDoctor] = useState('ALL');

  const filteredNotes = mockNotes.filter(note => {
    const matchesSearch = 
      note.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || note.type === filterType;
    const matchesPriority = filterPriority === 'ALL' || note.priority === filterPriority;
    const matchesStatus = filterStatus === 'ALL' || note.status === filterStatus;
    const matchesDoctor = filterDoctor === 'ALL' || note.doctorName === filterDoctor;

    return matchesSearch && matchesType && matchesPriority && matchesStatus && matchesDoctor;
  });

  const doctors = [...new Set(mockNotes.map(n => n.doctorName))];

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setShowNoteModal(true);
  };

  const handleEditNote = () => {
    setEditMode(true);
  };

  const handleSaveNote = () => {
    // Burada API çağrısı yapılacak
    setEditMode(false);
    setShowNoteModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Not Yönetimi</h1>
              <p className="text-sm text-gray-600">Hasta ve tedavi notlarını yönetin</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Not</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Hasta, not ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Türler</option>
              <option value="MEDICAL">Tıbbi Not</option>
              <option value="TREATMENT">Tedavi Notu</option>
              <option value="APPOINTMENT">Randevu Notu</option>
              <option value="GENERAL">Genel Not</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Öncelikler</option>
              <option value="HIGH">Yüksek</option>
              <option value="MEDIUM">Orta</option>
              <option value="LOW">Düşük</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="ARCHIVED">Arşivlenmiş</option>
              <option value="URGENT">Acil</option>
            </select>

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

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('ALL');
                setFilterPriority('ALL');
                setFilterStatus('ALL');
                setFilterDoctor('ALL');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleNoteClick(note)}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                      <p className="text-sm text-gray-500">{note.patientName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${noteTypes[note.type as keyof typeof noteTypes].color}`}>
                      {noteTypes[note.type as keyof typeof noteTypes].label}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorities[note.priority as keyof typeof priorities].color}`}>
                      {priorities[note.priority as keyof typeof priorities].label}
                    </span>
                  </div>
                </div>

                {/* Note Info */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span><strong>Doktor:</strong> {note.doctorName}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                    <span><strong>Şube:</strong> {note.branchName}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span><strong>Tarih:</strong> {new Date(note.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              <div className="p-4">
                <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                  {note.content}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {note.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statuses[note.status as keyof typeof statuses].color}`}>
                    {statuses[note.status as keyof typeof statuses].label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(note.updatedAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Not bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçilen kriterlere uygun not bulunamadı.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Not Oluştur
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Note Detail Modal */}
      {showNoteModal && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Not Detayları</h3>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setEditMode(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Hasta Bilgileri
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Ad Soyad</p>
                      <p className="font-medium">{selectedNote.patientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Telefon</p>
                      <p className="font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {selectedNote.patientPhone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Doktor</p>
                      <p className="font-medium flex items-center">
                        <Stethoscope className="h-4 w-4 mr-1" />
                        {selectedNote.doctorName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Şube</p>
                      <p className="font-medium flex items-center">
                        <Building2 className="h-4 w-4 mr-1" />
                        {selectedNote.branchName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Note Details */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Not Bilgileri</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Başlık</p>
                      <p className="font-medium">{selectedNote.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tür</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${noteTypes[selectedNote.type as keyof typeof noteTypes].color}`}>
                        {noteTypes[selectedNote.type as keyof typeof noteTypes].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Öncelik</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorities[selectedNote.priority as keyof typeof priorities].color}`}>
                        {priorities[selectedNote.priority as keyof typeof priorities].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Durum</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statuses[selectedNote.status as keyof typeof statuses].color}`}>
                        {statuses[selectedNote.status as keyof typeof statuses].label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Note Content */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Not İçeriği</h4>
                  {editMode ? (
                    <textarea
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={selectedNote.content}
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedNote.content}</p>
                  )}
                </div>

                {/* Tags */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Etiketler</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
                      >
                        <Tag className="h-4 w-4 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  {editMode ? (
                    <>
                      <button
                        onClick={handleSaveNote}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Kaydet</span>
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        İptal
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditNote}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Düzenle</span>
                      </button>
                      <button className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2">
                        <Trash2 className="h-4 w-4" />
                        <span>Sil</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Yeni Not Ekle</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hasta Seç
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Hasta seçiniz</option>
                      <option value="1">Ahmet Yılmaz</option>
                      <option value="2">Fatma Özkan</option>
                      <option value="3">Mehmet Demir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Not Türü
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="MEDICAL">Tıbbi Not</option>
                      <option value="TREATMENT">Tedavi Notu</option>
                      <option value="APPOINTMENT">Randevu Notu</option>
                      <option value="GENERAL">Genel Not</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlık
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Not başlığı..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İçerik
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Not içeriği..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Öncelik
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="LOW">Düşük</option>
                      <option value="MEDIUM">Orta</option>
                      <option value="HIGH">Yüksek</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etiketler
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Etiketler (virgülle ayırın)..."
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                    <Save className="h-4 w-4" />
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