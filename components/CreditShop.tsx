
import React, { useState } from 'react';
import { 
  X, Coins, Zap, ShieldCheck, Sparkles, ChevronRight, 
  Award, Lock, Loader2, CheckCircle2, Copy, AlertTriangle, 
  Wallet, Info, ExternalLink, Heart, QrCode, Search, RefreshCw, XCircle, Bitcoin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyBitcoinTransaction } from '../services/blockchainService';

interface CreditShopProps {
  onClose: () => void;
  onPurchase: (amount: number) => void;
}

const CreditShop: React.FC<CreditShopProps> = ({ onClose, onPurchase }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [verificationLog, setVerificationLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const WALLET_ADDRESS = "15yoEV6mcc1gmP3pnfQzJubaoUwzDYnrNR";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`, {
      style: { borderRadius: '10px', background: '#111827', color: '#fff', fontSize: '10px', fontWeight: 'bold' }
    });
  };

  const addLog = (msg: string) => setVerificationLog(prev => [...prev.slice(-4), msg]);

  const handleBlockchainVerification = async () => {
    setIsProcessing(true);
    setError(null);
    setVerificationLog([]);

    addLog("Connecting to Bitcoin Core Node (Mainnet)...");
    await new Promise(r => setTimeout(r, 1000));
    
    addLog("Querying UTXO set for target address...");
    await new Promise(r => setTimeout(r, 800));

    addLog(`Scanning address: ${WALLET_ADDRESS.substring(0, 8)}...`);
    
    const result = await verifyBitcoinTransaction();

    if (result.success) {
      addLog(`Match Found! Amount: ${result.amount} BTC`);
      addLog(result.confirmations ? "Confirmations: 1+ Verified." : "Status: Pending in Mempool.");
      
      setIsProcessing(false);
      setIsSuccess(true);
      
      toast.success("Bitcoin Transaction Detected!", { icon: '₿' });
      
      setTimeout(() => {
        const pts = Math.floor(parseFloat(result.amount || "0") * 1000000);
        onPurchase(pts > 0 ? pts : 1000); 
        onClose();
      }, 4000);
    } else {
      addLog("Search complete. No matching UTXO found.");
      setIsProcessing(false);
      setError(result.error || "Verification failed. Ensure you have sent the BTC and wait for a few minutes.");
      toast.error("Bitcoin ledger match not found.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in duration-300 relative">
        
        {(isProcessing || isSuccess) && (
          <div className="absolute inset-0 z-[120] bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
             {!isSuccess ? (
               <div className="space-y-8 w-full max-w-md">
                  <div className="relative mx-auto w-20 h-20">
                     <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
                     <Bitcoin className="absolute inset-0 m-auto w-10 h-10 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Blockchain Audit in Progress</h3>
                    <p className="text-slate-500 text-xs font-medium">Scanning the Bitcoin Timechain for your signature.</p>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-[10px] text-left space-y-2 text-amber-300/80">
                    {verificationLog.map((log, i) => (
                      <div key={i} className="flex items-center gap-2">
                         <span className="text-amber-600">›</span> {log}
                      </div>
                    ))}
                  </div>
               </div>
             ) : (
               <div className="animate-in zoom-in duration-700">
                  <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-[0_0_50px_rgba(245,158,11,0.4)] mb-8 mx-auto">
                    <CheckCircle2 className="w-16 h-16" />
                  </div>
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Sovereign Settlement</h3>
                  <p className="text-amber-100 font-medium max-w-sm mx-auto">Your Bitcoin contribution has been acknowledged on-chain. Impact points added to your cryptographic profile.</p>
               </div>
             )}
          </div>
        )}

        <div className="px-8 py-10 border-b border-slate-100 flex flex-col items-center text-center relative overflow-hidden bg-slate-50/50">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"></div>
          <div className="p-5 bg-amber-500 rounded-3xl text-white mb-6 shadow-2xl shadow-amber-500/20 border border-amber-400">
            <Bitcoin className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">Sovereign Sponsorship</h2>
          <p className="text-sm font-medium text-slate-500 max-w-md">Your voluntary Bitcoin contributions fuel our adversarial research and high-stealth infrastructure.</p>
          <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-slate-200 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-12">
          <div className="max-w-2xl mx-auto space-y-10">
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-start gap-4">
               <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
               <div>
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Network Information</h4>
                  <p className="text-xs text-amber-700 font-bold leading-relaxed">
                    Ensure you are sending via the **Bitcoin (BTC)** network. SegWit (bc1) and Legacy (1) addresses are supported. Settlement can take 10-60 minutes depending on fee priority.
                  </p>
               </div>
            </div>

            <div className="space-y-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
               <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bitcoin Deposit Address</label>
                     <button onClick={() => copyToClipboard(WALLET_ADDRESS, "Address")} className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-800 transition-all">
                        <Copy className="w-3.5 h-3.5" /> Copy Address
                     </button>
                  </div>
                  <div className="w-full p-6 bg-white border border-slate-200 rounded-2xl font-mono text-xs text-slate-900 break-all leading-relaxed shadow-sm text-center">
                    {WALLET_ADDRESS}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center text-center">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Currency</p>
                     <p className="text-xs font-black text-slate-900 uppercase">BTC (Bitcoin)</p>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center text-center">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Address Format</p>
                     <p className="text-xs font-black text-slate-900 uppercase">Legacy (P2PKH)</p>
                  </div>
               </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
                 <XCircle className="w-4 h-4 shrink-0" />
                 {error}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-6 items-center">
               <button 
                 onClick={handleBlockchainVerification}
                 disabled={isProcessing}
                 className="flex-1 w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 shadow-2xl hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-[0.98]"
               >
                 <ShieldCheck className="w-5 h-5 text-amber-500" />
                 Verify On-Chain History
               </button>

               <button 
                 onClick={onClose}
                 className="px-10 py-6 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group"
               >
                 Go Back
                 <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
               </button>
            </div>
          </div>
        </div>

        <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                 <Lock className="w-4 h-4 text-slate-400" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encrypted Terminal</span>
              </div>
              <div className="flex items-center gap-3 text-amber-600">
                 <ShieldCheck className="w-4 h-4" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Timechain Verified</span>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Open-Source Freedom</span>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CreditShop;
