-- NoteFlow initial schema

create extension if not exists "pgcrypto";

-- Folders (supports nested hierarchy)
create table folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  parent_id   uuid references folders(id) on delete cascade,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Notes
create table notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  folder_id   uuid references folders(id) on delete set null,
  title       text not null default 'Untitled',
  content     text not null default '',
  tags        text[] not null default '{}',
  ai_summary  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- User settings (one row per user)
create table user_settings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  settings    jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Indexes
create index notes_user_id_idx      on notes(user_id);
create index notes_folder_id_idx    on notes(folder_id);
create index notes_updated_at_idx   on notes(updated_at desc);
create index folders_user_id_idx    on folders(user_id);
create index folders_parent_id_idx  on folders(parent_id);
