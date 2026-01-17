
import React, { useState } from 'react';
import { 
  X, Zap, ShieldCheck, Sparkles, 
  Award, Lock, Loader2, CheckCircle2, 
  Heart, Coins, Trophy, ArrowRight,
  ShieldCheck as VerifiedIcon
} from 'lucide-react';
import { Telemetry } from '../services/telemetry';
import toast from 'react-hot-toast';

// Extend window for Paystack Inline JS
declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface CreditShopProps {
  onClose: () => void;
  onPurchase: (amount: number) => void;
  defaultCurrency?: 'USD' | 'NGN';
}

const CreditShop: React.FC<CreditShopProps> = ({ onClose, onPurchase, defaultCurrency = 'NGN' }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the injected environment variable first, then fallback to the provided test key.
  // This allows you to go live just by setting the PAYSTACK_PUBLIC_KEY env var in your hosting provider.
  const PAYSTACK_PUBLIC_KEY = (process.env as any).PAYSTACK_PUBLIC_KEY || "pk_test_523ed4a2cc025285ff73d65e57deaa8f823a8bf9"; 

  const FLAT_FEE = {
    name: "Premium Research Pass",
    credits: 1,
    priceNGN: 2500,
    desc: "Full forensic audit & bypass for MSc, PhD, or Executive documents."
  };

  const handlePaystackPayment = () => {
    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error("Paystack Public Key configuration error.");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading(
      PAYSTACK_PUBLIC_KEY.startsWith('pk_live') 
        ? "Connecting to Live Secure Node..." 
        : "Connecting to Test Node (Payment Sandbox)..."
    );

    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: 'billing@plagiafix.ai', 
        amount: FLAT_FEE.priceNGN * 100, // Amount in kobo
        currency: 'NGN',
        metadata: {
          custom_fields: [
            {
              display_name: "Asset",
              variable_name: "asset",
              value: "Premium Neural Node Unlock"
            },
            {
              display_name: "Platform",
              variable_name: "plagiafix_v14_production"
            }
          ]
        },
        callback: (response: any) => {
          setIsProcessing(false);
          toast.dismiss(loadingToast);
          
          Telemetry.logTransaction(FLAT_FEE.priceNGN, response.reference);

          toast.success("Transaction Successful! Neural Pass Active.", {
            icon: '🔥',
            duration: 5000
          });
          onPurchase(FLAT_FEE.credits);
        },
        onClose: () => {
          setIsProcessing(false);
          toast.dismiss(loadingToast);
          toast.error("Payment session closed.");
        }
      });

      handler.openIframe();
    } catch (e) {
      setIsProcessing(false);
      toast.dismiss(loadingToast);
      toast.error("Paystack engine failed to initialize.");
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 dark:border-slate-800 animate-in zoom-in duration-500">
        
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
          {/* Sidebar */}
          <div className="lg:w-80 bg-slate-50 dark:bg-slate-950/50 p-12 flex flex-col justify-between border-r border-slate-100 dark:border-slate-800">
            <div className="space-y-10">
              <div className="p-4 bg-indigo-600 rounded-3xl w-fit shadow-xl"><Coins className="w-8 h-8 text-white" /></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 font-heading leading-tight">Institutional Billing</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Simple, transparent access. <br/><br/>
                  <b>Undergraduates:</b> <span className="text-emerald-500 font-bold">Free Forever</span><br/>
                  <b>Researchers:</b> ₦2,500 flat fee per document.
                </p>
              </div>
              <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Secure Processor</p>
                 <div className="flex items-center gap-3">
                    <VerifiedIcon className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Paystack Secure</span>
                 </div>
              </div>
            </div>
            <div className="space-y-6">
               <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest"><Heart className="w-4 h-4 text-rose-500" /> FOR STUDENTS</div>
               <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> INSTANT SYNC</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 relative bg-white dark:bg-slate-900 flex flex-col justify-center">
            <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-all z-10"><X className="w-6 h-6 text-slate-500" /></button>

            <div className="text-center mb-12">
               <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-heading mb-4">The Premium Research Pass</h2>
               <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Elite Forensic Humanization for Advanced Scholars</p>
            </div>

            <div className="max-w-xl mx-auto w-full mb-12">
                <div className="bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-600 rounded-[3rem] p-10 text-center space-y-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><Trophy className="w-32 h-32" /></div>
                  <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{FLAT_FEE.name}</h4>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 px-4">{FLAT_FEE.desc}</p>
                  </div>
                  <div className="text-5xl font-black text-slate-900 dark:text-white font-heading">
                    ₦{FLAT_FEE.priceNGN.toLocaleString()}
                  </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto w-full">
                <button 
                  onClick={handlePaystackPayment} 
                  disabled={isProcessing}
                  className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl transition-all flex items-center justify-center gap-4 group active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6 fill-current" />
                  )}
                  {isProcessing ? 'Connecting...' : `Pay ₦${FLAT_FEE.priceNGN.toLocaleString()} with Paystack`}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                {!PAYSTACK_PUBLIC_KEY.startsWith('pk_live') && (
                  <p className="text-center mt-6 text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                    Note: System is currently in TEST MODE.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditShop;
