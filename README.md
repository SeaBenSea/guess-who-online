# Guess Who Online

A modern, multiplayer implementation of the classic Guess Who? game built with Next.js and Supabase. Play the timeless game of deduction with friends online!

## Features

- **Authentication System**
  - Email-based registration and login
  - Email verification and password reset flow
  - Secure user sessions with inactivity auto-logout and token refresh
- **Real-time Multiplayer**
  - Create and join game rooms
  - Real-time room updates via Supabase Realtime
  - Private room codes
- **Game Mechanics**
  - Two-player rooms
  - Each player has a max of **2 guesses** to deduce their opponent's character
  - Custom character pools (add/remove) per room
  - In-game chat and live updates (optional example in code if you decide to enable chat)
  - Turn-based gameplay with guess tracking
- **Leaderboard System**
  - Global rankings
  - Win/loss statistics
  - Player performance tracking
- **Admin Dashboard**
  - Character management (full CRUD, up to 20 characters per user)
  - User management with role assignment (grant/revoke admin)
  - Game monitoring (room details, cleanup, logs)
  - **Admin Logs** for tracking admin actions (e.g., room deletion, role changes, etc.)
- **Modern UI/UX**
  - Responsive design built with TailwindCSS
  - Dark mode support
  - Smooth animations and transitions
  - Mobile-friendly interface

## How to Play

1. **Create an Account**
   - Sign up with your email
   - Verify your email address via the link sent to your inbox
   - Log in to your account

2. **Start a Game**
   - Create a new game room (6-character alphanumeric code is generated)
   - Share the room code with a friend
   - Or join an existing room using its code

3. **Gameplay Flow**
   - Each player selects a secret character from the shared pool (2 or more characters required)
   - You have **two guesses** to identify your opponent's character
   - Ask yes/no questions (informal or via chat if added) and use deduction
   - If you guess their character correctly (or if your opponent forfeits), you win!

## Tech Stack

- **Frontend**
  - Next.js **15.1.2** (with Turbopack for dev)
  - React **19**
  - TailwindCSS
  - Shadcn UI
  - TypeScript

- **Backend**
  - Supabase (managed Postgres + Auth + Realtime)
    - Row Level Security (RLS) policies for secure data operations
    - Auth service with JWT-based sessions
    - Real-time database subscriptions
  - Next.js API Routes

## Getting Started

### Prerequisites

- Node.js 18+ (LTS version recommended)
- npm or yarn
- A [Supabase](https://supabase.com/) account and project

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SeaBenSea/guess-who-online.git
   cd guess-who-online
   ```

2. **Create your environment file** by copying `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Then fill in your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="your-project-url.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. **Set up the database**:
   - Run the SQL scripts in the `supabase` directory (in your Supabase project dashboard or via CLI) to create the necessary tables and policies.
   - The scripts also include optional seed data for initial characters.

### Installation & Running Locally

```bash
# Install dependencies
npm install
# or
yarn install

# Run the development server (using Turbopack)
npm run dev
# or
yarn dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser to start playing.

### Production Build

```bash
npm run build
npm run start
```

This will create a production-ready build and serve it on port 3000 by default.

## Database Schema

Key tables in this project:

- **`auth.users`** – Built-in Supabase auth table for user credentials
- **`public.characters`** – Game character information (with a max 20-character limit per user)
- **`public.rooms`** – Game room management (players, picks, guesses, winner, etc.)
- **`public.room_character_pools`** – Stores which characters are added to each room
- **`public.leaderboard`** – Aggregates player stats (games played, wins, etc.)
- **`public.admin_logs`** – Tracks admin actions (room deletions, role changes, etc.)

See the SQL files in `supabase/` for detailed definitions, constraints, and RLS policies.

## TODO

- [ ] **Migrate to SSR**  
  [Guide](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers)
- [ ] **Update to PKCE**  
  [Docs](https://supabase.com/docs/guides/auth/passwords?queryGroups=language&language=js&queryGroups=flow&flow=pkce#signing-up-with-an-email-and-password)
- [ ] **Move character picks to an API route** (hide selections from dev tools/network tab)
- [ ] **Fix a11y issues** throughout the app
- [ ] **Profile Page** (user can view/edit their profile)
- [ ] **Add tests**  
  - [ ] Unit tests  
  - [ ] Integration tests  
  - [ ] E2E tests (e.g., using Cypress or Playwright)
- [ ] **Play as a guest** (for quick matches without full account registration)
- [ ] **Add better mobile support** (optimize layout, gestures, etc.)

## Contributing

Contributions are welcome! Please open a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

If you plan to introduce major changes, please open an issue for discussion first.

## CI/CD

This project uses GitHub Actions for continuous integration. The workflow (`.github/workflows/ci.yml`) runs on push/PR to `master` and includes:

- Lint checks
- Type checks
- Prettier formatting checks
- Security audits
- Production build

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ by [SeaBenSea](https://github.com/SeaBenSea)
- Inspired by the classic Guess Who? board game
- Special thanks to the [Supabase](https://supabase.com/) and [Next.js](https://nextjs.org/) communities for their invaluable tools and guidance!
