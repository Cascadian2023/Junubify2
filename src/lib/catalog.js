import { supabase } from './supabase.js';

const AUDIO_BUCKET = 'junubify-audio';
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac']);

function throwIfError(result) {
  if (result.error) throw result.error;
  return result.data;
}

function mapTrack(track) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist_name,
    genre: track.genre,
    album: track.album,
    plays: track.plays ?? 0,
    cover: track.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500',
    audioPath: track.audio_path,
    status: track.status,
    fileName: track.audio_path.split('/').pop(),
  };
}

export async function fetchPublishedTracks() {
  const data = throwIfError(await supabase
    .from('tracks')
    .select('id,title,artist_name,genre,album,cover_url,audio_path,status,plays,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(100));
  return data.map(mapTrack);
}

export async function fetchArtistTracks(artistId) {
  const data = throwIfError(await supabase
    .from('tracks')
    .select('id,title,artist_name,genre,album,cover_url,audio_path,status,plays,created_at')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(100));
  return data.map(mapTrack);
}

export async function createTrackAudioUrl(audioPath) {
  const data = throwIfError(await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(audioPath, 60 * 60));
  return data.signedUrl;
}

export async function submitTrack({ file, form, artistId }) {
  if (!supabase) throw new Error('Connect Supabase before submitting audio.');
  if (!artistId) throw new Error('Sign in before submitting a track.');
  if (!file || file.size > MAX_AUDIO_BYTES) throw new Error('Choose an audio file no larger than 50 MB.');

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error('Choose an MP3, WAV, M4A, OGG, AAC, or FLAC audio file.');
  }

  const audioPath = `${artistId}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from(AUDIO_BUCKET).upload(audioPath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const insert = await supabase.from('tracks').insert({
    artist_id: artistId,
    artist_name: form.artist.trim(),
    title: form.title.trim(),
    genre: form.genre,
    album: form.album.trim() || 'Single',
    cover_url: form.cover.trim() || null,
    audio_path: audioPath,
    status: 'pending_review',
    rights_confirmed_at: new Date().toISOString(),
  }).select('id,title,artist_name,genre,album,cover_url,audio_path,status,plays,created_at').single();

  if (insert.error) {
    // The storage delete policy permits removing only this user's unreferenced uploads.
    await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
    throw insert.error;
  }

  return mapTrack(insert.data);
}
