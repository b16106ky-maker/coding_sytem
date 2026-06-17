import sqlite3
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
DB_FILE = "todos.db"

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                due_time TEXT
            )
        """)
        # Dynamically add due_time column if it doesn't exist in existing DB
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(todos)")
        columns = [row[1] for row in cursor.fetchall()]
        if "due_time" not in columns:
            cursor.execute("ALTER TABLE todos ADD COLUMN due_time TEXT")
        conn.commit()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/todos", methods=["GET"])
def get_todos():
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, completed, due_time FROM todos ORDER BY id DESC")
        todos = [dict(row) for row in cursor.fetchall()]
        # Convert completed integer to boolean for frontend ease
        for todo in todos:
            todo["completed"] = bool(todo["completed"])
    return jsonify(todos)

@app.route("/api/todos", methods=["POST"])
def add_todo():
    data = request.json
    if not data or "title" not in data or not data["title"].strip():
        return jsonify({"error": "Title is required"}), 400
    
    title = data["title"].strip()
    due_time = data.get("due_time")
    if due_time:
        due_time = due_time.strip()
    else:
        due_time = None
        
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO todos (title, completed, due_time) VALUES (?, 0, ?)", (title, due_time))
        conn.commit()
        new_id = cursor.lastrowid
        
    return jsonify({"id": new_id, "title": title, "completed": False, "due_time": due_time}), 201

@app.route("/api/todos/<int:todo_id>", methods=["PUT"])
def update_todo(todo_id):
    data = request.json
    if not data or "completed" not in data:
        return jsonify({"error": "Completed status is required"}), 400
    
    completed = 1 if data["completed"] else 0
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE todos SET completed = ? WHERE id = ?", (completed, todo_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Todo not found"}), 404
            
    return jsonify({"id": todo_id, "completed": data["completed"]})

@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Todo not found"}), 404
            
    return jsonify({"result": "success"})

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
