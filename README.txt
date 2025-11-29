This project is a full-stack web application built using:
- Backend: Python Flask
- Frontend: React + Vite + TailwindCSS
- Database: MySQL (via XAMPP or standalone)
- Environment: Node.js + Python 3.10+

Before running this project, please make sure you have installed:
(1) Python (3.10 or later)
    https://www.python.org/downloads/
(2) Node.js (v18 or later)
    https://nodejs.org/
(3) XAMPP (or MySQL Server)
    Start the MySQL service before running backend.
(4) Git / VS Code (recommended)

before run code
Backend
1.Install dependencies:
   > pip install flask flask-cors flask-jwt-extended python-dotenv mysql-connector-python werkzeug

2.Configure the environment file:
   Edit the file `.env` inside /backend

3. Start the backend server:
   > python app.py

If successful, you should see:
* Running on http://127.0.0.1:5000

Frontend
1. Install dependencies:
   > npm install

   If Tailwind or PostCSS errors appear, ensure you have these packages installed:
   > npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss

3. Run the frontend development server:
   > npm run dev

   If successful, you should see:
   Local:  http://127.0.0.1:5173/

step to run Code
Step 1 → Start MySQL in XAMPP（or other sqlserve）  
Step 2 → Run backend:
    cd backend
    python app.py

Step 3 → Run frontend:
    cd frontend
    npm run dev

Step 4 → Open your browser and go to:
    http://127.0.0.1:5173/
