// Profile Management JavaScript
let userProfile = {};
let isEditing = false;

// Available languages
const availableLanguages = [
    { code: 'en-US', name: 'English - United States' },
    { code: 'en-GB', name: 'English - United Kingdom' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'fil', name: 'Filipino' },
    { code: 'tl', name: 'Tagalog' }
];

document.addEventListener('DOMContentLoaded', function() {
    // Load user profile directly - let PHP handle session checking
    loadUserProfile();
    
    // Setup modal close listeners
    setupModalListeners();
});

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

// Load user profile from database
function loadUserProfile() {
    console.log('Loading profile...');
    
    fetch('api.php?endpoint=get_profile') 
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(text => {
        console.log('Raw response:', text);
        try {
            const data = JSON.parse(text);
            console.log('Parsed data:', data);
            
            if (data.success) {
                // Format names with proper capitalization
                data.profile.first_name = capitalizeWords(data.profile.first_name);
                data.profile.last_name = capitalizeWords(data.profile.last_name);
                data.profile.full_name = formatFullName(data.profile.first_name, data.profile.last_name);
                
                userProfile = data.profile;
                displayProfile(data.profile);
                console.log('Profile loaded successfully:', data.profile);
            } else {
                console.error('Failed to load profile:', data);
                if (data.message === 'Not authenticated') {
                    alert('Session expired. Please log in again.');
                    window.location.href = 'index.html';
                } else {
                    alert('Error loading profile: ' + data.message);
                }
            }
        } catch (e) {
            console.error('JSON parse error:', e);
            console.error('Response was not valid JSON:', text);
            alert('Server returned invalid response. Check console for details.');
        }
    })
    .catch(error => {
        console.error('Network error loading profile:', error);
        alert('Network error occurred while loading your profile.');
    });
}

// Display profile data in the HTML
function displayProfile(profile) {
    // Update header section with full name
    document.getElementById('userName').textContent = profile.full_name;
    document.getElementById('userEmail').textContent = profile.email;
    
    // Update profile details
    document.getElementById('fullName').textContent = profile.full_name;
    document.getElementById('phoneNumber').textContent = profile.phone_number || 'Not provided';
    document.getElementById('gender').textContent = profile.gender;
    document.getElementById('country').textContent = profile.country;
    document.getElementById('language').textContent = profile.language;
    document.getElementById('timezone').textContent = profile.timezone;
    
    // Update email list
    updateEmailList([profile.email]);
    
    // Update phone list
    if (profile.phone_number && profile.phone_number !== 'Not provided') {
        updatePhoneList([profile.phone_number]);
    } else {
        updatePhoneList([]);
    }
}

// Update email list display
function updateEmailList(emails) {
    const emailList = document.getElementById('emailList');
    emailList.innerHTML = '';
    
    emails.forEach(email => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <i class="fas fa-envelope"></i>
            <span>${email}</span>
            <button class="delete-contact" onclick="deleteEmail(this)" style="display: none;">
                <i class="fas fa-trash"></i> Remove
            </button>
        `;
        emailList.appendChild(listItem);
    });
}

// Update phone list display
function updatePhoneList(phones) {
    const phoneList = document.getElementById('phoneList');
    phoneList.innerHTML = '';
    
    if (phones.length === 0) {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <i class="fas fa-phone"></i>
            <span style="color: #999;">No phone number added</span>
        `;
        phoneList.appendChild(listItem);
    } else {
        phones.forEach(phone => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <i class="fas fa-phone"></i>
                <span>${phone}</span>
                <button class="delete-contact" onclick="deletePhone(this)" style="display: none;">
                    <i class="fas fa-trash"></i> Remove
                </button>
            `;
            phoneList.appendChild(listItem);
        });
    }
}

// ========== EDIT PROFILE FUNCTIONS ==========

// Edit profile function
function editProfile() {
    if (isEditing) {
        cancelEdit();
        return;
    }
    
    showEditForm();
}

// Show edit form modal
function showEditForm() {
    // Populate form with current data
    document.getElementById('editFirstName').value = userProfile.first_name || '';
    document.getElementById('editLastName').value = userProfile.last_name || '';
    document.getElementById('editEmail').value = userProfile.email || '';
    document.getElementById('editPhone').value = (userProfile.phone_number === 'Not provided') ? '' : (userProfile.phone_number || '');
    document.getElementById('editLanguage').value = userProfile.language || 'English - United States';
    document.getElementById('editGender').value = userProfile.gender || 'Not specified';
    
    // Show modal
    const modal = document.getElementById('editProfileModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    isEditing = true;
}

// Update profile via API
function updateProfile(event) {
    event.preventDefault();
    
    const form = document.getElementById('editProfileForm');
    const formData = new FormData(form);
    
    // Format names before sending
    const firstName = capitalizeWords(formData.get('first_name'));
    const lastName = capitalizeWords(formData.get('last_name'));
    formData.set('first_name', firstName);
    formData.set('last_name', lastName);
    
    const submitBtn = form.querySelector('.btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
    
    fetch('api.php?endpoint=update_profile', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Profile updated successfully!');
            cancelEdit();
            loadUserProfile(); // Reload profile data
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        alert('An error occurred while updating your profile.');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

// Cancel edit mode
function cancelEdit() {
    isEditing = false;
    
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// ========== MODAL CONTROL FUNCTIONS ==========

function openEmailModal() {
    const modal = document.getElementById('emailModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        document.getElementById('newEmail').focus();
    }, 100);
}

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('emailForm').reset();
}

function openPhoneModal() {
    const modal = document.getElementById('phoneModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        document.getElementById('newPhone').focus();
    }, 100);
}

function closePhoneModal() {
    const modal = document.getElementById('phoneModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('phoneForm').reset();
}

// ========== ADD EMAIL/PHONE FUNCTIONS ==========

function addEmail(event) {
    event.preventDefault();
    
    const email = document.getElementById('newEmail').value;
    
    // Check for duplicates
    const existingEmails = document.querySelectorAll('#emailList li span');
    for (let emailSpan of existingEmails) {
        if (emailSpan.textContent === email) {
            alert('This email address already exists!');
            return;
        }
    }
    
    // For now, just add to the display
    const emailList = document.getElementById('emailList');
    const newEmailItem = document.createElement('li');
    newEmailItem.innerHTML = `
        <i class="fas fa-envelope"></i>
        <span>${email}</span>
        <button class="delete-contact" onclick="deleteEmail(this)">
            <i class="fas fa-trash"></i> Remove
        </button>
    `;
    
    emailList.appendChild(newEmailItem);
    closeEmailModal();
    
    alert('Email added successfully! (Note: This is a demo - in production, this would be saved to your profile)');
}

function addPhone(event) {
    event.preventDefault();
    
    const phone = document.getElementById('newPhone').value;
    
    // Check for duplicates
    const existingPhones = document.querySelectorAll('#phoneList li span');
    for (let phoneSpan of existingPhones) {
        if (phoneSpan.textContent === phone) {
            alert('This phone number already exists!');
            return;
        }
    }
    
    // Remove "No phone number added" message if it exists
    const phoneList = document.getElementById('phoneList');
    const noPhoneMessage = phoneList.querySelector('span[style*="color: #999"]');
    if (noPhoneMessage) {
        noPhoneMessage.parentElement.remove();
    }
    
    // Add new phone number
    const newPhoneItem = document.createElement('li');
    newPhoneItem.innerHTML = `
        <i class="fas fa-phone"></i>
        <span>${phone}</span>
        <button class="delete-contact" onclick="deletePhone(this)">
            <i class="fas fa-trash"></i> Remove
        </button>
    `;
    
    phoneList.appendChild(newPhoneItem);
    closePhoneModal();
    
    alert('Phone added successfully! (Note: This is a demo - in production, this would be saved to your profile)');
}

// ========== DELETE FUNCTIONS ==========

function deleteEmail(button) {
    alert('Email deletion is disabled in this demo to prevent removing your login email.');
}

function deletePhone(button) {
    if (confirm('Are you sure you want to remove this phone number?')) {
        const listItem = button.closest('li');
        listItem.remove();
        
        // Check if no phone numbers left
        const phoneList = document.getElementById('phoneList');
        if (phoneList.children.length === 0) {
            const noPhoneItem = document.createElement('li');
            noPhoneItem.innerHTML = `
                <i class="fas fa-phone"></i>
                <span style="color: #999;">No phone number added</span>
            `;
            phoneList.appendChild(noPhoneItem);
        }
        
        alert('Phone number removed! (Note: This is a demo - in production, this would be saved to your profile)');
    }
}

// ========== MODAL EVENT LISTENERS ==========

function setupModalListeners() {
    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
                isEditing = false;
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                activeModal.classList.remove('active');
                document.body.style.overflow = 'auto';
                isEditing = false;
            }
        }
    });
}

// ========== UTILITY FUNCTIONS ==========

// Function to handle input capitalization in real-time
function handleNameInput(input) {
    const cursorPosition = input.selectionStart;
    const originalValue = input.value;
    input.value = capitalizeWords(input.value);
    
    // Restore cursor position
    if (input.value.length === originalValue.length) {
        input.setSelectionRange(cursorPosition, cursorPosition);
    }
}

// Add input event listeners for name fields when modal opens
document.addEventListener('DOMContentLoaded', function() {
    const firstNameInput = document.getElementById('editFirstName');
    const lastNameInput = document.getElementById('editLastName');
    
    if (firstNameInput) {
        firstNameInput.addEventListener('input', function() {
            handleNameInput(this);
        });
    }
    
    if (lastNameInput) {
        lastNameInput.addEventListener('input', function() {
            handleNameInput(this);
        });
    }
});