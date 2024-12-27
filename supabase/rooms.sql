-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    players jsonb DEFAULT '[]'::jsonb,
    is_game_started boolean DEFAULT false,
    player_picks jsonb DEFAULT '{}'::jsonb,
    player_picks_state jsonb DEFAULT '{}'::jsonb,
    player_guesses jsonb DEFAULT '{}'::jsonb, -- {nickname: {characterId: string, timestamp: string}[]}
    winner text -- nickname of the winner
);

-- Add for rooms table
ALTER TABLE public.rooms 
    ADD CONSTRAINT max_players CHECK (jsonb_array_length(players) <= 4),
    ADD CONSTRAINT valid_player_format CHECK (
        jsonb_typeof(players) = 'array' AND
        jsonb_typeof(player_picks) = 'object' AND
        jsonb_typeof(player_guesses) = 'object'
    );

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.rooms
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.rooms
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.rooms
    FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms; 

