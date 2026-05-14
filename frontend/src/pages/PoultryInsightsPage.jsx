import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

const token = () => localStorage.getItem('expenses_token');

function fmt(n, decimals = 2) {
  if (n == null) return '—';
  return Number(n).toFixed(decimals);
}
function fmtMoney(n) {
  if (n == null) return '—';
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

const METRICS = [
  { key: 'fcr',           label: 'FCR',              lower: true,  desc: 'Feed Conversion Ratio — lower is better' },
  { key: 'converted_fcr', label: 'Converted FCR',    lower: true,  desc: 'Adjusted FCR accounting for mortality' },
  { key: 'eef',           label: 'EEF',              lower: false, desc: 'European Efficiency Factor — higher is better' },
  { key: 'mortality_pct', label: 'Mortality %',      lower: true,  desc: 'Lower mortality is better' },
  { key: 'avg_body_wt',   label: 'Avg Body Wt (Kg)', lower: false, desc: 'Higher average weight = better growth' },
  { key: 'day_gain',      label: 'Day Gain',         lower: false, desc: 'Average daily weight gain (grams)' },
  { key: 'mean_age',      label: 'Mean Age (days)',  lower: true,  desc: 'Age at sale — lower means faster cycle' },
  { key: 'feed_rs_kg',    label: 'Feed Rs/Kg',       lower: true,  desc: 'Feed cost per kg of bird' },
  { key: 'prod_cost_rs_kg', label: 'Prod Cost Rs/Kg', lower: true, desc: 'Total production cost per kg' },
  { key: 'avg_sale_rate', label: 'Avg Sale Rate',    lower: false, desc: 'Sale price per kg' },
  { key: 'ern_rc_kg',     label: 'Earned RC/Kg',     lower: false, desc: 'Earned rearing charge per kg' },
  { key: 'net_pay',       label: 'Net Pay (₹)',      lower: false, desc: 'Total net payment received' },
];

function MiniBar({ value, max, lower }) {
  if (value == null || max == null) return null;
  const pct = Math.min(100, (value / max) * 100);
  const good = lower ? pct <= 50 : pct >= 50;
  return (
    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
      <div
        className={`h-1.5 rounded-full ${good ? 'bg-emerald-400' : 'bg-red-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Trend({ current, prev, lower }) {
  if (current == null || prev == null) return null;
  const diff = current - prev;
  const improved = lower ? diff < 0 : diff > 0;
  if (Math.abs(diff) < 0.001) return <Minus size={12} className="text-gray-400" />;
  return improved
    ? <TrendingUp size={12} className="text-emerald-500" />
    : <TrendingDown size={12} className="text-red-500" />;
}

export default function PoultryInsightsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('fcr');

  useEffect(() => {
    fetch('/api/poultry/bills/all', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(j => { setBills(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-6" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (bills.length === 0) return (
    <div className="p-6 max-w-4xl mx-auto text-center py-20">
      <BarChart2 size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No bills yet</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500">Upload rearing charge bills in the Batches page to see insights here.</p>
    </div>
  );

  const selected = METRICS.find(m => m.key === activeMetric);
  const chartVals = bills.map(b => ({ label: b.batch_name, value: b[activeMetric] })).filter(b => b.value != null);
  const maxVal = Math.max(...chartVals.map(b => b.value), 0.001);
  const minVal = Math.min(...chartVals.map(b => b.value));

  // Best batch per metric
  function best(key, lower) {
    const valid = bills.filter(b => b[key] != null);
    if (!valid.length) return null;
    return valid.reduce((a, b) => (lower ? b[key] < a[key] : b[key] > a[key]) ? b : a);
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart2 size={20} className="text-amber-500" /> Batch Insights
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{bills.length} batch{bills.length !== 1 ? 'es' : ''} with bills</p>
      </div>

      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map(m => (
          <button key={m.key} onClick={() => setActiveMetric(m.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeMetric === m.key
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartVals.length > 0 && selected && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{selected.label}</h2>
            <span title={selected.desc}><Info size={13} className="text-gray-400 cursor-help" /></span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{selected.lower ? '↓ lower is better' : '↑ higher is better'}</span>
          </div>
          <div className="space-y-3">
            {chartVals.map((b, i) => {
              const pct = Math.min(100, ((b.value - (selected.lower ? 0 : minVal * 0.8)) / (maxVal - (selected.lower ? 0 : minVal * 0.8))) * 100);
              const isBest = selected.lower ? b.value === minVal : b.value === maxVal;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0 truncate" title={b.label}>{b.label}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden relative">
                    <div
                      className={`h-6 rounded-full transition-all flex items-center justify-end pr-2 ${isBest ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600'}`}
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-16 text-right shrink-0 ${isBest ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {activeMetric === 'net_pay' ? fmtMoney(b.value) : fmt(b.value, activeMetric === 'chick_housed' ? 0 : 3)}
                    {isBest && ' ★'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full comparison table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">All Batches — Key Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-4 py-3 whitespace-nowrap">Batch</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">FCR</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Conv FCR</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">EEF</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Mort%</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Avg Wt</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Feed/Kg</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Prod/Kg</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Sale Rate</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Net Pay</th>
                <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-3 whitespace-nowrap">Grade</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill, i) => {
                const prev = bills[i + 1];
                return (
                  <tr key={bill.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[140px] truncate">{bill.batch_name}</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">{fmt(bill.fcr, 3)} <Trend current={bill.fcr} prev={prev?.fcr} lower /></div>
                      <MiniBar value={bill.fcr} max={Math.max(...bills.map(b => b.fcr ?? 0))} lower />
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(bill.converted_fcr, 3)}</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">{fmt(bill.eef, 2)} <Trend current={bill.eef} prev={prev?.eef} lower={false} /></div>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(bill.mortality_pct, 3)}</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(bill.avg_body_wt, 3)}</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(bill.feed_rs_kg, 2)}</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(bill.prod_cost_rs_kg, 2)}</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(bill.avg_sale_rate, 3)}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmtMoney(bill.net_pay)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {bill.grade && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          bill.grade === 'A' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                          bill.grade === 'B' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          bill.grade === 'C' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>{bill.grade}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best performers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Best FCR', m: 'fcr', lower: true, suffix: '' },
          { label: 'Best EEF', m: 'eef', lower: false, suffix: '' },
          { label: 'Lowest Mortality', m: 'mortality_pct', lower: true, suffix: '%' },
          { label: 'Best Avg Weight', m: 'avg_body_wt', lower: false, suffix: ' Kg' },
          { label: 'Highest Net Pay', m: 'net_pay', lower: false, isMoney: true },
          { label: 'Best Sale Rate', m: 'avg_sale_rate', lower: false, suffix: '/Kg' },
        ].map(({ label, m, lower, suffix, isMoney }) => {
          const b = best(m, lower);
          if (!b) return null;
          return (
            <div key={m} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{b.batch_name}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {isMoney ? fmtMoney(b[m]) : `${fmt(b[m], 3)}${suffix}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
