export function fmt(n) {
  const num = Number(n) || 0;
  const abs = Math.abs(num);
  if (abs >= 10000000) return (num < 0 ? '-' : '') + '₹' + (abs/10000000).toFixed(2) + 'Cr';
  if (abs >= 100000)   return (num < 0 ? '-' : '') + '₹' + (abs/100000).toFixed(2) + 'L';
  return (num < 0 ? '-' : '') + '₹' + abs.toLocaleString('en-IN');
}

export function pct(a, b) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

export function classNames(...args) {
  return args.filter(Boolean).join(' ');
}
