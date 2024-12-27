# Guess Who Online

A modern, multiplayer implementation of the classic Guess Who? game built with Next.js and Supabase. Play the timeless game of deduction with friends online!

## Features

- Real-time multiplayer gameplay
- Character selection and management
- Live game rooms
- Leaderboard system
- Modern, responsive UI
- Admin dashboard for game management

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Supabase (Database & Authentication)
- **Language**: TypeScript
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn
- Supabase account and project

### Environment Setup

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
