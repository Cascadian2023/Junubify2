import { useEffect, useRef, useState } from 'react';
import { AudioLines, BadgeCheck, CircleDollarSign, Headphones, Heart, Music2, Pause, Play, Plus, Radio, Upload, Wallet } from 'lucide-react';

const seedTracks = [
  { id: '1', title: 'Juba City Lights', artist: 'Emmanuel Jal & Dynamq', genre: 'Afrobeat', plays: 124500, cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3' },
  { id: '2', title: 'White Nile Groove', artist: 'Riya Denis', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=tropical-house-110034.mp3' },
  { id: '3', title: 'Peace in South Sudan', artist: 'Silver X feat. MacJ', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=hip-hop-rock-beats-118000.mp3' },
];

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState(seedTracks);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({ title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' });
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 4500);
  };

  const playTrack = (track) => {
    if (!track.audioUrl) {
      notify('This track has no playable audio file.');
      return;
    }
    if (playing?.id === track.id) {
      if (audioRef.current?.paused) audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      else audioRef.current?.pause();
      return;
    }
    setPlaying(track);
    requestAnimationFrame(() => audioRef.current?.play().catch(() => notify('Audio playback failed. Try another track.')));
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg)$/i.test(file.name) && !file.type.startsWith('audio/')) {
      notify('Choose an audio file such as MP3, WAV, M4A, or OGG.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      notify('Audio file must be 50 MB or smaller for this browser preview.');
      return;
    }
    setSelectedFile(file);
  };

  const publishTrack = (event) => {
    event.preventDefault();
    if (!selectedFile) return notify('Choose an audio file before publishing.');
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const audioUrl = URL.createObjectURL(selectedFile);
    objectUrlRef.current = audioUrl;
    const track = {
      id: crypto.randomUUID(), title: form.title.trim(), artist: form.artist.trim(), genre: form.genre,
      album: form.album.trim() || 'Single', plays: 0,
      cover: form.cover.trim() || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500',
      audioUrl, fileName: selectedFile.name,
    };
    setTracks((current) => [track, ...current]);
    setForm({ title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' });
    setSelectedFile(null);
    event.currentTarget.reset();
    setTab('discover');
    notify('Added to this browser preview. For public release, connect persistent audio storage and a backend.');
  };

  const visibleTracks = tracks.filter((track) => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase()));
  const uploadedTracks = tracks.filter((track) => track.fileName);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home"><span className="brand-icon"><Radio size={21}/></span><span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span></button>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17}/> Discover</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17}/> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17}/> Monetization</button>
        </nav>
        <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracks or artists" aria-label="Search tracks or artists" />
      </header>

      <main className="content">
        {tab === 'discover' && <>
          <section className="hero"><div className="hero-copy"><span className="eyebrow"><AudioLines size={14}/> MUSIC FROM HOME</span><h1>South Sudan’s sound,<br/><em>all in one place.</em></h1><p>Discover emerging voices and hometown favorites from Juba and beyond.</p><button className="button primary" onClick={() => visibleTracks[0] && playTrack(visibleTracks[0])}><Play size={16} fill="currentColor"/> Play a track</button></div><div className="hero-art"><div className="vinyl"><div className="vinyl-label"><Radio size={34}/></div></div><span className="art-caption">JUBA · WAU · MALAKAL · DIASPORA</span></div></section>
          <section className="section-heading"><div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2>Discover tracks</h2></div><span className="muted">{visibleTracks.length} tracks</span></section>
          <section className="track-list">{visibleTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><img src={track.cover} alt=""/><div className="track-info"><b>{track.title}</b><span>{track.artist} · {track.genre}</span></div><span className="play-count">{track.plays.toLocaleString()} plays</span><button className="icon-button" onClick={() => playTrack(track)} aria-label={playing?.id === track.id && !audioRef.current?.paused ? `Pause ${track.title}` : `Play ${track.title}`}>{playing?.id === track.id && !audioRef.current?.paused ? <Pause size={18}/> : <Play size={18}/>}</button></article>)}{visibleTracks.length === 0 && <p className="empty">No tracks match that search.</p>}</section>
          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Upload an audio file in Artist Studio to preview it in this browser.</p></div><button className="button secondary" onClick={() => setTab('studio')}><Plus size={17}/> Open artist studio</button></section>
        </>}

        {tab === 'studio' && <>
          <section className="section-heading"><div><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p className="muted">Add track details and an audio file for a local preview.</p></div><span className="status-pill"><BadgeCheck size={15}/> Upload preview</span></section>
          <div className="studio-grid"><form className="panel upload-form" onSubmit={publishTrack}><h2><Upload size={19}/> Upload a song</h2><p className="muted">MP3, WAV, M4A, or OGG · up to 50 MB</p>
            <label>Song title<input required maxLength="100" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Nile Sunset"/></label>
            <label>Artist name<input required maxLength="100" value={form.artist} onChange={(e) => setForm({...form, artist: e.target.value})} placeholder="Your artist name"/></label>
            <label>Genre<select value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})}><option>Afrobeat</option><option>Dancehall</option><option>Hip-Hop</option><option>Traditional Fusion</option><option>Gospel</option><option>Afro-Pop</option></select></label>
            <label>Album / release name<input maxLength="100" value={form.album} onChange={(e) => setForm({...form, album: e.target.value})} placeholder="Single"/></label>
            <label>Cover image URL <span className="muted">(optional)</span><input type="url" value={form.cover} onChange={(e) => setForm({...form, cover: e.target.value})} placeholder="https://…"/></label>
            <label className="file-picker"><Music2 size={21}/><span><b>{selectedFile ? selectedFile.name : 'Choose audio file'}</b><small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB selected` : 'Select a local audio file'}</small></span><input required type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={(e) => handleFile(e.target.files?.[0])}/></label>
            <button className="button primary full" type="submit"><Upload size={16}/> Add to preview catalog</button>
            <p className="fine-print">This prototype keeps uploaded audio in browser memory only. It is not uploaded to a server or published for other listeners.</p>
          </form>
          <section className="panel catalog-panel"><h2>Your preview catalog</h2>{uploadedTracks.length ? uploadedTracks.map((track) => <div className="mini-track" key={track.id}><img src={track.cover} alt=""/><div><b>{track.title}</b><span>{track.artist} · {track.fileName}</span></div><button className="icon-button" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{playing?.id === track.id ? <Pause size={17}/> : <Play size={17}/>}</button></div>) : <div className="empty-state"><Music2 size={28}/><b>Your uploaded previews will appear here</b><span>Choose an audio file and add its details.</span></div>}<div className="notice-box"><b>Before public launch</b><p>Connect artist accounts, durable audio storage, moderation, rights/ownership checks, and a backend catalog API.</p></div></section></div>
        </>}

        {tab === 'monetize' && <>
          <section className="section-heading"><div><span className="eyebrow">CREATOR ECONOMY</span><h1>Monetization</h1><p className="muted">Plan and royalty information. No payments are processed in this preview.</p></div><span className="status-pill warning"><Wallet size={15}/> Setup required</span></section>
          <div className="notice-box prominent"><b>Payments are not live yet</b><p>{paymentSetupMessage}</p></div>
          <section className="plan-grid"><article className="panel plan-card"><span className="eyebrow">FOR LISTENERS</span><h2>Premium Fan</h2><div className="price">$2.99 <small>/ month</small></div><ul><li>Ad-free listening plan concept</li><li>High-quality audio plan concept</li><li>Support local artists</li></ul><button className="button disabled" disabled title={paymentSetupMessage}>Checkout unavailable</button></article><article className="panel plan-card featured"><span className="eyebrow">FOR ARTISTS</span><h2>Pro Creator</h2><div className="price">$4.99 <small>/ month</small></div><ul><li>Artist upload plan concept</li><li>Proposed 70% royalty share</li><li>Royalty and listener analytics</li></ul><button className="button disabled" disabled title={paymentSetupMessage}>Checkout unavailable</button></article></section>
          <section className="panel payout-panel"><div><span className="eyebrow">ROYALTIES & PAYOUTS</span><h2>Artist earnings</h2><p className="muted">A 70% artist share is shown as a proposed plan term only. No earnings are calculated or transferred in this prototype.</p></div><button className="button disabled" disabled title={paymentSetupMessage}><Wallet size={16}/> Payouts unavailable</button></section>
          <div className="notice-box"><b>To activate real monetization</b><p>Choose a payment provider that supports your business and country, complete its merchant onboarding, and implement server-side checkout, signed payment webhooks, subscription entitlements, royalty accounting, identity checks, and payout APIs. Never put provider secret keys in frontend code.</p></div>
        </>}
      </main>

      <footer className="player"><div className="player-track">{playing ? <><img src={playing.cover} alt=""/><div><b>{playing.title}</b><span>{playing.artist}</span></div></> : <><span className="player-placeholder"><Music2 size={19}/></span><div><b>Nothing playing</b><span>Pick a track to listen</span></div></>}</div><div className="player-control"><button className="play-main" onClick={() => playing && playTrack(playing)} disabled={!playing} aria-label="Play or pause">{playing?.id === playing?.id && audioRef.current && !audioRef.current.paused ? <Pause size={18}/> : <Play size={18} fill="currentColor"/>}</button><span>Audio preview</span></div><audio ref={audioRef} src={playing?.audioUrl || undefined} onEnded={() => setPlaying(null)} onError={() => playing && notify('Could not load this audio.')} controls={false}/></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
