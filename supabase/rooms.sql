-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id text PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    players JSONB DEFAULT '[]'::jsonb,
    is_game_started BOOLEAN DEFAULT false,
    player_picks JSONB DEFAULT '{}'::jsonb,
    player_picks_state JSONB DEFAULT '{}'::jsonb,
    player_guesses JSONB DEFAULT '{}'::jsonb, -- {userId: {characterId: string, timestamp: string}[]}
    winner UUID REFERENCES auth.users(id) -- winner's user ID
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
-- Allow authenticated users to create new rooms
CREATE POLICY "Enable insert for authenticated users only"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow reading rooms that user is part of or public rooms
CREATE POLICY "Enable read access for room participants and public rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (
    -- Allow if user is in the players array
    EXISTS (
        SELECT 1
        FROM jsonb_array_elements(players) AS player
        WHERE (player->>'id')::uuid = auth.uid()
    )
    -- Or if the room is not started (public)
    OR NOT is_game_started
);

-- Allow updates only for players in the room
CREATE POLICY "Enable update for room participants only"
ON public.rooms
FOR UPDATE
TO authenticated
USING (
    -- Check if user is in the players array
    EXISTS (
        SELECT 1
        FROM jsonb_array_elements(players) AS player
        WHERE (player->>'id')::uuid = auth.uid()
    )
)
WITH CHECK (
    -- Check if user is in the players array
    EXISTS (
        SELECT 1
        FROM jsonb_array_elements(players) AS player
        WHERE (player->>'id')::uuid = auth.uid()
    )
);

-- Allow deletion only for players in the room
CREATE POLICY "Enable delete for room participants only"
ON public.rooms
FOR DELETE
TO authenticated
USING (
    -- Check if user is in the players array
    EXISTS (
        SELECT 1
        FROM jsonb_array_elements(players) AS player
        WHERE (player->>'id')::uuid = auth.uid()
    )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms; 
