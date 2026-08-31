import React, { useState, useRef } from 'react';
import { useZot } from '../../context/ZotContext';
import { 
  User, 
  Key, 
  Smartphone, 
  LogOut, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  Edit3, 
  X, 
  RotateCcw,
  Lock,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

// Curated high-contrast geometric & developer avatar presets
const PRESET_AVATARS = [
  {
    id: 'neural-amber',
    label: 'Neural Core',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a1710"/><circle cx="50" cy="50" r="30" fill="none" stroke="%23FF9100" stroke-width="6"/><circle cx="50" cy="50" r="14" fill="%23FF9100"/><circle cx="28" cy="28" r="6" fill="%23FF9100"/><circle cx="72" cy="28" r="6" fill="%23FF9100"/><circle cx="28" cy="72" r="6" fill="%23FF9100"/><circle cx="72" cy="72" r="6" fill="%23FF9100"/></svg>'
  },
  {
    id: 'tensor-matrix',
    label: 'Tensor Matrix',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2312110c"/><polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="%2310B981" stroke-width="5"/><polygon points="50,28 72,42 72,68 50,82 28,68 28,42" fill="%2310B981" fill-opacity="0.2" stroke="%2310B981" stroke-width="2"/><circle cx="50" cy="55" r="8" fill="%2310B981"/></svg>'
  },
  {
    id: 'cyber-mesh',
    label: 'Zero-Shot Node',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231f1b13"/><path d="M20 20 L80 80 M80 20 L20 80 M50 10 L50 90 M10 50 L90 50" stroke="%2338bdf8" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="50" r="16" fill="%2318150f" stroke="%2338bdf8" stroke-width="4"/><circle cx="50" cy="50" r="6" fill="%2338bdf8"/></svg>'
  },
  {
    id: 'quantum-flux',
    label: 'Quantum Prism',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2318150f"/><path d="M50 15 L88 78 L12 78 Z" fill="none" stroke="%23a855f7" stroke-width="6"/><circle cx="50" cy="55" r="12" fill="%23a855f7"/><line x1="50" y1="15" x2="50" y2="78" stroke="%23a855f7" stroke-width="2" stroke-dasharray="4 3"/></svg>'
  }
];

export const AccountsView: React.FC = () => {
  const { 
    userAccount, 
    setUserAccount, 
    apiKeys, 
    createApiKey, 
    deleteApiKey,
    setIsAuthModalOpen,
    setAuthModalMode,
    logout
  } = useZot();

  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [selectedScopes] = useState<string[]>(['router:read', 'router:write']);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarTab, setAvatarTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Profile State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    createApiKey(newKeyName.trim(), selectedScopes);
    setNewKeyName('');
    setIsCreatingKey(false);
  };

  const toggleMfa = () => {
    if (!userAccount) return;
    setUserAccount({
      ...userAccount,
      mfaEnabled: !userAccount.mfaEnabled
    });
  };

  // Open Avatar Modal
  const openAvatarEditor = () => {
    setPreviewAvatar(userAccount?.imageUrl || null);
    setImageUrlInput(userAccount?.imageUrl && !userAccount.imageUrl.startsWith('data:') ? userAccount.imageUrl : '');
    setIsAvatarModalOpen(true);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save selected avatar
  const handleSaveAvatar = () => {
    if (!userAccount) return;
    setUserAccount({
      ...userAccount,
      imageUrl: previewAvatar || undefined
    });
    setIsAvatarModalOpen(false);
    showSavedToast();
  };

  // Reset to default User Icon
  const handleResetAvatar = () => {
    if (!userAccount) return;
    setUserAccount({
      ...userAccount,
      imageUrl: undefined
    });
    setPreviewAvatar(null);
    setImageUrlInput('');
    setIsAvatarModalOpen(false);
    showSavedToast();
  };

  // Open Profile Editor
  const openProfileEditor = () => {
    if (!userAccount) return;
    setEditFirstName(userAccount.firstName);
    setEditLastName(userAccount.lastName);
    setEditEmail(userAccount.email);
    setIsEditProfileOpen(true);
  };

  // Save Profile Details
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccount) return;
    setUserAccount({
      ...userAccount,
      firstName: editFirstName.trim() || userAccount.firstName,
      lastName: editLastName.trim() || userAccount.lastName,
      email: editEmail.trim() || userAccount.email
    });
    setIsEditProfileOpen(false);
    showSavedToast();
  };

  const showSavedToast = () => {
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2200);
  };

  if (!userAccount) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-[#1a1710] border border-[#2E2910] rounded-2xl text-center shadow-xl">
        <div className="w-14 h-14 bg-[#FF9100]/10 border border-[#FF9100]/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#FF9100]">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-xs text-stone-400 mb-6">
          Sign in via Clerk to manage your Zero-Shot prompt routing tokens, model configurations, and developer preferences.
        </p>
        <button
          onClick={() => {
            setAuthModalMode('signIn');
            setIsAuthModalOpen(true);
          }}
          className="w-full py-2.5 px-4 bg-[#FF9100] hover:bg-[#e08000] text-black font-semibold rounded-xl text-xs transition-all shadow-md cursor-pointer"
        >
          Sign In to ZOT Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2E2910]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Developer Account & API Access</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FF9100]/20 text-[#FF9100] border border-[#FF9100]/30 uppercase">
              Clerk Managed
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Manage your personal profile, custom user avatar, gateway API tokens, and access credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {profileSavedToast && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Profile Saved & Synced
            </span>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 py-2 px-3.5 bg-[#1f1b13] hover:bg-red-500/20 hover:text-red-400 border border-[#2E2910] hover:border-red-500/30 rounded-xl text-xs font-medium text-stone-300 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-4 mb-5">
              {/* Interactive Avatar Container */}
              <div 
                onClick={openAvatarEditor}
                className="relative group cursor-pointer"
                title="Click to edit avatar photo"
              >
                {userAccount.imageUrl ? (
                  <img 
                    src={userAccount.imageUrl} 
                    alt={`${userAccount.firstName} ${userAccount.lastName}`}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#FF9100] shadow-md group-hover:opacity-75 transition-opacity"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  /* Clean User Icon as Default (no random person image) */
                  <div className="w-16 h-16 rounded-2xl bg-[#231f16] text-[#FF9100] flex items-center justify-center border-2 border-[#2E2910] group-hover:border-[#FF9100] transition-colors shadow-md">
                    <User className="w-8 h-8" />
                  </div>
                )}

                {/* Hover overlay with Camera Icon */}
                <div className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[9px] text-stone-200 font-semibold mt-0.5">Edit</span>
                </div>

                {/* Online Indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#1a1710] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">
                    {userAccount.firstName} {userAccount.lastName}
                  </h3>
                  <button
                    onClick={openProfileEditor}
                    className="p-1 text-stone-400 hover:text-[#FF9100] transition-colors cursor-pointer"
                    title="Edit Name & Email"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-stone-400 font-mono truncate">{userAccount.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#2E2910] text-[#FF9100] font-semibold uppercase">
                    {userAccount.role}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#231f16] text-stone-400">
                    Via {userAccount.authProvider}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Button to Change Avatar Photo */}
            <div className="mb-4">
              <button
                onClick={openAvatarEditor}
                className="w-full py-2 px-3 bg-[#13110c] hover:bg-[#201b13] border border-[#2E2910] hover:border-[#FF9100]/50 rounded-xl text-xs text-stone-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#FF9100]" />
                <span>{userAccount.imageUrl ? 'Change Avatar Photo' : 'Upload / Set Custom Avatar'}</span>
              </button>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-[#2E2910]/60 text-xs">
              <div className="flex justify-between py-1 text-stone-400">
                <span>User Identifier:</span>
                <span className="font-mono text-stone-200">{userAccount.id}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-400">
                <span>Account Created:</span>
                <span className="text-stone-200">{new Date(userAccount.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-400">
                <span>Auth State:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active & Verified
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2E2910]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#FF9100]" />
                <div>
                  <span className="text-xs font-medium text-stone-200 block">2-Factor Auth (MFA)</span>
                  <span className="text-[10px] text-stone-500">Security authentication token prompt</span>
                </div>
              </div>
              <button
                onClick={toggleMfa}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  userAccount.mfaEnabled ? 'bg-[#FF9100]' : 'bg-[#2E2910]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    userAccount.mfaEnabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* API Tokens Generator */}
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#FF9100]" />
                <span>Gateway API Tokens</span>
              </h3>
              <button
                onClick={() => setIsCreatingKey(true)}
                className="flex items-center gap-1 text-xs text-[#FF9100] hover:text-[#e08000] font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generate Key</span>
              </button>
            </div>

            {isCreatingKey && (
              <form onSubmit={handleCreateKey} className="p-3.5 bg-[#13110c] border border-[#FF9100]/40 rounded-xl mb-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">Key Description / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Microservice Token"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#1a1710] border border-[#2E2910] rounded-lg text-xs text-white focus:outline-none focus:border-[#FF9100]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-[#FF9100] hover:bg-[#e08000] text-black font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingKey(false)}
                    className="py-1.5 px-3 bg-[#231f16] text-stone-400 text-xs rounded-lg hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {(apiKeys || []).map((key) => (
                <div key={key.id} className="p-3 bg-[#13110c] border border-[#2E2910] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">{key.name}</div>
                    <div className="font-mono text-[11px] text-stone-400 mt-0.5">{key.prefix}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {(key.scopes || []).map((scope) => (
                        <span key={scope} className="text-[9px] px-1.5 py-0.5 rounded bg-[#2E2910] text-[#FF9100] font-mono">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(key.id, key.prefix)}
                      className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-[#2E2910]/50 transition-colors cursor-pointer"
                      title="Copy Key Prefix"
                    >
                      {copiedKeyId === key.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="p-1.5 text-stone-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#13110c] border border-[#2E2910] rounded-xl text-xs text-stone-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF9100]" />
            <span>Tokens are persisted to local storage across browser refreshes.</span>
          </div>
        </div>
      </div>

      {/* Avatar Editor Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#18150f] border border-[#2E2910] rounded-2xl p-6 shadow-2xl text-stone-100 space-y-5">
            <div className="flex items-center justify-between border-b border-[#2E2910] pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#FF9100]" />
                <h3 className="text-base font-bold text-white">Edit Account Avatar</h3>
              </div>
              <button 
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Avatar Preview */}
            <div className="flex items-center gap-5 p-4 bg-[#12110c] border border-[#2E2910] rounded-xl">
              <div className="relative">
                {previewAvatar ? (
                  <img 
                    src={previewAvatar} 
                    alt="Avatar preview" 
                    className="w-18 h-18 rounded-2xl object-cover border-2 border-[#FF9100]"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-2xl bg-[#231f16] text-[#FF9100] flex items-center justify-center border-2 border-[#2E2910]">
                    <User className="w-9 h-9" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Current Avatar Preview</span>
                <p className="text-[11px] text-stone-400">
                  {previewAvatar ? 'Custom avatar image loaded' : 'Clean User icon (no random person)'}
                </p>
                {previewAvatar && (
                  <button
                    onClick={() => {
                      setPreviewAvatar(null);
                      setImageUrlInput('');
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Revert to Default User Icon</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tabs for Avatar Selection */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAvatarTab('upload')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  avatarTab === 'upload' ? 'bg-[#FF9100] text-black shadow-md' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('url')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  avatarTab === 'url' ? 'bg-[#FF9100] text-black shadow-md' : 'text-stone-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Image URL</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('presets')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  avatarTab === 'presets' ? 'bg-[#FF9100] text-black shadow-md' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Presets</span>
              </button>
            </div>

            {/* Tab 1: File Upload */}
            {avatarTab === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2E2910] hover:border-[#FF9100] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#14120d]"
                >
                  <Upload className="w-8 h-8 text-[#FF9100] mx-auto mb-2" />
                  <span className="text-xs font-semibold text-stone-200 block">
                    Click to browse or drop an image file
                  </span>
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    Supports PNG, JPG, WebP, SVG (Max 5MB)
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Image URL */}
            {avatarTab === 'url' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Image Web Address (URL)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/my-avatar.png"
                    value={imageUrlInput}
                    onChange={(e) => {
                      setImageUrlInput(e.target.value);
                      if (e.target.value.trim().startsWith('http')) {
                        setPreviewAvatar(e.target.value.trim());
                      }
                    }}
                    className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-white placeholder-stone-600"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Tip: You can use your GitHub avatar or any direct image URL.
                </p>
              </div>
            )}

            {/* Tab 3: Presets */}
            {avatarTab === 'presets' && (
              <div className="space-y-3">
                <span className="text-xs text-stone-400 block">Choose a developer badge preset:</span>
                <div className="grid grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPreviewAvatar(preset.dataUrl)}
                      className={`p-2 bg-[#12110c] border rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        previewAvatar === preset.dataUrl
                          ? 'border-[#FF9100] ring-2 ring-[#FF9100]/30'
                          : 'border-[#2E2910] hover:border-stone-500'
                      }`}
                    >
                      <img src={preset.dataUrl} alt={preset.label} className="w-10 h-10 rounded-lg" />
                      <span className="text-[10px] text-stone-300 font-semibold">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#2E2910]">
              <button
                type="button"
                onClick={handleResetAvatar}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white px-3 py-2 rounded-xl hover:bg-[#231f16] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to Default User Icon</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-4 py-2 bg-[#1f1b13] hover:bg-[#2a2418] text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  className="px-4 py-2 bg-[#FF9100] hover:bg-[#e08000] text-black font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  Apply Avatar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Details Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#18150f] border border-[#2E2910] rounded-2xl p-6 shadow-2xl text-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2E2910] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#FF9100]" />
                <h3 className="text-base font-bold text-white">Edit Profile Details</h3>
              </div>
              <button 
                onClick={() => setIsEditProfileOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2E2910]">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 bg-[#1f1b13] hover:bg-[#2a2418] text-stone-300 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF9100] hover:bg-[#e08000] text-black font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
