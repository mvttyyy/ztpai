# BeatThat — darmowe loopy i sample

# Spis Treści
1. Opis
2. Architektura
3.

# 1. Opis
BeatThat to aplikacja internetowa do udostępniania darmowych loopów i sampli audio. Użytkownicy mogą wgrywać pliki, odsłuchiwać strumieniowo, pobierać, oceniać i komentować. 

# 2. Architektura
- Twarde rozdzielenie warstw: dwa osobne frameworki i serwery.
- Backend (API): NestJS (Node.js), PostgreSQL (Prisma ORM), RabbitMQ (kolejki), Swagger/OpenAPI.
- Frontend (WEB): Next.js (React)
- Transkodowanie/preview: job w kolejce generuje MP3/OGG 128 kb/s + waveform/spektrogram (preview).
- Autoryzacja: JWT (access krótkożyjący, refresh dłuższy) w HttpOnly Secure cookies.
- Konteneryzacja: Docker + docker-compose.

# 10. Zdjęcie poglądowe
<img width="811" height="547" alt="Screenshot 2025-10-18 at 10 10 48" src="https://github.com/user-attachments/assets/68fc5338-e105-440b-9a20-6e584afa6aed" />
