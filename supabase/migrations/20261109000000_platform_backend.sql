-- Run in the Supabase SQL editor for your project.
-- Audio remains private while a track is pending review. Only trusted server-side
-- administration should change status to 'published'.

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references auth.users(id) on delete cascade,
  artist_name text not null check (char_length(artist_name) between 1 and 100),
  title text not null check (char_length(title) between 1 and 100),
  genre text not null check (char_length(genre) between 1 and 60),
  album text not null default 'Single' check (char_length(album) <= 100),
  cover_url text,
  audio_path text not null unique,
  status text not null default 'pending_review' check (status in ('pending_review', 'published', 'rejected')),
  rights_confirmed_at timestamptz not null,
  plays bigint not null default 0 check (plays >= 0),
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;
revoke all on public.tracks from anon, authenticated;
grant select on public.tracks to anon, authenticated;
grant insert on public.tracks to authenticated;

create policy "Published tracks are readable"
  on public.tracks for select to anon, authenticated using (status = 'published');
create policy "Artists can read their own submissions"
  on public.tracks for select to authenticated using (artist_id = auth.uid());
create policy "Artists can submit private tracks for review"
  on public.tracks for insert to authenticated
  with check (artist_id = auth.uid() and status = 'pending_review');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('junubify-audio', 'junubify-audio', false, 52428800, array['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg','audio/aac','audio/flac'])
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "Artists upload audio into their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'junubify-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Artists can read their own audio and published tracks can be streamed"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'junubify-audio'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.tracks t where t.audio_path = name and t.status = 'published')
    )
  );
create policy "Published audio can be signed for playback"
  on storage.objects for select to anon
  using (bucket_id = 'junubify-audio' and exists (select 1 from public.tracks t where t.audio_path = name and t.status = 'published'));

-- Payment records are intentionally server-only. Add provider-specific handlers,
-- signature verification, idempotency, and settlement reconciliation before use.
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;

create table if not exists public.royalty_ledger (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references auth.users(id),
  track_id uuid references public.tracks(id),
  source_reference text not null unique,
  gross_minor bigint not null check (gross_minor >= 0),
  artist_share_minor bigint not null check (artist_share_minor >= 0 and artist_share_minor <= gross_minor),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);
alter table public.royalty_ledger enable row level security;
revoke all on public.royalty_ledger from anon, authenticated;
