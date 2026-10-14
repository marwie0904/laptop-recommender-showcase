'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import type { UseCase } from '@shared/brief';
import type { BuildKey, HourKey, Laptop, LaptopDetails, SpecKey } from '@shared/catalog';
import { USE_HOURS } from '@shared/scoring/weights';
import { FitBreakdown } from '@/components/charts/FitBreakdown';
import { ConfigSwitcher } from '@/components/controls/ConfigSwitcher';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { Logo } from '@/components/layout/Logo';
import { ScrollRow } from '@/components/layout/ScrollRow';
import { PriceDelta } from '@/components/price/PriceDelta';
import { USE_CASES, fmtStorage } from '@/lib/brief';
import { getLaptops, scoreForDisplay } from '@/lib/catalog';
import { fmtDate, fmtPhp, priceCheckedAt } from '@/lib/price';
import { displayLine, fastChargeLabel, specValues, warrantyLabel } from '@/lib/format';
import { useFitlap, useHydrated } from '@/store/useFitlap';
import s from './details.module.css';


const TABS = [['Specs', '#specs'], ['Battery life', '#battery'], ['Build quality', '#build'], ['Prices', '#prices']] as const;
const VIEWS = ['Front', 'Side', 'Ports', 'Keyboard', 'Photo'];
const VIEW_TITLES = ['Overview · front', 'Profile · side', 'Ports · left and right', 'Keyboard & trackpad', 'Press photo'];
const SPECS: [SpecKey, string][] = [
  ['cpu', 'Processor'], ['gpu', 'Graphics'], ['ram', 'Memory'], ['storage', 'Storage'], ['display', 'Display'],
  ['ports', 'Ports'], ['wireless', 'Wireless'], ['webcam', 'Webcam'], ['os', 'OS'], ['size', 'Size'],
];
const MATTERS: Record<UseCase, SpecKey[]> = {
  coding: ['cpu', 'ram', 'storage', 'os'],
  editing: ['cpu', 'gpu', 'ram', 'storage', 'display'],
  gaming: ['gpu', 'cpu', 'display'],
  '3d': ['gpu', 'cpu', 'ram'],
  work: ['wireless', 'webcam', 'size'],
  school: ['size', 'wireless'],
};
const BATTERY: [string, string, HourKey][] = [
  ['Video playback', 'local 1080p, Wi-Fi off', 'video'],
  ['Web browsing', '10 tabs, light use', 'web'],
  ['Coding', 'IDE + browser + local server', 'coding'],
  ['General office', 'docs, email, calls', 'office'],
  ['Video editing', '4K timeline export', 'editing'],
  ['Gaming / 3D render', 'sustained GPU load', 'gaming'],
];
const BUILD: [BuildKey, string][] = [
  ['materials', 'Materials'], ['rigidity', 'Rigidity'], ['hinge', 'Hinge'],
  ['keyboard', 'Keyboard'], ['trackpad', 'Trackpad'], ['thermals', 'Thermals & noise'],
];

const GLYPHS = '0123456789#%/<>=+×';
const TICKS = 23; // 40 ms ticks, progress += 0.045 until 1

/** Scramble decode: chars resolve left to right; spaces never scramble. Glyphs are deterministic so SSR and hydration match. */
function scramble(str: string, tick: number, offset: number) {
  const p = Math.max(0, Math.min(1, Math.min(1, tick * 0.045) * 1.6 - offset));
  if (p >= 1) return str;
  let out = '';
  for (let k = 0; k < str.length; k++) {
    const ch = str[k];
    out += ch === ' ' || k / str.length < p ? ch : GLYPHS[(k * 7 + tick * 13) % GLYPHS.length];
  }
  return out;
}

// ?cfg= is read on the client only: this static page has no Suspense boundary for useSearchParams (see page.tsx).
const noSubscribe = () => () => {};
const cfgParam = () => new URLSearchParams(location.search).get('cfg');

const scrollLinked = (animation: string, range: string): CSSProperties => ({ animation, animationTimeline: 'view()', animationRange: range });
const lowerFirst = (t: string) => t[0].toLowerCase() + t.slice(1);

export function DetailsClient({ laptop, details }: { laptop: Laptop; details: LaptopDetails }) {
  const hydrated = useHydrated();
  const brief = useFitlap((st) => st.brief);
  const compareIds = useFitlap((st) => st.compareIds);
  const select = useFitlap((st) => st.select);
  const addCompare = useFitlap((st) => st.addCompare);

  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState(0);
  const [why, setWhy] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [view, setView] = useState(0);
  const [vt, setVt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const urlCfg = useSyncExternalStore(noSubscribe, cfgParam, () => null);

  // /results returns to this laptop. Wait for rehydration so the persisted value doesn't overwrite it.
  useEffect(() => {
    if (hydrated) select(laptop.slug);
  }, [hydrated, select, laptop.slug]);

  useEffect(() => {
    if (tick >= TICKS) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setTick(reduce ? TICKS : tick + 1), 40);
    return () => clearTimeout(t);
  }, [tick]);

  const scored = scoreForDisplay(laptop, brief, picked ?? urlCfg);
  const c = scored.config;
  const checked = priceCheckedAt(c.price);
  const specs = specValues(laptop, c, details);
  const uses: UseCase[] = brief.uses.length ? brief.uses : ['work'];
  const matters = new Set(uses.flatMap((u) => MATTERS[u]));
  const mixUses = USE_CASES.filter((c) => uses.includes(c.key));
  const mixHours = Math.round(uses.reduce((a, u) => a + laptop.hoursByUse[USE_HOURS[u]], 0) / uses.length);
  const pending: CSSProperties | undefined = hydrated ? undefined : { visibility: 'hidden' };

  const compareHref = '/compare?c=' + [c.code, ...compareIds.filter((x) => x !== c.code)].slice(0, 4).join(',');
  const others = getLaptops().filter((l) => l.slug !== laptop.slug);
  const thinnerPct = others.length ? Math.round((others.filter((l) => l.dims.h > laptop.dims.h).length / others.length) * 100) : 0;
  const [res, hz, nits] = displayLine(c).split(' · ');
  const { w, d, h } = laptop.dims;
  const kg = laptop.weightKg.toFixed(2) + ' kg';
  const mm = (n: number) => n.toFixed(1) + ' mm';

  const views = details.photo ? VIEWS : VIEWS.slice(0, -1);
  const photo = details.photo;
  const switchConfig = (code: string) => {
    setPicked(code);
    history.replaceState(null, '', '?cfg=' + code + location.hash);
    setTick(0);
  };

  const pickView = (i: number) => {
    if (i === view) return;
    setView(i);
    setVt(vt + 1);
  };

  return (
    <div className={s.wrap}>
      <header className={s.hdr}>
        <div className={s.hdrGroup}>
          <Link href="/results" aria-label="Back to matches" className={`${s.circle} ${s.back} ring`}>‹</Link>
          <Logo />
        </div>
        <ScrollRow role="navigation" aria-label="Sections" className={`${s.tabs} no-scrollbar`}>
          <span aria-hidden className={s.tabPill} style={{ transform: `translateX(${tab * 128}px)` }} />
          {TABS.map(([label, href], i) => (
            <a
              key={href}
              href={href}
              onClick={() => setTab(i)}
              className={`${s.tab}${i === tab ? ' ' + s.tabOn : ''}`}
              style={{ color: i === tab ? 'var(--on-ink)' : 'var(--ink)' }}
            >
              {label}
            </a>
          ))}
        </ScrollRow>
        <div className={s.hdrBtns}>
          <ThemeToggle />
          <Link href={compareHref} onClick={() => addCompare(c.code)} aria-label="Add to compare" className={s.plus}>+</Link>
        </div>
      </header>

      <div className={s.drow}>
        <aside id="prices" className={s.side}>
          <span className={s.label13}>Laptop details</span>
          <div className={s.col6}>
            <span className={s.meta13}>Match ID · {scramble(c.code, tick, 0)}</span>
            <span className={s.name} style={{ animation: 'printIn 900ms cubic-bezier(.7,0,.2,1) 150ms backwards' }}>{laptop.model}</span>
            <span className={s.subline}>
              {c.cpu.name} · {c.ramGb} GB · {fmtStorage(c.storageGb)} · {c.color}
            </span>
          </div>
          <ConfigSwitcher laptop={laptop} brief={brief} value={c.code} onChange={switchConfig} style={pending} />
          <div className={s.tiles}>
            <div className={`${s.tile} ${s.tileNew}`} style={{ animation: 'rise 600ms cubic-bezier(.2,.9,.2,1) 300ms backwards' }}>
              <span className={s.meta12}>{'SRP · ' + (c.price.srpSource ?? '—')}</span>
              <span className={s.tileVal}>{scramble(c.price.srpPhp !== undefined ? fmtPhp(c.price.srpPhp) : 'Used only', tick, 0.2)}</span>
            </div>
            <div className={`${s.tile} ${s.tileUsed}`} style={{ animation: 'rise 600ms cubic-bezier(.2,.9,.2,1) 380ms backwards' }}>
              <span className={s.meta12}>Used estimate · {c.price.usedSource ?? '—'}</span>
              <span className={s.tileVal}>{scramble(c.price.usedPhp !== undefined ? fmtPhp(c.price.usedPhp) : '—', tick, 0.3)}</span>
              <PriceDelta price={c.price} size={13} suffix=" vs SRP" />
            </div>
          </div>
          {checked && <span className={s.meta12}>Price checked {fmtDate(checked)}</span>}
          <div className={s.pills} style={pending}>
            {USE_CASES.filter((c) => brief.uses.includes(c.key)).map((c) => (
              <span key={c.key} className={s.pill}>
                <span className={s.pillDot} style={{ background: 'var(--accent)' }} />
                {c.pill}
              </span>
            ))}
            {laptop.metal && (
              <span className={s.pill}>
                <span className={s.pillDot} style={{ background: 'var(--blue)' }} />
                Metal body
              </span>
            )}
          </div>
          <div className={s.fitBlock}>
            <span className={s.meta13}>Fit for your brief</span>
            <span className={s.fit} style={pending}>
              {scramble(String(scored.fit), tick, 0.4)}
              <span className={s.fitPct}>%</span>
            </span>
            <span className={s.summary}>{details.summary}</span>
            <button onClick={() => setWhy(!why)} aria-expanded={why} className={`${s.why} ring`}>
              How is this scored? <span className={s.whyIcon} style={{ transform: `rotate(${why ? 45 : 0}deg)` }}>+</span>
            </button>
            {hydrated && <FitBreakdown rows={scored.rows} fit={scored.fit} open={why} totalLabel="Total" totalSize={22} />}
          </div>
        </aside>

        <main className={s.main}>
          <div className={s.viewHead}>
            <span className={s.label13}>{view === 2 && !laptop.ports.right.length ? 'Ports' : VIEW_TITLES[view]}</span>
            <span className={s.meta13}>
              {w.toFixed(1)} × {d.toFixed(1)} × {mm(h)} · {kg}
            </span>
          </div>
          <div className={s.stageWrap}>
            <div key={vt} className={s.stage} style={{ animation: vt ? 'iris 650ms cubic-bezier(.7,0,.2,1) backwards' : 'none' }}>
              {view === 0 && (
                <LaptopDrawing
                  shape={laptop.archetype}
                  hot={scored.hot}
                  big
                  animate="crt"
                  size="74%"
                  style={{ maxWidth: 560 }}
                  floor
                  screenStyle={{ flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch', padding: '14px 16px', boxSizing: 'border-box', color: '#FFFFFF' }}
                  screen={
                    <>
                      <span className={s.screenTop}>
                        {specs.display} · {res}
                      </span>
                      <span className={s.screenDisc}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                        </svg>
                      </span>
                      <span className={s.screenHz}>
                        {hz}
                        <br />
                        {nits}
                      </span>
                    </>
                  }
                />
              )}
              {view === 1 && (
                <div className={s.sideView}>
                  <div className={s.sideH}>{mm(h)}</div>
                  <div className={s.sideSlab} style={{ animation: 'slab 800ms cubic-bezier(.7,0,.2,1) 200ms backwards' }} />
                  <div className={s.ruler}>
                    <span>|</span>
                    <span>
                      {mm(w)} · thinner than {thinnerPct}% of matches
                    </span>
                    <span>|</span>
                  </div>
                </div>
              )}
              {view === 2 && (
                <div className={s.portsView}>
                  {(laptop.ports.right.length ? [laptop.ports.left, laptop.ports.right] : [laptop.ports.left]).map((ports, side, rails) => (
                    <div key={side} className={s.portSide}>
                      <span className={s.meta12}>{rails.length === 1 ? 'Ports' : side ? 'Right side' : 'Left side'}</span>
                      <div className={s.portRail}>
                        {!ports.length && <span className={s.meta12}>Not listed</span>}
                        {ports.map((p, i) => (
                          <span key={i} className={s.port} style={{ animation: `keyIn 450ms cubic-bezier(.2,1.2,.4,1) ${250 + side * 200 + i * 90}ms backwards` }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {view === 3 && (
                <div className={s.kbd}>
                  <div className={s.keys}>
                    {Array.from({ length: 56 }, (_, k) => (
                      <span key={k} className={s.key} style={{ animation: `keyIn 380ms cubic-bezier(.2,1.2,.4,1) ${120 + (k % 14) * 22 + Math.floor(k / 14) * 60}ms backwards` }} />
                    ))}
                  </div>
                  <span className={s.pad} style={{ animation: 'keyIn 500ms cubic-bezier(.2,.9,.2,1) 700ms backwards' }} />
                </div>
              )}
              {/* PLAN §7a: the only place a real photo loads, and only once this view is opened. */}
              {view === 4 && photo && (
                <figure className={s.photoView}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images: a plain img with srcSet does the same */}
                  <img
                    src={photo.urlSmall}
                    srcSet={`${photo.urlSmall} ${Math.min(480, photo.width)}w, ${photo.url} ${photo.width}w`}
                    sizes="(max-width: 700px) 92vw, 560px"
                    width={photo.width}
                    height={photo.height}
                    alt={`${laptop.model}, press photo`}
                    className={s.photo}
                  />
                  <figcaption className={s.meta12}>Image: {photo.credit}</figcaption>
                </figure>
              )}
            </div>
          </div>
          <ScrollRow className={`${s.views} no-scrollbar`}>
            {views.map((label, i) => (
              <button key={label} aria-pressed={i === view} onClick={() => pickView(i)} className={`${s.view}${i === view ? ' ' + s.viewOn : ''}`}>
                {label}
              </button>
            ))}
          </ScrollRow>
        </main>
      </div>

      <section id="specs" className={`${s.sec} ${s.secSpecs}`}>
        <div className={s.secHead}>
          <div className={s.col4}>
            <span className={s.meta13}>01</span>
            <span className={s.stitle}>Specs</span>
          </div>
          <span className={s.legend}>
            <span className={s.legendDot} />
            matters for your use case
          </span>
        </div>
        <div className={`${s.specGrid}${specsOpen ? ' ' + s.open : ''}`}>
          {SPECS.map(([k, label], i) => {
            const m = matters.has(k);
            return (
              <div
                key={k}
                className={`${s.spec} ${s.specCard}${hydrated && !m ? ' ' + s.extra : ''}`}
                style={{ animation: `printIn 700ms cubic-bezier(.7,0,.2,1) ${250 + i * 70}ms backwards` }}
              >
                <div className={s.specTop}>
                  <span className={s.meta12}>{label}</span>
                  <span className={`${s.dot} ${m ? s.dotHot : s.dotCold}`} style={pending} />
                </div>
                <span className={s.sv}>{scramble(specs[k], tick, (i % 5) * 0.12)}</span>
                <span className={s.sn}>{details.specNotes[k]}</span>
              </div>
            );
          })}
        </div>
        <button onClick={() => setSpecsOpen(!specsOpen)} aria-expanded={specsOpen} className={`${s.onlySm} ring`}>
          {specsOpen ? 'Show fewer specs' : 'Show all 10 specs'}
        </button>
      </section>

      <section id="battery" className={`${s.sec} ${s.secBattery}`}>
        <div className={s.bsum}>
          <div className={s.col4}>
            <span className={s.meta13}>02</span>
            <span className={s.stitle}>Battery life</span>
          </div>
          <div className={s.col2} style={pending}>
            <span className={s.meta13}>Your mix ({mixUses.map((c) => lowerFirst(c.label)).join(' + ')})</span>
            <span className={s.bbigBat}>
              ~{mixHours}
              <span className={s.bUnit}> h</span>
            </span>
          </div>
          <div className={s.facts}>
            <div className={`${s.col2} ${s.factTop}`}>
              <span className={s.meta12}>Capacity</span>
              <span className={s.factVal}>{details.battery.wh} Wh</span>
            </div>
            <div className={`${s.col2} ${s.factTop}`}>
              <span className={s.meta12}>Charger</span>
              <span className={s.factVal}>{details.battery.chargerW} W USB-C</span>
            </div>
            <div className={s.col2}>
              <span className={s.meta12}>0 → 50%</span>
              <span className={s.factVal}>{fastChargeLabel(details.battery.fastChargeMin)}</span>
            </div>
            <div className={s.col2}>
              <span className={s.meta12}>Unplugged perf.</span>
              <span className={s.factVal}>{details.battery.unpluggedPerf}</span>
            </div>
          </div>
        </div>
        <div className={s.bars}>
          <div className={`${s.brow} ${s.bhead}`}>
            <span>Use case</span>
            <span className={s.scale}>
              <span>0 h</span>
              <span>12 h</span>
              <span>24 h</span>
            </span>
            <span className={s.right}>Hours</span>
          </div>
          {BATTERY.map(([label, how, key], r) => {
            const hrs = laptop.hoursByUse[key];
            const n = Math.min(48, Math.max(1, Math.round((hrs / 24) * 48)));
            return (
              <div key={key} className={`${s.brow} ${s.bline}`}>
                <div className={s.col2}>
                  <span className={s.bLabel}>{label}</span>
                  <span className={s.meta12}>{how}</span>
                </div>
                <div className={s.track}>
                  {Array.from({ length: 48 }, (_, i) => (
                    <span key={i} className={s.baseDot} />
                  ))}
                  <div className={s.fill} style={scrollLinked(`printIn 1.4s steps(${n}, end) ${r * 120}ms both`, 'entry 15% cover 45%')}>
                    {Array.from({ length: n }, (_, i) => (
                      <span key={i} className={s.bd} style={{ opacity: i >= n - 3 ? 0.55 : 1, animation: i === n - 1 ? 'blink 1.6s ease-in-out infinite' : undefined }} />
                    ))}
                  </div>
                </div>
                <span className={s.bh}>{hrs} h</span>
              </div>
            );
          })}
          <span className={s.foot}>Sample data · bars charge in as you scroll</span>
        </div>
      </section>

      <section id="build" className={`${s.sec} ${s.secBuild}`}>
        <div className={s.buildHead}>
          <div className={s.col4}>
            <span className={s.meta13}>03</span>
            <span className={s.stitle}>Build quality</span>
          </div>
          <div className={s.overall}>
            <span className={s.meta13}>Overall</span>
            <span className={s.bbigBuild}>{laptop.buildOverall.toFixed(1)}</span>
            <span className={s.outOf}>/ 10</span>
          </div>
        </div>
        <div className={s.buildRow}>
          <div className={s.dprof}>
            <span className={s.meta12}>Profile · side view</span>
            <div className={s.profBox}>
              <div className={s.profSlab} style={scrollLinked('slab 1s cubic-bezier(.7,0,.2,1) both', 'entry 10% cover 40%')}>
                <span className={s.profH}>{mm(h)}</span>
              </div>
              <div className={s.ruler}>
                <span>|</span>
                <span>{mm(w)}</span>
                <span>|</span>
              </div>
            </div>
            <div className={s.chassis}>
              {[
                ['Chassis', details.build.chassis],
                ['Weight', kg],
                ['Repairability', details.build.repairability],
                ['Warranty', warrantyLabel(details.build.warrantyYears)],
              ].map(([k, v]) => (
                <div key={k} className={s.col2}>
                  <span className={s.meta12}>{k}</span>
                  <span className={s.chVal}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={s.bgrid}>
            {BUILD.map(([k, label]) => {
              const sc = details.build[k];
              return (
                <div key={k} className={`${s.spec} ${s.buildCard}`}>
                  <div className={s.bcHead}>
                    <span className={s.bcK}>{label}</span>
                    <span className={s.bcScore}>{sc.toFixed(1)}</span>
                  </div>
                  <div className={s.segs}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={s.seg}
                        style={{
                          background: i <= Math.round(sc / 2) ? 'var(--ink)' : 'var(--line2)',
                          ...scrollLinked('slab 600ms cubic-bezier(.7,0,.2,1) both', `entry ${5 + i * 6}% cover ${25 + i * 6}%`),
                        }}
                      />
                    ))}
                  </div>
                  <span className={`${s.sn} ${s.snBuild}`}>{details.build.notes[k]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className={s.footer}>
        <Link href="/results" className={s.backLink}>‹ Back to all matches</Link>
        <Link href={compareHref} onClick={() => addCompare(c.code)} className={s.compareCta}>
          Compare with others <span className={s.ctaArw}>→</span>
        </Link>
      </div>
    </div>
  );
}
