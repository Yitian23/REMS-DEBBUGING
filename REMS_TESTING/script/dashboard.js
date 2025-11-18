// Dashboard connection and authentication
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded');
    // Check if user is logged in
    if (!checkAuthentication()) {
        return;
    }
    loadDashboardData();
});

function checkAuthentication() {
    // Check localStorage first (from login)
    const loggedIn = localStorage.getItem('loggedIn');
    const userData = localStorage.getItem('user');
    
    if (!loggedIn || !userData) {
        // Redirect to login if not authenticated
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function loadDashboardData() {
    // Show loading state
    showLoadingState();
    
    // Get dashboard data from server
    fetch('api.php?endpoint=dashboard_data')
    .then(response => response.json())
    .then(data => {
        console.log('Dashboard data received:', data);
        if (data.success) {
            // Update UI with user data (but user_dropdown.js will handle the dropdown)
            // We keep this for backward compatibility
            updateUserDisplay(data.user);
            // Update statistics
            updateStatistics(data.stats);
            // Update tasks
            updateTasks(data.tasks, data.tasks_count);
        } else {
            // Session expired, redirect to login
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            if (data.redirect) {
                window.location.href = data.redirect;
            } else {
                window.location.href = 'index.html';
            }
        }
    })
    .catch(error => {
        console.error('Error loading dashboard data:', error);
        showErrorState();
    });
}

function showLoadingState() {
    // Add loading indicators to stats
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(element => {
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });
}

function showErrorState() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(element => {
        element.textContent = '—';
    });
}

function updateUserDisplay(user) {
    // This function is kept for backward compatibility
    // but user_dropdown.js will handle updating the dropdown from get_profile.php
    // We only update localStorage here
    
    if (user && user.name && user.email) {
        // Store updated user data
        localStorage.setItem('user', JSON.stringify(user));
        console.log('User data stored in localStorage:', user);
    }
}

function updateStatistics(stats) {
    // Update each statistic with animation
    const statItems = document.querySelectorAll('.stat-item');
    
    // Map stats to their positions
    const statsMapping = [
        { value: stats.total_leads, label: 'All Leads' },
        { value: stats.open_deals, label: 'Open Deal' },
        { value: stats.new_leads, label: 'New Leads' },
        { value: stats.on_progress, label: 'On Progress' },
        { value: stats.signing_contract, label: 'Signing Contract' },
        { value: stats.closed_deals, label: 'Closed Deal' }
    ];
    
    statItems.forEach((item, index) => {
        const numberElement = item.querySelector('.stat-number');
        const labelElement = item.querySelector('.stat-label');
        
        if (statsMapping[index]) {
            // Animate number
            animateNumber(numberElement, 0, statsMapping[index].value, 1000);
            
            // Update label (in case it needs updating)
            if (labelElement) {
                labelElement.textContent = statsMapping[index].label;
            }
        }
    });
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const difference = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + difference * easeOutQuart(progress));
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

function updateTasks(tasks, tasks_count) {
    console.log('Updating tasks:', tasks, tasks_count);
    // Update To-do tasks
    updateTaskCard('todo', tasks.todo, tasks_count.todo, 'To-do');
    
    // Update Call tasks
    updateTaskCard('call', tasks.call, tasks_count.call, 'Calls');
    
    // Update Email tasks
    updateTaskCard('email', tasks.email, tasks_count.email, 'Email');
}

function updateTaskCard(taskType, taskList, count, title) {
    const taskCards = document.querySelectorAll('.task-card');
    let targetCard = null;
    
    // Find the correct card by its title
    taskCards.forEach(card => {
        const cardTitle = card.querySelector('.task-title');
        if (cardTitle && cardTitle.textContent.trim() === title) {
            targetCard = card;
        }
    });
    
    if (!targetCard) {
        console.warn('Task card not found for:', title);
        return;
    }
    
    // Update badge count
    const badge = targetCard.querySelector('.task-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.backgroundColor = count > 0 ? 'red' : '#999';
    }
    
    // Update task list
    const taskListElement = targetCard.querySelector('.task-list');
    if (taskListElement) {
        if (taskList.length === 0) {
            taskListElement.innerHTML = '<li style="list-style: none; color: #999; font-style: italic; cursor: default;">No tasks</li>';
        } else {
            taskListElement.innerHTML = taskList.map(task => {
                let taskText = '';
                
                if (task.property_name) {
                    taskText = `${task.title} - ${task.property_name}`;
                } else if (task.assigned_to) {
                    taskText = `${task.title} - ${task.assigned_to}`;
                } else {
                    taskText = task.title;
                }
                
                // Add date if available
                if (task.due_date) {
                    const date = new Date(task.due_date);
                    const formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                    taskText += `<br><small style="color: #666;">${formattedDate}</small>`;
                }
                
                // Add priority indicator for todo tasks (FIXED)
                if (taskType === 'todo' && task.priority) {
                    const priorityColors = {
                        'High': '#dc3545',
                        'Medium': '#ffc107',
                        'Low': '#28a745'
                    };
                    const color = priorityColors[task.priority] || '#999';
                    taskText = `<span class="priority-indicator" style="background-color: ${color};"></span>` + taskText;
                }
                
                // Use data attribute to avoid quote issues and add direct event listener
                return `<li class="clickable-task" data-task-id="${task.id}" data-task-type="${taskType}" title="Click to view task details">${taskText}</li>`;
            }).join('');
            
            // Add event listeners to all clickable tasks
            const clickableTasks = taskListElement.querySelectorAll('.clickable-task');
            clickableTasks.forEach(taskElement => {
                taskElement.addEventListener('click', function() {
                    const taskId = this.getAttribute('data-task-id');
                    const taskType = this.getAttribute('data-task-type');
                    navigateToTask(taskId, taskType);
                });
            });
        }
    }
}

// Refresh dashboard data every 5 minutes
setInterval(() => {
    if (checkAuthentication()) {
        loadDashboardData();
    }
}, 300000); // 5 minutes

// Function to filter management page by clicking on stats
function filterManagement(filter) {
    // Store filter in localStorage
    localStorage.setItem('managementFilter', filter);
    
    // Navigate to management page
    window.location.href = 'management.html';
}

// Function to navigate to task page with specific task
function navigateToTask(taskId, taskType) {
    console.log('Navigating to task:', taskId, taskType);
    
    try {
        // Store task filter in localStorage
        localStorage.setItem('taskFilter', taskType);
        localStorage.setItem('selectedTaskId', taskId);
        
        console.log('localStorage saved:', {
            taskFilter: localStorage.getItem('taskFilter'),
            selectedTaskId: localStorage.getItem('selectedTaskId')
        });
        
        // Navigate to task page
        window.location.href = 'task.html';
    } catch (error) {
        console.error('Error in navigateToTask:', error);
        alert('Error navigating to task page: ' + error.message);
    }
}