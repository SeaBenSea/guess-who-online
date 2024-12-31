-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for character types
CREATE TYPE character_type AS ENUM (
  'human_male',
  'human_female',
  'dog',
  'cat',
  'bird',
  'fish',
  'robot',
  'alien',
  'monster',
  'superhero',
  'villain',
  'wizard',
  'dragon',
  'unicorn',
  'other'
);

-- Create characters table
CREATE TABLE characters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type character_type NOT NULL,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Add constraints
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT valid_image_url CHECK (
    image_url IS NULL OR
    image_url LIKE 'data:image/%' OR
    image_url SIMILAR TO 'https?://([\w-]+\.)*imgur\.com/\S+' OR
    image_url SIMILAR TO 'https?://([\w-]+\.)*giphy\.com/\S+' OR
    image_url SIMILAR TO 'https?://upload.wikimedia.org/\S+'
  )
);

-- Enable Row Level Security (RLS)
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all characters
CREATE POLICY "Authenticated users can read all characters"
ON characters FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to insert their own characters
CREATE POLICY "Authenticated users can insert their own characters"
ON characters FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND
  (SELECT COUNT(*) FROM characters WHERE created_by = auth.uid()) < 20
);

-- Create policy to allow users to delete their own characters
CREATE POLICY "Authenticated users can delete their own characters"
ON characters FOR DELETE
TO authenticated
USING (auth.uid() = created_by); 
