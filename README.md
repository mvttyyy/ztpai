# BeatThat 🎵

A full-stack web application for sharing, previewing, and downloading free audio loops and samples. Built with modern technologies including NestJS, Next.js, PostgreSQL, and RabbitMQ.

![BeatThat](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### Core Features
- 🎧 **Audio Preview** - Stream and preview loops with waveform visualization
- 📥 **Free Downloads** - All loops are free to use with no attribution required
- 🔐 **Certified Downloads** - SHA-256 hash verification for authenticity
- 📈 **Trending System** - 7-day rolling analytics (downloads + unique listens)
- 🎚️ **Multi-loop Playback** - Play multiple loops at the same BPM simultaneously

### User Features
- 👤 User registration and authentication (JWT + refresh tokens)
- ⬆️ Upload loops with metadata (BPM, key, genre, tags)
- ⭐ Rate loops (1-5 stars)
- 💬 Comment on loops
- ❤️ Favorite loops for later
- 🔔 Real-time notifications (WebSocket)
- 💭 Private messaging between users

### Admin Features
- 📊 Dashboard with platform statistics
- 👥 User management
- 🎵 Loop moderation
- 📝 Audit logging

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: RabbitMQ for async audio processing
- **Auth**: JWT with refresh tokens (HttpOnly cookies)
- **Real-time**: Socket.io for WebSocket connections
- **Audio Processing**: FFmpeg (MP3/OGG transcoding, waveform generation)
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Components**: Radix UI primitives
- **State Management**: Zustand
- **Audio**: Custom audio player with waveform visualization
- **HTTP Client**: Axios

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Services**: PostgreSQL, RabbitMQ, Backend API, Worker, Frontend

## Project Structure

```
BeatThat/
├── docker-compose.yml          # Docker orchestration
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Authentication & authorization
│   │   │   ├── users/          # User management
│   │   │   ├── loops/          # Loop CRUD operations
│   │   │   ├── tags/           # Tag management
│   │   │   ├── ratings/        # Rating system
│   │   │   ├── comments/       # Comments
│   │   │   ├── favorites/      # User favorites
│   │   │   ├── downloads/      # Download tracking
│   │   │   ├── trending/       # Trending algorithm
│   │   │   ├── chat/           # Private messaging
│   │   │   └── notifications/  # Real-time notifications
│   │   ├── prisma/             # Database service
│   │   └── rabbitmq/           # Message queue service
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Database seeding
│   └── worker/                 # Audio processing worker
└── frontend/
    ├── src/
    │   ├── app/                # Next.js pages
    │   ├── components/         # React components
    │   ├── lib/                # Utilities & API client
    │   └── stores/             # Zustand stores
    └── public/                 # Static assets
```

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- FFmpeg (for audio processing)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/beatthat.git
   cd beatthat/BeatThat
   ```

2. **Create environment file**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

5. **Seed the database** (optional)
   ```bash
   docker-compose exec backend npx prisma db seed
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Docs: http://localhost:3001/api
   - RabbitMQ Management: http://localhost:15672

### Local Development

#### Backend
```bash
cd backend
npm install
npm run start:dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Worker
```bash
cd backend
npm run worker:dev
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthat?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-token-secret"

# RabbitMQ
RABBITMQ_URL="amqp://guest:guest@localhost:5672"

# App
PORT=3001
UPLOAD_DIR="./uploads"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API Documentation

The API is documented using Swagger/OpenAPI. Once the backend is running, access the documentation at:

- **Swagger UI**: http://localhost:3001/api
- **OpenAPI JSON**: http://localhost:3001/api-json

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/loops` | List loops (with filters) |
| POST | `/loops` | Upload new loop |
| GET | `/loops/:id` | Get loop details |
| POST | `/ratings/:loopId` | Rate a loop |
| GET | `/trending` | Get trending loops |
| GET | `/tags/popular` | Get popular tags |

## Database Schema

The database follows 3NF normalization with the following main entities:

- **User** - Platform users with roles (USER, ADMIN)
- **Loop** - Audio loops with metadata
- **Tag** - Categorization tags (many-to-many with Loop)
- **Rating** - User ratings for loops
- **Comment** - User comments on loops
- **Favorite** - User favorite loops
- **Download** - Download records with certification
- **Listen** - Unique listen tracking
- **ChatMessage** - Private messages between users
- **Notification** - User notifications

## Audio Processing

The worker service handles:

1. **Transcoding** - Convert uploads to MP3/OGG preview files (128 kbps)
2. **Waveform Generation** - Extract amplitude data for visualization
3. **Hash Calculation** - SHA-256 for download certification

## Trending Algorithm

Loops are ranked by a weighted score calculated over a 7-day window:

```
score = (downloads × 2) + unique_listens
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [NestJS](https://nestjs.com/) - A progressive Node.js framework
- [Next.js](https://nextjs.org/) - The React Framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible components
- [FFmpeg](https://ffmpeg.org/) - Audio processing
