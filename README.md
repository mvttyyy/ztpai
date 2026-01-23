# BeatThat

Aplikacja full-stack do udostepniania, podgladu i pobierania darmowych loopow i sampli audio. Zbudowana z wykorzystaniem nowoczesnych technologii: NestJS, Next.js, PostgreSQL i RabbitMQ.

## Funkcjonalnosci

### Funkcje glowne
- **Podglad audio** - Streaming i podglad loopow z wizualizacja fali dzwiekowej
- **Darmowe pobieranie** - Wszystkie loopy sa darmowe, bez wymaganej atrybucji
- **Certyfikowane pobrania** - Weryfikacja autentycznosci przez hash SHA-256
- **System trendow** - Analityka 7-dniowa (pobrania + unikalne odsluchania)
- **Odtwarzanie wielu loopow** - Jednoczesne odtwarzanie wielu loopow o tym samym BPM

### Funkcje uzytkownika
- Rejestracja i uwierzytelnianie (JWT + refresh tokens)
- Upload loopow z metadanymi (BPM, tonacja, gatunek, tagi)
- Ocenianie loopow (1-5 gwiazdek)
- Komentowanie loopow
- Dodawanie do ulubionych
- Powiadomienia w czasie rzeczywistym (WebSocket)
- Prywatne wiadomosci miedzy uzytkownikami

### Funkcje administratora
- Dashboard ze statystykami platformy
- Zarzadzanie uzytkownikami
- Moderacja loopow
- Logowanie zdarzen

## Stos technologiczny

### Backend
- **Framework**: NestJS (Node.js)
- **Baza danych**: PostgreSQL z Prisma ORM
- **Kolejka**: RabbitMQ do asynchronicznego przetwarzania audio
- **Autoryzacja**: JWT z refresh tokenami (ciasteczka HttpOnly)
- **Czas rzeczywisty**: Socket.io do polaczen WebSocket
- **Przetwarzanie audio**: FFmpeg (transkodowanie MP3/OGG, generowanie fali)
- **Dokumentacja**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 z App Router
- **Stylowanie**: Tailwind CSS
- **Komponenty**: Radix UI
- **Zarzadzanie stanem**: Zustand
- **Audio**: Wlasny odtwarzacz z wizualizacja fali
- **Klient HTTP**: Axios

### Infrastruktura
- **Konteneryzacja**: Docker i Docker Compose
- **Uslugi**: PostgreSQL, RabbitMQ, Backend API, Worker, Frontend

## Diagram relacji encji (ERD)



## Struktura projektu

```
BeatThat/
├── docker-compose.yml          # Orkiestracja Docker
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Uwierzytelnianie i autoryzacja
│   │   │   ├── users/          # Zarzadzanie uzytkownikami
│   │   │   ├── loops/          # Operacje CRUD na loopach
│   │   │   ├── tags/           # Zarzadzanie tagami
│   │   │   ├── ratings/        # System ocen
│   │   │   ├── comments/       # Komentarze
│   │   │   ├── favorites/      # Ulubione uzytkownika
│   │   │   ├── downloads/      # Sledzenie pobran
│   │   │   ├── trending/       # Algorytm trendow
│   │   │   ├── chat/           # Prywatne wiadomosci
│   │   │   └── notifications/  # Powiadomienia real-time
│   │   ├── prisma/             # Serwis bazy danych
│   │   └── rabbitmq/           # Serwis kolejki wiadomosci
│   ├── prisma/
│   │   ├── schema.prisma       # Schemat bazy danych
│   │   └── seed.ts             # Seedowanie bazy
│   └── worker/                 # Worker przetwarzania audio
└── frontend/
    ├── src/
    │   ├── app/                # Strony Next.js
    │   ├── components/         # Komponenty React
    │   ├── lib/                # Narzedzia i klient API
    │   └── stores/             # Store'y Zustand
    └── public/                 # Zasoby statyczne
```

## Pierwsze kroki

### Wymagania
- Docker i Docker Compose
- Node.js 18+ (do lokalnego developmentu)
- FFmpeg (do przetwarzania audio)

### Szybki start z Docker

1. **Sklonuj repozytorium**
   ```bash
   git clone https://github.com/yourusername/beatthat.git
   cd beatthat/BeatThat
   ```

2. **Utworz plik srodowiskowy**
   ```bash
   # Srodowisko backend
   cp backend/.env.example backend/.env
   ```

3. **Uruchom wszystkie uslugi**
   ```bash
   docker-compose up -d
   ```

4. **Wykonaj migracje bazy danych**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

5. **Wypelnij baze danymi** (opcjonalne)
   ```bash
   docker-compose exec backend npx prisma db seed
   ```

6. **Dostep do aplikacji**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Dokumentacja API: http://localhost:3001/api
   - Panel RabbitMQ: http://localhost:15672

### Lokalny development

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

## Zmienne srodowiskowe

### Backend (.env)
```env
# Baza danych
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthat?schema=public"

# JWT
JWT_SECRET="twoj-super-tajny-klucz-jwt"
JWT_REFRESH_SECRET="twoj-tajny-klucz-refresh-token"

# RabbitMQ
RABBITMQ_URL="amqp://guest:guest@localhost:5672"

# Aplikacja
PORT=3001
UPLOAD_DIR="./uploads"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Dokumentacja API

API jest udokumentowane przy uzyciu Swagger/OpenAPI. Po uruchomieniu backendu, dokumentacja dostepna jest pod adresem:

- **Swagger UI**: http://localhost:3001/api
- **OpenAPI JSON**: http://localhost:3001/api-json

### Glowne endpointy

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/auth/register` | Rejestracja nowego uzytkownika |
| POST | `/auth/login` | Logowanie i pobranie tokenow |
| POST | `/auth/refresh` | Odswiezenie access tokena |
| GET | `/loops` | Lista loopow (z filtrami) |
| POST | `/loops` | Upload nowego loopa |
| GET | `/loops/:id` | Szczegoly loopa |
| POST | `/ratings/:loopId` | Ocen loop |
| GET | `/trending` | Pobierz popularne loopy |
| GET | `/tags/popular` | Pobierz popularne tagi |

## Schemat bazy danych

Baza danych jest znormalizowana do 3NF i zawiera nastepujace glowne encje:

- **User** - Uzytkownicy platformy z rolami (USER, ADMIN)
- **Loop** - Loopy audio z metadanymi
- **Tag** - Tagi kategoryzacji (relacja many-to-many z Loop)
- **Rating** - Oceny uzytkownikow dla loopow
- **Comment** - Komentarze uzytkownikow do loopow
- **Favorite** - Ulubione loopy uzytkownika
- **Download** - Rekordy pobran z certyfikacja
- **Listen** - Sledzenie unikalnych odsluchain
- **ChatMessage** - Prywatne wiadomosci miedzy uzytkownikami
- **Notification** - Powiadomienia uzytkownika

## Przetwarzanie audio

Serwis worker obsluguje:

1. **Transkodowanie** - Konwersja uploadow do plikow podgladu MP3/OGG (128 kbps)
2. **Generowanie fali** - Ekstrakcja danych amplitudy do wizualizacji
3. **Obliczanie hashu** - SHA-256 do certyfikacji pobran

## Algorytm trendow

Loopy sa rankowane wedlug wazonego wyniku obliczanego w oknie 7-dniowym:

```
wynik = (pobrania × 2) + unikalne_odsluchania
```

