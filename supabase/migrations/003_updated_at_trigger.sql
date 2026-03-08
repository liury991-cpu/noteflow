-- Auto-update updated_at on row modification

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_updated_at
  before update on notes
  for each row execute function set_updated_at();

create trigger folders_updated_at
  before update on folders
  for each row execute function set_updated_at();

create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function set_updated_at();
