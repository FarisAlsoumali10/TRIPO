import React from 'react';
import { Place } from '../types/index';

export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isOpenNow(openingHours?: Record<string, { open: string; close: string; closed?: boolean }>): boolean | null {
  if (!openingHours) return null;
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const hours = openingHours[dayKey] || openingHours['everyday'];
  if (!hours || hours.closed) return false;
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  // handle overnight (e.g. 20:00 – 02:00)
  if (closeMins < openMins) return nowMins >= openMins || nowMins < closeMins;
  return nowMins >= openMins && nowMins < closeMins;
}

export function getTodayHours(openingHours?: Record<string, { open: string; close: string; closed?: boolean }>): string {
  if (!openingHours) return '';
  const dayKey = DAY_KEYS[new Date().getDay()];
  const h = openingHours[dayKey] || openingHours['everyday'];
  if (!h) return '';
  if (h.closed) return 'Closed today';
  return `${h.open} – ${h.close}`;
}

export function getPriceRange(place: Place): number | null {
  if (place.priceRange != null) return place.priceRange;
  const cost = place.avgCost;
  if (cost === undefined || cost === null) return null;
  if (cost === 0) return 1;
  if (cost <= 50) return 2;
  if (cost <= 150) return 3;
  return 4;
}

export function getPriceLevel(p: Place): number {
  if (p.priceRange != null) return p.priceRange;
  const cost = p.avgCost;
  if (cost == null) return 0;
  if (cost === 0) return 1;
  if (cost <= 50) return 2;
  if (cost <= 150) return 3;
  return 4;
}

export function formatDuration(mins?: number): string | null {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}
