import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, BadgeCheck, CircleDollarSign, Headphones, Heart, Music2, Pause, Play, Radio, Upload, Wallet } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createTrackAudioUrl, fetchArtistTracks, fetchPublishedTracks, submitTrack } from './lib/catalog.js';

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };
const demoTracks = [
  { id: 'demo-1', title: 'Juba City Lights', artist: 'Emmanuel Jal & Dynamq', genre: 'Afrobeat', plays: 124500, cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3', demo: true },
  { id: 'demo-2', title: 'White Nile Groove', artist: 'Riya Denis', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=tropical-house-110034.mp3', demo: true },
  { id: 'demo-3', title: 'Peace in South Sudan', artist: 'Silver X feat. MacJ', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=hip-hop-rock-beats-118000.mp3', demo: true },
];

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [email, setEmail] = useState('');
  const [session, setSession] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 5000);
  };

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) notify(error.message);
      setSession(data?.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  const refreshCatalog = async () => {
    if (!supabaseConfigured) return;
    setLoadingCatalog(true);
    setCatalogError('');
    try {
      const publicTracks = await fetchPublishedTracks();
      setTracks(publicTracks);
      if (session?.user?.id) setArtistTracks(await fetchArtistTracks(session.user.id));
      else setArtistTracks([]);
    } catch (error) {
      setCatalogError(error.message || 'Could not load the catalog.');
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => { refreshCatalog(); }, [session?.user?.id]);

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) {
      notify('Choose an audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      notify('Audio file must be 50 MB or smaller.');
      return;
    }
    setSelectedFile(file);
  };

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Add the Supabase project URL and anon key to enable artist sign-in.');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (error) notify(error.message);
    else notify('Check your email for a secure sign-in link.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else notify('You have signed out.');
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in to submit a track.');
    if (!selectedFile) return notify('Choose an audio file before submitting.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.');
    setSubmitting(true);
    try {
      const submission = await submitTrack({ file: selectedFile, form, artistId: session.user.id });
      setArtistTracks((current) => [submission, ...current]);
      setForm(emptyForm);
      setSelectedFile(null);
      setRightsConfirmed(false);
      event.currentTarget.reset();
      notify('Track uploaded securely and submitted for review. It will appear in Discover after approval.');
    } catch (error) {
      notify(error.message || 'Track upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const playTrack = async (track) => {
    if (playing?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      else audioRef.current.pause();
      return;
    }
    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      setAudioUrl(url);
      setPlaying(track);
      requestAnimationFrame(() => audioRef.current?.play().catch(() => notify('Audio playback failed. Try another track.')));
    } catch (error) {
      notify(error.message || 'Could not create a secure audio playback link.');
    }
  };

  const catalogTracks = tracks.length ? tracks : demoTracks;
  const showingDemoTracks = tracks.length === 0;
  const visibleTracks = catalogTracks.filter((track) => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home"><span className="brand-icon"><Radio size={21}/></span><span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span></button>
        <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracks or artists" aria-label="Search tracks or artists" />
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17}/> Discover</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17}/> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17}/> Monetization</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'discover' && <>
          <section className="hero">
            <div className="hero-copy"><span className="eyebrow"><AudioLines size={14}/> MUSIC FROM HOME</span><h1>South Sudan’s sound,<br/><em>all in one place.</em></h1><p>Discover emerging voices and hometown favorites from Juba and beyond.</p><button className="button primary hero-play" onClick={() => visibleTracks[0] && playTrack(visibleTracks[0])}><Play size={16} fill="currentColor"/> Play a track</button></div>
            <div className="hero-badge"><BadgeCheck size={18}/> A home for local artists</div>
          </section>
          <section className="section-heading"><div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2>Discover tracks</h2></div><span className="muted">{visibleTracks.length} tracks</span></section>
          {showingDemoTracks && <p className="catalog-status">{supabaseConfigured ? 'Sample tracks · published releases will appear here' : 'Sample tracks · connect Supabase for the live catalog'}</p>}
          {loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}
          {catalogError && <div className="notice-box"><b>Catalog unavailable</b><p>{catalogError}</p><button className="button secondary" onClick={refreshCatalog}>Try again</button></div>}
          <section className="track-list">{visibleTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div><div className="track-stats"><span><Heart size={14}/> {track.plays.toLocaleString()}</span><button className="mini-play" onClick={() => playTrack(track)} aria-label={playing?.id === track.id && audioRef.current && !audioRef.current.paused ? `Pause ${track.title}` : `Play ${track.title}`}>{playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15}/> : <Play size={15}/>}</button></div></article>)}</section>
          {!loadingCatalog && !catalogError && visibleTracks.length === 0 && <div className="panel empty-catalog"><Music2 size={26}/><b>{query ? 'No tracks match your search.' : 'The public catalog is ready for its first release.'}</b><span>Approved artist submissions will appear here.</span></div>}
          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Submit your music securely for review in Artist Studio.</p></div><button className="button primary" onClick={() => setTab('studio')}><Upload size={16}/> Open studio</button></section>
        </>}

        {tab === 'studio' && <>
          <section className="section-heading"><div><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p className="muted">Submit a track for review. Audio is stored privately until approved.</p></div></section>
          {!supabaseConfigured && <div className="notice-box prominent"><b>Backend setup required</b><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then apply the Supabase migrations to enable persistent uploads.</p></div>}
          {!session ? <section className="panel studio-auth"><h2>Sign in to submit music</h2><p className="muted">We’ll email you a secure sign-in link. Your uploads are tied to your artist account.</p><form onSubmit={requestSignIn}><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email"/></label><button className="button primary full" disabled={!supabaseConfigured}>Email me a sign-in link</button></form></section> : <>
            <div className="studio-account"><span>Signed in as <b>{session.user.email}</b></span><button className="button secondary" onClick={signOut}>Sign out</button></div>
            <div className="studio-grid">
              <form className="panel upload-form" onSubmit={publishTrack}><h2><Upload size={19}/> Submit a song</h2><p className="muted">MP3, WAV, M4A, OGG, AAC, or FLAC · up to 50 MB</p>
                <label>Song title<input required maxLength="100" value={form.title} onChange={(event) => setForm({...form, title: event.target.value})} placeholder="e.g. Nile Sunset"/></label>
                <label>Artist name<input required maxLength="100" value={form.artist} onChange={(event) => setForm({...form, artist: event.target.value})} placeholder="Your artist name"/></label>
                <label>Genre<select value={form.genre} onChange={(event) => setForm({...form, genre: event.target.value})}><option>Afrobeat</option><option>Dancehall</option><option>Hip-Hop</option><option>Traditional Fusion</option><option>Gospel</option><option>Afro-Pop</option><option>R&amp;B</option></select></label>
                <label>Album / release name<input maxLength="100" value={form.album} onChange={(event) => setForm({...form, album: event.target.value})} placeholder="Single"/></label>
                <label>Cover image URL <span className="muted">(optional)</span><input type="url" value={form.cover} onChange={(event) => setForm({...form, cover: event.target.value})} placeholder="https://example.com/cover.jpg"/></label>
                <label className="file-picker"><Music2 size={21}/><span><b>{selectedFile ? selectedFile.name : 'Choose audio file'}</b><small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · securely uploaded on submit` : 'Select an audio file from your device'}</small></span><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" onChange={(event) => handleFile(event.target.files?.[0])}/></label>
                <label className="rights-confirm"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)}/><span>I confirm that I own or control the rights to this recording and have permission to submit it.</span></label>
                <button className="button primary full" type="submit" disabled={submitting || !supabaseConfigured}><Upload size={16}/>{submitting ? 'Uploading securely…' : 'Submit for review'}</button>
                <p className="fine-print">Audio is stored in private Supabase storage. Submissions are not public until approved. Only your account can access pending audio.</p>
              </form>
              <section className="panel catalog-panel"><div className="catalog-title"><h2>Your submissions</h2><button className="button secondary" onClick={refreshCatalog}>Refresh</button></div>
                {artistTracks.length ? artistTracks.map((track) => <div className="mini-track" key={track.id}><img src={track.cover} alt=""/><div><strong>{track.title}</strong><span>{track.artist} · {track.status.replace('_', ' ')}</span></div>{track.status === 'published' && <button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><Play size={14}/></button>}</div>) : <div className="catalog-empty"><div className="empty-icon"><Music2 size={22}/></div><p><strong>Your submissions will appear here</strong></p><small>Submit a track to add it to your private artist catalog.</small></div>}
                <div className="notice-box launch-note"><b>Before public launch</b><p>Configure and apply the Supabase storage and catalog migrations, test review moderation, and set production auth redirect URLs.</p></div>
              </section>
            </div>
          </>}
        </>}

        {tab === 'monetize' && <>
          <section className="section-heading"><div><span className="eyebrow">CREATOR ECONOMY</span><h1>Monetization</h1><p className="muted">Plan and royalty information. No payments are processed until a provider is enabled.</p></div></section>
          <div className="notice-box prominent"><b>Payments are not live yet</b><p>{paymentSetupMessage}</p></div>
          <section className="plan-grid"><article className="panel plan-card"><span className="eyebrow">FOR LISTENERS</span><h2>Premium Fan</h2><div className="price">$2.99 <small>/ month</small></div><ul><li>Ad-free listening concept</li><li>Support local artists</li><li>Exclusive releases</li></ul></article><article className="panel plan-card"><span className="eyebrow">FOR ARTISTS</span><h2>Pro Creator</h2><div className="price">70% <small>proposed share</small></div><ul><li>Artist uploads</li><li>Proposed royalty share</li><li>Listener analytics concept</li></ul></article></section>
          <section className="panel payout-panel"><div><span className="eyebrow">ROYALTIES &amp; PAYOUTS</span><h2>Artist earnings</h2><p className="muted">No earnings are calculated or transferred in this prototype.</p></div><button className="button secondary" disabled title={paymentSetupMessage}><Wallet size={16}/> Payouts unavailable</button></section>
          <div className="notice-box"><b>To activate real monetization</b><p>Choose and configure a payment provider and secure server-side integration. Never put provider secret keys in frontend code.</p></div>
        </>}
      </main>

      <footer className="player"><div className="player-track">{playing ? <><img src={playing.cover} alt=""/><div><b>{playing.title}</b><span>{playing.artist}</span></div></> : <><span className="player-icon"><Music2 size={19}/></span><div><b>Nothing playing</b><span>Pick a track to listen</span></div></>}</div><button className="play-toggle" aria-label={playing ? 'Pause current track' : 'Play first track'} onClick={() => playing ? playTrack(playing) : visibleTracks[0] && playTrack(visibleTracks[0])}>{playing && audioRef.current && !audioRef.current.paused ? <Pause size={20}/> : <Play size={20}/>}</button><audio ref={audioRef} src={audioUrl} onEnded={() => { setPlaying(null); setAudioUrl(''); }} onError={() => playing && notify('Could not load this audio. Try again later.')}/></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
