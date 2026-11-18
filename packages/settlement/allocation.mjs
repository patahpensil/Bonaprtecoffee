function money(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new RangeError('Expected nonnegative integer rupiah');
  return value;
}

export function allocate(amount, entries) {
  money(amount);
  if (!Array.isArray(entries) || entries.length === 0) throw new RangeError('Empty allocation');
  const ids = new Set();
  const rows = entries.map(({id, weight}) => {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw new RangeError('Invalid allocation identifier');
    ids.add(id);
    return {id, weight: money(weight)};
  });
  const total = rows.reduce((sum, row) => sum + row.weight, 0n);
  if (amount > total) throw new RangeError('Allocation exceeds balance');
  if (total === 0n) return rows.map(({id}) => ({id, amount: 0n}));
  const ranked = rows.map(({id,weight}) => ({id, amount: amount * weight / total, remainder: amount * weight % total}));
  let left = amount - ranked.reduce((sum,row)=>sum+row.amount,0n);
  ranked.sort((a,b)=> a.remainder === b.remainder ? (a.id < b.id ? -1 : 1) : (a.remainder > b.remainder ? -1 : 1));
  for (const row of ranked) {
    if (left === 0n) break;
    row.amount++;
    left--;
  }
  return ranked.sort((a,b)=>a.id < b.id ? -1 : 1).map(({id,amount})=>({id,amount}));
}

export function cashSettlement(due, settlement, tender) {
  money(due); money(settlement); money(tender);
  if (settlement === 0n || settlement > due || tender < settlement) throw new RangeError('Invalid cash settlement');
  return {settlement, change: tender-settlement, remaining: due-settlement};
}
