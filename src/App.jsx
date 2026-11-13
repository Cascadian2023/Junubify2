import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, CircleDollarSign, Headphones, Heart, Music2, Pause, Play, Radio, Upload, Wallet } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createTrackAudioUrl, fetchArtistTracks, fetchPublishedTracks, submitTrack } from './lib/catalog.js';

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };
const sampleTracks = [
  { id: 'demo-1', title: 'Juba City Lights', artist: 'Emmanuel Jal & Dynamq', genre: 'Afrobeat', plays: 124500, cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'demo-2', title: 'White Nile Groove', artist: 'Riya Denis', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'demo-3', title: 'Peace in South Sudan', artist: 'Silver X feat. MacJ', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

function formatPlays(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [session, setSession] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [likedTracks, setLikedTracks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('junubify-liked-tracks') || '{}'); } catch { return {}; }
  });
  const audioRef = useRef(null);
  const notifyTimer = useRef(null);
  const catalogTracks = tracks.length ? tracks : sampleTracks;
  const visibleTracks = catalogTracks.filter((track) => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase()));

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notifyTimer.current);
    notifyTimer.current = window.setTimeout(() => setNotice(''), 4500);
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

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let mounted = true;
    setLoadingCatalog(true);
    fetchPublishedTracks()
      .then((published) => { if (mounted) setTracks(published); })
      .catch((error) => { if (mounted) setCatalogError(error.message || 'Could not load the live catalog.'); })
      .finally(() => { if (mounted) setLoadingCatalog(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) { setArtistTracks([]); return undefined; }
    let mounted = true;
    fetchArtistTracks(session.user.id).then((list) => { if (mounted) setArtistTracks(list); }).catch((error) => notify(error.message));
    return () => { mounted = false; };
  }, [session?.user?.id]);

  const playTrack = async (track) => {
    if (playing?.id === track.id) {
      if (!audioRef.current) return;
      if (audioRef.current.paused) audioRef.current.play().catch(() => notify('Playback could not start. Check your connection and try again.'));
      else audioRef.current.pause();
      return;
    }
    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      setPlaying({ ...track, playbackUrl: url });
      setIsPlaying(true);
      window.setTimeout(() => audioRef.current?.play().catch(() => notify('Playback could not start. Check your connection and try again.')), 0);
    } catch (error) {
      notify(error.message || 'Could not create a secure audio playback link.');
    }
  };

  const toggleLike = (trackId) => setLikedTracks((current) => {
    const next = { ...current, [trackId]: !current[trackId] };
    try { localStorage.setItem('junubify-liked-tracks', JSON.stringify(next)); } catch { /* Browser storage may be disabled. */ }
    return next;
  });

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Connect Supabase to enable artist sign-in.');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    notify(error ? error.message : 'Check your email for a secure sign-in link.');
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in before submitting a track.');
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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    notify(error ? error.message : 'You have signed out.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home">
          <span className="brand-icon"><Radio size={25} strokeWidth={2.2} /></span>
          <span className="brand-copy"><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span>
        </button>
        <label className="search-wrap"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracks or artists" aria-label="Search tracks or artists" /></label>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={22} /><span>Discover</span></button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={22} /><span>Artist studio</span></button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={22} /><span>Monetization</span></button>
        </nav>
      </header>

      <main className="content">
        {tab === 'discover' && <>
          <section className="hero">
            <span className="eyebrow"><AudioLines size={17} /> MUSIC FROM HOME</span>
            <h1>South Sudan’s sound,<br /><em>all in one place.</em></h1>
            <p>Discover emerging voices and hometown favorites from Juba and beyond.</p>
            <button className="primary-button hero-button" onClick={() => playTrack(visibleTracks[0] || sampleTracks[0])}><Play size={22} fill="currentColor" /> Play a track</button>
          </section>

          <section className="catalog" id="catalog">
            <div className="section-heading catalog-heading">
              <div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2>Discover tracks</h2></div>
              <span className="track-count">{visibleTracks.length} tracks</span>
            </div>
            <p className="catalog-note">{supabaseConfigured ? 'South Sudan’s latest releases, all in one place' : 'Sample tracks · connect Supabase for the live catalog'}</p>
            {catalogError && <p className="inline-note" role="status">Live catalog unavailable: {catalogError} Showing sample tracks instead.</p>}
            {loadingCatalog && <p className="inline-note">Loading the live catalog…</p>}
            <div className="track-list">
              {visibleTracks.length ? visibleTracks.map((track, index) => <article className="track-row" key={track.id}>
                <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
                <img className="track-art" src={track.cover} alt={`${track.title} cover`} loading="lazy" />
                <div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div>
                <div className="track-actions">
                  <button className={`icon-button like-button ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? 'Unlike track' : 'Like track'}><Heart size={22} fill={likedTracks[track.id] ? 'currentColor' : 'none'} /></button>
                  <span className="plays-count">{formatPlays(track.plays)}</span>
                  <button className="square-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{playing?.id === track.id && isPlaying ? <Pause size={21} /> : <Play size={21} />}</button>
                </div>
              </article>) : <div className="empty-results">No tracks match “{query}”. Try another search.</div>}
            </div>
          </section>

          <section className="artist-promo">
            <span className="eyebrow">ARE YOU AN ARTIST?</span>
            <h2>Bring your sound to Junubify.</h2>
            <p>Submit your music securely for review in Artist Studio.</p>
            <button className="primary-button" onClick={() => setTab('studio')}><Upload size={21} /> Open studio</button>
          </section>
        </>}

        {tab === 'studio' && <section className="studio-page">
          <div className="page-heading"><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p>Submit your music securely for review. Approved tracks can be published to the Junubify catalog.</p></div>
          {!supabaseConfigured ? <div className="notice-card"><strong>Artist submissions are not enabled yet</strong><p>Connect a Supabase project to enable secure artist sign-in and audio uploads.</p></div> : !session ? <form className="panel form-panel" onSubmit={requestSignIn}><h2>Sign in to Artist Studio</h2><p>We’ll email you a secure sign-in link.</p><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><button className="primary-button" type="submit">Email sign-in link</button></form> : <>
            <div className="signed-in panel"><div><strong>Signed in</strong><span>{session.user.email}</span></div><button className="secondary-button" onClick={signOut}>Sign out</button></div>
            <form className="panel form-panel" onSubmit={publishTrack}><h2>Submit a track</h2><p>Audio is uploaded privately and stays pending until reviewed.</p>
              <div className="form-grid"><label>Track title<input required maxLength="120" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Artist name<input required maxLength="120" value={form.artist} onChange={(event) => setForm({ ...form, artist: event.target.value })} /></label><label>Genre<select value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })}><option>Afrobeat</option><option>Dancehall</option><option>Hip-Hop</option><option>Traditional Fusion</option><option>Gospel</option></select></label><label>Album (optional)<input maxLength="120" value={form.album} onChange={(event) => setForm({ ...form, album: event.target.value })} /></label><label className="full-field">Cover image URL (optional)<input type="url" value={form.cover} onChange={(event) => setForm({ ...form, cover: event.target.value })} placeholder="https://…" /></label><label className="file-field full-field">Audio file (MP3, WAV, M4A, OGG, AAC, or FLAC; max 50 MB)<input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" required onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />{selectedFile && <span className="file-name">{selectedFile.name}</span>}</label></div>
              <label className="checkbox-row"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /> I own or control the rights to this audio and have permission to submit it.</label><button className="primary-button" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review'}</button>
            </form>
            {artistTracks.length > 0 && <div className="panel submission-list"><h2>Your submissions</h2>{artistTracks.map((track) => <div key={track.id} className="submission-row"><span>{track.title} · {track.artist}</span><b>{track.status === 'pending_review' ? 'Pending review' : track.status}</b></div>)}</div>}
          </>}
        </section>}

        {tab === 'monetize' && <section className="monetization-page">
          <div className="page-heading"><span className="eyebrow">CREATOR ECONOMY</span><h1>Monetization</h1><p>Plan and royalty information. No payments are processed until a provider is enabled.</p></div>
          <div className="notice-card warning"><strong>Payments are not live yet</strong><p>{paymentSetupMessage}</p></div>
          <article className="plan-card"><span className="eyebrow">FOR LISTENERS</span><h2>Premium Fan</h2><div className="plan-price"><strong>$2.99</strong><span>/ month</span></div><ul><li>Ad-free listening concept</li><li>Support local artists</li><li>Exclusive releases</li></ul></article>
          <article className="plan-card"><span className="eyebrow">FOR ARTISTS</span><h2>Pro Creator</h2><div className="plan-price"><strong>70%</strong><span>proposed share</span></div><ul><li>Artist uploads</li><li>Proposed royalty share</li><li>Listener analytics concept</li></ul></article>
          <article className="panel earnings-card"><span className="eyebrow">ROYALTIES &amp; PAYOUTS</span><h2>Artist earnings</h2><p>No earnings are calculated or transferred in this prototype.</p><button className="secondary-button" disabled><Wallet size={21} /> Payouts unavailable</button></article>
          <div className="notice-card warning setup-warning"><strong>To activate real monetization</strong><p>Choose and configure a payment provider and secure server-side integration. Never put provider secret keys in frontend code.</p></div>
        </section>}
      </main>

      <footer className="player" aria-label="Audio player">
        <Music2 className="player-note" size={27} />
        <div className="player-copy"><strong>{playing ? playing.title : 'Nothing playing'}</strong><span>{playing ? playing.artist : 'Pick a track to listen'}</span></div>
        <audio ref={audioRef} src={playing?.playbackUrl || undefined} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} preload="none" />
        <button className="square-play player-button" onClick={() => playing ? playTrack(playing) : playTrack(visibleTracks[0] || sampleTracks[0])} aria-label={isPlaying ? 'Pause playback' : 'Play track'}>{isPlaying ? <Pause size={24} /> : <Play size={24} />}</button>
      </footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
