'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { DotFitChart } from '@/components/charts/DotFitChart';
import { FitBreakdown } from '@/components/charts/FitBreakdown';
import { CompareModal } from '@/components/compare/CompareModal';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { Loader } from '@/components/feedback/Loader';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { Logo } from '@/components/layout/Logo';
import { PriceDelta } from '@/components/price/PriceDelta';
import { rankTag } from '@/components/rail/MatchCard';
import { Rail } from '@/components/rail/Rail';
import { DEFAULT_BRIEF, briefSummary, fmtStorage, useLabel } from '@/lib/brief';
import { goodFor, rankForBrief } from '@/lib/catalog';
import { fmtPhp } from '@/lib/price';
import { briefFromParams, briefToParams } from '@shared/briefUrl';
import { idealAxes } from '@shared/scoring/fit';
import { useFitlap, useHydrated } from '@/store/useFitlap';
import s from './results.module.css';

const LOAD_MS = 1600;
const WIDTHS = [170, 200, 240];
const NAV: [label: string, d: string][] = [
  ['Brief', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z'],
  ['Matches', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
  ['Recommend', 'M5 5h14v10H5zM2 19h20'],
  ['Details', 'M12 8v8M8 12h8M4 4h16v16H4z'],
  ['Battery & build', 'M4 19V5M4 19h16M8 15l4-5 3 3 4-6'],
  ['Compare', 'M8 4v16M16 4v16M4 8h8M12 16h8'],
];
const HERO_SCREEN: CSSProperties = {
  flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch',
  padding: '14px 16px', boxSizing: 'border-box', color: '#FFFFFF', transition: 'background-color .5s',
};
const HIDDEN: CSSProperties = { visibility: 'hidden' };

const tk = (delay: number): CSSProperties => ({ display: 'block', animation: `tick 520ms cubic-bezier(.2,.9,.2,1) ${delay}ms backwards` });
const wipe = (ms: number, delay: number) => `wipeIn ${ms}ms cubic-bezier(.7,0,.2,1) ${delay}ms backwards`;

function Header({ hrefs, summary }: { hrefs?: string[]; summary?: string }) {
  return (
    <header className={s.header}>
      <Logo />
      {hrefs && (
        <nav aria-label="Sections" className={`${s.hideSm} ${s.nav}`}>
          {NAV.map(([label, d], i) => (
            <Link
              key={label}
              href={hrefs[i]}
              aria-label={label}
              title={label}
              aria-current={i === 2 ? 'page' : undefined}
              className={`ring ${s.navIcon}${i === 2 ? ' ' + s.navOn : ''}`}
              style={{ animation: `navDrop 640ms cubic-bezier(.2,1.3,.4,1) ${120 + i * 70}ms backwards` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
            </Link>
          ))}
        </nav>
      )}
      <div className={s.headRight}>
        <ThemeToggle />
        <Link href="/brief" className={s.briefLink}>
          <span className={`ring ${s.circle44}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          </span>
          <span className={`${s.hideSm} ${s.briefText}`}>
            <span className={s.briefTitle}>Your brief</span>
            <span className={s.briefSub} style={summary ? undefined : HIDDEN}>{summary ?? ' '}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

export function ResultsClient() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const stored = useFitlap((st) => st.brief);
  const setBrief = useFitlap((st) => st.setBrief);
  // The URL is the brief (PLAN §3); the store mirrors it for /brief and the next visit.
  // With no brief in the URL, the stored brief is written there so the page can be shared.
  const fromUrl = useMemo(() => briefFromParams(sp, DEFAULT_BRIEF), [sp]);
  const brief = fromUrl ?? stored;
  const selectedId = useFitlap((st) => st.selectedId);
  const select = useFitlap((st) => st.select);

  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState(0); // replay clicks (restart the timer + loader bar)
  const [loads, setLoads] = useState(0); // finished loads (replay the sleeper track)
  const [tick, setTick] = useState(0); // selection or load end: replays lid, tickers, dither, pill
  const [why, setWhy] = useState(false);
  const [whyT, setWhyT] = useState(0);
  const [dens, setDens] = useState(1);
  const [cmpOpen, setCmpOpen] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      setTick((n) => n + 1);
      setLoads((n) => n + 1);
    }, LOAD_MS);
    return () => clearTimeout(t);
  }, [loading, run]);

  useEffect(() => {
    if (!hydrated) return;
    if (!fromUrl) router.replace('/results?' + briefToParams(stored, DEFAULT_BRIEF), { scroll: false });
    else if (JSON.stringify(fromUrl) !== JSON.stringify(stored)) setBrief(fromUrl);
  }, [hydrated, fromUrl, stored, router, setBrief]);

  const ranked = rankForBrief(brief);
  const idx = Math.max(0, ranked.findIndex((r) => r.laptop.slug === selectedId));
  const cur = ranked[idx];
  // ponytail: advanced mode draws the 4 work-mix axes with no ideal outline until the 8-axis chart is designed (spec §4.6).
  const ideal = brief.mode === 'simple' ? idealAxes(brief) : null;
  const summary = hydrated ? briefSummary(brief) : undefined;

  if (!cur)
    return (
      <div className={s.wrap}>
        <Header summary={summary} />
        <main className={s.main}>
          <div className={`${s.hero} ${s.heroCol}`}>
            <span className={s.emptyTitle}>Nothing fits this brief</span>
            <Link href="/brief" className={`cta ${s.ctaDark}`}>Adjust your brief <span className={`arw ${s.arw}`}>→</span></Link>
          </div>
        </main>
      </div>
    );

  const busy = loading || !hydrated;
  const dim = { opacity: !hydrated ? 0 : busy ? 0.35 : 1 };
  const l = cur.laptop;
  const c = cur.config;
  const p = c.price;
  const detailsHref = `/laptop/${l.slug}`;
  const next = [...ranked.slice(idx + 1), ...ranked.slice(0, idx)].slice(0, 2);
  const compareHref = '/compare?c=' + [cur, ...next].map((r) => r.config.code).join(',');
  const cfg = c.label;

  const pick = (id: string) => {
    select(id);
    setTick((n) => n + 1);
    setWhyT((n) => n + 1);
  };
  const go = (d: number) => pick(ranked[(idx + d + ranked.length) % ranked.length].laptop.slug);
  const toggleWhy = () => {
    setWhy((w) => !w);
    setWhyT((n) => n + 1);
  };
  const replay = () => {
    setLoading(true);
    setRun((n) => n + 1);
  };
  const openCmp = () => setCmpOpen(true);

  const facts: [string, string][] = [
    ['Model', l.model],
    ['Weight', l.weightKg.toFixed(2) + ' kg'],
    ['Memory', c.ramGb + ' GB'],
    ['Storage', fmtStorage(c.storageGb)],
    ['Good for', goodFor(brief, c.code).map(useLabel).join(' · ') || '—'],
  ];
  const prices = [
    {
      meta: 'SRP · ' + (p.srpSource ?? '—'), dot: 'var(--lime)', label: 'New price', value: p.srpPhp !== undefined ? fmtPhp(p.srpPhp) : 'Used only', delay: 80, off: null,
      block: 'var(--accent)', blockDelay: 120, pills: [['Source', p.srpSource ?? '—', 'var(--lime)'], ['Config', cfg, 'var(--blue)']],
    },
    {
      meta: 'Used est. · ' + (p.usedSource ?? '—'), dot: 'var(--accent)', label: 'Used price', value: p.usedPhp !== undefined ? fmtPhp(p.usedPhp) : '—', delay: 160,
      off: <PriceDelta price={p} size={13} suffix=" vs new" />,
      block: '#B8B8B8', blockDelay: 220, pills: [['Source', p.usedSource ?? '—', 'var(--accent)'], ['Checked', p.usedSeenAt ?? '—', 'var(--blue)']],
    },
  ];

  return (
    <div className={s.wrap}>
      <Header hrefs={['/brief', '/results', '/results', detailsHref, detailsHref + '#battery', compareHref]} summary={summary} />

      <div className={s.row}>
        <aside className={s.left} style={dim}>
          <div className={s.between}>
            <span className={s.label}>Laptop details</span>
            <Link href={detailsHref} aria-label="Open full details" className={`ring ${s.openBtn}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
            </Link>
          </div>
          <div className={s.idBox}>
            <span className={s.light}>Match ID</span>
            <span className={s.idLine}><span key={tick} style={tk(0)}><span className={s.idVal}>{c.code}</span></span></span>
          </div>
          <div className={s.facts}>
            {facts.map(([k, v], i) => (
              <div key={k} className={i === 4 ? `${s.fact} ${s.wide}` : s.fact}>
                <span className={s.factKey}>{k}</span>
                <span className={s.clip}><span key={tick} style={tk(60 + i * 50)}><span className={s.factVal}>{v}</span></span></span>
              </div>
            ))}
          </div>
          <div className={s.chartBox}>
            <span className={s.axis}>Performance</span>
            <div className={s.chartMid}>
              <span className={s.axis}>Value</span>
              <DotFitChart key={tick} axes={[cur.axes.performance, cur.axes.portability, cur.axes.battery, cur.axes.value]} ideal={ideal ? [ideal.performance, ideal.portability, ideal.battery, ideal.value] : undefined} className={s.chart}>
                <button className={s.pill} onClick={toggleWhy} aria-expanded={why} title="How is this scored?" style={{ animation: wipe(500, 1150) }}>
                  <span style={{ color: 'var(--good)' }}>↑</span> {cur.fit}% · {cur.verdict} <span className={why ? `${s.q} ${s.qOn}` : s.q}>?</span>
                </button>
              </DotFitChart>
              <span className={s.axis}>Portability</span>
            </div>
            <span className={s.axis}>Battery</span>
            {ideal && <span className={s.legend}>Ideal for your brief</span>}
          </div>
          <FitBreakdown
            rows={cur.rows}
            fit={cur.fit}
            open={why}
            replay={whyT}
            innerStyle={{ borderTop: '1px solid var(--line2)' }}
            header={
              <div className={s.between}>
                <span className={s.label}>How {cur.fit}% adds up</span>
                <button aria-label="Close breakdown" onClick={toggleWhy} className={`ring ${s.close32}`}>×</button>
              </div>
            }
          />
        </aside>

        <main className={s.main}>
          <div className={s.mainHead} style={hydrated ? undefined : HIDDEN}>
            <span className={s.label}>{idx === 0 ? 'Top match' : `Match ${rankTag(idx + 1)} of ${ranked.length}`}</span>
            <span className={s.light}>{`${l.dims.w.toFixed(1)} × ${l.dims.d.toFixed(1)} × ${l.dims.h.toFixed(1)} mm`}</span>
          </div>
          {busy ? (
            <Loader key={run} className={`${s.hero} ${s.heroCol}`} />
          ) : (
            <div className={s.hero}>
              <button aria-label="Previous match" className={`ring ${s.arrowBtn}`} onClick={() => go(-1)}>‹</button>
              <div className={s.stage}>
                <div className={s.stageRow}>
                  <Link key={tick} href={detailsHref} aria-label="Open details" className={s.heroLink} style={{ animation: 'deck 1100ms cubic-bezier(.2,.9,.2,1) backwards' }}>
                    <LaptopDrawing
                      shape={l.archetype}
                      hot={cur.hot}
                      animate="lid"
                      big
                      floor
                      screenStyle={HERO_SCREEN}
                      screen={
                        <>
                          <span className={s.scan} style={{ animation: 'scan 900ms cubic-bezier(.5,0,.3,1) 1150ms backwards' }} />
                          <span className={s.screenTitle}>FITLAP · {rankTag(idx + 1)}</span>
                          <span className={s.disc}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
                          </span>
                          <span className={s.screenText}>{`${c.ramGb} GB\n${fmtStorage(c.storageGb)}\n${cur.fit}%`}</span>
                        </>
                      }
                    />
                  </Link>
                  <button className={s.cmpSlot} onClick={openCmp} aria-haspopup="dialog">
                    <span className={s.spinBox}>
                      <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden style={{ position: 'absolute', inset: 0, animation: 'spin 9s linear infinite' }}>
                        <circle cx="30" cy="30" r="28" fill="none" stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 5" />
                      </svg>
                      <span className={s.plus}>+</span>
                    </span>
                    <span className={s.slotText}>Compare</span>
                  </button>
                </div>
              </div>
              <button aria-label="Next match" className={`ring ${s.arrowBtn}`} onClick={() => go(1)}>›</button>
            </div>
          )}
          <div className={s.ctaRow}>
            <Link href={detailsHref} className={`cta ${s.ctaDark}`}>View full details <span className={`arw ${s.arw}`}>→</span></Link>
            <button onClick={openCmp} aria-haspopup="dialog" className={`ring ${s.ghostBtn}`}>+ Compare</button>
          </div>
        </main>

        <aside className={s.prices} style={dim}>
          {prices.map((c) => (
            <section key={c.label} className={s.pcard}>
              <div className={s.pmeta}><span className={s.meta}>{c.meta}</span><span className={s.dot8} style={{ background: c.dot }} /></div>
              <div className={s.pmid}>
                <span className={s.light}>{c.label}</span>
                <span className={s.pvbox}><span key={tick} style={tk(c.delay)}><span className={s.pval}>{c.value}</span></span></span>
                {c.off}
              </div>
              <div key={tick} className={s.pblock} style={{ backgroundColor: c.block, animation: wipe(700, c.blockDelay) }} />
              <div className={s.ppills}>
                {c.pills.map(([k, v, dot]) => (
                  <div key={k} className={s.ppill}>
                    <span className={s.factKey}>{k}</span>
                    <span className={s.ppillBody}><span className={s.dot6} style={{ background: dot }} />{v}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </aside>
      </div>

      <div className={s.controls}>
        <span className={s.label} style={hydrated ? undefined : HIDDEN}>
          {ranked.length} {ranked.length === 1 ? 'match' : 'matches'} · sorted by fit<span className={s.hideSm}> · tap a card to load it</span>
        </span>
        <div className={`${s.hideSm} ${s.density}`}>
          <button aria-label="Smaller cards" className={`ring ${s.densBtn}`} onClick={() => setDens((d) => Math.max(0, d - 1))}>−</button>
          <div className={s.densTrack}>
            <span className={s.knob} style={{ left: dens * 50 + '%' }}><span className={s.knobCore} /></span>
          </div>
          <button aria-label="Bigger cards" className={`ring ${s.densBtn}`} onClick={() => setDens((d) => Math.min(2, d + 1))}>+</button>
        </div>
        <div className={s.iconBtns}>
          <button aria-label="Replay rail" title="Replay" className={`ring ${s.iconBtn}`} onClick={replay}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>
          </button>
          <Link href={compareHref} aria-label="Compare" className={`ring ${s.iconBtn}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--ink)" aria-hidden>
              <rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" />
            </svg>
          </Link>
        </div>
      </div>

      <Rail items={ranked} currentId={l.slug} width={WIDTHS[dens]} loading={busy} replay={loads} onPick={pick} />

      {cmpOpen && <CompareModal ranked={ranked} current={idx} onClose={() => setCmpOpen(false)} />}
    </div>
  );
}
