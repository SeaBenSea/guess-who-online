-- Create leaderboard table
create table if not exists public.leaderboard (
    nickname text primary key,
    games_played integer not null default 0,
    wins integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.leaderboard enable row level security;

-- Create policy to allow anyone to read the leaderboard
create policy "Anyone can read leaderboard"
on public.leaderboard for select
to public
using (true);

-- Create policy to allow anyone to insert their own record
create policy "Anyone can insert their own record"
on public.leaderboard for insert
to public
with check (true);

-- Create policy to allow anyone to update their own record
create policy "Anyone can update their own record"
on public.leaderboard for update
to public
using (true);

-- Create function to update updated_at on record change
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- Create trigger to automatically update updated_at
create trigger handle_updated_at
    before update on public.leaderboard
    for each row
    execute function public.handle_updated_at(); 
