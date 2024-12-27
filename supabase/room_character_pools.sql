-- Create room_character_pools table
CREATE TABLE IF NOT EXISTS public.room_character_pools (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id text REFERENCES public.rooms(id) ON DELETE CASCADE,
    character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
    added_by text NOT NULL,
    added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, character_id)
);

-- Enable RLS
ALTER TABLE public.room_character_pools ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.room_character_pools
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.room_character_pools
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.room_character_pools
    FOR DELETE USING (true);

-- Enable realtime with full replica identity
ALTER TABLE public.room_character_pools REPLICA IDENTITY FULL;

-- Enable realtime for all operations
ALTER PUBLICATION supabase_realtime ADD TABLE room_character_pools;

-- Add comment to specify realtime events
COMMENT ON TABLE public.room_character_pools IS 'Enable realtime for INSERT,DELETE'; 
