import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2, Calendar } from 'lucide-react';
import { Button, Input } from './ui';
import { User } from '../types/index';
import { privateTripAPI } from '../services/api';
import { showToast } from './Toast';

interface Props {
  onClose: () => void;
  onCreated: (trip: any) => void;
}

export const CreatePrivateTripModal = ({ onClose, onCreated }: Props) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Debounced user search
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await privateTripAPI.searchUsers(searchQuery.trim());
        const alreadyInvited = new Set(invitedUsers.map(u => u.id));
        setSearchResults(results.filter((u: User) => !alreadyInvited.has(u.id)));
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const addUser = (user: User) => {
    setInvitedUsers(prev => [...prev, user]);
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    setSearchQuery('');
  };

  const removeUser = (id: string) => {
    setInvitedUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showToast('Please enter a trip name', 'error');
      return;
    }
    setIsCreating(true);
    try {
      const trip = await privateTripAPI.create({
        title: title.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        inviteIds: invitedUsers.map(u => u.id),
      });
      showToast('Private trip created!', 'success');
      onCreated(trip);
    } catch {
      showToast('Failed to create trip', 'error');
    }
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/50 flex items-end sm:items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-lg text-slate-900">New Private Trip</h2>
            <p className="text-xs text-slate-500 mt-0.5">Invite-only trip for friends</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Trip Name */}
          <Input
            label="Trip Name"
            placeholder="e.g. Riyadh Weekend with the Crew"
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />Start Date
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
                <Calendar className="w-3 h-3 inline mr-1" />End Date
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

          {/* Invite Friends */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              <UserPlus className="w-3 h-3 inline mr-1" />Invite Friends
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => addUser(u)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left border-b border-slate-50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex-shrink-0">+ Add</span>
                  </button>
                ))}
              </div>
            )}

            {/* Invited Users */}
            {invitedUsers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {invitedUsers.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-[9px] font-bold">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-emerald-800">{u.name.split(' ')[0]}</span>
                    <button onClick={() => removeUser(u.id)} className="text-emerald-400 hover:text-emerald-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />Creating...
              </span>
            ) : (
              'Create Trip'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
