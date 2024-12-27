-- Insert test characters for each type (existing 15)
INSERT INTO characters (name, type) VALUES
  ('John Smith', 'human_male'),
  ('Sarah Johnson', 'human_female'),
  ('Buddy', 'dog'),
  ('Whiskers', 'cat'),
  ('Rio', 'bird'),
  ('Nemo', 'fish'),
  ('R2-D2', 'robot'),
  ('Zorg', 'alien'),
  ('Cookie Monster', 'monster'),
  ('Captain Amazing', 'superhero'),
  ('Dr. Evil', 'villain'),
  ('Merlin', 'wizard'),
  ('Smaug', 'dragon'),
  ('Sparkles', 'unicorn'),
  ('Mystery Being', 'other');

-- Insert additional 35 popular characters (to reach 50 total)
INSERT INTO characters (name, type) VALUES
  -- More human males
  ('Tony Stark', 'human_male'),
  ('Bruce Wayne', 'human_male'),
  ('Luke Skywalker', 'human_male'),

  -- More human females
  ('Diana Prince', 'human_female'),
  ('Lara Croft', 'human_female'),
  ('Hermione Granger', 'human_female'),

  -- Dogs
  ('Scooby-Doo', 'dog'),
  ('Snoopy', 'dog'),
  ('Pluto', 'dog'),

  -- Cats
  ('Garfield', 'cat'),
  ('Tom', 'cat'),

  -- Birds
  ('Tweety', 'bird'),
  ('Hedwig', 'bird'),

  -- Fish
  ('Dory', 'fish'),
  ('Flounder', 'fish'),

  -- Robots
  ('C-3PO', 'robot'),
  ('WALL-E', 'robot'),

  -- Aliens
  ('E.T.', 'alien'),
  ('Xenomorph', 'alien'),

  -- Monsters
  ('Frankenstein''s Monster', 'monster'),
  ('Godzilla', 'monster'),

  -- Superheroes
  ('Spider-Man', 'superhero'),
  ('Wonder Woman', 'superhero'),
  ('Wolverine', 'superhero'),
  ('Batman', 'superhero'),

  -- Villains
  ('Darth Vader', 'villain'),
  ('Joker', 'villain'),
  ('Thanos', 'villain'),

  -- Wizards
  ('Gandalf', 'wizard'),
  ('Albus Dumbledore', 'wizard'),

  -- Dragons
  ('Drogon', 'dragon'),
  ('Toothless', 'dragon'),

  -- Unicorn
  ('Twilight Sparkle', 'unicorn'),

  -- Others
  ('Pikachu', 'other'),
  ('Sonic', 'other');

-- Verify all insertions
SELECT * FROM characters ORDER BY created_at DESC;
