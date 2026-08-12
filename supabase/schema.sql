-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  is_ai boolean not null,
  title text not null,
  reason text not null,
  verified_year int,
  created_at timestamptz default now()
);

-- The anon key is meant to be public; row-level security is what keeps
-- writes locked down while allowing the game to read the card pool.
alter table cards enable row level security;

create policy "Public read access"
  on cards for select
  using (true);

-- No insert/update/delete policy is created, so the anon key can only
-- read. Add/edit rows yourself via the Supabase Table Editor, or add an
-- authenticated-only write policy later if you build an admin panel.

-- Optional starter rows so the table isn't empty on first run. Replace the
-- URLs with your own uploaded images (Storage -> create a public bucket,
-- e.g. "card-images", upload files, copy their public URL).
insert into cards (url, is_ai, title, reason, verified_year) values
  ('https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1000&q=80&auto=format&fit=crop',
   false, 'Sunset Ridge', 'Real atmospheric scatter and sensor grain in the shadow detail.', 2017),
  ('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000&q=80&auto=format&fit=crop',
   false, 'Spiral Stair, Interior Study', 'Consistent perspective lines and true depth-of-field falloff.', 2018);
