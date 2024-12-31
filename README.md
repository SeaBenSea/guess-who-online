# Guess Who Online

A modern, multiplayer implementation of the classic Guess Who? game built with Next.js and Supabase. Play the timeless game of deduction with friends online!

## Features

- **Authentication System**
  - Email-based registration and login
  - Email verification
  - Secure user sessions
- **Real-time Multiplayer**
  - Create and join game rooms
  - Real-time game state updates
  - Private room codes
- **Game Features**
  - Custom character pools
  - In-game chat
  - Turn-based gameplay
  - Win/loss tracking
- **Leaderboard System**
  - Global rankings
  - Win/loss statistics
  - Player performance tracking
- **Admin Dashboard**
  - Character management
  - User management
  - Game monitoring
- **Modern UI/UX**
  - Responsive design
  - Dark mode support
  - Interactive animations
  - Mobile-friendly interface

## How to Play

1. **Create an Account**
   - Sign up with your email
   - Verify your email address
   - Log in to your account

2. **Start a Game**
   - Create a new game room
   - Share the room code with a friend
   - Or join an existing room with a code

3. **Gameplay**
   - Each player selects a secret character
   - Take turns asking yes/no questions
   - Use deduction to guess your opponent's character
   - First player to correctly guess wins!

## Tech Stack

- **Frontend**
  - Next.js 14
  - React 18
  - TailwindCSS
  - Shadcn UI
  - TypeScript

- **Backend**
  - Supabase
    - PostgreSQL Database
    - Authentication
    - Real-time subscriptions
  - Next.js API Routes

## Getting Started

### Prerequisites

- Node.js 18+ (LTS version recommended)
- npm or yarn
- Supabase account and project

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/SeaBenSea/guess-who-online.git
   cd guess-who-online
   ```

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Set up the database:
   - Run the SQL scripts in the `supabase` directory to create necessary tables
   - Import initial character data if needed

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start playing!

## Database Schema

The project uses the following main tables:
- `auth.users` - User authentication and profiles
- `public.characters` - Game character information
- `public.rooms` - Game room management
- `public.room_character_pools` - Character pools for each room
- `public.leaderboard` - Player statistics and rankings

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with ❤️ by [SeaBenSea](https://github.com/SeaBenSea)
- Inspired by the classic Guess Who? board game
