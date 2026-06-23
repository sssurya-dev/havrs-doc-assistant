# havrs. Document Assistant

> **AI-powered rental agreement analysis tool** — upload a PDF, get instant risk assessment, clause extraction, and a plain-language chat interface to ask questions about your document.

Built for **Problem Statement 14** as part of the HAVRS Real Estate Tech internship programme.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Screenshots](#screenshots)
- [Author](#author)

---

## Overview

The **havrs. Document Assistant** solves a common problem in real estate: rental agreements are long, complex, and full of legal language that most tenants and landlords struggle to understand. This tool allows users to upload a rental agreement PDF and instantly receive:

- A plain-English **summary** of the document
- Extraction of all **key clauses** (rent, security deposit, notice period, termination, etc.)
- A **risk assessment** for each clause with color-coded severity levels
- An **AI chat interface** to ask any question about the document in natural language

---

## Features

- **Drag-and-drop PDF upload** with file type and size validation
- **Automatic clause extraction** powered by Llama3 running locally via Ollama
- **Risk level classification** — Low / Medium / High — with color-coded UI indicators
- **Tabbed analysis view** — Overview, Clauses, and Risks tabs
- **AI Chat interface** — ask plain-language questions about your specific document
- **Document checklist** — quick-glance verification of critical agreement sections
- **Downloadable PDF report** — export your full analysis as a PDF (client-side via jsPDF)
- **Document history** — all uploaded agreements saved and accessible via Supabase
- Graceful handling of corrupted or scanned (non-text) PDFs

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React + Vite | UI framework and build tool |
| Axios | HTTP requests to the backend |
| React Router | Client-side navigation |
| jsPDF | Client-side PDF report generation |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Multer | PDF file upload handling |
| Axios | Proxy requests to AI service |
| Supabase JS Client | Cloud PostgreSQL database |
| Morgan | HTTP request logging |
| UUID | Unique document ID generation |

### AI Service
| Technology | Purpose |
|---|---|
| Python + FastAPI | AI microservice API |
| Uvicorn | ASGI server |
| PyMuPDF (`fitz`) | PDF text extraction |
| HTTPX | Async requests to Ollama |
| Ollama (Llama3) | Local LLM for analysis and chat |

### Database
| Technology | Purpose |
|---|---|
| Supabase | Cloud-hosted PostgreSQL — stores document metadata and analysis results |

---

## Architecture

The project follows a **decoupled three-service architecture**:

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
│                     │        │                     │        │                     │
│   React / Vite      │──────▶│   Node.js / Express │──────▶│   Python / FastAPI  │
│   Frontend          │        │   Backend           │        │   AI Service        │
│   Port: 5173        │        │   Port: 5000        │        │   Port: 8000        │
│                     │◀──────│                     │◀──────│                     │
└─────────────────────┘        └────────┬────────────┘        └────────┬────────────┘
                                        │                               │
                                        ▼                               ▼
                               ┌─────────────────┐           ┌─────────────────────┐
                               │    Supabase     │           │   Ollama (Llama3)   │
                               │  PostgreSQL DB  │           │   Local LLM         │
                               │  (Cloud)        │           │   Port: 11434       │
                               └─────────────────┘           └─────────────────────┘
```

**Flow:**
1. User uploads a PDF via the React frontend
2. The frontend sends the file to the Express backend
3. The backend stores metadata in Supabase and forwards the PDF to the FastAPI AI service
4. FastAPI extracts text via PyMuPDF, sends it to Llama3 via Ollama, and returns structured JSON
5. The analysis result (summary, clauses, risks) is stored in Supabase and returned to the frontend
6. For chat queries, the same pipeline is used with document context passed alongside the user's question

---

## Getting Started

### Prerequisites

Make sure the following are installed on your machine:

- [Node.js](https://nodejs.org/) v18 or higher
- [Python](https://www.python.org/) 3.10 – 3.12 (Python 3.13 is not compatible with this project's dependencies)
- [Ollama](https://ollama.com/) — for running Llama3 locally
- A [Supabase](https://supabase.com/) account with a project set up

Pull the Llama3 model before starting:
```bash
ollama pull llama3
```

---

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/your-username/havrs-doc-assistant.git
cd havrs-doc-assistant
```

**2. Install Frontend dependencies**
```bash
cd frontend
npm install
```

**3. Install Backend dependencies**
```bash
cd ../backend
npm install
```

**4. Install AI Service dependencies**
```bash
cd ../ai_service
pip install fastapi==0.115.0 uvicorn==0.30.0 pydantic==2.9.0 pymupdf httpx python-multipart
```

---

### Running the App

You need to start **four services** — Ollama, AI service, backend, and frontend — each in a separate terminal.

**Terminal 1 — Ollama (Local LLM)**
```bash
ollama serve
```

**Terminal 2 — AI Service**
```bash
cd ai_service
python -m uvicorn main:app --reload --port 8000
```

**Terminal 3 — Backend**
```bash
cd backend
npm run dev
```

**Terminal 4 — Frontend**
```bash
cd frontend
npm run dev
```

Open your browser at: **[http://localhost:5173](http://localhost:5173)**

---

## Project Structure

```
havrs-doc-assistant/
│
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── backend/                   # Node.js + Express API
│   ├── routes/                # API route handlers
│   ├── middleware/            # Custom middleware
│   ├── server.js
│   └── package.json
│
├── ai_service/                # Python FastAPI AI microservice
│   ├── main.py                # FastAPI app with /analyze and /chat endpoints
│   └── requirements.txt
│
└── README.md
```

---

## Environment Variables

### Backend — `backend/.env`
```env
PORT=5000
AI_SERVICE_URL=http://localhost:8000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### Frontend — `frontend/.env`
```env
VITE_BACKEND_URL=http://localhost:5000
```

> **Never commit your `.env` files to GitHub.** They are listed in `.gitignore`.

---

## Author

**Surya**
Intern — HAVRS Real Estate Tech
Problem Statement 14: AI-Powered Rental Agreement Analysis Tool

---

*Built with React, Node.js, FastAPI, Llama3, and Supabase.*
