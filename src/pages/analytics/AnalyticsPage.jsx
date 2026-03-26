import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import useAuthStore from '../../store/auth.store';
import { getMonthly, getYearly, getCategories, getAllTime } from '../../api/analytics.api';
import { fmt } from '../../utils/format';
import PageLayout from '../../components/layout/PageLayout';
import Spinner from '../../components/shared/Spinner';
import useIsMobile from '../../utils/useIsMobile';

const COLORS = ['#f0b429','#38bdf8','#34d399','#a78bfa','#f87171','#fbbf24','#2dd4bf','#f472b6','#fb923c','#a3e635'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'12px 16px',fontSize:13,boxShadow:'0 12px 28px rgba(0,0,0,.18)'}}>
      <div style={{fontWeight:700,marginBottom:6,color:'var(--text)'}}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color,marginBottom:2}}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { activeWorkspace } = useAuthStore();
  const isMobile = useIsMobile();
  const wid = activeWorkspace?.id;
  const [tab, setTab] = useState('monthly');
  const [monthly, setMonthly] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allTime, setAllTime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wid) return;
    setLoading(true);
    Promise.all([
      getMonthly(wid),
      getYearly(wid),
      getCategories(wid),
      getAllTime(wid),
    ]).then(([m, y, c, a]) => {
      setMonthly(m);
      setYearly(y);
      setCategories(c.categories || []);
      setAllTime(a);
    }).finally(() => setLoading(false));
  }, [wid]);

  const tabStyle = (t) => ({
    padding:'9px 16px', borderRadius:12, border:'1px solid var(--border)',
    background: tab===t ? 'var(--surface2)' : 'transparent',
    borderColor: tab===t ? 'var(--gold-dim)' : 'var(--border)',
    color: tab===t ? 'var(--gold)' : 'var(--text-dim)',
    cursor:'pointer', fontSize:13, fontWeight:700,
  });

  if (!wid) return <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>No workspace selected</div>;
  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner /></div>;

  return (
    <PageLayout title="📊 Analytics & Insights" subtitle="Monthly, yearly, category, and long-term spending trends across your current workspace.">
      {/* All-time summary */}
      {allTime && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:1,background:'var(--border)',border:'1px solid var(--border)',borderRadius:'20px',overflow:'hidden',marginBottom:28}}>
          {[
            { label:'Total Spent (All Time)', value: fmt(allTime.totalExpenses), color:'var(--red)' },
            { label:'Total Entries', value: allTime.expenseCount, color:'var(--text)' },
            { label:'Outstanding Debt', value: fmt(allTime.totalDebt), color:'var(--amber)' },
            { label:'Total Invested', value: fmt(allTime.totalInvested), color:'var(--hema,#38bdf8)' },
            { label:'Investment Gain', value: fmt(allTime.investmentGain), color: allTime.investmentGain >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map((s, i) => (
            <div key={i} style={{background:'var(--surface)',padding:'16px 18px'}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:1.1,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>{s.label}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:21,fontWeight:700,color:s.color,lineHeight:1.2}}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
        {['monthly','yearly','categories','income-vs-expense'].map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
            {t === 'monthly' && '📅 Monthly'}
            {t === 'yearly' && '📆 Yearly'}
            {t === 'categories' && '🥧 Categories'}
            {t === 'income-vs-expense' && '📈 Income vs Expense'}
          </button>
        ))}
      </div>

      {/* Monthly spending bar */}
      {tab === 'monthly' && (
        <div>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:18}}>Monthly Spending</h3>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'22px 18px',marginBottom:20}}>
            <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
              <BarChart data={monthly} margin={{top:5,right:20,left:20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{fill:'var(--text-dim)',fontSize:12}} />
                <YAxis tick={{fill:'var(--text-dim)',fontSize:12}} tickFormatter={v => '₹'+v.toLocaleString('en-IN')} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="totalExpenses" name="Expenses" fill="#f87171" radius={[4,4,0,0]} />
                <Bar dataKey="totalIncome" name="Income" fill="#34d399" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {monthly.map((m, i) => (
              <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'14px',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:isMobile ? 'flex-start' : 'center',flexDirection:isMobile ? 'column' : 'row',gap:isMobile ? 12 : 16}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{m.label}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{m.yearLabel} · {m.itemCount} items</div>
                </div>
                <div style={{display:'flex',gap:isMobile ? 12 : 20,textAlign:'right',width:isMobile ? '100%' : 'auto',justifyContent:isMobile ? 'space-between' : 'flex-end'}}>
                  <div>
                    <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:.7}}>Expenses</div>
                    <div style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--red)',fontSize:13}}>{fmt(m.totalExpenses)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:.7}}>Surplus</div>
                    <div style={{fontFamily:'var(--mono)',fontWeight:700,color:m.surplus>=0?'var(--gold)':'var(--red)',fontSize:13}}>{fmt(m.surplus)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yearly comparison */}
      {tab === 'yearly' && (
        <div>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:18}}>Yearly Comparison</h3>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'22px 18px',marginBottom:20}}>
            <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
              <BarChart data={yearly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{fill:'var(--text-dim)',fontSize:12}} />
                <YAxis tick={{fill:'var(--text-dim)',fontSize:12}} tickFormatter={v=>'₹'+v.toLocaleString('en-IN')} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="totalExpenses" name="Expenses" fill="#f87171" radius={[4,4,0,0]} />
                <Bar dataKey="totalIncome"   name="Income"   fill="#34d399" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:'grid',gridTemplateColumns:isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
            {yearly.map((y,i) => (
              <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'16px 18px'}}>
                <div style={{fontWeight:700,fontSize:16,marginBottom:12}}>{y.label}</div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:13,color:'var(--text-dim)'}}>Expenses</span>
                  <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--red)',fontSize:13}}>{fmt(y.totalExpenses)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:13,color:'var(--text-dim)'}}>Income</span>
                  <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--green)',fontSize:13}}>{fmt(y.totalIncome)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:13,fontWeight:700}}>Surplus</span>
                  <span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:14,color:y.surplus>=0?'var(--gold)':'var(--red)'}}>{fmt(y.surplus)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category pie */}
      {tab === 'categories' && (
        <div style={{display:'grid',gridTemplateColumns:isMobile ? '1fr' : 'repeat(auto-fit,minmax(320px,1fr))',gap:20}}>
          <div>
            <h3 style={{fontSize:18,fontWeight:700,marginBottom:18}}>Category Breakdown</h3>
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'22px 18px'}}>
              <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
                <PieChart>
                  <Pie data={categories} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 88 : 110} label={!isMobile ? ({name,percent})=>`${name} ${(percent*100).toFixed(0)}%` : undefined}>
                    {categories.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 style={{fontSize:18,fontWeight:700,marginBottom:18}}>Top Categories</h3>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {categories.slice(0,10).map((c, i) => (
                <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'14px',padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}} />
                  <span style={{flex:1,fontSize:14}}>{c.name}</span>
                  <span style={{fontFamily:'var(--mono)',fontWeight:700,color:COLORS[i%COLORS.length],fontSize:13}}>{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Income vs Expense line */}
      {tab === 'income-vs-expense' && (
        <div>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:18}}>Income vs Expenses Trend</h3>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'22px 18px'}}>
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 360}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{fill:'var(--text-dim)',fontSize:12}} />
                <YAxis tick={{fill:'var(--text-dim)',fontSize:12}} tickFormatter={v=>'₹'+v.toLocaleString('en-IN')} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="totalIncome"   name="Income"   stroke="#34d399" strokeWidth={2} dot={{r:3}} />
                <Line type="monotone" dataKey="totalExpenses" name="Expenses" stroke="#f87171" strokeWidth={2} dot={{r:3}} />
                <Line type="monotone" dataKey="surplus"       name="Surplus"  stroke="#f0b429" strokeWidth={2} strokeDasharray="4 4" dot={{r:3}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
