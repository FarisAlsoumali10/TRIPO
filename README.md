
<div align="center">
  <img width="120" height="120" alt="Tripo Web App" src="https://github.com/user-attachments/assets/a4ab70e4-0d0a-469f-a9d0-03552e024be9" />

  <h1>🚀 Tripo | تريبو</h1>
  <p><b>Intelligent Micro-Escape & Social Discovery Platform</b></p>

  [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](#)
  [![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?style=flat-square&logo=react)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-18.x-339933.svg?style=flat-square&logo=node.js)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?style=flat-square&logo=typescript)](#)
  [![Socket.IO](https://img.shields.io/badge/RealTime-Socket.IO_4-010101.svg?style=flat-square&logo=socket.io)](#)
  [![Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75B2.svg?style=flat-square&logo=google)](#)
  [![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?style=flat-square&logo=docker)](#)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](#)
</div>

<br/>

> **Tripo** is a state-of-the-art, AI-enhanced social discovery platform engineered specifically for the Saudi market. It connects users with hyper-local, short-duration (1-3 hour) micro-escapes within their cities. Built with a robust, scalable full-stack architecture, Tripo seamlessly blends personalized algorithmic recommendations with real-time social coordination, aligning seamlessly with modern local tourism initiatives.

---

## ✨ Core Capabilities & Features

### 🧠 Intelligent Discovery Engine
* **Algorithmic 'For You' Feed:** Powered by Google Gemini AI, generating dynamic, mood-based itinerary recommendations tailored to real-time user context, time availability, and budget constraints.
* **Smart Profiling:** A sophisticated preferences engine analyzing interests and adapting to user interactions over time.

### 🤝 Seamless Social Coordination
* **Low-Latency Group Sync:** Instantaneous group messaging, itinerary sharing, and live status updates powered by WebSockets (`Socket.IO 4`).
* **Collaborative Planning:** Invite-only group trip management allowing multiple users to edit and vote on shared itineraries concurrently.
* **Smart Expense Engine:** Automated split-budget calculator and financial tracking for group micro-escapes.

### 🗺️ Interactive Geospatial Interface
* **Dynamic Cartography:** High-performance, interactive maps integrated via `React Leaflet` with geospatial querying (MongoDB `$geoNear`).
* **Cinematic UI/UX:** Fluid, hardware-accelerated animations using `GSAP 3` and highly responsive layouts built with `Tailwind CSS 3`.

### 🛡️ Enterprise-Grade Administration
* **RBAC (Role-Based Access Control):** Granular permission systems for users, hosts, and platform administrators.
* **Content Moderation Hub:** Advanced admin dashboard for catalog management, reporting, and Tripo-Verified flagging.

---

## 🏗️ System Architecture & Tech Stack

Tripo is designed with a decoupled, high-cohesion architecture, ensuring maximum availability, secure data flow, and horizontal scalability.

<div align="center">
 <img width="800" height="" alt="Tripo Architecture Design" src="https://github.com/user-attachments/assets/a1d4bcbd-2207-4b11-b59f-d0a34d69b49b" />

  <p><i>High-level architecture illustrating the separation of concerns, API Gateway, and Real-time data flow.</i></p>
</div>

| Domain | Technologies |
| :--- | :--- |
| **Frontend Core** | React 19, TypeScript, Vite 6 |
| **UI & Animation** | Tailwind CSS 3, Lucide React, GSAP 3 |
| **Networking & Maps** | Axios, Socket.IO Client, React Leaflet, React Query |
| **Backend Core** | Node.js (≥18), Express 4, TypeScript |
| **Database & ORM** | MongoDB, Mongoose 8 (Geospatial querying enabled) |
| **Security & Auth** | bcryptjs, Helmet, Rate-Limit, Zod, JWT, `@react-oauth/google` |
| **AI Integration** | `@google/generative-ai` (Gemini) |
| **DevOps & Testing** | Docker, Docker Compose, Jest 29, Playwright (E2E) |

---

## 🚀 Quick Start (Development Environment)

We recommend using Docker for a frictionless setup that mirrors the production environment.

### 1. Prerequisites
* Node.js 18+
* Docker & Docker Compose
* Git

### 2. Installation & Execution
Clone the repository and configure your environment:
```bash
git clone [https://github.com/your-org/tripo-fullstack.git](https://github.com/your-org/tripo-fullstack.git)
cd tripo-fullstack

# Configure environment variables
cp .env.example .env

*(Configure your `MONGO_URI` and `JWT_SECRET` in the `.env` file).*

3. **Launch Containers (Recommended)**
```bash
docker-compose up --build
```

*This single command orchestrates the MongoDB database, Node.js API server, and React client.*

### 📍 Access Points

* **Client UI:** `http://localhost:5173`
* **API Gateway:** `http://localhost:3000/api/v1`
* **System Health Check:** `http://localhost:3000/health`

---

## 🔐 Security & Data Integrity

Security is built into Tripo's DNA. The platform enforces:

* Strict payload validation via `Zod` to prevent injection attacks.
* Stateless authentication using heavily encrypted JWTs.
* Environment isolation preventing accidental exposure of secret keys.
* RESTful conventions with structured error handling (preventing stack trace leaks).

---

## 🧪 Testing & Quality Assurance

Comprehensive testing suites are implemented to guarantee system reliability.

```bash
# Execute Backend Unit & Integration Tests (Jest)
cd backend && npm run test:coverage

# Execute Frontend Component Tests (Vitest)
cd frontend && npm run test:ui

```

---

## 🗺️ Development Roadmap

* [x] **Phase 1-2:** Core Foundation & Smart Discovery Engine
* [x] **Phase 3-4:** Real-time Social Features & Expense Management
* [x] **Phase 5:** Admin Moderation & RBAC
* [ ] **Phase 6:** Advanced Localization (Arabic/English Contextual UI)
* [ ] **Phase 7:** Tripo Marketplace (Campsites & Premium Sessions)
* [x] **Phase 8:** CI/CD Pipeline Integration & Technical Documentation

---

Lead Developer & Architect: Faris Alsoumali.
----------------------------------------------------------------
Devoloper UI/UX Engineer: Abdulrahman Aldoumaikhi.
----------------------------------------------------------------

*Developed with engineering excellence for the Saudi Micro-Tourism Sector.*

```
