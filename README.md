# User Login & Registration API

A scalable, production-ready backend for user registration, login, and user listing, built with **Node.js**, **Express**, **Prisma**, **PostgreSQL**, **Redis**, and **Zod**.  
Supports up to 100 million users with secure authentication, input validation, and cursor-based pagination.

---

## 🚀 Tech Stack

- **Node.js** + **Express** (API server)
- **PostgreSQL** (database)
- **Prisma ORM**
- **bcrypt** (password hashing)
- **Zod** (input validation)
- **Redis** (caching for fast pagination)
- **dotenv** (environment variables)
- **Postman** (API documentation & testing)

---

## 📦 Features

- **User Registration** (`POST /api/register`)
- **User Login** (`POST /api/login`)
- **Get Users (Paginated)** (`GET /api/users`)
- **Input Validation** (Zod)
- **Password Hashing** (bcrypt)
- **Cursor-based Pagination** (scalable for 100M+ users)
- **Redis Caching** (for fast repeated queries)
- **.env Config** (for DB and Redis credentials)
- **Postman Collection** (see [`postman_collection.json`](./postman_collection.json))

---

## 🗂️ Project Structure

```
src/
  app.js
  server.js
  routes/
    auth.js
  controllers/
    authController.js
prisma/
  schema.prisma
  seed.js
.env
postman_collection.json
README.md
```

---

## ⚙️ Setup & Installation

1. **Clone the repo:**
   ```sh
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your PostgreSQL and Redis credentials.

4. **Set up the database:**
   ```sh
   npx prisma migrate dev --name init
   ```

5. **Seed the database (optional, for test data):**
   ```sh
   npm run seed
   ```

6. **Start the server:**
   ```sh
   npm run dev
   ```

---

## 🛠️ API Endpoints

### **Register User**
- **POST** `/api/register`
- **Body:**
  ```json
  {
    "email": "testuser@example.com",
    "password": "strongpassword123"
  }
  ```
- **Success:** `201 Created`
  ```json
  { "message": "User registered successfully" }
  ```

### **Login User**
- **POST** `/api/login`
- **Body:**
  ```json
  {
    "email": "testuser@example.com",
    "password": "strongpassword123"
  }
  ```
- **Success:** `200 OK`
  ```json
  { "message": "Login successful" }
  ```

### **Get Users (Paginated)**
- **GET** `/api/users?take=10&cursor=0`
- **Query Params:**
  - `take` (number, optional): Users per page (default: 10)
  - `cursor` (number, optional): Last user ID from previous page
- **Success:** `200 OK`
  ```json
  {
    "users": [
      { "id": 1, "email": "user1@example.com", "createdAt": "2024-06-01T12:00:00.000Z" }
    ],
    "nextCursor": 11
  }
  ```

---

## 🧪 API Testing

- Import [`postman_collection.json`](./postman_collection.json) into [Postman](https://www.postman.com/) for ready-to-use requests and detailed documentation.

---

## 🛡️ Security & Performance

- Unique index on email for fast lookups
- Passwords hashed with bcrypt
- Input validation with Zod
- Cursor-based pagination for scalability
- Redis caching for fast repeated queries

---

## 🙏 Acknowledgements

- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [Zod](https://zod.dev/)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) 
