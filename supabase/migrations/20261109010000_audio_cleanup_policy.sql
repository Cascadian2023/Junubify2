-- Allow authenticated artists to clean up only their own audio objects that have no catalog row.
-- This is used to remove an upload if its track metadata insert fails.
create policy "Artists can remove their own unreferenced audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'junubify-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.tracks t where t.audio_path = name)
  );
