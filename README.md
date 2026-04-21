# CodePilot

Code Pilot is an AI-powered coding education platform with a normalized MySQL schema and a Node.js + HTML/CSS/JS web interface.

## Frontend Implementation

This repository includes a fully functional frontend with **database connectivity** and **complete CRUD operations** for core entities (users, learning paths, lessons, moderation flags).

### Stack

- **Backend**: Node.js + Express with MySQL connection pooling
- **Frontend**: HTML, CSS, JS
- **Database**: MySQL (normalized schema with foreign keys)
- **Architecture**: RESTful API endpoints with form-based GUI

### Project Structure

```
CodePilot/
	db/
		schema.sql              - Database schema (10 tables)
		seed.sql               - Sample data for testing
	public/
		css/
			styles.css         - Responsive styles + form validation UI
		js/
			api.js             - API client wrapper (GET, POST, PUT, DELETE)
			app.js             - Shared utilities
			student.js         - User CRUD logic
			lesson.js          - Learning path & lesson CRUD logic
			manager.js         - Content flag moderation logic
		index.html             - Landing page
		student.html           - User management (insert, edit, delete)
		lesson.html            - Path & lesson management (insert, edit, delete)
		chat.html              - AI chat sessions view
		manager.html           - Content moderation console (update status)
	server.js                  - Express server with MySQL CRUD endpoints
	package.json               - Dependencies (express, mysql2, bcrypt)
	.gitignore
```

### Implemented Features

#### ✅ User Management (Student Page)
- **Create Users**: Form to add students/managers with email, password, role, skill level, language preference
- **Read Users**: Display all users in formatted list with metadata
- **Update Users**: Click "Edit" to modify user details inline
- **Delete Users**: Remove users with confirmation dialog

#### ✅ Learning Paths & Lessons (Lesson Page)
- **Create Learning Paths**: Form to add paths with name, description, difficulty, estimated hours
- **Read Learning Paths**: Display all paths with filtering and actions
- **Update Learning Paths**: Edit path details without page reload
- **Delete Learning Paths**: Remove paths with cascade handling
- **Create Lessons**: Form to add lessons to specific paths with title and rich content
- **Read Lessons**: Display lessons grouped by parent path
- **Update Lessons**: Edit lesson content and metadata
- **Delete Lessons**: Remove lessons from system

#### ✅ Content Moderation (Manager Page)
- **Read Flags**: Display moderation queue of flagged content
- **Update Flag Status**: Change status (Open → In Review → Resolved → Dismissed)
- **Add Notes**: Include moderator notes with each status update

#### ✅ AI Chat Sessions (Chat Page)
- **Read Sessions**: View all active sessions with user/lesson associations

### API Endpoints

**Users**
- `POST /api/users` – Create user
- `GET /api/users` – List users
- `PUT /api/users/:id` – Update user
- `DELETE /api/users/:id` – Delete user

**Learning Paths**
- `POST /api/learning-paths` – Create path
- `GET /api/learning-paths` – List paths
- `PUT /api/learning-paths/:id` – Update path
- `DELETE /api/learning-paths/:id` – Delete path

**Lessons**
- `POST /api/lessons` – Create lesson
- `GET /api/lessons` – List lessons
- `PUT /api/lessons/:id` – Update lesson
- `DELETE /api/lessons/:id` – Delete lesson

**Chat & Moderation**
- `GET /api/chat-sessions` – List sessions
- `GET /api/moderation/flags` – List flags
- `PUT /api/moderation/flags/:id` – Update flag status

## Installation & Setup

### Prerequisites
- **Node.js** v18+ with npm
- **MySQL Server** running (local or remote)

### Quick Start

1. **Install Node.js**: https://nodejs.org (download LTS)

2. **Set up database**:
   ```bash
   mysql -u root -p codepilot < db/schema.sql
   mysql -u root -p codepilot < db/seed.sql
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Configure database** (optional – adjust if not using localhost/root):
   Create `.env` in CodePilot root:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=codepilot
   PORT=3000
   ```

5. **Start server**:
   ```bash
   npm start       # Production
   npm run dev     # Development with auto-reload
   ```

6. **Open browser**:
   ```
   http://localhost:3000
   ```

## Using the Application

### Student Page – User Management
1. Click **"Student"** in nav
2. Click **"+ Create User"** to add new users
3. Click **"Edit"** on any user to modify their details
4. Click **"Delete"** to remove users (with confirm)
5. Click **"Refresh"** to reload list from database

### Lesson Page – Paths & Lessons
1. Click **"Lesson"** in nav
2. Click **"+ Add Path"** to create learning paths
3. Click **"Edit"** or **"Delete"** on paths to manage
4. Click **"+ Add Lesson"** to create lessons for specific paths
5. Click **"Edit"** or **"Delete"** on lessons to manage
6. All changes save to MySQL immediately

### Manager Page – Content Moderation
1. Click **"Manager"** in nav
2. View all flagged content in queue
3. Click **"Edit Status"** on any flag
4. Change status and add moderator notes
5. Click **"Update Flag"** to save to database
6. Click **"Refresh"** to reload queue

## Error Handling

✅ Form validation (required fields, data types) on frontend  
✅ API errors caught and displayed to user  
✅ Database constraint violations (unique emails, foreign keys) handled gracefully  
✅ All operations are asynchronous with proper loading states  

## Development Architecture

- **Modular JS**: Each page has its own script (student.js, lesson.js, manager.js)
- **Reusable API**: `api.js` wraps all fetch calls with standardized error handling
- **Message System**: Global `showMessage()` / `hideMessage()` for user feedback
- **State Management**: Minimal in-memory state for edit operations
- **Responsive CSS**: Mobile-first design with CSS Grid and Flexbox
- **No Dependencies**: Pure vanilla JavaScript (only Express + MySQL2 on backend)