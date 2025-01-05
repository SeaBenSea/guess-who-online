-- Create rooms table
CREATE TABLE IF NOT EXISTS
  public.rooms (
    id text PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone ('utc'::text, now()) NOT NULL,
    players JSONB DEFAULT '[]'::jsonb,
    is_game_started BOOLEAN DEFAULT false,
    player_picks JSONB DEFAULT '{}'::jsonb,
    player_picks_state JSONB DEFAULT '{}'::jsonb,
    player_guesses JSONB DEFAULT '{}'::jsonb, -- {userId: {characterId: string, timestamp: string}[]}
    winner UUID REFERENCES auth.users (id) -- winner's user ID
  );

-- Add for rooms table
ALTER TABLE public.rooms
ADD CONSTRAINT max_players CHECK (jsonb_array_length(players) <= 4),
ADD CONSTRAINT valid_player_format CHECK (
  jsonb_typeof(players) = 'array'
  AND jsonb_typeof(player_picks) = 'object'
  AND jsonb_typeof(player_guesses) = 'object'
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users only" ON public.rooms FOR
SELECT
  TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.rooms FOR INSERT TO authenticated
WITH
  CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.rooms
FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.rooms FOR DELETE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime
ADD TABLE rooms;
