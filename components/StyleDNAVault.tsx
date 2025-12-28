import React, { useState } from 'react';
import { 
  Dna, Fingerprint, Plus, X, Check, Search, ShieldCheck, 
  Book, ScrollText, Library, Ghost, Briefcase, Sparkles, AlertCircle
} from 'lucide-react';
import { LinguisticProfile, IdentityLevel } from '../types';
import toast from 'react-hot-toast';

interface StyleDNAVaultProps {
  profiles: LinguisticProfile[];
  activeProfileId: string | null;
  onProfileSelect: (id: string | null) => void;
  onAddProfile: (profile: LinguisticProfile) => void;
  onClose: () => void;
}

export const SYSTEM_ARCHETYPES: Partial<LinguisticProfile>[] = [
  { id: 'sys_ug', name: 'Undergraduate', level: 'UNDERGRADUATE', iconName: 'Book', complexity: 62, burstiness: 88, category: 'SYSTEM', sample: 'Balanced undergraduate prose. Focuses on clear argumentative transitions and standardized academic vocabulary without excessive abstraction.' },
  { id: 'sys_msc', name: 'Master\'s (MSc)', level: 'MSC', iconName: 'ScrollText', complexity: 79, burstiness: 72, category: 'SYSTEM', sample: 'Specialized research-grade style. High lexical density with emphasis on critical evaluation and nuanced theoretical frameworks.' },
  { id: 'sys_phd', name: 'PhD Researcher', level: 'POSTGRADUATE', iconName: 'Library', complexity: 96, burstiness: 65, category: 'SYSTEM', sample: 'Elite scholarly writing. Characterized by complex syntactic nesting, exhaustive evidentiary grounding, and highly technical lexicon.' },
  { id: 'sys_ghost', name: 'Global Stealth', level: 'GHOST', iconName: 'Ghost', complexity: 85, burstiness: 99, category: 'SYSTEM', sample: 'Maximum entropy mode. Utilizes adversarial rhythmic jitter and unpredictable sentence structures to bypass global AI detection signatures.' },
  { id: 'sys_exec', name: 'Executive Memo', level: 'EXECUTIVE', iconName: 'Briefcase', complexity: 70, burstiness: 78, category: 'SYSTEM', sample: 'Authoritative, direct, and pragmatic. Optimized for decision-makers who value high-level synthesis and actionable professional insight.' }
];

const IconRenderer = ({ name, className }: { name: string, className?: string }) => {
  switch (name) {
    case 'Book': return <Book className={className} />;
    case 'ScrollText': return <ScrollText className={className} />;
    case 'Library': return <Library className={className} />;
    case 'Ghost': return <Ghost className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    default: return <Fingerprint className={className} />;
  }
};

const StyleDNAVault: React.FC<StyleDNAVaultProps> = ({ 
  profiles, activeProfileId, onProfileSelect, onAddProfile, onClose 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSample, setNewSample] = useState('');
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');

  const handleAdd = () => {
    if (newSample.length < 500) {
      toast.error("Need at least 500 characters for accurate DNA sequencing.");
      return;
    }
    const newProfile: LinguisticProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName || `Identity #${profiles.length + 1}`,
      sample: newSample,
      complexity: 85,
      burstiness: 75,
      category: 'CUSTOM',
      level: 'GHOST'
    };
    onAddProfile(newProfile);
    setIsAdding(false);
    setNewName('');
    setNewSample('');
    toast.success("Custom DNA Sequenced", { icon: '🧬' });
  };

  const customProfiles = profiles.filter(p => p.category === 'CUSTOM');

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/20 animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <Dna className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter font-heading">Linguistic DNA Vault</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Stealth Identification</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => { setActiveTab('system'); setIsAdding(false); }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Institutional Personas
            </button>
            <button 
              onClick={() => setActiveTab('custom')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Custom DNA
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {isAdding ? (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <p className="text-xs font-bold text-indigo-800">Paste a document you wrote. The V14 engine will extract your rhythmic patterns, lexical biases, and syntactical DNA for seamless humanization.</p>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Label</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 font-bold"
                  placeholder="e.g., My Academic Voice v1.2"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Style Sample</label>
                   <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">500+ Chars Required</span>
                </div>
                <textarea 
                  className="w-full h-80 px-8 py-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 resize-none font-serif-doc text-xl leading-relaxed text-slate-700"
                  placeholder="Paste your past assignments, papers, or articles here..."
                  value={newSample}
                  onChange={(e) => setNewSample(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleAdd}
                  className="flex-1 py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 font-heading"
                >
                  <Fingerprint className="w-5 h-5" /> Sequence Linguistic DNA
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-10 py-5 bg-slate-100 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all font-heading"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeTab === 'custom' && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="group border-2 border-dashed border-slate-200 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-6 hover:border-indigo-400 hover:bg-indigo-50 transition-all min-h-[300px]"
                >
                  <div className="p-5 bg-slate-100 text-slate-400 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    <Plus className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">New Identity</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clone your writing style</p>
                  </div>
                </button>
              )}

              {(activeTab === 'system' ? SYSTEM_ARCHETYPES : customProfiles).map(profile => {
                const isActive = activeProfileId === profile.id || (!activeProfileId && profile.id === 'sys_ghost');
                return (
                  <div 
                    key={profile.id}
                    onClick={() => onProfileSelect(profile.id!)}
                    className={`group relative p-8 rounded-[3rem] border-2 cursor-pointer transition-all duration-300 min-h-[300px] flex flex-col justify-between ${isActive ? 'border-indigo-600 bg-indigo-50/50 shadow-2xl' : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-xl'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`p-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-white group-hover:bg-indigo-600'}`}>
                        <IconRenderer name={profile.iconName || 'Fingerprint'} className="w-6 h-6" />
                      </div>
                      {isActive && (
                        <div className="px-4 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-sm animate-in zoom-in">
                          <Check className="w-3.5 h-3.5" /> Active
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-1 font-heading">{profile.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{profile.category === 'SYSTEM' ? 'Institutional Grade' : 'Custom Cloned'}</p>
                      </div>
                      
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                        {profile.sample?.substring(0, 150)}...
                      </p>
                      
                      <div className="flex gap-6 pt-2">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Complexity</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500" style={{ width: `${profile.complexity}%` }}></div>
                            </div>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Burstiness</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500" style={{ width: `${profile.burstiness}%` }}></div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-12 py-8 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                 <ShieldCheck className="w-5 h-5 text-indigo-400" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Stealth Active</span>
              </div>
              <div className="flex items-center gap-3">
                 <Search className="w-5 h-5 text-indigo-400" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adversarial Rhythmic Jitter</span>
              </div>
           </div>
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional DNA Moat • V14 Engine</p>
        </div>
      </div>
    </div>
  );
};

export default StyleDNAVault;