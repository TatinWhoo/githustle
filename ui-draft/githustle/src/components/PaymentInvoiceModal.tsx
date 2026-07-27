import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PaymentInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  payingInvoice: {
    id: string;
    milestone_title: string;
    amount: number;
  } | null;
  onPayConfirm: (method: string) => void;
}

export default function PaymentInvoiceModal({
  isOpen,
  onClose,
  payingInvoice,
  onPayConfirm
}: PaymentInvoiceModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'maya' | 'bank' | 'card' | 'paypal'>('gcash');
  const [isPaymentSimulating, setIsPaymentSimulating] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'auth' | 'verify' | 'complete' | null>(null);

  if (!isOpen || !payingInvoice) return null;

  const handleSimulatePayment = () => {
    setIsPaymentSimulating(true);
    setPaymentStep('auth');

    // Simulate 3 steps: Auth, Verify, Complete
    setTimeout(() => {
      setPaymentStep('verify');
      setTimeout(() => {
        setPaymentStep('complete');
        setTimeout(() => {
          setIsPaymentSimulating(false);
          setPaymentStep(null);
          onPayConfirm(paymentMethod);
        }, 800);
      }, 1000);
    }, 1000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={() => !isPaymentSimulating && onClose()}
          className="absolute inset-0 bg-black"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-md w-full bg-white border border-border p-5 rounded-2xl shadow-2xl z-50 font-sans text-xs select-none"
        >
          <div className="flex justify-between items-center pb-2.5 border-b border-border">
            <div className="flex items-center gap-1.5 text-gh-teal">
              <Receipt size={18} weight="fill" />
              <span className="font-sans font-extrabold text-xs uppercase tracking-wider text-gh-ink">
                GCash Escrow Handshake Signature
              </span>
            </div>
            {!isPaymentSimulating && (
              <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 cursor-pointer transition">
                <X size={18} />
              </button>
            )}
          </div>

          {isPaymentSimulating ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 border-4 border-gh-teal/20 border-t-gh-teal rounded-full"
                />
                <Receipt size={24} className="text-gh-teal animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-sans font-bold text-sm text-text-primary">
                  {paymentStep === 'auth' && "Requesting GCash API Node Auths..."}
                  {paymentStep === 'verify' && "Validating Ledger Signature Hash..."}
                  {paymentStep === 'complete' && "Settling Escrow Handshake SLA..."}
                </h4>
                <p className="font-mono text-[10px] text-text-muted max-w-xs">
                  {paymentStep === 'auth' && "Establishing TLS 1.3 encrypted handshake with Globe Sandbox nodes..."}
                  {paymentStep === 'verify' && `Parsing invoice ID ${payingInvoice.id} payload against smart contract rules...`}
                  {paymentStep === 'complete' && "Disbursing pre-funded escrow holding directly to freelancer's GCash wallet..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="bg-slate-50 border border-border/80 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-text-muted">Target ID</span>
                  <strong className="text-text-primary font-bold">{payingInvoice.id}</strong>
                </div>
                <div className="flex justify-between font-sans text-xs">
                  <span className="text-text-muted font-medium">Milestone</span>
                  <strong className="text-text-primary font-semibold truncate max-w-[200px]">{payingInvoice.milestone_title}</strong>
                </div>
                <div className="flex justify-between font-mono text-sm pt-2 border-t border-border/40">
                  <span className="text-text-muted">Disbursing Amount</span>
                  <strong className="text-gh-teal font-bold">₱{payingInvoice.amount.toLocaleString()}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary text-[10px] uppercase tracking-wider">Select Digital Wallet / Payment Route</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['gcash', 'maya', 'bank', 'card', 'paypal'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        paymentMethod === method
                          ? 'border-gh-teal bg-gh-teal-light/20 text-gh-teal-hover'
                          : 'border-border bg-white hover:border-border/80 text-text-secondary'
                      }`}
                    >
                      <span className="font-sans font-bold text-[10px] uppercase tracking-wide">{method}</span>
                      <span className="font-mono text-[8px] text-text-muted">
                        {method === 'gcash' && "Globe Digital E-Wallet"}
                        {method === 'maya' && "Smart Maya Wallet"}
                        {method === 'bank' && "PH Local Bank Routing"}
                        {method === 'card' && "Visa / Mastercard PH"}
                        {method === 'paypal' && "Global PayPal Clearing"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 text-text-muted rounded-xl flex items-start gap-2 border border-border/40 leading-relaxed text-[9px] font-mono">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-gh-amber" />
                <span>Digital handshakes bypass standard banking batch windows. Escrow payout is processed on the immutable sandbox ledger and disbursed instantly.</span>
              </div>
            </div>
          )}

          {!isPaymentSimulating && (
            <div className="flex justify-end gap-2 pt-2.5 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-border hover:bg-slate-50 rounded-lg font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="px-4 py-1.5 text-white bg-gh-teal hover:bg-gh-teal-hover rounded-lg font-bold shadow-sm cursor-pointer flex items-center gap-1 text-xs"
              >
                <ShieldCheck size={14} />
                <span>Initiate Payout Signature Handshake</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
