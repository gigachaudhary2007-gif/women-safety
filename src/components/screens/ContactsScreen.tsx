import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Phone,
  MessageSquare,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Share2,
  ChevronLeft,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { TrustedContact } from '../../types';
import { createWhatsAppDistressUrl, createSmsDistressUrl } from '../../utils/geolocation';
import { soundManager } from '../../utils/audio';

export const ContactsScreen: React.FC = () => {
  const {
    contacts,
    addContact,
    updateContact,
    deleteContact,
    user,
    currentLocation,
    setActiveTab,
    showToast,
  } = useSafety();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [relationship, setRelationship] = useState<TrustedContact['relationship']>('Friend');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [notifyOnJourneyStart, setNotifyOnJourneyStart] = useState<boolean>(true);
  const [notifyOnDeviation, setNotifyOnDeviation] = useState<boolean>(true);
  const [notifyOnSos, setNotifyOnSos] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setPhone('');
    setRelationship('Friend');
    setIsPrimary(contacts.length === 0);
    setNotifyOnJourneyStart(true);
    setNotifyOnDeviation(true);
    setNotifyOnSos(true);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: TrustedContact) => {
    setEditingContact(c);
    setName(c.name);
    setPhone(c.phone);
    setRelationship(c.relationship);
    setIsPrimary(c.isPrimary);
    setNotifyOnJourneyStart(c.notifyOnJourneyStart);
    setNotifyOnDeviation(c.notifyOnDeviation);
    setNotifyOnSos(c.notifyOnSos);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Please enter a valid contact name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 7) {
      setValidationError('Please enter a valid phone number with area code.');
      return;
    }

    if (editingContact) {
      updateContact(editingContact.id, {
        name,
        phone,
        relationship,
        isPrimary,
        notifyOnJourneyStart,
        notifyOnDeviation,
        notifyOnSos,
      });
    } else {
      addContact({
        name,
        phone,
        relationship,
        isPrimary,
        notifyOnJourneyStart,
        notifyOnDeviation,
        notifyOnSos,
      });
    }

    setIsModalOpen(false);
  };

  const handleTestSms = (c: TrustedContact) => {
    soundManager.triggerHaptic(20);
    const url = createSmsDistressUrl(
      c.phone,
      user.name,
      currentLocation.lat,
      currentLocation.lng,
      'Test Safety Check'
    );
    window.open(url, '_blank');
    showToast(`Test alert link generated for ${c.name}`);
  };

  const handleTestWhatsApp = (c: TrustedContact) => {
    soundManager.triggerHaptic(20);
    const url = createWhatsAppDistressUrl(
      c.phone,
      user.name,
      currentLocation.lat,
      currentLocation.lng,
      'SafeJourney Test Check'
    );
    window.open(url, '_blank');
    showToast(`Test WhatsApp link generated for ${c.name}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="h-10 px-4 rounded-2xl glass-panel flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-indigo-600" />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-base lg:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Trusted Circle & Emergency Contacts
            </h1>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
              Designated recipients for live GPS beacons & deviation escalation
            </span>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="h-11 px-5 rounded-2xl bg-indigo-600 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* Grid of Contacts: 1 on mobile, 2 on md, 3 on lg/xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.length === 0 && (
          <div className="col-span-full text-center py-12 px-6 glass-panel rounded-[32px] border border-dashed border-slate-300 dark:border-indigo-900/60 flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">No Trusted Contacts Added Yet</h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-sm">
              Add trusted family members or friends. They will receive automated GPS tracking alerts and emergency SOS beacons.
            </p>
            <button
              onClick={openAddModal}
              className="mt-2 h-10 px-5 rounded-2xl bg-indigo-600 text-white text-xs font-black flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Contact</span>
            </button>
          </div>
        )}
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="glass-panel rounded-[32px] p-5 lg:p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50 transition-all hover:bg-white dark:hover:bg-slate-800/80 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 text-indigo-700 dark:text-indigo-400 font-black text-base flex items-center justify-center shrink-0 border border-indigo-500/20">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{contact.name}</h3>
                      {contact.isPrimary && (
                        <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                          Primary
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block mt-0.5">
                      {contact.phone} · {contact.relationship}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(contact)}
                    className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center justify-center transition cursor-pointer"
                    title="Edit Contact"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteContact(contact.id)}
                    className="w-8 h-8 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 flex items-center justify-center transition cursor-pointer"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex flex-wrap gap-1.5 text-[10px]">
                {contact.notifyOnJourneyStart && (
                  <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-lg font-black border border-indigo-200 dark:border-indigo-900">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                    Trip Start
                  </span>
                )}
                {contact.notifyOnDeviation && (
                  <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-lg font-black border border-blue-200 dark:border-blue-900">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    Deviation
                  </span>
                )}
                {contact.notifyOnSos && (
                  <span className="flex items-center gap-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg font-black border border-red-200 dark:border-red-900">
                    <CheckCircle2 className="w-3 h-3 text-red-600" />
                    SOS Alert
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex items-center gap-2">
              <button
                onClick={() => handleTestWhatsApp(contact)}
                className="flex-1 h-9 rounded-xl glass-panel text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => handleTestSms(contact)}
                className="flex-1 h-9 rounded-xl glass-panel text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>SMS</span>
              </button>
              <a
                href={`tel:${contact.phone}`}
                className="h-9 px-4 rounded-xl bg-indigo-600 text-white flex items-center justify-center transition hover:bg-indigo-700 active:scale-95 cursor-pointer"
                title={`Call ${contact.name}`}
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-md rounded-[32px] p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-indigo-900/60 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-indigo-900/40">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingContact ? 'Edit Contact' : 'Add Trusted Contact'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {validationError && (
                <div className="p-3 rounded-2xl bg-red-100/90 border border-red-300 text-xs text-red-700 font-black">
                  {validationError}
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-900 dark:text-white block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sister, Mom, Best Friend"
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-900 dark:text-white block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-900 dark:text-white block mb-1">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as TrustedContact['relationship'])}
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Partner">Partner</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-indigo-900/40">
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    Designate as Primary Contact
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    First recipient notified during emergency escalation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-12 rounded-full glass-panel text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-full bg-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
