-- Run this once in Supabase → SQL Editor.

-- 1) Table
create table if not exists public.photos (
  id         uuid primary key default gen_random_uuid(),
  username   text not null check (char_length(username) between 1 and 30),
  path       text not null,
  owner      uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

-- Everyone can see the wall
create policy "anyone can view photos" on public.photos
  for select using (true);

-- Signed-in (including anonymous) browsers can add their own rows
create policy "add own photos" on public.photos
  for insert to authenticated with check (owner = auth.uid());

-- Only the uploader can delete
create policy "delete own photos" on public.photos
  for delete to authenticated using (owner = auth.uid());

-- 2) Storage bucket (public so image URLs work in <img>)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/gif','image/webp'])
on conflict (id) do nothing;

create policy "upload to photos bucket" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own files in photos bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
