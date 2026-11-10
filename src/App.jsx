import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, BadgeCheck, CircleDollarSign, Compass, Download, Headphones, Heart, Music2, Pause, Play, Radio, Smartphone, TrendingUp, Upload, Wallet } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createTrackAudioUrl, fetchArtistTracks, fetchPublishedTracks, submitTrack } from './lib/catalog.js';

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };
const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500';
const demoTracks = [
  { id: 'demo-1', title: 'Juba City Lights', artist: 'Emmanuel Jal & Dynamq', genre: 'Afrobeat', plays: 124500, cover: fallbackCover },
  { id: 'demo-2', title: 'White Nile Groove', artist: 'Riya Denis', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500' },
  { id: 'demo-3', title: 'Peace in South Sudan', artist: 'Silver X feat. MacJ', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500' },
  { id: 'demo-4', title: 'Bahr el Ghazal Breeze', artist: 'Winnie Lado', genre: 'Traditional & Cultural', plays: 68400, cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=500' },
  { id: 'demo-5', title: 'Custom Bus Dance', artist: 'K-Doe', genre: 'Afro-Pop', plays: 57300, cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=500' },
  { id: 'demo-6', title: 'Juba Morning', artist: 'Mia Ajak', genre: 'Afrobeat', plays: 42100, cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=500' },
  { id: 'demo-7', title: 'Nile Road Home', artist: 'D. Khat', genre: 'Gospel & Choir', plays: 38900, cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=500' },
  { id: 'demo-8', title: 'Malakal After Dark', artist: 'R. Ngu', genre: 'Hip-Hop', plays: 31200, cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=500' },
];
const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', count: '1.2k tracks', color: 'genre-green' },
  { name: 'Traditional & Cultural', filter: 'Traditional & Cultural', count: '850 tracks', color: 'genre-orange' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', count: '2.4k tracks', color: 'genre-purple' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', count: '940 tracks', color: 'genre-red' },
  { name: 'Gospel & Choir', filter: 'Gospel & Choir', count: '1.8k tracks', color: 'genre-blue' },
];

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
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

  const catalogTracks = tracks.length ? tracks : demoTracks;
  const visibleTracks = catalogTracks.filter((track) => {
    const matchesText = `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase());
    const matchesGenre = !genreFilter || track.genre.toLowerCase().includes(genreFilter.toLowerCase());
    return matchesText && matchesGenre;
  });

  const playTrack = async (track) => {
    if (playing?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      else audioRef.current.pause();
      return;
    }
    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('This sample listing has no audio attached yet.');
      setAudioUrl(url);
      setPlaying(track);
      window.setTimeout(() => audioRef.current?.play().catch(() => notify('Audio playback failed. Try another track.')), 0);
    } catch (error) {
      notify(error.message || 'Could not create a secure audio playback link.');
    }
  };

  const selectGenre = (genre) => {
    setGenreFilter((current) => current === genre ? '' : genre);
    setQuery('');
    setTab('discover');
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home"><span className="brand-icon"><Radio size={21}/></span><span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span></button>
        <input className="search" value={query} onChange={(event) => { setQuery(event.target.value); setGenreFilter(''); }} placeholder="Search tracks or artists" aria-label="Search tracks or artists" />
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17}/> Discover</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17}/> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17}/> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17}/> Get the app</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'discover' && <>
          <section className="hero trend-hero">
            <div className="hero-copy"><span className="eyebrow"><AudioLines size={14}/> FEATURED JUBA PLAYLIST</span><h1>Top 50 South Sudan Trends</h1><p>Stream the hottest tracks straight out of Juba, Wau, Malakal, and the diaspora. Powered by local Mobile Money payouts.</p><div className="hero-actions"><button className="button primary hero-play" onClick={() => visibleTracks[0] && playTrack(visibleTracks[0])}><Play size={16} fill="currentColor"/> Play All</button><button className="button secondary" onClick={() => setTab('studio')}><Upload size={16}/> Upload Song</button></div></div>
            <div className="hero-badge"><BadgeCheck size={18}/> A home for local artists</div>
          </section>

          <section className="genre-section"><div className="section-heading"><div><span className="eyebrow">EXPLORE</span><h2><Compass size={22}/> Explore Juba Genres</h2></div></div><div className="genre-grid">{genres.map((genre) => <button key={genre.name} className={`genre-card ${genre.color} ${genreFilter === genre.filter ? 'selected' : ''}`} onClick={() => selectGenre(genre.filter)}><strong>{genre.name}</strong><span>{genre.count}</span></button>)}</div></section>

          <section className="trending-section" id="catalog"><div className="section-heading"><div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2><TrendingUp size={22}/> Trending tracks in Juba</h2></div><span className="muted">{genreFilter ? <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear genre · </button> : null}{visibleTracks.length} tracks</span></div>
            {!tracks.length && <p className="catalog-status">Sample tracks · connect Supabase for the live catalog</p>}
            {loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}
            {catalogError && <div className="notice-box"><b>Catalog unavailable</b><p>{catalogError}</p><button className="button secondary" onClick={refreshCatalog}>Try again</button></div>}
            <section className="track-list">{visibleTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div><div className="track-stats"><span><Heart size={14}/> {Number(track.plays || 0).toLocaleString()}</span><button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15}/> : <Play size={15}/>}</button></div></article>)}</section>
            {!visibleTracks.length && <div className="panel empty-catalog"><Music2 size={26}/><b>No tracks match this filter.</b><span>Choose another genre or clear your search.</span></div>}
          </section>

          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Submit your music securely for review in Artist Studio.</p></div><button className="button primary" onClick={() => setTab('studio')}><Upload size={16}/> Open studio</button></section>
        </>}

        {tab === 'studio' && <>
          <section className="section-heading"><div><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p className="muted">Submit a track for review. Audio is stored privately until approved.</p></div></section>
          {!supabaseConfigured && <div className="notice-box prominent"><b>Backend setup required</b><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then apply the Supabase migrations to enable uploads.</p></div>}
          {!session ? <section className="panel studio-auth"><h2>Sign in to submit music</h2><p className="muted">We’ll email you a secure sign-in link.</p><form onSubmit={requestSignIn}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><button className="button primary" type="submit">Send sign-in link</button></form></section> : <>
            <div className="studio-account"><span>Signed in as <b>{session.user.email}</b></span><button className="button secondary" onClick={signOut}>Sign out</button></div>
            <div className="studio-grid"><form className="panel upload-form" onSubmit={publishTrack}><h2><Upload size={19}/> Submit a song</h2><p className="muted">MP3, WAV, M4A, OGG, AAC, or FLAC · up to 50 MB</p>
              <label>Song title<input required maxLength="100" value={form.title} onChange={(event) => setForm({...form, title: event.target.value})} placeholder="e.g. Nile Sunset"/></label>
              <label>Artist name<input required maxLength="100" value={form.artist} onChange={(event) => setForm({...form, artist: event.target.value})} placeholder="Your artist name"/></label>
              <label>Genre<select value={form.genre} onChange={(event) => setForm({...form, genre: event.target.value})}><option>Afrobeat</option><option>Dancehall</option><option>Hip-Hop</option><option>Traditional &amp; Cultural</option><option>Gospel &amp; Choir</option><option>Afro-Pop</option></select></label>
              <label>Album / release name<input maxLength="100" value={form.album} onChange={(event) => setForm({...form, album: event.target.value})} placeholder="Single"/></label>
              <label>Cover image URL <span className="muted">(optional)</span><input type="url" value={form.cover} onChange={(event) => setForm({...form, cover: event.target.value})} placeholder="https://"/></label>
              <label className="file-picker"><Music2 size={21}/><span><b>{selectedFile ? selectedFile.name : 'Choose audio file'}</b><small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Audio file · up to 50 MB'}</small></span><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" onChange={(event) => handleFile(event.target.files?.[0])}/></label>
              <label className="rights-confirm"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)}/><span>I confirm that I own or control the rights to this audio.</span></label>
              <button className="button primary full" type="submit" disabled={submitting || !supabaseConfigured}><Upload size={16}/>{submitting ? 'Uploading securely…' : 'Submit for review'}</button><p className="fine-print">Submissions remain private until approved.</p>
            </form><section className="panel catalog-panel"><div className="catalog-title"><h2>Your submissions</h2><button className="button secondary" onClick={refreshCatalog}>Refresh</button></div>{artistTracks.length ? artistTracks.map((track) => <div className="mini-track" key={track.id}><img src={track.cover} alt=""/><div><strong>{track.title}</strong><span>{track.artist} · {track.status.replace('_', ' ')}</span></div>{track.status === 'published' && <button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><Play size={14}/></button>}</div>) : <div className="catalog-empty"><div className="empty-icon"><Music2 size={22}/></div><p><strong>Your submissions will appear here</strong></p><small>Submit a track to add it to your private artist catalog.</small></div>}</section></div>
          </>}
        </>}

        {tab === 'monetize' && <><section className="section-heading"><div><span className="eyebrow">CREATOR ECONOMY</span><h1>Monetization</h1><p className="muted">Plans and royalty information. Payments are not active.</p></div></section><div className="notice-box prominent"><b>Payments are not live yet</b><p>{paymentSetupMessage}</p></div><section className="plan-grid"><article className="panel plan-card"><span className="eyebrow">FOR LISTENERS</span><h2>Premium Fan</h2><div className="price">$2.99 <small>/ month</small></div><ul><li>Ad-free listening concept</li><li>Support local artists</li><li>Exclusive releases</li></ul></article><article className="panel plan-card"><span className="eyebrow">FOR ARTISTS</span><h2>Pro Creator</h2><div className="price">70% <small>proposed share</small></div><ul><li>Artist uploads</li><li>Proposed royalty share</li><li>Listener analytics concept</li></ul></article></section><section className="panel payout-panel"><div><span className="eyebrow">ROYALTIES &amp; PAYOUTS</span><h2>Artist earnings</h2><p className="muted">No earnings are calculated or transferred yet.</p></div><Wallet size={28}/></section></>}

        {tab === 'download' && <section className="app-download panel"><div className="download-icon"><Smartphone size={42}/></div><span className="eyebrow">LISTEN WHEREVER YOU ARE</span><h1>Get Junubify for Android &amp; iOS</h1><p>Use the installable web app to keep Junubify close. Native store downloads will be linked once the apps are published.</p><div className="store-buttons"><div className="store-placeholder"><Download size={22}/><span><small>ANDROID APP</small><b>Coming soon</b></span></div><div className="store-placeholder"><Download size={22}/><span><small>APPLE APP</small><b>Coming soon</b></span></div></div><div className="qr-placeholder" aria-label="Decorative QR-style pattern" role="img">{Array.from({ length: 64 }, (_, index) => <i key={index} className={(index * 7 + index % 3) % 4 === 0 ? 'qr-lit' : ''}/>)}</div><p className="muted">To install the current web app, use your browser menu and choose “Add to Home screen”.</p></section>}
      </main>

      <footer className="player"><div className="player-track">{playing ? <><img src={playing.cover || fallbackCover} alt=""/><div><b>{playing.title}</b><span>{playing.artist}</span></div></> : <><span className="player-note"><Music2 size={16}/></span><div><b>Nothing playing</b><span>Pick a track to listen</span></div></>}</div><audio ref={audioRef} src={audioUrl || undefined} onEnded={() => setPlaying(null)} /><button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label="Toggle playback">{playing ? <Pause size={16}/> : <Play size={16}/>}</button></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
