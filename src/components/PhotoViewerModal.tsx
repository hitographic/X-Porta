import { useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import type { ReportAttachment } from '../types/report';
import { processImageFile, canAddAttachment, getMaxAttachments } from '../utils/photos';

interface PhotoViewerModalProps {
  attachments: ReportAttachment[];
  onClose: () => void;
  onSave: (attachments: ReportAttachment[]) => void;
}

export default function PhotoViewerModal({ attachments: initialAttachments, onClose, onSave }: PhotoViewerModalProps) {
  const [attachments, setAttachments] = useState<ReportAttachment[]>(initialAttachments);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [description, setDescription] = useState(initialAttachments[0]?.description ?? '');
  const [uploading, setUploading] = useState(false);
  const retakeInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const selected = attachments[selectedIndex] ?? null;

  const selectAttachment = (index: number) => {
    setSelectedIndex(index);
    setDescription(attachments[index]?.description ?? '');
  };

  const handleSave = () => {
    if (!selected) return;
    const updated = attachments.map((a, i) => i === selectedIndex ? { ...a, description } : a);
    setAttachments(updated);
    onSave(updated);
  };

  const handleRetake = () => {
    retakeInputRef.current?.click();
  };

  const handleRetakeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const newAttachment = await processImageFile(file);
      newAttachment.description = selected?.description ?? '';
      const updated = attachments.map((a, i) => i === selectedIndex ? newAttachment : a);
      setAttachments(updated);
      onSave(updated);
    } catch {
      alert('Gagal memproses gambar.');
    } finally {
      setUploading(false);
      if (retakeInputRef.current) retakeInputRef.current.value = '';
    }
  };

  const handleDelete = () => {
    if (!confirm('Hapus foto ini?')) return;
    const updated = attachments.filter((_, i) => i !== selectedIndex);
    setAttachments(updated);
    setSelectedIndex(Math.min(selectedIndex, Math.max(0, updated.length - 1)));
    setDescription(updated[Math.min(selectedIndex, Math.max(0, updated.length - 1))]?.description ?? '');
    onSave(updated);
    if (updated.length === 0) onClose();
  };

  const handleAddPhoto = () => {
    addInputRef.current?.click();
  };

  const handleAddFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canAddAttachment(attachments.length)) {
      alert(`Maksimal ${getMaxAttachments()} foto.`);
      return;
    }
    setUploading(true);
    try {
      const newAttachment = await processImageFile(file);
      const updated = [...attachments, newAttachment];
      setAttachments(updated);
      setSelectedIndex(updated.length - 1);
      setDescription('');
      onSave(updated);
    } catch {
      alert('Gagal memproses gambar.');
    } finally {
      setUploading(false);
      if (addInputRef.current) addInputRef.current.value = '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="photo-viewer-modal" onClick={e => e.stopPropagation()}>
        <input
          ref={retakeInputRef}
          type="file"
          accept="image/*"
          onChange={handleRetakeFileChange}
          style={{ display: 'none' }}
        />
        <input
          ref={addInputRef}
          type="file"
          accept="image/*"
          onChange={handleAddFileChange}
          style={{ display: 'none' }}
        />

        <div className="pv-header">
          <span className="pv-title">Foto lampiran</span>
          <button type="button" className="pv-close" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        {attachments.length > 0 && (
          <div className="pv-thumbnails">
            {attachments.map((att, index) => (
              <button
                key={att.id}
                type="button"
                className={`pv-thumb ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => selectAttachment(index)}
              >
                <img src={att.driveUrl || att.dataUrl} alt={att.description || `${index + 1}`} />
                <span className="pv-thumb-label">{index + 1}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            <div className="pv-preview">
              <img src={selected.driveUrl || selected.dataUrl} alt={selected.description || 'Preview'} />
            </div>

            <div className="pv-desc-label">Keterangan foto</div>
            <input
              className="pv-desc-input"
              value={description}
              placeholder={`Foto lampiran ke-${selectedIndex + 1}`}
              onChange={e => setDescription(e.target.value)}
            />

            <div className="pv-actions-row">
              <button type="button" className="pv-btn secondary" disabled={uploading} onClick={handleRetake}>
                <RotateCcw size={16} /> Retake
              </button>
              <button type="button" className="pv-btn secondary" onClick={handleSave}>
                <Save size={16} /> Simpan
              </button>
              <button type="button" className="pv-btn danger" onClick={handleDelete}>
                <Trash2 size={16} /> Hapus
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          className="pv-btn add-full"
          disabled={uploading || !canAddAttachment(attachments.length)}
          onClick={handleAddPhoto}
        >
          <ImagePlus size={16} /> {uploading ? 'Memproses...' : 'Tambah foto'}
        </button>
      </div>
    </div>
  );
}
