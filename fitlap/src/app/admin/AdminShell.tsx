'use client';

import { Component, createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { api } from '@convex/_generated/api';
import s from './admin.module.css';

const STORAGE = 'fitlap-admin-key';
const KeyContext = createContext('');

/** The admin key from the gate. Every admin query and mutation takes it. */
export const useAdminKey = () => useContext(KeyContext);

function readKey() {
  try { return localStorage.getItem(STORAGE) ?? ''; } catch { return ''; }
}
function writeKey(k: string) {
  try { if (k) localStorage.setItem(STORAGE, k); else localStorage.removeItem(STORAGE); } catch { /* private mode: key lasts this tab */ }
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  const [key, setKey] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
  useEffect(() => setKey(readKey()), []);

  const forget = (why: string) => { writeKey(''); setKey(''); setNotice(why); };

  if (key === null) return null;
  return (
    <ConvexProvider client={client}>
      {key ? (
        <KeyContext.Provider value={key}>
          <Boundary onReset={(msg) => forget(msg)}>{children}</Boundary>
        </KeyContext.Provider>
      ) : (
        <KeyForm client={client} notice={notice} onKey={(k) => { writeKey(k); setNotice(''); setKey(k); }} />
      )}
    </ConvexProvider>
  );
}

function KeyForm({ client, notice, onKey }: { client: ConvexReactClient; notice: string; onKey: (k: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(notice);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await client.query(api.admin.laptops.list, { key: value.trim() });
      onKey(value.trim());
    } catch {
      setError('Key rejected. Run npm run admin-key and paste the key it prints.');
    }
  }
  return (
    <form className={`${s.page} ${s.form}`} onSubmit={submit}>
      <h1 className={s.h1}>FITLAP admin</h1>
      <input className={s.input} type="password" autoComplete="off" placeholder="Admin key" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className={s.btn} type="submit" disabled={!value.trim()}>Unlock</button>
      {error && <p className={s.error}>{error}</p>}
    </form>
  );
}

/** A rejected or rotated key makes queries throw. Show the key form again instead of a crash. */
class Boundary extends Component<{ onReset: (msg: string) => void; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const auth = /Not authorized/.test(error.message);
    return (
      <div className={s.page}>
        <p className={s.error}>{auth ? 'The saved key was rejected.' : error.message}</p>
        <button className={s.btn} onClick={() => { this.setState({ error: null }); this.props.onReset(auth ? 'The saved key was rejected.' : ''); }}>
          Enter the key again
        </button>
      </div>
    );
  }
}
