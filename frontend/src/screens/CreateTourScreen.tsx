import React, { useState, useRef } from 'react';
import {
  Camera, Image as ImageIcon, X, Plus, MapPin, Clock, Users,
  DollarSign, ChevronRight, Check, Loader2, Tag,
} from 'lucide-react';
import { Button } from '../components/ui';
import { tourAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { User } from '../types';

// ── Image compression ─────────────────────────────────────────────────────────2
function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = (height * maxPx) / width; width = maxPx; }
          else { width = (width * maxPx) / height; height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const CATEGORIES = [
  { val: 'adventure', emoji: '⛰️', label: 'Adventure', labelAr: 'مغامرة' },
  { val: 'culture',   emoji: '🏛️', label: 'Culture',   labelAr: 'ثقافة'  },
  { val: 'food',      emoji: '🍽️', label: 'Food',      labelAr: 'طعام'   },
  { val: 'nature',    emoji: '🌿', label: 'Nature',    labelAr: 'طبيعة'  },
  { val: 'social',    emoji: '🎉', label: 'Social',    labelAr: 'اجتماعي'},
  { val: 'heritage',  emoji: '🕌', label: 'Heritage',  labelAr: 'تراث'   },
  { val: 'community', emoji: '🤝', label: 'Community', labelAr: 'مجتمع'  },
];

const DIFFICULTIES = [
  { val: 'easy',        label: 'Easy',        labelAr: 'سهل'   },
  { val: 'moderate',    label: 'Moderate',    labelAr: 'متوسط' },
  { val: 'challenging', label: 'Challenging', labelAr: 'صعب'   },
] as const;

const STEP_LABELS_EN = ['Basics', 'Details', 'Publish'];
const STEP_LABELS_AR = ['الأساسيات', 'التفاصيل', 'النشر'];

interface Props {
  currentUser?: User;
  t?: any;
  lang?: 'en' | 'ar';
  onTourCreated: (tour: any) => void;
}

export const CreateTourScreen = ({ currentUser, lang, onTourCreated }: Props) => {
  const ar = lang === 'ar';
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Basics
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]           = useState('');
  const [heroImage, setHeroImage]   = useState<string | null>(null);
  const [images, setImages]         = useState<string[]>([]);
  const [category, setCategory]     = useState('');

  // Step 2 — Details
  const [departureLocation, setDepartureLocation] = useState('');
  const [departureTime, setDepartureTime]         = useState('');
  const [totalDuration, setTotalDuration]         = useState('2');
  const [maxGroupSize, setMaxGroupSize]           = useState('10');
  const [difficulty, setDifficulty]               = useState<'easy' | 'moderate' | 'challenging'>('easy');
  const [highlightInput, setHighlightInput]       = useState('');
  const [highlights, setHighlights]               = useState<string[]>([]);
  const [includedInput, setIncludedInput]         = useState('');
  const [included, setIncluded]                   = useState<string[]>([]);
  const [availableDates, setAvailableDates]       = useState<string[]>([]);
  const [dateInput, setDateInput]                 = useState('');

  const [isPublishing, setIsPublishing] = useState(false);
  const [done, setDone]               = useState(false);

  const heroInputRef   = useRef<HTMLInputElement>(null);
  const extraInputRef  = useRef<HTMLInputElement>(null);

  const handleHeroChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setHeroImage(await compressImage(file)); }
    catch { showToast('Could not load image', 'error'); }
    e.target.value = '';
  };

  const handleExtraImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []) as File[];
    if (!files.length) return;
    const remaining = 5 - images.length;
    const compressed = await Promise.all(files.slice(0, remaining).map(f => compressImage(f, 900)));
    setImages(prev => [...prev, ...compressed].slice(0, 5));
    e.target.value = '';
  };

  const addChip = (
    val: string, setter: React.Dispatch<React.SetStateAction<string[]>>, inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setter(prev => [...prev, trimmed]);
    inputSetter('');
  };

  const handlePublish = async () => {
    if (!title.trim()) { showToast('Tour name is required', 'error'); return; }
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
      showToast('Enter a valid price per person', 'error'); return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        title:            title.trim(),
        description:      description.trim(),
        pricePerPerson:   Number(price),
        heroImage:        heroImage ?? (images[0] ?? undefined),
        images:           images,
        category:         category || 'community',
        departureLocation: departureLocation.trim(),
        departureTime:    departureTime,
        totalDuration:    Number(totalDuration) || 2,
        maxGroupSize:     Number(maxGroupSize) || 10,
        difficulty,
        highlights,
        included,
        availableDates:   availableDates,
        guideName:        currentUser?.name || 'Host',
        guideAvatar:      currentUser?.avatar,
      };

      const tour = await tourAPI.createTour(payload);

      // Flag so HostDashboard tab unlocks
      localStorage.setItem('tripo_has_published_tour', '1');

      setDone(true);
      showToast('Tour published! It\'s now live in the Tours tab.', 'success');
      setTimeout(() => onTourCreated(tour), 1200);
    } catch {
      showToast('Failed to publish tour', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Progress bar ─────────────────────────────────────────────────────────────
  const progress = (step / 3) * 100;

  // ── Field helpers ─────────────────────────────────────────────────────────────
  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-300';
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Tag className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-900 leading-tight">{ar ? 'أضف جولة جديدة' : 'Add a New Tour'}</h1>
            <p className="text-xs text-slate-400">{ar ? `الخطوة ${step} من ٣ — ${STEP_LABELS_AR[step - 1]}` : `Step ${step} of 3 — ${STEP_LABELS_EN[step - 1]}`}</p>
          </div>
        </div>
        {/* Progress */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4 max-w-lg mx-auto">

        {/* ── STEP 1: Basics ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            {/* Cover photo */}
            <div
              className="relative h-44 bg-slate-100 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-slate-200 flex items-center justify-center"
              onClick={() => heroInputRef.current?.click()}
            >
              {heroImage ? (
                <>
                  <img src={heroImage} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-semibold">{ar ? 'تغيير الصورة' : 'Change photo'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-slate-400" />
                  </div>
                  <span className="text-sm font-medium">{ar ? 'أضف صورة الغلاف' : 'Add cover photo'}</span>
                </div>
              )}
              <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroChange} />
            </div>

            {/* Tour name */}
            <div>
              <label className={labelCls}>{ar ? 'اسم الجولة *' : 'Tour Name *'}</label>
              <input
                type="text"
                placeholder={ar ? 'مثال: تجربة غروب الشمس في العُلا' : 'e.g. Sunset Desert Experience in AlUla'}
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>{ar ? 'الوصف' : 'Description'}</label>
              <textarea
                placeholder={ar ? 'أخبر المسافرين عن ما يميز هذه الجولة…' : 'Tell travellers what makes this tour special…'}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Price */}
            <div>
              <label className={labelCls}><DollarSign className="w-3 h-3 inline mr-1" />{ar ? 'السعر للشخص (ريال) *' : 'Price per Person (SAR) *'}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">SAR</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className={`${inputCls} pl-12`}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className={labelCls}>{ar ? 'التصنيف' : 'Category'}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.val}
                    onClick={() => setCategory(c => c === cat.val ? '' : cat.val)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      category === cat.val
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <span>{cat.emoji}</span>{ar ? cat.labelAr : cat.label}
                    {category === cat.val && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => {
              if (!title.trim()) { showToast('Tour name is required', 'error'); return; }
              if (!price || isNaN(Number(price))) { showToast('Enter a valid price', 'error'); return; }
              setStep(2);
            }}>
              {ar ? 'التالي — تفاصيل الجولة' : 'Next — Tour Details'} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}

        {/* ── STEP 2: Details ────────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><MapPin className="w-3 h-3 inline mr-1" />{ar ? 'نقطة الانطلاق' : 'Departure Location'}</label>
                <input type="text" placeholder={ar ? 'مثال: العُلا القديمة' : 'e.g. AlUla Old Town'} value={departureLocation} onChange={e => setDepartureLocation(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><Clock className="w-3 h-3 inline mr-1" />{ar ? 'وقت الانطلاق' : 'Departure Time'}</label>
                <input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{ar ? 'المدة (ساعات)' : 'Duration (hours)'}</label>
                <input type="number" min="0.5" step="0.5" value={totalDuration} onChange={e => setTotalDuration(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><Users className="w-3 h-3 inline mr-1" />{ar ? 'الحد الأقصى للمجموعة' : 'Max Group Size'}</label>
                <input type="number" min="1" value={maxGroupSize} onChange={e => setMaxGroupSize(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className={labelCls}>{ar ? 'مستوى الصعوبة' : 'Difficulty'}</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.val}
                    onClick={() => setDifficulty(d.val)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      difficulty === d.val
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {ar ? d.labelAr : d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div>
              <label className={labelCls}>{ar ? 'أبرز المميزات' : 'Highlights'}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={ar ? 'مثال: مناظر غروب الشمس' : 'e.g. Sunset views'}
                  value={highlightInput}
                  onChange={e => setHighlightInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addChip(highlightInput, setHighlights, setHighlightInput)}
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => addChip(highlightInput, setHighlights, setHighlightInput)}
                  className="px-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {highlights.map((h, i) => (
                    <span key={i} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {h}
                      <button onClick={() => setHighlights(hs => hs.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* What's included */}
            <div>
              <label className={labelCls}>{ar ? 'ما يشمله السعر' : "What's Included"}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={ar ? 'مثال: مرشد، وجبات خفيفة' : 'e.g. Guide, Snacks'}
                  value={includedInput}
                  onChange={e => setIncludedInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addChip(includedInput, setIncluded, setIncludedInput)}
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => addChip(includedInput, setIncluded, setIncludedInput)}
                  className="px-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {included.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {included.map((item, i) => (
                    <span key={i} className="flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {item}
                      <button onClick={() => setIncluded(arr => arr.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Available dates */}
            <div>
              <label className={labelCls}>{ar ? 'التواريخ المتاحة' : 'Available Dates'}</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateInput}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setDateInput(e.target.value)}
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => {
                    if (dateInput && !availableDates.includes(dateInput)) {
                      setAvailableDates(prev => [...prev, dateInput].sort());
                      setDateInput('');
                    }
                  }}
                  className="px-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {availableDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableDates.map(d => (
                    <span key={d} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {d}
                      <button onClick={() => setAvailableDates(arr => arr.filter(x => x !== d))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Extra photos */}
            <div>
              <label className={labelCls}>{ar ? 'صور إضافية (حتى 5)' : 'Additional Photos (up to 5)'}</label>
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages(arr => arr.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    onClick={() => extraInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-emerald-300 transition"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                )}
                <input ref={extraInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraImages} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>{ar ? 'رجوع' : 'Back'}</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>{ar ? 'مراجعة ونشر' : 'Review & Publish'}</Button>
            </div>
          </>
        )}

        {/* ── STEP 3: Review & Publish ────────────────────────────────────────── */}
        {step === 3 && (
          <>
            {done ? (
              <div className="flex flex-col items-center py-16 gap-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-black text-lg text-slate-900">{ar ? 'تم نشر الجولة!' : 'Tour Published!'}</p>
                <p className="text-sm text-slate-500 text-center">{ar ? 'جولتك الآن متاحة. جاري التحويل إلى تبويب الجولات…' : 'Your tour is now live. Redirecting to the Tours tab…'}</p>
              </div>
            ) : (
              <>
                {/* Preview card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {heroImage && <img src={heroImage} alt="" className="w-full h-40 object-cover" />}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="font-black text-base text-slate-900">{title || 'Tour Name'}</h2>
                      <span className="text-sm font-black text-emerald-600 shrink-0">SAR {price || '0'}/person</span>
                    </div>
                    {description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {departureLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{departureLocation}</span>}
                      {totalDuration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalDuration}h</span>}
                      {maxGroupSize && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ar ? `حتى ${maxGroupSize}` : `Up to ${maxGroupSize}`}</span>}
                    </div>
                    {highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {highlights.map((h, i) => (
                          <span key={i} className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-700">
                  {ar ? 'بعد النشر ستظهر جولتك في تبويب الجولات ضمن "أضيف مؤخراً". يمكنك إدارتها في أي وقت من لوحة المضيف.' : 'Once published, your tour will appear in the Tours tab under "Recently Added". You can manage it anytime from the Host Dashboard.'}
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>{ar ? 'رجوع' : 'Back'}</Button>
                  <Button className="flex-1" onClick={handlePublish} disabled={isPublishing}>
                    {isPublishing ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{ar ? 'جاري النشر…' : 'Publishing…'}</span>
                    ) : (ar ? 'نشر الجولة' : 'Publish Tour')}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CreateTourScreen;
