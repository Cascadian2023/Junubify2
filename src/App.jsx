import { useEffect, useRef, useState } from 'react';
import { AudioLines, BadgeCheck, CircleDollarSign, Headphones, Music2, Pause, Play, Radio, Upload, Wallet } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';

const seedTracks = [
  { id: '1', title: 'Juba City Lights', artist: 'Emmanuel Jal & Dynamq', genre: 'Afrobeat', plays: 124500, cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3' },
  { id: '2', title: 'White Nile Groove', artist: 'Riya Denis', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=tropical-house-110034.mp3' },
  { id: '3', title: 'Peace in South Sudan', artist: 'Silver X feat. MacJ', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=hip-hop-rock-beats-118000.mp3' },
];

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState(seedTracks);
  const [myTracks, setMyTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(null);
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [form, setForm] = useState({ title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' });
  const audioRef = useRef(null);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 5000);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) { setMyTracks([]); return; }
    let cancelled = false;
    const loadMine = async () => {
      const { data, error } = await supabase.from('tracks').select('*').eq('artist_id', session.user.id).order('created_at', { ascending: false });
      if (error) { notify(error.message); return; }
      if (!cancelled) setMyTracks(data || []);
    };
    loadMine();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const loadPublished = async () => {
      const { data, error } = await supabase.from('tracks').select('*').eq('status', 'published').order('created_at', { ascending: false });
      if (error) return;
      const published = await Promise.all((data || []).map(async (track) => {
        const { data: signed } = await supabase.storage.from('junubify-audio').createSignedUrl(track.audio_path, 3600);
        return { id: track.id, title: track.title, artist: track.artist_name, genre: track.genre, plays: track.plays || 0, cover: track.cover_url || seedTracks[0].cover, audioUrl: signed?.signedUrl || '' };
      }));
      if (!cancelled && published.length) setTracks((old) => [...published, ...seedTracks]);
    };
    loadPublished();
    return () => { cancelled = true; };
  }, []);

  const playTrack = (track) => {
    if (!track.audioUrl) return notify('This track is not available for playback.');
    if (playing?.id === track.id) {
      if (audioRef.current?.paused) audioRef.current.play().catch(() => notify('Could not play this track.'));
      else audioRef.current?.pause();
      return;
    }
    setPlaying(track);
    requestAnimationFrame(() => audioRef.current?.play().catch(() => notify('Audio playback failed.')));
  };

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Configure Supabase environment variables first.');
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setAuthBusy(false);
    notify(error ? error.message : 'Check your email for the secure sign-in link.');
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!supabase || !session) return notify('Sign in before uploading.');
    if (!selectedFile) return notify('Choose an audio file before uploading.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this recording.');
    if (selectedFile.size > 50 * 1024 * 1024) return notify('Audio file must be 50 MB or smaller.');
    setUploadBusy(true);
    const path = `${session.user.id}/${crypto.randomUUID()}-${selectedFile.name.replace(/[^\w.-]/g, '_')}`;
    const { error: storageError } = await supabase.storage.from('junubify-audio').upload(path, selectedFile, { contentType: selectedFile.type || 'audio/mpeg', upsert: false });
    if (storageError) { setUploadBusy(false); return notify(storageError.message); }
    const { error: rowError } = await supabase.from('tracks').insert({
      artist_id: session.user.id, artist_name: form.artist.trim(), title: form.title.trim(), genre: form.genre,
      album: form.album.trim() || 'Single', cover_url: form.cover.trim() || null, audio_path: path, status: 'pending_review', rights_confirmed_at: new Date().toISOString(),
    });
    if (rowError) {
      await supabase.storage.from('junubify-audio').remove([path]);
      setUploadBusy(false);
      return notify(rowError.message);
    }
    const { data: refreshed } = await supabase.from('tracks').select('*').eq('artist_id', session.user.id).order('created_at', { ascending: false });
    setMyTracks(refreshed || []);
    setForm({ title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' });
    setSelectedFile(null);
    setRightsConfirmed(false);
    event.currentTarget.reset();
    setUploadBusy(false);
    notify('Upload received and saved. It will remain private until reviewed and approved.');
  };

  const previewMine = async (track) => {
    const { data, error } = await supabase.storage.from('junubify-audio').createSignedUrl(track.audio_path, 300);
    if (error) return notify(error.message);
    playTrack({ id: track.id, title: track.title, artist: track.artist_name, genre: track.genre, plays: 0, cover: track.cover_url || seedTracks[0].cover, audioUrl: data.signedUrl });
  };

  const visibleTracks = tracks.filter((track) => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home"><span className="brand-icon"><Radio size={21}/></span><span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span></button>
      <nav className="nav-tabs" aria-label="Main navigation"><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17}/> Discover</button><button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17}/> Artist studio</button><button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17}/> Monetization</button></nav>
      <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tracks or artists" aria-label="Search tracks or artists"/>
      {session && <button className="button secondary signout" onClick={() => supabase.auth.signOut()}>Sign out</button>}
    </header>
    {!supabaseConfigured && <div className="notice-box prominent config-banner"><b>Backend setup required</b><p>Add Supabase project URL and public anon key to a local .env file; see README for database and storage setup.</p></div>}
    <main className="content">
      {tab === 'discover' && <><section className="hero"><div className="hero-copy"><span className="eyebrow"><AudioLines size={14}/> MUSIC FROM HOME</span><h1>South Sudan’s sound,<br/><em>all in one place.</em></h1><p>Discover emerging voices and hometown favorites from Juba and beyond.</p><button className="button primary" onClick={() => visibleTracks[0] && playTrack(visibleTracks[0])}><Play size={16} fill="currentColor"/> Play a track</button></div><div className="hero-art"><div className="vinyl"><div className="vinyl-label"><Radio size={34}/></div></div><span className="art-caption">JUBA · WAU · MALAKAL · DIASPORA</span></div></section><section className="section-heading"><div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2>Discover tracks</h2></div><span className="muted">{visibleTracks.length} tracks</span></section><section className="track-list">{visibleTracks.map((track, i) => <article className="track-row" key={track.id}><span className="track-number">{String(i + 1).padStart(2, '0')}</span><img src={track.cover} alt=""/><div className="track-info"><b>{track.title}</b><span>{track.artist} · {track.genre}</span></div><span className="play-count">{track.plays.toLocaleString()} plays</span><button className="icon-button" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={18}/> : <Play size={18}/>}</button></article>)}{!visibleTracks.length && <p className="empty">No tracks match that search.</p>}</section><section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Sign in to submit a track for review.</p></div><button className="button secondary" onClick={() => setTab('studio')}><Upload size={17}/> Open artist studio</button></section></>}
      {tab === 'studio' && <><section className="section-heading"><div><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p className="muted">Authenticated audio uploads are stored privately and queued for review.</p></div><span className="status-pill"><BadgeCheck size={15}/> Private until approved</span></section>
        {!session ? <form className="panel auth-card" onSubmit={signIn}><h2>Sign in to Artist Studio</h2><p className="muted">We’ll email you a secure, passwordless sign-in link.</p><label>Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label><button className="button primary" disabled={authBusy || !supabaseConfigured}>{authBusy ? 'Sending…' : 'Email me a sign-in link'}</button></form> : <div className="studio-grid"><form className="panel upload-form" onSubmit={publishTrack}><h2><Upload size={19}/> Submit a song</h2><p className="muted">MP3, WAV, M4A, or OGG · maximum 50 MB</p><label>Song title<input required maxLength="100" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Nile Sunset"/></label><label>Artist name<input required maxLength="100" value={form.artist} onChange={(e) => setForm({...form, artist: e.target.value})} placeholder="Your artist name"/></label><label>Genre<select value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})}><option>Afrobeat</option><option>Dancehall</option><option>Hip-Hop</option><option>Traditional Fusion</option><option>Gospel</option><option>Afro-Pop</option></select></label><label>Album / release name<input maxLength="100" value={form.album} onChange={(e) => setForm({...form, album: e.target.value})} placeholder="Single"/></label><label>Cover image URL <span className="muted">(optional)</span><input type="url" value={form.cover} onChange={(e) => setForm({...form, cover: e.target.value})} placeholder="https://…"/></label><label className="file-picker"><Music2 size={21}/><span><b>{selectedFile ? selectedFile.name : 'Choose audio file'}</b><small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB selected` : 'Private upload to your account'}</small></span><input required type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={(e) => { const file = e.target.files?.[0]; if (file && (file.size > 50 * 1024 * 1024 || (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)))) { notify('Choose an audio file up to 50 MB.'); e.target.value = ''; return; } setSelectedFile(file || null); }}/></label><label className="rights-check"><input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)}/> I own or control the rights needed to submit and distribute this recording.</label><button className="button primary full" type="submit" disabled={uploadBusy || !supabaseConfigured}>{uploadBusy ? 'Uploading…' : 'Upload for review'}</button><p className="fine-print">Submissions are private and not playable by the public until an administrator approves them.</p></form><section className="panel catalog-panel"><h2>Your submissions</h2>{myTracks.length ? myTracks.map((track) => <div className="mini-track" key={track.id}><img src={track.cover_url || seedTracks[0].cover} alt=""/><div><b>{track.title}</b><span>{track.artist_name} · {track.status}</span></div>{track.status === 'pending_review' && <button className="icon-button" onClick={() => previewMine(track)} aria-label={`Preview ${track.title}`}><Play size={17}/></button>}</div>) : <div className="empty-state"><Music2 size={28}/><b>Your submissions appear here</b><span>Uploaded tracks start in private review.</span></div>}<div className="notice-box"><b>Rights and moderation</b><p>Never submit recordings you do not have permission to distribute. Reviewers must approve tracks before public release.</p></div></section></div>}</>}
      {tab === 'monetize' && <><section className="section-heading"><div><span className="eyebrow">CREATOR ECONOMY</span><h1>Monetization</h1><p className="muted">Payment processing stays disabled until merchant/provider setup is completed.</p></div><span className="status-pill warning"><Wallet size={15}/> Provider setup required</span></section><div className="notice-box prominent"><b>No payments are being processed</b><p>The app does not collect money, activate subscriptions, calculate payable royalties, or send payouts. Provider credentials and a verified merchant account are required before enabling checkout.</p></div><section className="plan-grid"><article className="panel plan-card"><span className="eyebrow">FOR LISTENERS</span><h2>Premium Fan</h2><div className="price">$2.99 <small>/ month · proposed</small></div><ul><li>Ad-free listening plan concept</li><li>High-quality audio</li><li>Support local artists</li></ul><button className="button disabled" disabled>Checkout unavailable</button></article><article className="panel plan-card featured"><span className="eyebrow">FOR ARTISTS</span><h2>Pro Creator</h2><div className="price">$4.99 <small>/ month · proposed</small></div><ul><li>Artist upload plan concept</li><li>Proposed 70% royalty share</li><li>Royalty and listener analytics</li></ul><button className="button disabled" disabled>Checkout unavailable</button></article></section><section className="panel payout-panel"><div><span className="eyebrow">ROYALTIES & PAYOUTS</span><h2>Artist earnings</h2><p className="muted">No real earnings or balances are shown. Payouts need a supported provider, verified artist details, and server-side accounting.</p></div><button className="button disabled" disabled><Wallet size={16}/> Payouts unavailable</button></section><div className="notice-box"><b>Payment integration needs a provider decision</b><p>Tell us which provider you have a merchant account with (for example m-GURUSH, MTN MoMo, or another processor), and provide its API documentation or merchant onboarding details. Do not send secret keys in chat; configure them as server-side secrets after integration.</p></div></>}
    </main>
    <footer className="player"><div className="player-track">{playing ? <><img src={playing.cover} alt=""/><div><b>{playing.title}</b><span>{playing.artist}</span></div></> : <><span className="player-placeholder"><Music2 size={19}/></span><div><b>Nothing playing</b><span>Pick a track to listen</span></div></>}</div><div className="player-control"><button className="play-main" onClick={() => playing && playTrack(playing)} disabled={!playing} aria-label="Play or pause">{playing && audioRef.current && !audioRef.current.paused ? <Pause size={18}/> : <Play size={18} fill="currentColor"/>}</button><span>Audio preview</span></div><audio ref={audioRef} src={playing?.audioUrl || undefined} onEnded={() => setPlaying(null)} onError={() => playing && notify('Could not load this audio.')}/></footer>
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}
