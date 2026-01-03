export function normalizeSeatCode(code: string | null | undefined): string {
  if (!code) return '';
  const s = String(code).trim().toUpperCase();
  const numLetter = s.match(/^(\d+)([A-Z]+)$/i);
  if (numLetter) return `${parseInt(numLetter[1], 10)}${numLetter[2]}`;
  const letterNum = s.match(/^([A-Z]+)(\d+)$/i);
  if (letterNum) return `${parseInt(letterNum[2], 10)}${letterNum[1]}`;
  return s;
}

export function isSeatCodeValid(code: string | null | undefined): boolean {
  if (!code) return false;
  const s = String(code).trim();
  return /^\d+[A-Z]+$/i.test(s) || /^[A-Z]+\d+$/i.test(s);
}
