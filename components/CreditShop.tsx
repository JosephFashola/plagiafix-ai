
import React, { useState } from 'react';
import { 
  X, Zap, ShieldCheck, Sparkles, ChevronRight, 
  Award, Lock, Loader2, CheckCircle2, Copy, AlertTriangle, 
  Wallet, Info, ExternalLink, Heart, QrCode, Search, RefreshCw, XCircle, Bitcoin,
  Trophy, Star, Crown, GraduationCap, CreditCard, Building2, Apple,
  ExternalLink as LinkIcon,
  CreditCard as CardIcon,
  Coins,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyBitcoinTransaction } from '../services/blockchainService';
import { Telemetry } from '../services/telemetry';

interface CreditShopProps {
  onClose: () => void;
  onPurchase: (amount: number) => void;
}

const CreditShop: React.FC<CreditShopProps> = ({ onClose, onPurchase }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [method, setMethod] = useState<'checkout' | 'crypto'>('checkout');
  const [selectedTier, setSelectedTier] = useState<number>(2); 

  const WALLET_ADDRESS = "15yoEV6mcc1gmP3pnfQzJubaoUwzDYnrNR";
  const BILLING_PORTAL_URL = "https://plagiafix.lemonsqueezy.com/billing"; // Replace with your actual LS portal link

  const TIERS = [
    { id: 1, name: "Essay Pack", credits: 1000, priceBTC: "0.00015", priceFiat: 9.99, icon: <Star />, desc: "Perfect for short papers (~3,000 words)", color: "indigo", checkoutUrl: "https://plagiafix.lemonsqueezy.com/checkout/buy/essay-pack" },
    { id: 2, name: "Thesis Shield", credits: 10000, priceBTC: "0.0012", priceFiat: 49.00, icon: <GraduationCap />, desc: "Complete dissertation protection", color: "amber", popular: true, checkoutUrl: "https://plagiafix.lemonsqueezy.com/checkout/buy/thesis-shield" },
    { id: 3, name: "Agency Vault", credits: 50000, priceBTC: "0.005", priceFiat: 199.00, icon: <Crown />, desc: "High-volume institutional use", color: "emerald", checkoutUrl: "https://plagiafix.lemonsqueezy.com/checkout/buy/agency-vault" },
  ];

  const handleStandardCheckout = () => {
    const tier = TIERS.find(t => t.id === selectedTier);
    if (!tier) return;
    
    setIsProcessing(true);
    toast.loading("Redirecting to Secure Checkout...");
    
    setTimeout(() => {
        window.open(tier.checkoutUrl, '_blank');
        setIsProcessing(false);
        toast.dismiss();
        toast.success("Checkout link opened in new tab.");
    }, 1200);
  };

  const handleBlockchainVerification = async () => {
    setIsProcessing(true);
    const result = await verifyBitcoinTransaction();
    if (result.success) {
      setIsSuccess(true);
      const tier = TIERS.find(t => t.id === selectedTier);
      onPurchase(tier ? tier.credits : 10000);
      Telemetry.logDonation(result.amount || "0", result.confirmations || 1);
    } else {
      setIsProcessing(false);
      toast.error(result.error || "Ledger match not found.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20 dark:border-slate-800 animate-in zoom-in duration-500">
        
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
          <div className="lg:w-80 bg-slate-50 dark:bg-slate-950/50 p-12 flex flex-col justify-between border-r border-slate-100 dark:border-slate-800">
            <div className="space-y-10">
              <div className="p-4 bg-indigo-600 rounded-3xl w-fit shadow-xl">
                 <Coins className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 font-heading">Secure Credits</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  PlagiaFix uses a credit-based authorization system. One credit equals one full neural rewrite.
                </p>
              </div>

              {/* Added Manage Billing Button */}
              <button 
                onClick={() => window.open(BILLING_PORTAL_URL, '_blank')}
                className="w-full py-4 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-4 group hover:border-indigo-500 transition-all shadow-sm"
              >
                <History className="w-5 h-5 text-indigo-500 group-hover:rotate-[-45deg] transition-transform" />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Manage Billing</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Invoices & Portal</p>
                </div>
              </button>
            </div>
            
            <div className="space-y-6">
               <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Processing
               </div>
               <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                  <LinkIcon className="w-4 h-4 text-indigo-500" /> Instant Provisioning
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 relative bg-white dark:bg-slate-900">
            <button onClick={onClose} className="absolute top-8 right-8 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-all">
              <X className="w-6 h-6 text-slate-500" />
            </button>

            <div className="flex justify-center mb-16">
              <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] flex gap-2">
                <button 
                  onClick={() => setMethod('checkout')}
                  className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${method === 'checkout' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <CardIcon className="w-4 h-4" /> Card / Apple Pay
                </button>
                <button 
                  onClick={() => setMethod('crypto')}
                  className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${method === 'crypto' ? 'bg-white dark:bg-slate-700 text-amber-500 dark:text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Bitcoin className="w-4 h-4" /> Bitcoin Node
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {TIERS.map((tier) => (
                <button 
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative p-10 rounded-[3.5rem] border-2 transition-all flex flex-col items-center text-center gap-6 group ${selectedTier === tier.id ? `border-${tier.color}-500 bg-${tier.color}-50/50 dark:bg-${tier.color}-950/20 shadow-2xl` : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200'}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">Most Popular</div>
                  )}
                  <div className={`p-5 rounded-2xl transition-all duration-500 ${selectedTier === tier.id ? `bg-${tier.color}-500 text-white` : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:scale-110'}`}>
                    {React.cloneElement(tier.icon as React.ReactElement, { className: "w-8 h-8" })}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{tier.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{tier.credits.toLocaleString()} Credits</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{tier.desc}</p>
                  <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800 w-full text-4xl font-black text-slate-900 dark:text-white font-heading">
                    {method === 'crypto' ? `${tier.priceBTC} BTC` : `$${tier.priceFiat}`}
                  </div>
                </button>
              ))}
            </div>

            <div className="max-w-3xl mx-auto">
              {method === 'checkout' ? (
                <div className="bg-slate-900 rounded-[3rem] p-12 text-white space-y-10 shadow-2xl border border-white/5 animate-in slide-in-from-bottom-6">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                           <CardIcon className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight">Institutional Billing</h3>
                           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Powered by LemonSqueezy MoR</p>
                        </div>
                      </div>
                      <div className="flex gap-3 grayscale opacity-50">
                         <Building2 className="w-6 h-6" />
                         <Building2 className="w-6 h-6" />
                         <Building2 className="w-6 h-6" />
                      </div>
                   </div>

                   <button 
                    onClick={handleStandardCheckout}
                    disabled={isProcessing}
                    className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-4 group active:scale-95 disabled:opacity-50"
                   >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <LinkIcon className="w-6 h-6" />}
                      Launch Secure Checkout
                   </button>
                   
                   <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest">
                     Transactions handled by Lemon Squeezy, a Merchant of Record. Tax-compliant invoices for research grants will be provided.
                   </p>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-[3rem] p-12 text-white space-y-10 shadow-2xl border border-white/5 animate-in slide-in-from-bottom-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                           <Bitcoin className="w-8 h-8 text-amber-500" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight">Direct Node Settlement</h3>
                           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">P2P Sovereign Payment</p>
                        </div>
                      </div>
                      <span className="px-4 py-1.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">Realtime Audit</span>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center px-4">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Blockchain Address</label>
                         <button onClick={() => { navigator.clipboard.writeText(WALLET_ADDRESS); toast.success("Address Copied"); }} className="text-[10px] font-black text-indigo-400 hover:text-white uppercase flex items-center gap-2 transition-all"><Copy className="w-3.5 h-3.5" /> Copy Link</button>
                      </div>
                      <div className="w-full p-8 bg-black/40 border border-white/10 rounded-3xl font-mono text-sm text-indigo-300 break-all text-center select-all">
                         {WALLET_ADDRESS}
                      </div>
                   </div>

                   <button 
                    onClick={handleBlockchainVerification}
                    disabled={isProcessing}
                    className="w-full py-8 bg-white text-slate-900 hover:bg-slate-100 rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                   >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                      Verify Transaction on Ledger
                   </button>

                   <div className="flex items-center justify-center gap-4 p-4 bg-white/5 rounded-2xl">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ensure you send the EXACT amount of BTC before verifying.</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditShop;
