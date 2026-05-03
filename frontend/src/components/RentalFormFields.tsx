import React from 'react';
import {
  Home, Star, Tent, BedDouble, Navigation, MapPin,
  Wifi, Flame, Waves, Utensils, Wind, Car, Heart,
} from 'lucide-react';

export interface RentalFormValue {
  title: string;
  locationName: string;
  type: string;
  price: string;
  description: string;
  phone: string;
  amenities: string[];
}

interface Props {
  value: RentalFormValue;
  onChange: (v: RentalFormValue) => void;
}

const BG      = '#081229';
const LIFTED  = '#101B36';
const MINT    = '#7CF7C8';
const MOON    = '#B8C2D6';
const SAND    = '#7F8AA3';
const BORDER  = 'rgba(255,255,255,0.10)';
const FOCUS   = 'rgba(124,247,200,0.5)';

const PLACE_TYPES = [
  { id: 'Chalet',    icon: <Home className="w-5 h-5" />,       label: 'Chalet' },
  { id: 'Villa',     icon: <Star className="w-5 h-5" />,       label: 'Villa' },
  { id: 'Camp',      icon: <Tent className="w-5 h-5" />,       label: 'Camp' },
  { id: 'Apartment', icon: <BedDouble className="w-5 h-5" />,  label: 'Apartment' },
  { id: 'Farm',      icon: <Navigation className="w-5 h-5" />, label: 'Farm' },
  { id: 'Other',     icon: <MapPin className="w-5 h-5" />,     label: 'Other' },
];

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi:         <Wifi className="w-3.5 h-3.5" />,
  BBQ:          <Flame className="w-3.5 h-3.5" />,
  Pool:         <Waves className="w-3.5 h-3.5" />,
  Kitchen:      <Utensils className="w-3.5 h-3.5" />,
  AC:           <Wind className="w-3.5 h-3.5" />,
  Parking:      <Car className="w-3.5 h-3.5" />,
  Fireplace:    <Flame className="w-3.5 h-3.5" />,
  'Pet Friendly': <Heart className="w-3.5 h-3.5" />,
};

const HOST_AMENITIES = Object.keys(AMENITY_ICONS);

const inputCls = 'w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all';
const inputStyle = { background: LIFTED, border: `1px solid ${BORDER}` };

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = FOCUS;
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = BORDER;
}

export const RentalFormFields = ({ value, onChange }: Props) => {
  const set = (patch: Partial<RentalFormValue>) => onChange({ ...value, ...patch });

  const toggleAmenity = (a: string) =>
    set({ amenities: value.amenities.includes(a) ? value.amenities.filter(x => x !== a) : [...value.amenities, a] });

  return (
    <div className="space-y-5">
      {/* Type chips */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: MOON }}>Place type</label>
        <div className="grid grid-cols-3 gap-2">
          {PLACE_TYPES.map(pt => {
            const active = value.type === pt.id;
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => set({ type: pt.id })}
                className="flex flex-col items-center gap-2 py-3 rounded-2xl border transition-all"
                style={{
                  background: active ? MINT : 'rgba(255,255,255,0.06)',
                  borderColor: active ? MINT : BORDER,
                  color: active ? '#050B1E' : MOON,
                }}
              >
                {pt.icon}
                <span className="text-xs font-bold">{pt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: MOON }}>Place name *</label>
        <input
          value={value.title}
          onChange={e => set({ title: e.target.value })}
          placeholder="e.g. Sunset Chalet, Abha"
          className={inputCls}
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: MOON }}>Location *</label>
        <input
          value={value.locationName}
          onChange={e => set({ locationName: e.target.value })}
          placeholder="e.g. Abha, Asir Region"
          className={inputCls}
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: MOON }}>Description</label>
        <textarea
          value={value.description}
          onChange={e => set({ description: e.target.value })}
          placeholder="Describe the vibe, the views, the best time to visit…"
          rows={3}
          className={inputCls + ' resize-none'}
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: MOON }}>Amenities</label>
        <div className="flex flex-wrap gap-2">
          {HOST_AMENITIES.map(a => {
            const on = value.amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                style={{
                  background: on ? MINT : 'rgba(255,255,255,0.06)',
                  borderColor: on ? MINT : BORDER,
                  color: on ? '#050B1E' : MOON,
                }}
              >
                {AMENITY_ICONS[a]}
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: MOON }}>Price per night (SAR) *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none" style={{ color: SAND }}>SAR</span>
          <input
            type="number"
            min="0"
            value={value.price}
            onChange={e => set({ price: e.target.value })}
            placeholder="650"
            className={inputCls}
            style={{ ...inputStyle, paddingLeft: '3.5rem' }}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: MOON }}>Contact phone</label>
        <input
          type="tel"
          value={value.phone}
          onChange={e => set({ phone: e.target.value })}
          placeholder="+966 5X XXX XXXX"
          className={inputCls}
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>
    </div>
  );
};
