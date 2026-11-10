/**
 * Utility functions for Bengali and English number conversion, 
 * formatting, and In-Words generation based on the original Billing.cs
 */

export function parseNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  const s = String(val).trim();
  if (!s) return 0;

  // Convert Bengali digits (০-৯) to English (0-9)
  let converted = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0x09e6 && code <= 0x09ef) {
      converted += String.fromCharCode(48 + (code - 0x09e6));
    } else if (s[i] !== ',' && s[i] !== ' ') {
      converted += s[i];
    }
  }

  const d = parseFloat(converted);
  return isNaN(d) ? 0 : d;
}

export function formatMoney(d: number): string {
  const num = Math.round((d || 0) * 100) / 100;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatQty(d: number): string {
  const num = Math.round((d || 0) * 100) / 100;
  return String(num);
}

export function formatQty4(d: number): string {
  const num = Math.round((d || 0) * 10000) / 10000;
  return String(num);
}

const Ones = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];

const Tens = [
  '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
];

function b100(n: number): string {
  if (n < 20) return Ones[n];
  return (Tens[Math.floor(n / 10)] + ' ' + Ones[n % 10]).trim();
}

function b1000(n: number): string {
  let s = '';
  if (n >= 100) s = Ones[Math.floor(n / 100)] + ' HUNDRED';
  if (n % 100 > 0) s += (s.length > 0 ? ' ' : '') + b100(n % 100);
  return s;
}

export function numberToWords(n: number): string {
  if (n === 0) return 'ZERO';
  if (n < 0) return 'MINUS ' + numberToWords(-n);

  let s = '';
  let rem = Math.floor(n);

  const cr = Math.floor(rem / 10000000);
  rem %= 10000000;

  const lk = Math.floor(rem / 100000);
  rem %= 100000;

  const th = Math.floor(rem / 1000);
  rem %= 1000;

  if (cr > 0) s += numberToWords(cr) + ' CRORE ';
  if (lk > 0) s += b100(lk) + ' LAKH ';
  if (th > 0) s += b100(th) + ' THOUSAND ';
  if (rem > 0) s += b1000(rem);

  return s.trim();
}

export function inWords(amt: number): string {
  const rounded = Math.round((amt || 0) * 100) / 100;
  const a = Math.abs(rounded);
  const whole = Math.floor(a);
  const paisa = Math.round((a - whole) * 100);

  let s = numberToWords(whole);
  if (paisa > 0) {
    s += ' AND ' + numberToWords(paisa) + ' PAISA';
  }
  if (amt < 0) s = 'MINUS ' + s;
  return s + ' ONLY';
}

export function formatDateBangla(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return dateStr as string;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBangla(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return dateStr as string;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}
