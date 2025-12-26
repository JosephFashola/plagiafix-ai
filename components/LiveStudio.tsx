
import React, { useState, useEffect, useRef } from 'react';
import { LiveHumanizer } from '../services/liveService';
import { HumanizeMode } from '../types';
import { 
  Mic, MicOff, RefreshCw, X, Check, 
  Activity, Sparkles, BrainCircuit, Waves,
  Ghost, GraduationCap, Palette, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LiveStudioProps {
  onCommit: (text: string) => void;
  onClose: () => void;
  initialMode: HumanizeMode;
}

const LiveStudio: React.FC<LiveStudioProps> = ({ onCommit, onClose, initialMode }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<HumanizeMode>(initialMode);
  const [inputTranscript, setInputTranscript] = useState('');
  const [outputTranscript, setOutputTranscript] = useState('');
  const [committedBlocks, setCommittedBlocks] = useState<string[]>([]);
  const humanizerRef = useRef<LiveHumanizer | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputTranscript, committedBlocks]);

  const startSession = async () => {
    try {
      setIsRecording(true);
      humanizerRef.current = new LiveHumanizer();
      await humanizerRef.current.connect(mode, {
        onInputTranscription: (text) => setInputTranscript(prev => prev + text),
        onOutputTranscription: (text) => setOutputTranscript(prev => prev + text),
        onTurnComplete: () => {
          setCommittedBlocks(prev => [...prev, outputTranscript]);
          setOutputTranscript('');
          setInputTranscript('');
        },
        onError: (err) => {
          console.error(err);
          toast.error("Connection Interrupted");
          stopSession();
        },
        onClose: () => setIsRecording(false)
      });
      toast.success("Live Sync Engaged", { icon: '🧬' });
    } catch (e) {
      toast.error("Microphone Access Denied");
      setIsRecording(false);
    }
  };

  const stopSession = async () => {
    await humanizerRef.current?.stop();
    setIsRecording(false);
    if (outputTranscript) {
      setCommittedBlocks(prev => [...prev, outputTranscript]);
      setOutputTranscript('');
    }
  };

  const handleCommit = () => {
    const finalText = [...committedBlocks, outputTranscript].join('\n\n').trim();
    if (finalText) {
      onCommit(finalText);
      onClose();
    } else {
      toast.error("No content to commit.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/20">
        
        {/* Studio Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                 <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Neural Pulse Studio</h2>
                 <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {isRecording ? 'Live Sync Active' : 'System Ready'}
                    </span>
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-6 h-6 text-slate-400" />
           </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
           {/* Sidebar: Mode Selection */}
           <div className="lg:w-64 border-r border-slate-100 p-6 space-y-6 bg-slate-50/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acoustic Mode</p>
              <div className="space-y-3">
                 {[
                   { id: 'Standard', icon: <Zap />, color: 'indigo' },
                   { id: 'Ghost', icon: <Ghost />, color: 'slate' },
                   { id: 'Academic', icon: <GraduationCap />, color: 'emerald' },
                   { id: 'Creative', icon: <Palette />, color: 'purple' }
                 ].map(m => (
                    <button 
                      key={m.id}
                      onClick={() => !isRecording && setMode(m.id as HumanizeMode)}
                      disabled={isRecording}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-3 ${mode === m.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                    >
                       <div className={`p-2 rounded-xl ${mode === m.id ? 'bg-white/10' : 'bg-slate-50'}`}>
                          {React.cloneElement(m.icon as React.ReactElement, { className: "w-4 h-4" })}
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-wider">{m.id}</span>
                    </button>
                 ))}
              </div>
           </div>

           {/* Transcript View */}
           <div className="flex-1 flex flex-col bg-white">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-thin font-serif-doc text-xl leading-relaxed text-slate-800">
                 {committedBlocks.map((block, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500">{block}</div>
                 ))}
                 
                 {outputTranscript && (
                    <div className="text-indigo-600 animate-pulse border-l-4 border-indigo-200 pl-6">
                       {outputTranscript}
                       <span className="inline-block w-1.5 h-6 bg-indigo-600 ml-1 translate-y-1"></span>
                    </div>
                 )}

                 {committedBlocks.length === 0 && !outputTranscript && !isRecording && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 italic">
                       <Waves className="w-16 h-16 mb-4 text-slate-300" />
                       <p>Start recording to initiate real-time humanized synthesis.</p>
                    </div>
                 )}
              </div>

              {/* Visualization Area */}
              <div className="px-10 py-6 border-t border-slate-50 bg-slate-50/20 flex items-center justify-between gap-10">
                 <div className="flex-1 h-12 bg-slate-900 rounded-2xl flex items-center justify-around px-8 relative overflow-hidden">
                    {isRecording ? (
                      [...Array(12)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1.5 bg-indigo-500 rounded-full animate-bounce"
                          style={{ 
                            height: `${Math.random() * 80 + 20}%`,
                            animationDuration: `${Math.random() * 0.5 + 0.5}s`
                          }}
                        ></div>
                      ))
                    ) : (
                      <div className="w-full h-[2px] bg-slate-800"></div>
                    )}
                 </div>

                 <div className="flex items-center gap-4">
                    {!isRecording ? (
                       <button 
                         onClick={startSession}
                         className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3"
                       >
                          <Mic className="w-5 h-5" /> Start Neural Sync
                       </button>
                    ) : (
                       <button 
                         onClick={stopSession}
                         className="px-10 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-3"
                       >
                          <MicOff className="w-5 h-5" /> Stop Session
                       </button>
                    )}
                    
                    <button 
                      onClick={handleCommit}
                      disabled={isRecording || (committedBlocks.length === 0 && !outputTranscript)}
                      className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                       <Check className="w-5 h-5" /> Commit
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStudio;
