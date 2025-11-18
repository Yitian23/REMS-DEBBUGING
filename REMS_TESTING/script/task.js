// Task Management JavaScript
let allTasks = { todo: [], call: [], email: [] };

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    
    loadTasks();
    
    // Handle form submission
    document.getElementById('createTaskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createTask();
    });

    // Close modal when clicking outside
    document.getElementById('createTaskModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCreateTaskModal();
        }
    });

    // Show/hide status and priority fields based on task type
    const taskTypeSelect = document.querySelector('select[name="task_type"]');
    if (taskTypeSelect) {
        taskTypeSelect.addEventListener('change', toggleStatusPriorityFields);
        toggleStatusPriorityFields(); // Initial call
    }
});

// Load tasks from database
function loadTasks() {
    fetch('/api.php?endpoint=get_tasks')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            allTasks = data.tasks;
            displayTasks(data.tasks, data.counts);
        } else {
            console.error('Failed to load tasks:', data.message);
        }
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
    });
}

// Display tasks in columns
function displayTasks(tasks, counts) {
    // Update notification badges
    updateNotificationBadges(counts);
    
    // Display tasks in each column
    displayTaskColumn('todo', tasks.todo);
    displayTaskColumn('call', tasks.call);
    displayTaskColumn('email', tasks.email);
}

// Update notification badges
function updateNotificationBadges(counts) {
    const badges = document.querySelectorAll('.notification-badge');
    badges[0].textContent = counts.todo || 0;
    badges[1].textContent = counts.call || 0;
    badges[2].textContent = counts.email || 0;
}

// Display tasks in a specific column
function displayTaskColumn(type, tasks) {
    const columns = document.querySelectorAll('.task-column');
    let targetColumn;
    
    // Find the correct column
    if (type === 'todo') targetColumn = columns[0];
    else if (type === 'call') targetColumn = columns[1];
    else if (type === 'email') targetColumn = columns[2];
    
    if (!targetColumn) return;
    
    // Clear existing tasks (keep header)
    const existingTasks = targetColumn.querySelectorAll('.task-item');
    existingTasks.forEach(task => task.remove());
    
    // Add new tasks
    tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        targetColumn.appendChild(taskElement);
    });
}

// Create task element
function createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.setAttribute('data-task-id', task.id);
    
    // Format date
    const taskDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }) : '';
    
    let taskContent = `
        <input type="checkbox" class="task-checkbox" onchange="handleTaskCheck(${task.id})">
        <div class="task-content" onclick="showTaskNotes(${task.id}, '${(task.notes || '').replace(/'/g, "\\'")}')">
            <div class="task-title">${task.title}</div>
    `;
    
    if (taskDate) {
        taskContent += `<div class="task-date">${taskDate}</div>`;
    }
    
    if (task.assigned_to) {
        taskContent += `
            <div class="task-assignee">
                <i class="fas fa-user"></i>
                <span>${task.assigned_to}</span>
            </div>
        `;
    }
    
    // Only show status and priority for todo tasks
    if (task.task_type === 'todo') {
        const statusClass = task.status ? task.status.toLowerCase().replace(' ', '-') : 'not-started';
        const priorityClass = task.priority ? task.priority.toLowerCase() : 'medium';
        
        taskContent += `
            <div class="task-details">
                <div class="task-status status-${statusClass}">Status: ${task.status || 'Not Started'}</div>
                <div class="task-priority priority-${priorityClass}">Priority: ${task.priority || 'Medium'}</div>
            </div>
        `;
    }
    
    taskContent += '</div>';
    taskItem.innerHTML = taskContent;
    
    return taskItem;
}

// Handle task checkbox change
function handleTaskCheck(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const checkbox = taskElement.querySelector('.task-checkbox');
    
    if (checkbox.checked) {
        // Show confirmation dialog
        const confirmed = confirm('Are you sure you want to mark this task as done? This will remove the task.');
        
        if (confirmed) {
            completeTask(taskId);
        } else {
            // Uncheck the checkbox
            checkbox.checked = false;
        }
    }
}

// Complete task (delete from view)
function completeTask(taskId) {
    fetch('/api.php?endpoint=complete_task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_id: taskId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove task from view
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.remove();
            }
            // Reload tasks to update counts
            loadTasks();
        } else {
            alert('Error: ' + data.message);
            // Uncheck the checkbox
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            const checkbox = taskElement.querySelector('.task-checkbox');
            checkbox.checked = false;
        }
    })
    .catch(error => {
        console.error('Error completing task:', error);
        alert('An error occurred. Please try again.');
        // Uncheck the checkbox
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const checkbox = taskElement.querySelector('.task-checkbox');
        checkbox.checked = false;
    });
}

// Show task notes
function showTaskNotes(taskId, notes) {
    if (notes && notes.trim() !== '') {
        alert('Notes: ' + notes);
    } else {
        alert('No notes available for this task.');
    }
}

// Open create task modal
function openCreateTaskModal() {
    document.getElementById('createTaskModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close create task modal
function closeCreateTaskModal() {
    document.getElementById('createTaskModal').classList.remove('show');
    document.body.style.overflow = 'auto';
    document.getElementById('createTaskForm').reset();
    // Reset field visibility
    toggleStatusPriorityFields();
}

// Create new task
function createTask() {
    const form = document.getElementById('createTaskForm');
    const formData = new FormData(form);
    
    const createBtn = document.querySelector('.btn-create');
    const originalText = createBtn.textContent;
    createBtn.textContent = 'Creating...';
    createBtn.disabled = true;
    
    fetch('/api.php?endpoint=add_task', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Task created successfully!');
            closeCreateTaskModal();
            loadTasks(); // Reload tasks
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error creating task:', error);
        alert('An error occurred. Please try again.');
    })
    .finally(() => {
        createBtn.textContent = originalText;
        createBtn.disabled = false;
    });
}

// Toggle status and priority fields based on task type
function toggleStatusPriorityFields() {
    const taskType = document.querySelector('select[name="task_type"]').value;
    const statusGroup = document.getElementById('status-group');
    const priorityGroup = document.getElementById('priority-group');
    
    if (taskType === 'todo') {
        // Show status and priority for todo tasks
        if (statusGroup) statusGroup.style.display = 'block';
        if (priorityGroup) priorityGroup.style.display = 'block';
        
        // Make priority required for todo tasks
        const priorityField = document.querySelector('select[name="priority"]');
        if (priorityField) priorityField.required = true;
    } else {
        // Hide status and priority for call/email tasks
        if (statusGroup) statusGroup.style.display = 'none';
        if (priorityGroup) priorityGroup.style.display = 'none';
        
        // Remove required attribute for non-todo tasks
        const statusField = document.querySelector('select[name="status"]');
        const priorityField = document.querySelector('select[name="priority"]');
        if (statusField) statusField.required = false;
        if (priorityField) priorityField.required = false;
    }
}
