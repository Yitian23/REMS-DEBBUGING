// Combined Settings and User Dropdown JavaScript
// Handles user settings, password changes, theme preferences, logout, and user dropdown

// ========== UTILITY FUNCTIONS ==========

// Function to capitalize first letter of each word
function capitalizeWords(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}


// Function to format full name
function formatFullName(firstName, lastName) {
    const formattedFirst = capitalizeWords(firstName);
    const formattedLast = capitalizeWords(lastName);
    return `${formattedFirst} ${formattedLast}`;
}

// ========== PAGE INITIALIZATION ==========

// Load user profile data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadUserDropdownData();
    setupPasswordForm();
    setupThemeSelection();
    loadUserSettings();
});

// Also handle cases where DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded - initializing user dropdown');
        setTimeout(loadUserDropdownData, 100);
    });
} else {
    console.log('DOM already loaded - initializing user dropdown');
    setTimeout(loadUserDropdownData, 100);
}

// ========== USER DROPDOWN DATA LOADING ==========

// Load and display user data in dropdown
function loadUserDropdownData() {
    console.log('Loading user dropdown data...');

    fetch('api.php?endpoint=get_profile')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('User dropdown data received:', data);
            
            if (data.success) {
                // Format names with proper capitalization
                const fullName = formatFullName(data.profile.first_name, data.profile.last_name);
                const email = data.profile.email;
                
                // Update dropdown elements
                const userNameElement = document.querySelector('.dropdown-user-name');
                const userEmailElement = document.querySelector('.dropdown-user-email');
                
                if (userNameElement) {
                    userNameElement.textContent = fullName;
                    console.log('Updated dropdown name:', fullName);
                }
                
                if (userEmailElement) {
                    userEmailElement.textContent = email;
                    console.log('Updated dropdown email:', email);
                }
                
                // Store user data in localStorage for other scripts to use
                localStorage.setItem('currentUser', JSON.stringify({
                    name: fullName,
                    email: email,
                    firstName: data.profile.first_name,
                    lastName: data.profile.last_name
                }));
                
            } else {
                console.error('Failed to load user data:', data.message);
                if (data.message === 'Not authenticated') {
                    // Clear localStorage and redirect to login
                    localStorage.removeItem('loggedIn');
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentUser');
                    window.location.href = 'index.html';
                }
            }
        })
        .catch(error => {
            console.error('Error loading user dropdown data:', error);
        });
}

// Load user settings including theme and notification preferences
function loadUserSettings() {
    fetch('api.php?endpoint=get_user_settings')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Load theme preference if available
            if (data.user.theme_preference) {
                const theme = data.user.theme_preference;
                localStorage.setItem('theme', theme);
                
                // Apply theme
                if (theme === 'dark') {
                    document.body.classList.add('dark-theme');
                } else {
                    document.body.classList.remove('dark-theme');
                }
                
                // Update active theme option
                const themeOptions = document.querySelectorAll('.theme-option');
                themeOptions.forEach(option => {
                    if (option.dataset.theme === theme) {
                        option.classList.add('active');
                    } else {
                        option.classList.remove('active');
                    }
                });
            }
            
            // Load notification settings
            if (data.user.task_reminders !== undefined) {
                const taskRemindersCheckbox = document.getElementById('taskReminders');
                if (taskRemindersCheckbox) {
                    taskRemindersCheckbox.checked = data.user.task_reminders == 1;
                }
            }
            
            console.log('User settings loaded:', data.user);
        } else {
            console.error('Failed to load user settings:', data.message);
            if (data.message === 'Not authenticated') {
                window.location.href = 'index.html';
            }
        }
    })
    .catch(error => {
        console.error('Error loading user settings:', error);
    });
}

// ========== USER DROPDOWN TOGGLE ==========

// Toggle User Dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const userBtn = event.target.closest('.user-dropdown');
    
    if (!userBtn && dropdown) {
        dropdown.classList.remove('show');
    }
});

// ========== LOGOUT MODAL ==========

function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    // Close the user dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== PASSWORD CHANGE ==========

function setupPasswordForm() {
    const passwordForm = document.getElementById('passwordForm');
    if (!passwordForm) return;
    
    passwordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Client-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('All fields are required');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }
        
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters long!');
            return;
        }
        
        // Check password strength
        const hasUppercase = /[A-Z]/.test(newPassword);
        const hasLowercase = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        
        if (!hasUppercase || !hasLowercase || !hasNumber) {
            alert('Password must contain at least one uppercase letter, one lowercase letter, and one number!');
            return;
        }
        
        if (newPassword === currentPassword) {
            alert('New password must be different from current password!');
            return;
        }
        
        // Send to server
        const formData = new FormData();
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);
        formData.append('confirm_password', confirmPassword);
        
        const submitBtn = passwordForm.querySelector('.btn-primary');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;
        
        fetch('api.php?endpoint=update_password', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage('Password updated successfully!');
                passwordForm.reset();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Password update error:', error);
            alert('An error occurred while updating your password.');
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });
    
    // Cancel button
    const cancelBtn = passwordForm.querySelector('.btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            passwordForm.reset();
        });
    }
}

// ========== APPEARANCE SETTINGS ==========

function setupThemeSelection() {
    const themeOptions = document.querySelectorAll('.theme-option');
    if (themeOptions.length === 0) return;
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    themeOptions.forEach(option => {
        if (option.dataset.theme === savedTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Theme selection click handlers
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            themeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function saveAppearance() {
    const selectedTheme = document.querySelector('.theme-option.active');
    
    if (selectedTheme) {
        const theme = selectedTheme.dataset.theme;
        
        const formData = new FormData();
        formData.append('setting_type', 'appearance');
        formData.append('theme', theme);
        
        fetch('api.php?endpoint=update_settings', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('theme', theme);
                
                if (theme === 'dark') {
                    document.body.classList.add('dark-theme');
                } else {
                    document.body.classList.remove('dark-theme');
                }
                
                showSuccessMessage('Appearance settings saved!');
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Appearance update error:', error);
            alert('An error occurred while saving appearance settings.');
        });
    }
}

// ========== NOTIFICATION SETTINGS ==========

function saveNotifications() {
    const taskReminders = document.getElementById('taskReminders').checked;
    
    const formData = new FormData();
    formData.append('setting_type', 'notifications');
    if (taskReminders) {
        formData.append('task_reminders', '1');
    }
    
    fetch('api.php?endpoint=update_settings', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage('Notification settings saved successfully!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Notification update error:', error);
        alert('An error occurred while saving notification settings.');
    });
}

// ========== SUCCESS MESSAGE ==========

function showSuccessMessage(message = 'Settings saved successfully!') {
    const successMsg = document.getElementById('successMessage');
    if (!successMsg) return;
    
    const icon = successMsg.querySelector('i');
    successMsg.textContent = ' ' + message;
    if (icon) {
        successMsg.insertBefore(icon, successMsg.firstChild);
    }
    
    successMsg.classList.add('show');
    
    setTimeout(() => {
        successMsg.classList.remove('show');
    }, 3000);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}