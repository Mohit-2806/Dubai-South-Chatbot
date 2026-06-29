# Dubai South AI Chatbot

An AI-powered customer support chatbot for Dubai South built with React, Vite, TypeScript, Express, and the MagOneAI workflow platform.

## Features

- AI-powered customer support
- Real-time chat interface
- Responsive modern UI
- Secure HMAC authentication with MagOneAI
- Markdown-formatted responses
- Session-based conversations
- Express backend with React frontend

## Tech Stack

- React
- TypeScript
- Vite
- Express.js
- Tailwind CSS
- MagOneAI API

## Installation

Clone the repository:

```bash
git clone https://github.com/<your-username>/<repository-name>.git
cd <repository-name>
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root.

```env
MAGONE_API_URL=YOUR_MAGONE_API_URL
MAGONE_SECRET=YOUR_MAGONE_SECRET
MAGONE_USE_CASE_ID=YOUR_USE_CASE_ID
```

## Running the application

```bash
npm run dev
```

The application will start on:

```
http://localhost:3000
```

## Project Structure

```
src/
 ├── App.tsx
 ├── main.tsx
 ├── index.css
 └── types.ts

server.ts
package.json
vite.config.ts
tsconfig.json
```

## Architecture

```
React Frontend
       │
       ▼
Express Backend
       │
       ▼
MagOneAI Workflow API
       │
       ▼
Dubai South Knowledge Base
```

## Security

API credentials are stored in environment variables and are not committed to the repository.

## License

This project is intended for demonstration and internal use.