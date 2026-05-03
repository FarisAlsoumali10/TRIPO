import React, { useState, useRef } from 'react';
import { X, Calendar, Lock, MapPin, Camera, Image as ImageIcon } from 'lucide-react';
import { Button, Input } from './ui';
import { privateTripAPI } from '../services/api';
import { showToast } from './Toast';

interface Props {
  onClose: () => void;
  onCreated: (trip: any) => void;
  lang?: 'en' | 'ar';
}

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = (height * MAX) / width; width = MAX; }
          else { width = (width * MAX) / height; height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const CreatePrivateTripModal = ({ onClose, onCreated, lang }: Props) => {
  const ar = lang === 'ar';
  const [title,       setTitle]       = useState('');
  const [destination, setDestination] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [coverImage,  setCoverImage]  = useState<string | null>(null);
  const [isCreating,  setIsCreating]  = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setCoverImage(compressed);
    } catch { showToast('Could not load photo', 'error'); }
    e.target.value = '';
  };

  const handleCreate = async () => {
    if (!title.trim()) { showToast('Please enter a trip name', 'error'); return; }
    setIsCreating(true);
    try {
      const trip = await privateTripAPI.create({
        title:       title.trim(),
        destination: destination.trim() || undefined,
        coverImage:  coverImage ?? undefined,
        startDate:   startDate  || undefined,
        endDate:     endDate    || undefined,
      });
      showToast('Trip created! Share the link to invite people.', 'success');
      onCreated(trip);
    } catch {
      showToast('Failed to create trip', 'error');
    }
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Cover photo area */}
        <div className="relative h-40 bg-slate-100 cursor-pointer" onClick={() => photoInputRef.current?.click()}>
          {coverImage ? (
            <>
              <img src={coverImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-semibold">{ar ? 'تغيير الصورة' : 'Change photo'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-slate-400" />
              </div>
              <span className="text-sm font-medium">{ar ? 'أضف صورة غلاف' : 'Add cover photo'}</span>
              <span className="text-xs text-slate-300">{ar ? 'اضغط للاختيار' : 'Tap to choose'}</span>
            </div>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">{ar ? 'رحلة خاصة جديدة' : 'New Private Trip'}</h2>
              <p className="text-[11px] text-slate-400">{ar ? 'شارك الرابط لدعوة أصدقائك' : 'Share the link to invite your crew'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Input
            label={ar ? 'اسم الرحلة' : 'Trip Name'}
            placeholder={ar ? 'مثال: ويكند الرياض مع الشلة' : 'e.g. Riyadh Weekend with the Crew'}
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
          />

          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />{ar ? 'الوجهة' : 'Destination'}
            </label>
            <input
              type="text"
              placeholder={ar ? 'مثال: العُلا، أبها، جدة…' : 'e.g. AlUla, Abha, Jeddah…'}
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />{ar ? 'البداية' : 'Start'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />{ar ? 'النهاية' : 'End'}
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700">{ar ? 'أي شخص لديه رابط الدعوة يمكنه الانضمام.' : 'Anyone with the invite link can join.'}</p>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{ar ? 'إلغاء' : 'Cancel'}</Button>
          <Button className="flex-1" onClick={handleCreate} disabled={isCreating || !title.trim()}>
            {isCreating ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'إنشاء الرحلة' : 'Create Trip')}
          </Button>
        </div>
      </div>
    </div>
  );
};
