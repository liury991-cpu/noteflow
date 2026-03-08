-- Row Level Security policies

alter table notes         enable row level security;
alter table folders       enable row level security;
alter table user_settings enable row level security;

-- Notes policies
create policy "notes: select own"
  on notes for select using (auth.uid() = user_id);

create policy "notes: insert own"
  on notes for insert with check (auth.uid() = user_id);

create policy "notes: update own"
  on notes for update using (auth.uid() = user_id);

create policy "notes: delete own"
  on notes for delete using (auth.uid() = user_id);

-- Folders policies
create policy "folders: select own"
  on folders for select using (auth.uid() = user_id);

create policy "folders: insert own"
  on folders for insert with check (auth.uid() = user_id);

create policy "folders: update own"
  on folders for update using (auth.uid() = user_id);

create policy "folders: delete own"
  on folders for delete using (auth.uid() = user_id);

-- User settings policies
create policy "user_settings: select own"
  on user_settings for select using (auth.uid() = user_id);

create policy "user_settings: insert own"
  on user_settings for insert with check (auth.uid() = user_id);

create policy "user_settings: update own"
  on user_settings for update using (auth.uid() = user_id);

create policy "user_settings: delete own"
  on user_settings for delete using (auth.uid() = user_id);
