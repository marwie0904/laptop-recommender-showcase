'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Brief, FormPref } from '@shared/brief';
import type { Laptop } from '@shared/catalog';
import { compareLabels, missesGpu, portCount, wifiRank } from '@shared/scoring/compare';
import type { Scored } from '@shared/scoring/fit';
import { SLIM_KG, SLIM_MM } from '@shared/scoring/weights';
import { getLaptops, rankForBrief, scoreForCode, scoreForDisplay } from '@/lib/catalog';
import { budgetCap, fmtStorage, USE_CASES } from '@/lib/brief';
import { displayShort, portSummary, wifiLabel } from '@/lib/format';
import { fmtDate, fmtPhp, newPriceLabel } from '@/lib/price';
import { CATALOG } from '@/data/catalog';
import { useFitlap, useHydrated } from '@/store/useFitlap';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { DotFitChart } from '@/components/charts/DotFitChart';
import { PriceDelta } from '@/components/price/PriceDelta';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { Switch } from '@/components/controls/Switch';
import { Logo } from '@/components/layout/Logo';
import { ScrollRow } from '@/components/layout/ScrollRow';
import s from './compare.module.css';

const FORM_SHORT: Record<FormPref, string> = { slim: 'Slim', metal: 'Metal', convertible: '2-in-1', bigScreen: 'Big screen' };

// [label, value → [text, score (higher is better; null = no "best")], misses the brief?]
type SpecRow = [string, (s: Scored) => [string, number | null], ((s: Scored, b: Brief) => boolean)?];
const SPEC_ROWS: SpecRow[] = [
  ['Processor', (s) => [s.config.cpu.name, s.dims.cpu]],
  ['Graphics', (s) => [s.config.gpu.name, s.dims.gpu], missesGpu],
  ['Memory', (s) => [s.config.ramGb + ' GB', s.config.ramGb], (s, b) => s.config.ramGb < b.minRamGb],
  ['Storage', (s) => [fmtStorage(s.config.storageGb), s.config.storageGb], (s, b) => s.config.storageGb < b.minStorageGb],
  ['Display', (s) => [displayShort(s.laptop, s.config), s.dims.display]],
  ['Battery · coding', (s) => ['~' + s.laptop.hoursByUse.coding + ' h', s.laptop.hoursByUse.coding], (s) => s.laptop.hoursByUse.coding < 8],
  ['Weight', (s) => [s.laptop.weightKg.toFixed(2) + ' kg', -s.laptop.weightKg], (s, b) => b.forms.includes('slim') && s.laptop.weightKg > SLIM_KG],
  ['Thickness', (s) => [s.laptop.dims.h + ' mm', -s.laptop.dims.h], (s, b) => b.forms.includes('slim') && s.laptop.dims.h > SLIM_MM],
  ['Build score', (s) => [s.laptop.buildOverall.toFixed(1), s.laptop.buildOverall]],
  ['Ports', (s) => [portSummary(s.laptop.ports), portCount(s.laptop)]],
  ['Wireless', (s) => [wifiLabel(s.laptop.wifi), wifiRank(s.laptop)]],
  ['OS', (s) => [s.laptop.os, null]],
];

const CODES = new Set(getLaptops().flatMap((l) => l.configs.map((c) => c.code)));
/** Known config codes only, deduped, max 4. Slugs from old links or saved lists drop out here. */
const clean = (list: string[]) => [...new Set(list)].filter((code) => CODES.has(code)).slice(0, 4);

// Scramble decode (section 5): 20 ticks of 40ms, p += .05. Glyphs come from a hash instead of Math.random so render stays pure.
const GLYPHS = '0123456789#%/<>=+×';
const TICKS = 20;
function scramble(str: string, tick: number, offset: number, seed: number) {
  const p = Math.max(0, Math.min(1, (tick / TICKS) * 1.6 - offset));
  if (p >= 1) return str;
  let out = '';
  for (let k = 0; k < str.length; k++) {
    const ch = str[k];
    const h = (Math.imul(k + 1, 2654435761) ^ Math.imul(tick + 1, 40503) ^ seed) >>> 0;
    out += ch === ' ' || k / str.length < p ? ch : GLYPHS[h % GLYPHS.length];
  }
  return out;
}

export default function CompareClient() {
  const router = useRouter();
  const raw = useSearchParams().get('c') ?? '';
  const hydrated = useHydrated();
  const brief = useFitlap((st) => st.brief);
  const compareIds = useFitlap((st) => st.compareIds);
  const setCompare = useFitlap((st) => st.setCompare);

  const ranked = useMemo(() => rankForBrief(brief), [brief]);
  const scores = useMemo(() => new Map(getLaptops().map((l) => [l.slug, scoreForDisplay(l, brief)])), [brief]);

  // URL is the source of truth (?c=MBP14-M,X1C-13, spec §4.3). With no valid codes: the store's list,
  // else the brief's top 3, else the catalog's first 3, each on its default config.
  const urlIds = clean(raw.split(','));
  const fallback = () => {
    const stored = clean(compareIds);
    if (stored.length) return stored;
    return (ranked.length ? ranked : getLaptops().map((l) => scores.get(l.slug)!)).slice(0, 3).map((r) => r.config.code);
  };
  const ids = !hydrated ? [] : urlIds.length ? urlIds : fallback();
  const key = ids.join(',');

  const [diff, setDiff] = useState(false);
  const [picker, setPicker] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Every change to the list re-rails the cards, replays the charts and re-runs the decode.
  const [run, setRun] = useState({ key, n: 0 });
  if (run.key !== key) {
    setRun({ key, n: run.n + 1 });
    setTick(0);
    setLeaving(null);
  }

  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setTick(n);
      if (n >= TICKS) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [run.n]);

  // Normalise the URL (fallback, bad or duplicate codes) and mirror it into the store.
  useEffect(() => {
    if (!key) return;
    setCompare(key.split(','));
    if (raw !== key) router.replace('/compare?c=' + key, { scroll: false });
  }, [key, raw, router, setCompare]);

  const out = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(out.current), []);

  const commit = (next: string[]) => {
    setCompare(next);
    router.replace('/compare?c=' + next.join(','), { scroll: false });
  };
  const remove = (id: string) => {
    if (leaving) return;
    setLeaving(id);
    setPicker(false);
    out.current = setTimeout(() => commit(ids.filter((x) => x !== id)), 420);
  };
  const add = (id: string) => {
    if (leaving || ids.length >= 4) return;
    setPicker(false);
    commit([...ids, id]);
  };

  const rankOf = (l: Laptop) => {
    const i = ranked.findIndex((r) => r.laptop.slug === l.slug);
    return '#' + String((i === -1 ? getLaptops().indexOf(l) : i) + 1).padStart(2, '0');
  };

  const colScores = ids.map((code) => scoreForCode(code, brief)!);
  const cols = colScores.map((sc) => sc.laptop);
  const labels = compareLabels(colScores, brief);
  const slotsLeft = 4 - cols.length;

  let hidden = 0;
  const specRows = SPEC_ROWS.map(([label, get, miss], r) => {
    const vals = colScores.map(get);
    const same = vals.length > 1 && vals.every((v) => v[0] === vals[0][0]);
    const top = Math.max(...vals.map((v) => v[1] ?? -Infinity));
    const uniqueBest = vals.length > 1 && top !== -Infinity && vals.filter((v) => v[1] === top).length === 1;
    const collapse = diff && same;
    if (collapse) hidden++;
    return (
      <div key={label} className={`${s.row} ${collapse ? s.collapsed : ''}`}>
        <div className={s.rowInner}>
          <div className={s.crow}>
            <span className={`${s.lc} ${s.kicker}`}>{label}</span>
            {[0, 1, 2, 3].map((i) => {
              const v = vals[i];
              if (!v) return <div key={i} className={s.cell}><span className={s.none}>·</span></div>;
              const misses = miss?.(colScores[i], brief) ?? false;
              const best = uniqueBest && v[1] === top;
              return (
                <div key={i} className={s.cell}>
                  <span className={`${s.dot} ${misses ? s.misses : s.meets}`} />
                  <span className={`${s.val} ${best ? s.best : misses ? s.valMiss : ''}`}>{scramble(v[0], tick, i * 0.1 + (r % 6) * 0.04, i * 31 + r)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.headL}>
          <Link href="/results" aria-label="Back to matches" className={`ring ${s.back}`}>‹</Link>
          <Logo />
        </div>
        <div className={s.headR}>
          {hydrated && (
            <>
              {brief.uses.map((u) => (
                <span key={u} className={s.chip}><span className={s.chipDot} style={{ background: 'var(--accent)' }} />{USE_CASES.find((c) => c.key === u)!.pill}</span>
              ))}
              {brief.forms.length > 0 && (
                <span className={s.chip}><span className={s.chipDot} style={{ background: 'var(--blue)' }} />{brief.forms.map((f) => FORM_SHORT[f]).join(' · ')}</span>
              )}
              <span className={s.chip}>
                <span className={s.chipDot} style={{ background: 'var(--lime)' }} />
                {budgetCap(brief.budgetMax)} · {brief.minRamGb} GB · {fmtStorage(brief.minStorageGb)}
              </span>
            </>
          )}
          <Link href="/brief" className={s.edit}>Edit brief</Link>
          <ThemeToggle />
        </div>
      </header>

      {cols.length > 0 && (
        <>
          <ScrollRow className={s.scroller}>
            <div className={s.inner}>
              <ScrollRow className={`${s.csec} ${s.csec1}`}>
                <div className={`${s.lc} ${s.lc1}`}>
                  <div className={s.titleBlock}>
                    <span className={s.kicker}>Compare · {cols.length} of 4</span>
                    <span className={s.ctitle}>Side by side</span>
                  </div>
                  <Switch checked={diff} onChange={setDiff}>Differences only</Switch>
                </div>
                {[0, 1, 2, 3].map((i) => {
                  const l = cols[i];
                  if (!l) {
                    if (i > cols.length) return <div key={'blank' + i} className={s.blank} />;
                    return (
                      <div key="add" className={s.add}>
                        <button aria-label="Add a laptop to compare" aria-expanded={picker} onClick={() => setPicker(!picker)} className={s.addBtn}>
                          <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden style={{ position: 'absolute', inset: 0, animation: 'spin 9s linear infinite' }}>
                            <circle cx="30" cy="30" r="28" fill="none" stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 5" />
                          </svg>
                          <span className={s.plus} style={{ transform: `rotate(${picker ? 45 : 0}deg)` }}>+</span>
                        </button>
                        <span className={s.addLabel}>Add a laptop</span>
                        <span className={s.left}>{slotsLeft} {slotsLeft === 1 ? 'slot' : 'slots'} left</span>
                        {picker && (
                          <div className={s.picker} style={{ animation: 'unfurl 380ms cubic-bezier(.7,0,.2,1) backwards' }}>
                            {getLaptops().filter((o) => !cols.includes(o)).map((o) => (
                              <button key={o.slug} className={s.pick} onClick={() => add(scores.get(o.slug)!.config.code)}>
                                <span>{o.model}</span>
                                <span className={s.pickFit}>{scores.get(o.slug)!.fit}%</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const sc = colScores[i];
                  return (
                    <div
                      key={ids[i] + ':' + run.n}
                      className={s.slot}
                      style={{
                        animation: leaving === ids[i]
                          ? 'squeeze 420ms cubic-bezier(.7,0,.2,1) forwards'
                          : `railInShort ${1100 + i * 120}ms cubic-bezier(.12,.9,.25,1) ${i * 70}ms backwards`,
                      }}
                    >
                      <article className={`${s.ccard} ${i === 0 ? s.top : ''}`}>
                        <div className={s.cardHead}>
                          <span>{rankOf(l)}{i === 0 && ' · Top pick'}</span>
                          <button aria-label={`Remove ${l.model} from compare`} className={`ring ${s.x}`} onClick={() => remove(ids[i])}>×</button>
                        </div>
                        <Link href={`/laptop/${l.slug}`} aria-label={`${l.model} details`} className={s.pic}>
                          <div className={s.cpic}><LaptopDrawing shape={l.archetype} hot={sc.hot} /></div>
                        </Link>
                        <div className={s.names}>
                          <span className={s.cname}>{l.model}</span>
                          <span className={s.cfg}>{sc.config.cpu.name} · {sc.config.ramGb} GB · {fmtStorage(sc.config.storageGb)}</span>
                        </div>
                        <div className={s.priceRow}>
                          <div className={s.prices}>
                            <span>{newPriceLabel(sc.config.price)}</span>
                            {sc.config.price.usedPhp !== undefined && (
                              <span className={s.used}>Used {fmtPhp(sc.config.price.usedPhp)} <PriceDelta price={sc.config.price} size={13} /></span>
                            )}
                          </div>
                          <span className={s.cfit}>{sc.fit}<span className={s.pct}>%</span></span>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </ScrollRow>

              <section className={s.csec}>
                <div className={s.secHead}>
                  <div className={s.secTitle}><span className={s.kicker}>01</span><span className={s.cst}>How each fits your brief</span></div>
                  <span className={s.legend}>
                    <span className={s.legendItem}><span className={s.fitsDot} />fits</span>
                    <span className={s.legendItem}><span className={s.gapDot} />gap</span>
                  </span>
                </div>
                <ScrollRow className={s.cgrid}>
                  <div className={`${s.lc} ${s.lc2}`}>
                    <span className={s.lcnote}>Each axis is weighted by your use cases. The bigger the orange shape, the better it fits.</span>
                    {[
                      ['Top', 'Performance', 'CPU, GPU and RAM for your use cases'],
                      ['Right', 'Portability', 'weight and thickness'],
                      ['Bottom', 'Battery', 'hours on your use mix'],
                      ['Left', 'Value', 'specs per peso'],
                    ].map(([pos, label, why]) => (
                      <div key={pos} className={s.axis}>
                        <span className={s.axisName}><span className={s.axisPos}>{pos}</span> · {label}</span>
                        <span className={`${s.lcnote} ${s.why}`}>{why}</span>
                      </div>
                    ))}
                  </div>
                  {[0, 1, 2, 3].map((col) => {
                    const l = cols[col];
                    if (!l) return <div key={'empty' + col} className={s.emptyChart}>Add a laptop to see its fit</div>;
                    const a = colScores[col].axes;
                    return (
                      <div key={ids[col]} className={s.chartCol}>
                        <span className={s.axl}>Performance</span>
                        <div className={s.chartRow}>
                          <span className={`${s.axl} ${s.vert} ${s.flip}`}>Value</span>
                          <DotFitChart key={l.slug + ':' + run.n} axes={[a.performance, a.portability, a.battery, a.value]} offset={col * 160} className={s.cg}>
                            <span className={s.fitPill} style={{ animation: `fadeIn 300ms steps(3, end) ${col * 160 + 1150}ms backwards` }}>
                              <span style={{ color: col === 0 ? 'var(--good)' : 'var(--sub)' }}>{col === 0 ? '↑' : '·'}</span> {colScores[col].fit}%
                            </span>
                          </DotFitChart>
                          <span className={`${s.axl} ${s.vert}`}>Portability</span>
                        </div>
                        <span className={s.axl}>Battery</span>
                        <div className={s.pills}>
                          <span className={s.pill}>
                            <span className={s.mDot} style={l.metal ? { background: 'var(--accent)' } : { border: '1px solid var(--faint)' }} />
                            Metal body
                          </span>
                          {labels[col] && <span className={s.pill}>{labels[col]}</span>}
                        </div>
                      </div>
                    );
                  })}
                </ScrollRow>
              </section>

              <ScrollRow className={s.csec}>
                <div className={s.secHead}>
                  <div className={s.secTitle}><span className={s.kicker}>02</span><span className={s.cst}>Specs</span></div>
                  <span className={s.legend}>
                    <span className={s.legendItem}><span className={s.bestKey}>best</span>in row</span>
                    <span className={s.legendItem}><span className={`${s.dot} ${s.meets}`} />meets brief</span>
                    <span className={s.legendItem}><span className={`${s.dot} ${s.misses}`} />misses</span>
                  </span>
                </div>
                {specRows}
                <span className={s.hiddenNote} style={{ opacity: hidden ? 1 : 0 }}>
                  {hidden ? `${hidden} identical row${hidden > 1 ? 's' : ''} hidden` : ''}
                </span>
              </ScrollRow>
            </div>
          </ScrollRow>

          <div className={s.footer}>
            <span className={s.footNote}>SRP and used estimates{CATALOG.stats.latestPriceCheck && ' · prices checked ' + fmtDate(CATALOG.stats.latestPriceCheck)}</span>
            <Link href={`/laptop/${cols[0].slug}`} className={`cta ${s.cta}`}>
              Open top pick <span className={`arw ${s.arw}`}>→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
