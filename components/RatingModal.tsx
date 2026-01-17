
import React, { useState } from 'react';
import { 
  X, Star, Send, ShieldCheck, Sparkles, 
  MessageSquare, User, Mail, CheckCircle2, 
  Fingerprint, Activity, Zap
} from 'lucide-react';
import { Telemetry } from '../services/telemetry';
import toast from 'react-hot-toast';

interface RatingModalProps {
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ onClose }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please provide a neural rating.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Fix: Use Telemetry.logFeedback instead of non-existent logRewriteFeedback and format details as a string.
      const feedbackMsg = `User: ${name || 'Anon'} | Email: ${email || 'Anon'} | Comment: ${comment}`;
      await Telemetry.logFeedback(rating, feedbackMsg);
      setIsSuccess(true);
      toast.success("Sentiment Logged", { icon: '🧬' });
      setTimeout(onClose, 2000);
    } catch (e) {
      toast.error("Transmission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in duration-300">
        
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter font-heading">Studio Sentiment</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Experience Audit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-10 space-y-10">
          {isSuccess ? (
            <div className="py-20 text-center space-y-6 animate-in zoom-in duration-500">
               <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Sync Complete</h3>
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Your signature has been added to the performance ledger.</p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-6">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Neural Satisfaction Level</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(star)}
                      className={`p-2 transition-all duration-300 transform ${ (hover || rating) >= star ? 'scale-125 text-amber-400' : 'text-slate-100 hover:text-slate-200' }`}
                    >
                      <Star className={`w-10 h-10 ${ (hover || rating) >= star ? 'fill-current' : '' }`} />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                  {rating === 5 ? 'Perfect Stealth' : rating === 4 ? 'Highly Effective' : rating === 3 ? 'Standard Sync' : rating > 0 ? 'Calibration Needed' : 'Select a Rating'}
                </p>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                         value={name} onChange={(e) => setName(e.target.value)}
                         className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all"
                         placeholder="Institutional Name"
                       />
                    </div>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                         value={email} onChange={(e) => setEmail(e.target.value)}
                         className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all"
                         placeholder="Sync Email"
                       />
                    </div>
                 </div>
                 <textarea 
                   value={comment} onChange={(e) => setComment(e.target.value)}
                   className="w-full h-32 px-6 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 resize-none transition-all"
                   placeholder="Share your forensic experience..."
                 />
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 group"
              >
                {isSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                Transmit Review
              </button>
            </>
          )}
        </div>

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encrypted Feedback Protocol</span>
           </div>
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">V14 Performance Ledger</p>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
