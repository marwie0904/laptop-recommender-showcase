'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Brief, FormPref, Laptop, UseCase } from '@/data/types';
import { getLaptop, getLaptops, rankForBrief } from '@/lib/catalog';
import { scoreForDisplay, SLIM_KG, SLIM_MM } from '@/lib/scoring';
import { fmtStorage, USE_CASES } from '@/lib/brief';
import { fmtUsd } from '@/lib/price';
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
const HEAVY_GPU: UseCase[] = ['editing', 'gaming', '3d'];

// [label, value → [text, score (higher is better)], misses the brief?]
type SpecRow = [string, (l: Laptop) => [string, number], ((l: Laptop, b: Brief) => boolean)?];
const SPEC_ROWS: SpecRow[] = [
  ['Processor', (l) => [l.config.cpu, l.ratings.cpu]],
  ['Graphics', (l) => [l.config.gpu, l.ratings.gpu], (l, b) => l.ratings.gpu < 5 && b.uses.some((u) => HEAVY_GPU.includes(u))],
  ['Memory', (l) => [l.config.ramGb + ' GB', l.config.ramGb], (l, b) => l.config.ramGb < b.minRamGb],
  ['Storage', (l) => [fmtStorage(l.config.storageGb), l.config.storageGb], (l, b) => l.config.storageGb < b.minStorageGb],
  ['Display', (l) => [l.config.display, l.ratings.display]],
  ['Battery · coding', (l) => ['~' + l.battery.hoursByUse.coding + ' h', l.battery.hoursByUse.coding], (l) => l.battery.hoursByUse.coding < 8],
  ['Weight', (l) => [l.weightKg.toFixed(2) + ' kg', -l.weightKg], (l, b) => b.forms.includes('slim') && l.weightKg > SLIM_KG],
  ['Thickness', (l) => [l.dims.h + ' mm', -l.dims.h], (l, b) => b.forms.includes('slim') && l.dims.h > SLIM_MM],
  ['Build score', (l) => [l.build.overall.toFixed(1), l.build.overall]],
  ['Ports', (l) => [l.ports, l.ratings.ports]],
  ['Wireless', (l) => [l.wireless.split(' · ')[0], l.ratings.wireless]],
  ['OS', (l) => [l.config.os, l.ratings.os]],
];

/** Valid laptop ids only, deduped, max 4. */
const clean = (list: string[]) => [...new Set(list)].filter((id) => getLaptop(id)).slice(0, 4);

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
  const raw = useSearchParams().get('ids') ?? '';
  const hydrated = useHydrated();
  const brief = useFitlap((st) => st.brief);
  const compareIds = useFitlap((st) => st.compareIds);
  const setCompare = useFitlap((st) => st.setCompare);

  const ranked = useMemo(() => rankForBrief(brief), [brief]);
  const scores = useMemo(() => new Map(getLaptops().map((l) => [l.id, scoreForDisplay(l, brief)])), [brief]);

  // URL is the source of truth. With no valid ids: the store's list, else the brief's top 3, else the catalog's first 3.
  const urlIds = clean(raw.split(','));
  const fallback = () => {
    const stored = clean(compareIds);
    if (stored.length) return stored;
    return (ranked.length ? ranked.map((r) => r.laptop) : getLaptops()).slice(0, 3).map((l) => l.id);
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

  // Normalise the URL (fallback, bad or duplicate ids) and mirror it into the store.
  useEffect(() => {
    if (!key) return;
    setCompare(key.split(','));
    if (raw !== key) router.replace('/compare?ids=' + key, { scroll: false });
  }, [key, raw, router, setCompare]);

  const out = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(out.current), []);

  const commit = (next: string[]) => {
    setCompare(next);
    router.replace('/compare?ids=' + next.join(','), { scroll: false });
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
    const i = ranked.findIndex((r) => r.laptop.id === l.id);
    return '#' + String((i === -1 ? getLaptops().indexOf(l) : i) + 1).padStart(2, '0');
  };

  const cols = ids.map((id) => getLaptop(id)!);
  const slotsLeft = 4 - cols.length;

  let hidden = 0;
  const specRows = SPEC_ROWS.map(([label, get, miss], r) => {
    const vals = cols.map(get);
    const same = vals.length > 1 && vals.every((v) => v[0] === vals[0][0]);
    const top = Math.max(...vals.map((v) => v[1]));
    const uniqueBest = vals.length > 1 && vals.filter((v) => v[1] === top).length === 1;
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
              const misses = miss?.(cols[i], brief) ?? false;
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
                ≤ {fmtUsd(brief.budgetMax)} · {brief.minRamGb} GB · {fmtStorage(brief.minStorageGb)}
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
                            {getLaptops().filter((o) => !ids.includes(o.id)).map((o) => (
                              <button key={o.id} className={s.pick} onClick={() => add(o.id)}>
                                <span>{o.name}</span>
                                <span className={s.pickFit}>{scores.get(o.id)!.fit}%</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const sc = scores.get(l.id)!;
                  return (
                    <div
                      key={l.id + ':' + run.n}
                      className={s.slot}
                      style={{
                        animation: leaving === l.id
                          ? 'squeeze 420ms cubic-bezier(.7,0,.2,1) forwards'
                          : `railInShort ${1100 + i * 120}ms cubic-bezier(.12,.9,.25,1) ${i * 70}ms backwards`,
                      }}
                    >
                      <article className={`${s.ccard} ${i === 0 ? s.top : ''}`}>
                        <div className={s.cardHead}>
                          <span>{rankOf(l)}{i === 0 && ' · Top pick'}</span>
                          <button aria-label={`Remove ${l.name} from compare`} className={`ring ${s.x}`} onClick={() => remove(l.id)}>×</button>
                        </div>
                        <Link href={`/laptop/${l.id}`} aria-label={`${l.name} details`} className={s.pic}>
                          <div className={s.cpic}><LaptopDrawing shape={l.shape} hot={sc.hot} /></div>
                        </Link>
                        <div className={s.names}>
                          <span className={s.cname}>{l.name}</span>
                          <span className={s.cfg}>{l.config.cpu} · {l.config.ramGb} GB · {fmtStorage(l.config.storageGb)}</span>
                        </div>
                        <div className={s.priceRow}>
                          <div className={s.prices}>
                            <span>New {fmtUsd(l.price.newUsd)}</span>
                            <span className={s.used}>Used {fmtUsd(l.price.usedAvgUsd)} <PriceDelta newUsd={l.price.newUsd} usedUsd={l.price.usedAvgUsd} size={13} /></span>
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
                    <span className={s.lcnote}>Each axis is one of your filters. The bigger the orange shape, the better it fits.</span>
                    {[
                      ['Top', 'Coding', 'CPU, RAM, keyboard'],
                      ['Right', 'Slim & light', `under ${SLIM_KG} kg, under ${SLIM_MM} mm`],
                      ['Bottom', 'Budget', `≤ ${fmtUsd(brief.budgetMax)} new`],
                      ['Left', 'Video editing', 'GPU, screen, CPU'],
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
                    const a = l.briefAxes;
                    return (
                      <div key={l.id} className={s.chartCol}>
                        <span className={s.axl}>Coding</span>
                        <div className={s.chartRow}>
                          <span className={`${s.axl} ${s.vert} ${s.flip}`}>Editing</span>
                          <DotFitChart key={l.id + ':' + run.n} axes={[a.coding, a.slim, a.budget, a.editing]} offset={col * 160} className={s.cg}>
                            <span className={s.fitPill} style={{ animation: `fadeIn 300ms steps(3, end) ${col * 160 + 1150}ms backwards` }}>
                              <span style={{ color: col === 0 ? 'var(--good)' : 'var(--sub)' }}>{col === 0 ? '↑' : '·'}</span> {scores.get(l.id)!.fit}%
                            </span>
                          </DotFitChart>
                          <span className={`${s.axl} ${s.vert}`}>Slim</span>
                        </div>
                        <span className={s.axl}>Budget</span>
                        <div className={s.pills}>
                          <span className={s.pill}>
                            <span className={s.mDot} style={l.metal ? { background: 'var(--accent)' } : { border: '1px solid var(--faint)' }} />
                            Metal body
                          </span>
                          <span className={s.pill}>{l.compareNote}</span>
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
            <span className={s.footNote}>Sample data · prices from retail + marketplace listings, last 30 days</span>
            <Link href={`/laptop/${ids[0]}`} className={`cta ${s.cta}`}>
              Open top pick <span className={`arw ${s.arw}`}>→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
