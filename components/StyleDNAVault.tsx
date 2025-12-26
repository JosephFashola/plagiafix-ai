
import React, { useState } from 'react';
import { Dna, Fingerprint, Plus, X, Check, Search, ShieldCheck } from 'lucide-react';
import { LinguisticProfile } from '../types';
import toast from 'react-hot-toast';

interface StyleDNAVaultProps {
  profiles: LinguisticProfile[];
  activeProfileId: string | null;
  onProfileSelect: (id: string | null) => void;
  onAddProfile: (profile: LinguisticProfile) => void;
  onClose: () => void;
}

const StyleDNAVault: React.FC<StyleDNAVaultProps> = ({ 
  profiles, activeProfileId, onProfileSelect, onAddProfile, onClose 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSample, setNewSample] = useState('');

  const handleAdd = () => {
    if (newSample.length < 100) {
      toast.error("Need at least 100 words for accurate DNA synthesis.");
      return;
    }
    const newProfile: LinguisticProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName || `Identity #${profiles.length + 1}`,
      sample: newSample,
      complexity: 85,
      burstiness: 72
    };
    onAddProfile(newProfile);
    setIsAdding(false);
    setNewName('');
    setNewSample('');
    toast.success("Linguistic DNA Sequenced", { icon: '🧬' });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] border border-white/20">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <Dna className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Linguistic DNA Vault</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Identity Moat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {!isAdding ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => setIsAdding(true)}
                className="group border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50 transition-all h-64"
              >
                <div className="p-4 bg-slate-100 text-slate-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Plus className="w-8 h-8" />
                </div>
                <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Capture New DNA</span>
              </button>

              {profiles.map(profile => (
                <div 
                  key={profile.id}
                  onClick={() => onProfileSelect(profile.id)}
                  className={`relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all h-64 flex flex-col justify-between ${activeProfileId === profile.id ? 'border-indigo-600 bg-indigo-50 shadow-xl' : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-slate-900 text-white rounded-xl">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    {activeProfileId === profile.id && (
                      <div className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                        <Check className="w-3 h-3" /> Live
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-1">{profile.name}</h3>
                    <p className="text-[10px] text-slate-400 font-medium line-clamp-2 italic mb-4">"{profile.sample.substring(0, 100)}..."</p>
                    <div className="flex gap-4">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Perplexity</span>
                          <span className="text-xs font-black text-slate-800">{profile.complexity}%</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Burstiness</span>
                          <span className="text-xs font-black text-slate-800">{profile.burstiness}%</span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Alias</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600"
                  placeholder="e.g., My Academic Voice v1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linguistic Sample</label>
                   <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">Min 100 Words</span>
                </div>
                <textarea 
                  className="w-full h-64 px-6 py-6 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 resize-none font-serif-doc text-lg leading-relaxed"
                  placeholder="Paste several paragraphs of your own writing. The engine will extract your syntactic patterns, word choice biases, and rhythmic variance..."
                  value={newSample}
                  onChange={(e) => setNewSample(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleAdd}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                >
                  <ShieldCheck className="w-5 h-5" /> Sequence DNA
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StyleDNAVault;
