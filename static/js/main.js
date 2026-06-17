document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoDue = document.getElementById('todo-due');
    const todoPriority = document.getElementById('todo-priority');
    const todoSort = document.getElementById('todo-sort');
    const todoList = document.getElementById('todo-list');
    const taskCounter = document.getElementById('task-counter');
    const completedCounter = document.getElementById('completed-counter');

    let todos = [];

    // Fetch todos from API
    async function fetchTodos() {
        try {
            const response = await fetch('/api/todos');
            if (!response.ok) throw new Error('Failed to fetch todos');
            todos = await response.json();
            renderTodos();
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    }

    // Render todos to UI
    function renderTodos() {
        todoList.innerHTML = '';
        
        // Update stats
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        taskCounter.textContent = `タスク: ${total} 件`;
        completedCounter.textContent = `完了: ${completed} 件`;

        if (total === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '40px 0';
            emptyState.style.color = 'var(--text-muted)';
            emptyState.style.fontSize = '0.9rem';
            emptyState.style.fontStyle = 'italic';
            emptyState.innerHTML = 'タスクはありません。新しいタスクを追加してください。';
            todoList.appendChild(emptyState);
            return;
        }

        // Apply sorting (Newest first / Input order)
        const sortValue = todoSort.value;
        let sortedTodos = [...todos];
        if (sortValue === 'newest') {
            // Newest first (descending ID)
            sortedTodos.sort((a, b) => b.id - a.id);
        } else if (sortValue === 'oldest') {
            // Input order (ascending ID)
            sortedTodos.sort((a, b) => a.id - b.id);
        }

        sortedTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.dataset.id = todo.id;

            // Clicking on the item (except the delete button) toggles completion
            li.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) return;
                toggleTodo(todo.id, todo.completed);
            });

            // Format due time and countdown
            const hasDue = !!todo.due_time;
            const dueDisplay = hasDue ? `<span class="todo-due-date">${formatDueDate(todo.due_time)}</span>` : '';
            const countdownDisplay = hasDue ? `<div class="todo-countdown" data-deadline="${todo.due_time}" data-completed="${todo.completed}"></div>` : '';

            // Format priority badge
            const priority = todo.priority || 'medium';
            let priorityBadge = '';
            if (priority === 'high') {
                priorityBadge = `<span class="priority-badge priority-high">🔥 高</span>`;
            } else if (priority === 'medium') {
                priorityBadge = `<span class="priority-badge priority-medium">⚡ 中</span>`;
            } else if (priority === 'low') {
                priorityBadge = `<span class="priority-badge priority-low">☕ 低</span>`;
            }

            // HTML content with custom double line logic and priority row
            li.innerHTML = `
                <div class="todo-content">
                    <div class="todo-checkbox">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                    <div class="todo-text-container">
                        <div class="todo-title-row">
                            <span class="todo-text">${escapeHtml(todo.title)}</span>
                            ${priorityBadge}
                        </div>
                        ${dueDisplay}
                    </div>
                </div>
                <div class="todo-meta">
                    ${countdownDisplay}
                    <button class="delete-btn" aria-label="タスクを削除">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.34 6.6m-2.76 0L11.3 9m8.38-1.79h-11m11 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>
            `;

            // Delete action
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteTodo(todo.id);
            });

            todoList.appendChild(li);
        });

        // Instant update of countdowns
        updateAllCountdowns();
    }

    // Add new Todo
    todoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = todoInput.value.trim();
        const due_time = todoDue.value ? todoDue.value : null;
        const priority = todoPriority.value || 'medium';
        if (!title) return;

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, due_time, priority })
            });

            if (!response.ok) throw new Error('Failed to add todo');
            
            const newTodo = await response.json();
            todos.unshift(newTodo); // Add to front of list
            renderTodos();
            todoInput.value = '';
            todoDue.value = '';
            todoPriority.value = 'medium';
            todoInput.focus();
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    });

    // Toggle complete status of Todo
    async function toggleTodo(id, currentCompleted) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: !currentCompleted })
            });

            if (!response.ok) throw new Error('Failed to update todo');
            
            // Update local state
            const index = todos.findIndex(t => t.id === id);
            if (index !== -1) {
                todos[index].completed = !currentCompleted;
                renderTodos();
            }
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    }

    // Delete Todo
    async function deleteTodo(id) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete todo');
            
            // Remove from local state
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }

    // Helper to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Format ISO Due Date into Japanese display
    function formatDueDate(isoString) {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return '';
            const m = d.getMonth() + 1;
            const date = d.getDate();
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `📅 ${m}月${date}日 ${h}:${min}`;
        } catch (e) {
            return '';
        }
    }

    // Update all countdown elements dynamically
    function updateAllCountdowns() {
        const countdownElements = document.querySelectorAll('.todo-countdown');
        countdownElements.forEach(el => {
            const deadlineStr = el.dataset.deadline;
            const completed = el.dataset.completed === 'true';
            
            if (completed) {
                el.className = 'todo-countdown status-completed';
                el.innerHTML = `<span>✓ 完了</span>`;
                return;
            }
            
            const deadline = new Date(deadlineStr);
            const now = new Date();
            const diff = deadline - now;
            
            if (isNaN(deadline.getTime())) {
                el.style.display = 'none';
                return;
            }
            
            if (diff <= 0) {
                el.className = 'todo-countdown status-danger';
                el.innerHTML = `<span>⚠️ 期限切れ</span>`;
            } else {
                const totalSeconds = Math.floor(diff / 1000);
                const days = Math.floor(totalSeconds / (3600 * 24));
                const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                let text = '';
                if (days > 0) {
                    text = `残り ${days}日 ${hours}時間`;
                } else if (hours > 0) {
                    text = `残り ${hours}時間 ${minutes}分`;
                } else if (minutes > 0) {
                    text = `残り ${minutes}分 ${seconds}秒`;
                } else {
                    text = `残り ${seconds}秒`;
                }
                
                let icon = '⏱️';
                // Highlight warning if less than 1 hour remains
                if (diff < 3600000) {
                    el.className = 'todo-countdown status-warning';
                    icon = '⏳';
                } else {
                    el.className = 'todo-countdown status-safe';
                }
                
                el.innerHTML = `<span>${icon} ${text}</span>`;
            }
        });
    }

    // Start background timer to update countdowns
    setInterval(updateAllCountdowns, 1000);

    // Re-render when sorting method is changed
    todoSort.addEventListener('change', () => {
        renderTodos();
    });

    // Initial Fetch
    fetchTodos();
});
