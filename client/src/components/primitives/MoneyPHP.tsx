export interface MoneyPHPProps { amount: number; className?: string; showCurrency?: boolean }

const FMT = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export function formatPHP(amount: number, showCurrency = true): string {
  if (!Number.isFinite(amount)) return showCurrency ? '₱0' : '0';
  const abs = Math.abs(amount);
  let s = FMT.format(abs).replace(/\.00$/, '');
  if (!showCurrency) s = s.replace(/^[^\d\-]+/, '').trim();
  return amount < 0 ? `−${s}` : s;
}

export function MoneyPHP({ amount, className = '', showCurrency = true }: MoneyPHPProps) {
  const neg = amount < 0;
  return (
    <span className={`font-mono tabular-nums ${neg ? 'text-gh-red' : ''} ${className}`}>{formatPHP(amount, showCurrency)}</span>
  );
}
