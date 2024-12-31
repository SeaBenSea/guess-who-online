-- Create leaderboard table
create table if not exists public.leaderboard (
    user_id UUID primary key NOT NULL REFERENCES auth.users(id),
    games_played integer not null default 0,
    wins integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.leaderboard enable row level security;

-- Create policy to allow anyone to read the leaderboard
create policy "Authenticated users can see leaderboard"
on "public"."leaderboard"
for select
to authenticated
using (true);

-- Create database function to update leaderboard
create or replace function update_leaderboard(
    winner_id uuid,
    loser_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
    -- Update or insert winner stats
    insert into public.leaderboard (user_id, games_played, wins)
    values (winner_id, 1, 1)
    on conflict (user_id)
    do update set
        games_played = public.leaderboard.games_played + 1,
        wins = public.leaderboard.wins + 1;

    -- Update or insert loser stats
    insert into public.leaderboard (user_id, games_played, wins)
    values (loser_id, 1, 0)
    on conflict (user_id)
    do update set
        games_played = public.leaderboard.games_played + 1;
end;
$$;

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
