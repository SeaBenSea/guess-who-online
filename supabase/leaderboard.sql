-- Create leaderboard table
CREATE TABLE IF NOT EXISTS
  public.leaderboard (
    user_id UUID PRIMARY KEY NOT NULL REFERENCES auth.users (id),
    games_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone ('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone ('utc'::text, now()) NOT NULL
  );

-- Enable Row Level Security (RLS)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read the leaderboard
CREATE POLICY "Authenticated users can see leaderboard" ON public.leaderboard FOR
SELECT
  TO authenticated USING (true);

-- Create database function to update leaderboard
CREATE
OR REPLACE FUNCTION update_leaderboard (winner_id UUID, loser_id UUID, room_id TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
    room_winner UUID;
    has_picks BOOLEAN;
    has_guesses BOOLEAN;
BEGIN
    -- First verify that this is a valid game result by checking:
    -- 1. The winner matches the room's winner
    -- 2. Both players were part of the game (check player_picks)
    -- 3. The game was actually played (check player_guesses exists)
    SELECT winner INTO room_winner
    FROM public.rooms
    WHERE id = room_id
    AND winner = winner_id;

    SELECT (player_picks ? winner_id::text AND player_picks ? loser_id::text) INTO has_picks
    FROM public.rooms
    WHERE id = room_id;

    SELECT (player_guesses IS NOT NULL) INTO has_guesses
    FROM public.rooms
    WHERE id = room_id;

    IF room_winner IS NULL OR NOT has_picks OR NOT has_guesses THEN
        RAISE EXCEPTION 'Invalid game result';
    END IF;

    -- Update or insert winner stats
    INSERT INTO public.leaderboard (user_id, games_played, wins)
    VALUES (winner_id, 1, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        games_played = public.leaderboard.games_played + 1,
        wins = public.leaderboard.wins + 1;

    -- Update or insert loser stats
    INSERT INTO public.leaderboard (user_id, games_played, wins)
    VALUES (loser_id, 1, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET
        games_played = public.leaderboard.games_played + 1;
END;
$$;

-- Revoke direct execute permission from public
REVOKE
EXECUTE ON FUNCTION update_leaderboard
FROM
  public;

-- Grant execute permission only to service role
GRANT
EXECUTE ON FUNCTION update_leaderboard TO service_role;

-- Create function to update updated_at on record change
CREATE
OR REPLACE FUNCTION public.handle_updated_at () RETURNS TRIGGER LANGUAGE plpgsql
SET
  search_path = public AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_updated_at BEFORE
UPDATE ON public.leaderboard FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at ();
