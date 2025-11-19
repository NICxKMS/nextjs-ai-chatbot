-- Supabase-managed trigger to mirror auth.users into public."User"
-- and backfill existing accounts.

-- Backfill existing Supabase auth users into public."User"
insert into "User" (id, email)
select id, lower(email)
from auth.users
on conflict (id) do nothing;

-- Create function to mirror new auth.users rows into public."User"
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into "User" (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger on insert into auth.users
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_auth_user();


