let allProperties = [];
let currentPropertyId = null;
let currentActivityTasks = { todo: [], call: [], email: [] };
let currentActiveTaskType = 'todo';
let sortDirection = 'asc'; // Track sort direction for tags
let isEditingFromDetailView = false; // Track if editing was initiated from detail view

const locationData = {};
const streetData = {}; // Store property types and classes by street
const propertyTypes = new Set();
const propertyClassesByType = {};

document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = '../index.html';
        return;
    }
    
    loadLocationData();
    loadProperties();
    
    document.getElementById('searchProperties').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProperties();
        }
    });
});

// Load location data from database
function loadLocationData() {
    console.log('=== loadLocationData CALLED ===');
    
    fetch('api.php?endpoint=get_properties')
    .then(response => {
        console.log('API Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('API Data received:', data);
        
        if (data.success) {
            console.log('Locations count:', data.locations?.length);
            
            // Process location data
            data.locations.forEach((loc, index) => {
                if (index < 3) {
                    console.log('Sample location', index + 1, ':', loc);
                }
                
                // Store barangay and street relationships
                if (!locationData[loc.barangay]) {
                    locationData[loc.barangay] = new Set();
                }
                locationData[loc.barangay].add(loc.street);
                
                // Store property types and classes by street
                const streetKey = `${loc.barangay}|${loc.street}`;
                if (!streetData[streetKey]) {
                    streetData[streetKey] = {
                        propertyTypes: new Set(),
                        classesByType: {}
                    };
                }
                
                if (loc.property_type) {
                    streetData[streetKey].propertyTypes.add(loc.property_type);
                    
                    if (!streetData[streetKey].classesByType[loc.property_type]) {
                        streetData[streetKey].classesByType[loc.property_type] = new Set();
                    }
                    
                    if (loc.class) {
                        streetData[streetKey].classesByType[loc.property_type].add(loc.class);
                    }
                }
                
                // Also store globally for reference
                if (loc.property_type) {
                    propertyTypes.add(loc.property_type);
                    
                    if (!propertyClassesByType[loc.property_type]) {
                        propertyClassesByType[loc.property_type] = new Set();
                    }
                    
                    if (loc.class) {
                        propertyClassesByType[loc.property_type].add(loc.class);
                    }
                }
            });
            
            console.log('Property types found:', Array.from(propertyTypes));
            console.log('Street data:', streetData);
            
            // Populate initial dropdowns
            populateBarangays();
            
            console.log('✓ Location data loaded successfully');
        } else {
            console.error('✗ API returned success=false:', data.message);
        }
    })
    .catch(error => {
        console.error('✗ Error loading location data:', error);
    });
}

// REPLACE THE ENTIRE populatePropertyTypes() FUNCTION WITH THIS:


// Populate barangay dropdown with all available barangays
function populateBarangays() {
    const barangaySelect = document.getElementById('barangay');
    if (!barangaySelect) return;
    
    // Show all barangays
    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
    
    // Get all barangays sorted
    const sortedBarangays = Object.keys(locationData).sort();
    
    // Add all barangays to dropdown
    sortedBarangays.forEach(barangay => {
        const option = document.createElement('option');
        option.value = barangay;
        option.textContent = barangay;
        barangaySelect.appendChild(option);
    });
    
    // Enable barangay dropdown
    barangaySelect.disabled = false;
    
    console.log('✓ Populated barangays:', sortedBarangays.length);
}

// Load streets based on selected barangay
function loadStreets() {
    const barangaySelect = document.getElementById('barangay');
    const streetSelect = document.getElementById('street');
    const propertyTypeSelect = document.getElementById('property_type');
    const classSelect = document.getElementById('property_class');
    
    if (!barangaySelect || !streetSelect) return;
    
    const selectedBarangay = barangaySelect.value;
    
    // Reset dependent dropdowns
    streetSelect.innerHTML = '<option value="">Select Street</option>';
    if (propertyTypeSelect) {
        propertyTypeSelect.innerHTML = '<option value="">Select Street First</option>';
        propertyTypeSelect.disabled = true;
    }
    if (classSelect) {
        classSelect.innerHTML = '<option value="">Select Property Type First</option>';
        classSelect.disabled = true;
    }
    
    if (!selectedBarangay) {
        streetSelect.disabled = true;
        streetSelect.innerHTML = '<option value="">Select Barangay First</option>';
        return;
    }
    
    // Get streets for selected barangay
    const streets = locationData[selectedBarangay];
    if (streets && streets.size > 0) {
        const sortedStreets = Array.from(streets).sort();
        
        sortedStreets.forEach(street => {
            const option = document.createElement('option');
            option.value = street;
            option.textContent = street;
            streetSelect.appendChild(option);
        });
        
        streetSelect.disabled = false;
        console.log('✓ Loaded streets for', selectedBarangay, ':', sortedStreets.length);
    } else {
        streetSelect.innerHTML = '<option value="">No streets available</option>';
        streetSelect.disabled = true;
    }
}

// Load property types based on selected street
function loadPropertyTypesByStreet() {
    const barangaySelect = document.getElementById('barangay');
    const streetSelect = document.getElementById('street');
    const propertyTypeSelect = document.getElementById('property_type');
    const classSelect = document.getElementById('property_class');
    
    if (!streetSelect || !propertyTypeSelect) return;
    
    const selectedBarangay = barangaySelect.value;
    const selectedStreet = streetSelect.value;
    
    // Reset class dropdown
    if (classSelect) {
        classSelect.innerHTML = '<option value="">Select Property Type First</option>';
        classSelect.disabled = true;
    }
    
    if (!selectedBarangay || !selectedStreet) {
        propertyTypeSelect.innerHTML = '<option value="">Select Street First</option>';
        propertyTypeSelect.disabled = true;
        return;
    }
    
    const streetKey = `${selectedBarangay}|${selectedStreet}`;
    const streetInfo = streetData[streetKey];
    
    if (streetInfo && streetInfo.propertyTypes.size > 0) {
        propertyTypeSelect.innerHTML = '<option value="">Select Type</option>';
        
        const sortedTypes = Array.from(streetInfo.propertyTypes).sort();
        sortedTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            propertyTypeSelect.appendChild(option);
        });
        
        propertyTypeSelect.disabled = false;
        console.log('✓ Loaded property types for street:', sortedTypes.length);
    } else {
        propertyTypeSelect.innerHTML = '<option value="">No types available</option>';
        propertyTypeSelect.disabled = true;
    }
}

// Load classes based on selected street and property type
function loadClassesByStreetAndType() {
    const barangaySelect = document.getElementById('barangay');
    const streetSelect = document.getElementById('street');
    const propertyTypeSelect = document.getElementById('property_type');
    const classSelect = document.getElementById('property_class');
    
    if (!classSelect || !propertyTypeSelect) return;
    
    const selectedBarangay = barangaySelect.value;
    const selectedStreet = streetSelect.value;
    const selectedType = propertyTypeSelect.value;
    
    if (!selectedBarangay || !selectedStreet || !selectedType) {
        classSelect.innerHTML = '<option value="">Select Property Type First</option>';
        classSelect.disabled = true;
        return;
    }
    
    const streetKey = `${selectedBarangay}|${selectedStreet}`;
    const streetInfo = streetData[streetKey];
    
    if (streetInfo && streetInfo.classesByType[selectedType]) {
        classSelect.innerHTML = '<option value="">Select Class</option>';
        
        const classes = Array.from(streetInfo.classesByType[selectedType]);
        
        // Sort classes with smart alphanumeric sorting
        const sortedClasses = classes.sort((a, b) => {
            const aIsLetter = /^[A-Z]+$/.test(a);
            const bIsLetter = /^[A-Z]+$/.test(b);
            
            if (aIsLetter && !bIsLetter) return -1;
            if (!aIsLetter && bIsLetter) return 1;
            
            const aMatch = a.match(/^([A-Z]+)(\d*)$/);
            const bMatch = b.match(/^([A-Z]+)(\d*)$/);
            
            if (aMatch && bMatch) {
                if (aMatch[1] !== bMatch[1]) {
                    return aMatch[1].localeCompare(bMatch[1]);
                }
                const aNum = parseInt(aMatch[2] || '0');
                const bNum = parseInt(bMatch[2] || '0');
                return aNum - bNum;
            }
            
            return a.localeCompare(b);
        });
        
        sortedClasses.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classSelect.appendChild(option);
        });
        
        classSelect.disabled = false;
        console.log('✓ Loaded classes for', selectedType, ':', sortedClasses.length);
    } else {
        classSelect.innerHTML = '<option value="">No classes available</option>';
        classSelect.disabled = true;
    }
    
    // Toggle property detail fields based on property type
    togglePropertyDetailFields();
}

// Toggle visibility of property detail fields based on property type
function togglePropertyDetailFields() {
    const propertyTypeSelect = document.getElementById('property_type');
    if (!propertyTypeSelect) return;
    
    const selectedType = propertyTypeSelect.value.toUpperCase();
    
    const bedroomsGroup = document.getElementById('bedrooms')?.closest('.form-group');
    const bathroomsGroup = document.getElementById('bathrooms')?.closest('.form-group');
    const floorAreaGroup = document.getElementById('floor_area')?.closest('.form-group');
    
    if (!bedroomsGroup || !bathroomsGroup || !floorAreaGroup) return;
    
    // AGRICULTURE and INDUSTRIAL: Hide bedrooms, bathrooms, and floor area
    if (selectedType.includes('AGRICULT') || selectedType === 'INDUSTRIAL') {
        bedroomsGroup.style.display = 'none';
        bathroomsGroup.style.display = 'none';
        floorAreaGroup.style.display = 'none';
        
        // Clear values when hiding
        document.getElementById('bedrooms').value = '';
        document.getElementById('bathrooms').value = '';
        document.getElementById('floor_area').value = '';
    }
    // COMMERCIAL: Hide only bedrooms
    else if (selectedType === 'COMMERCIAL') {
        bedroomsGroup.style.display = 'none';
        bathroomsGroup.style.display = '';
        floorAreaGroup.style.display = '';
        
        // Clear bedrooms value when hiding
        document.getElementById('bedrooms').value = '';
    }
    // Other property types: Show all fields
    else {
        bedroomsGroup.style.display = '';
        bathroomsGroup.style.display = '';
        floorAreaGroup.style.display = '';
    }
}

function showAddPropertyForm() {
    document.getElementById('addPropertyBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'flex';
    document.getElementById('propertyList').style.display = 'none';
    document.getElementById('addPropertyForm').style.display = 'block';
    
    // Reset form
    const form = document.getElementById('propertyForm');
    form.reset();
    form.removeAttribute('data-property-id');
    
    // Clear hidden input
    const hiddenInput = document.getElementById('property_id_hidden');
    if (hiddenInput) {
        hiddenInput.value = '';
    }
    
    // Reset form title and button
    document.querySelector('.form-header h2').textContent = 'Add New Property';
    document.querySelector('.btn-save').innerHTML = '<i class="fas fa-save"></i> Save Property';
    
    // Reset and disable dependent dropdowns
    const streetSelect = document.getElementById('street');
    const propertyTypeSelect = document.getElementById('property_type');
    const classSelect = document.getElementById('property_class');
    
    streetSelect.disabled = true;
    streetSelect.innerHTML = '<option value="">Select Barangay First</option>';
    
    if (propertyTypeSelect) {
        propertyTypeSelect.disabled = true;
        propertyTypeSelect.innerHTML = '<option value="">Select Street First</option>';
    }
    
    classSelect.disabled = true;
    classSelect.innerHTML = '<option value="">Select Property Type First</option>';
    
    // Show bedrooms, bathrooms, and floor area by default
    const bedroomsGroup = document.getElementById('bedrooms')?.closest('.form-group');
    const bathroomsGroup = document.getElementById('bathrooms')?.closest('.form-group');
    const floorAreaGroup = document.getElementById('floor_area')?.closest('.form-group');
    if (bedroomsGroup) bedroomsGroup.style.display = '';
    if (bathroomsGroup) bathroomsGroup.style.display = '';
    if (floorAreaGroup) floorAreaGroup.style.display = '';
}

// Handle property form submission
function addProperty() {
    console.log('=== ADD/UPDATE PROPERTY FUNCTION CALLED ===');
    
    const form = document.getElementById('propertyForm');
    const hiddenInput = document.getElementById('property_id_hidden');
    
    // Try to get property ID from hidden input FIRST (most reliable)
    let propertyId = hiddenInput ? hiddenInput.value : null;
    
    // If not in hidden input, try data attribute
    if (!propertyId || propertyId === '' || propertyId === 'null') {
        propertyId = form.getAttribute('data-property-id');
    }
    
    console.log('=== PROPERTY ID DETECTION ===');
    console.log('Hidden input element:', hiddenInput);
    console.log('Hidden input value:', hiddenInput ? hiddenInput.value : 'N/A');
    console.log('Data attribute value:', form.getAttribute('data-property-id'));
    console.log('Final property ID:', propertyId);
    console.log('Property ID type:', typeof propertyId);
    
    // Determine if this is an update or new property
    const isUpdate = propertyId && propertyId !== '' && propertyId !== 'null' && propertyId !== null;
    const url = isUpdate ? 'api.php?endpoint=update_property' : 'api.php?endpoint=add_property';
    
    console.log('=== DECISION ===');
    console.log('Is Update:', isUpdate);
    console.log('URL to call:', url);
    
    const formData = new FormData(form);
    
    // IMPORTANT: If it's an update, make sure property_id is in formData
    if (isUpdate) {
        const existingPropertyId = formData.get('property_id');
        console.log('property_id in FormData:', existingPropertyId);
        
        if (!existingPropertyId || existingPropertyId === '' || existingPropertyId === 'null') {
            formData.set('property_id', propertyId);
            console.log('✓ Manually added property_id to formData:', propertyId);
        } else {
            console.log('✓ property_id already in formData:', existingPropertyId);
        }
    } else {
        formData.delete('property_id');
        console.log('✗ Removed property_id from formData (new property)');
    }
    
    // Debug: log all form data
    console.log('=== FORM DATA ===');
    for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
    }
    
    console.log('=== SENDING REQUEST TO:', url, '===');
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('=== SERVER RESPONSE ===', data);
        
        if (data.success) {
            alert(isUpdate ? 'Property updated successfully!' : 'Property added successfully!');
            
            // Check if we should return to detail view
            if (isEditingFromDetailView && isUpdate && currentPropertyId) {
                // Reload properties then show detail view
                loadProperties().then(() => {
                    cancelAddProperty(); // This will return to detail view
                    // Reload the detail view with updated data
                    showDetailView(currentPropertyId);
                });
            } else {
                // Normal flow: return to list
                cancelAddProperty();
                loadProperties();
            }
        } else {
            alert('Error: ' + (data.message || 'Failed to save property'));
            console.error('Server error:', data);
        }
    })
    .catch(error => {
        console.error('=== FETCH ERROR ===', error);
        alert('An error occurred. Please try again.');
    });
}

function cancelAddProperty() {
    // Check if we should return to detail view
    if (isEditingFromDetailView && currentPropertyId) {
        // Return to detail view
        document.getElementById('addPropertyForm').style.display = 'none';
        document.getElementById('propertyDetailView').style.display = 'block';
        document.getElementById('addPropertyBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
        
        // Reset the flag
        isEditingFromDetailView = false;
        
        console.log('Returned to detail view for property:', currentPropertyId);
    } else {
        // Return to list view (normal behavior)
        document.getElementById('addPropertyBtn').style.display = 'flex';
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('propertyList').style.display = 'block';
        document.getElementById('addPropertyForm').style.display = 'none';
        
        // Hide detail view if visible
        const detailView = document.getElementById('propertyDetailView');
        if (detailView) detailView.style.display = 'none';
    }
    
    // Reset form
    const form = document.getElementById('propertyForm');
    form.reset();
    form.removeAttribute('data-property-id');
    
    // Clear hidden input
    const hiddenInput = document.getElementById('property_id_hidden');
    if (hiddenInput) {
        hiddenInput.value = '';
    }
    
    // Reset form title and button text
    document.querySelector('.form-header h2').textContent = 'Add New Property';
    document.querySelector('.btn-save').innerHTML = '<i class="fas fa-save"></i> Save Property';
    
    // Reset street dropdown
    const streetSelect = document.getElementById('street');
    if (streetSelect) {
    streetSelect.disabled = true;
    streetSelect.innerHTML = '<option value="">Select Barangay First</option>';
    }

    // Reset class dropdown
    const classSelect = document.getElementById('property_class');
    if (classSelect) {
    classSelect.disabled = true;
    classSelect.innerHTML = '<option value="">Select Property Type First</option>';
}
}

function goBack() {
    const detailView = document.getElementById('detailView');
    if (detailView && detailView.style.display === 'block') {
        showListView();
    } else {
        cancelAddProperty();
    }
}

function showListView() {
    document.getElementById('addPropertyBtn').style.display = 'flex';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('propertyList').style.display = 'block';
    document.getElementById('addPropertyForm').style.display = 'none';
    
    const detailView = document.getElementById('propertyDetailView');
    if (detailView) {
        detailView.style.display = 'none';
    }
    
    currentPropertyId = null;
    isEditingFromDetailView = false; // Reset the flag when returning to list view
}

function showDetailView(propertyId) {
    const property = allProperties.find(p => p.id == propertyId);
    if (!property) return;
    
    currentPropertyId = propertyId;
    
    document.getElementById('addPropertyBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('propertyList').style.display = 'none';
    document.getElementById('addPropertyForm').style.display = 'none';
    
    let detailView = document.getElementById('propertyDetailView');
    if (!detailView) {
        detailView = document.createElement('div');
        detailView.id = 'propertyDetailView';
        detailView.className = 'property-detail-view';
        document.querySelector('.property-content').appendChild(detailView);
    }
    
    const statusValue = property.status || 'New Lead';
    const statusClass = statusValue.toLowerCase().replace(/ /g, '-');
    
    // Valid statuses list
    const validStatuses = ['New Lead', 'Proposal', 'Follow Up', 'On Progress', 'Negotiation', 'Signing Contract', 'Not Interested', 'Closed Deal'];
    
    // Check if status is valid, if not default to 'New Lead'
    const displayStatus = validStatuses.includes(statusValue) ? statusValue : 'New Lead';
    const displayStatusClass = displayStatus.toLowerCase().replace(/ /g, '-');
    
    // Format price safely
    const formattedPrice = property.price ? parseFloat(property.price).toLocaleString() : '0';
    
    // Safe display values - CHANGED property_class to class
    const ownerName = property.owner_name || 'N/A';
    const email = property.email || 'N/A';
    const contactNumber = property.contact_number || 'N/A';
    const barangay = property.barangay || 'N/A';
    const street = property.street || 'N/A';
    const city = property.city || 'N/A';
    const province = property.province || 'N/A';
    const propertyType = property.property_type || 'N/A';
    const propertyClass = property.class || 'N/A'; // CHANGED FROM property.property_class
    const floorArea = property.floor_area ? `${property.floor_area} sqm` : 'N/A';
    const lotArea = property.lot_area ? `${property.lot_area} sqm` : 'N/A';
    const bedrooms = property.bedrooms || 'N/A';
    const bathrooms = property.bathrooms || 'N/A';
    
    detailView.innerHTML = `
        <div class="tab-navigation">
            <button class="btn-back-detail" onclick="showListView()" title="Back to List">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div class="tab-container">
                <button class="tab-button active" data-tab="overview">Overview</button>
                <button class="tab-button" data-tab="activities">Activities</button>
            </div>
            <div class="tab-actions-right">
                <button class="btn-edit-property" onclick="editProperty(${property.id})" title="Edit Property" id="editPropertyBtn">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-add-task" id="addTaskBtn" style="display: none;">
                    <i class="fas fa-plus"></i> Add Task
                </button>
            </div>
        </div>
        
        <div id="overviewTab" class="tab-content">
            <div class="lead-info-container">
                <div class="lead-info-row">
                    <span class="lead-info-label">Owner name :</span>
                    <span class="lead-info-value">${ownerName}</span>
                </div>
                <div class="lead-info-row">
                    <span class="lead-info-label">Email :</span>
                    <span class="lead-info-value">${email}</span>
                </div>
                <div class="lead-info-row">
                    <span class="lead-info-label">Contact number :</span>
                    <span class="lead-info-value">${contactNumber}</span>
                </div>
                <div class="lead-info-row">
                    <span class="lead-info-label">Tag :</span>
                    <span class="lead-info-value">
                        <select class="status-dropdown status-${displayStatusClass}" onchange="updatePropertyTag(${property.id}, this.value)">
                            <option value="New Lead" ${displayStatus === 'New Lead' ? 'selected' : ''}>New Lead</option>
                            <option value="Proposal" ${displayStatus === 'Proposal' ? 'selected' : ''}>Proposal</option>
                            <option value="Follow Up" ${displayStatus === 'Follow Up' ? 'selected' : ''}>Follow Up</option>
                            <option value="On Progress" ${displayStatus === 'On Progress' ? 'selected' : ''}>On Progress</option>
                            <option value="Negotiation" ${displayStatus === 'Negotiation' ? 'selected' : ''}>Negotiation</option>
                            <option value="Signing Contract" ${displayStatus === 'Signing Contract' ? 'selected' : ''}>Signing Contract</option>
                            <option value="Not Interested" ${displayStatus === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
                            <option value="Closed Deal" ${displayStatus === 'Closed Deal' ? 'selected' : ''}>Closed Deal</option>
                        </select>
                    </span>
                </div>
            </div>
            
            
            <!-- Property Location Map -->
            <div class="property-map-container">
                <div class="property-map-header">
                    <i class="fas fa-map-marker-alt"></i>
                    <h3>Property Location</h3>
                </div>
                <div id="propertyMap"></div>
                <div class="map-info-box">
                    <i class="fas fa-info-circle"></i>
                    Location shown is approximate based on barangay: <strong>${barangay}</strong>
                </div>
            </div>
            
            <div class="property-info-section">
                <h3 class="property-info-title">Property Information</h3>
                <div class="property-info-container">
                    <div class="property-info-grid">
                        <div class="property-info-item">
                            <label>Address :</label>
                            <span>${street}, ${barangay}, ${city}, ${province}</span>
                        </div>
                        <div class="property-info-item">
                            <label>Price :</label>
                            <span>₱${formattedPrice}</span>
                        </div>
                        <div class="property-info-item">
                            <label>Floor Area :</label>
                            <span>${floorArea}</span>
                        </div>
                        <div class="property-info-item">
                            <label>Lot Area :</label>
                            <span>${lotArea}</span>
                        </div>
                        <div class="property-info-item">
                            <label>Bedrooms :</label>
                            <span>${bedrooms}</span>
                        </div>
                        <div class="property-info-item">
                            <label>Bathrooms :</label>
                            <span>${bathrooms}</span>
                        </div>
                        <div class="property-info-item">
                            <label>Property type :</label>
                            <span>${propertyType}</span>
                        </div>
                        <div class="property-info-item">
                            <label>Class :</label>
                            <span>${propertyClass}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="notes-section">
                <h3 class="notes-title">Notes</h3>
                <textarea class="notes-textarea-editable" id="notesTextarea-${property.id}" placeholder="Click here to add notes...">${property.description || ''}</textarea>
                <div class="notes-save-indicator" id="saveIndicator-${property.id}" style="display: none;">
                    <i class="fas fa-check-circle"></i> Saved
                </div>
            </div>
        </div>
        
        <div id="activitiesTab" class="tab-content" style="display: none;">
            <div class="activities-content">
                <p class="task-assigned-info">Tasks for <strong id="clientNameDisplay">${property.owner_name}</strong></p>
                
                <!-- All Tasks Section -->
                <div class="all-tasks-section" id="allTasksSection">
                    <h3 class="activities-section-title">Activities</h3>
                    <div class="all-tasks-container" id="allTasksContainer">
                        <p style="text-align: center; color: #6c757d; padding: 20px;">Loading tasks...</p>
                    </div>
                </div>
                
                <div class="task-type-tabs">
                    <div class="task-type-tab active" data-type="todo">
                        To-do
                        <span class="task-count-badge" id="todoCount">0</span>
                    </div>
                    <div class="task-type-tab" data-type="call">
                        Calls
                        <span class="task-count-badge" id="callCount">0</span>
                    </div>
                    <div class="task-type-tab" data-type="email">
                        Email
                        <span class="task-count-badge" id="emailCount">0</span>
                    </div>
                </div>
                
                <div class="activity-tasks-container" id="activityTasksContainer">
                    <p style="text-align: center; color: #6c757d; padding: 40px;">Loading tasks...</p>
                </div>
            </div>
            
            <div class="modal-overlay" id="activityTaskModal">
                <div class="activity-task-modal">
                    <div class="modal-header">Create Task</div>
                    
                    <form id="activityTaskForm">
                        <input type="hidden" name="property_id" id="taskPropertyId">
                        
                        <div class="form-group">
                            <label class="form-label">Task Title *</label>
                            <input type="text" name="title" class="form-input" placeholder="Meeting with client" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Task Type *</label>
                                <select name="task_type" class="form-select" required id="activityTaskType">
                                    <option value="todo">To-do</option>
                                    <option value="call">Call</option>
                                    <option value="email">Email</option>
                                </select>
                            </div>
                            <div class="form-group" id="activity-priority-group">
                                <label class="form-label">Priority *</label>
                                <select name="priority" class="form-select" required>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group" id="activity-status-group">
                                <label class="form-label">Status *</label>
                                <select name="status" class="form-select">
                                    <option value="Not Started">Not Started</option>
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="On Progress">On Progress</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Assigned to:</label>
                                <input type="text" name="assigned_to" class="form-input" placeholder="Name">
                            </div>
                        </div>

                        <div class="date-time-row">
                            <div class="form-group">
                                <label class="form-label">Date:</label>
                                <input type="date" name="due_date" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Time:</label>
                                <input type="time" name="due_time" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Queue:</label>
                                <input type="number" name="queue_number" class="form-input" value="1" min="1">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Notes</label>
                            <textarea name="notes" class="form-textarea" placeholder="Add task notes..."></textarea>
                        </div>

                        <div class="modal-buttons">
                            <button type="submit" class="btn-create">Create</button>
                            <button type="button" class="btn-cancel-modal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    detailView.style.display = 'block';
    
    const tabButtons = detailView.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.getAttribute('data-tab'));
        });
    });
    
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', openActivityTaskModal);
    }
    
    const taskTypeTabs = detailView.querySelectorAll('.task-type-tab');
    taskTypeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            switchTaskTypeTab(this.getAttribute('data-type'));
        });
    });
    
    const activityTaskForm = document.getElementById('activityTaskForm');
    if (activityTaskForm) {
        activityTaskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createActivityTask();
        });
    }
    
    const cancelModalBtn = detailView.querySelector('.btn-cancel-modal');
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeActivityTaskModal);
    }
    
    const activityTaskType = document.getElementById('activityTaskType');
    if (activityTaskType) {
        activityTaskType.addEventListener('change', toggleActivityTaskFields);
    }
    
    const activityModal = document.getElementById('activityTaskModal');
    if (activityModal) {
        activityModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeActivityTaskModal();
            }
        });
    }
    
    const notesTextarea = detailView.querySelector('.notes-textarea-editable');
    if (notesTextarea) {
        let saveTimeout;
        notesTextarea.addEventListener('input', function() {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                autoSaveNotes(propertyId, this.value);
            }, 1000);
        });
    }
    
    // Initialize the property map
    setTimeout(() => {
        if (typeof initializePropertyMap === 'function') {
            initializePropertyMap(property);
        } else {
            console.warn('Map initialization function not loaded. Make sure map-functions.js is included.');
        }
    }, 200);
}

function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    const addTaskBtn = document.getElementById('addTaskBtn');
    const editPropertyBtn = document.getElementById('editPropertyBtn');
    
    if (tabName === 'overview') {
        document.getElementById('overviewTab').style.display = 'block';
        document.getElementById('activitiesTab').style.display = 'none';
        if (addTaskBtn) addTaskBtn.style.display = 'none';
        if (editPropertyBtn) editPropertyBtn.style.display = 'flex';
    } else if (tabName === 'activities') {
        document.getElementById('overviewTab').style.display = 'none';
        document.getElementById('activitiesTab').style.display = 'block';
        if (addTaskBtn) addTaskBtn.style.display = 'flex';
        if (editPropertyBtn) editPropertyBtn.style.display = 'none';
        loadActivities(currentPropertyId);
    }
}

function loadActivities(propertyId) {
    if (!propertyId) return;
    
    currentActiveTaskType = 'todo';
    
    fetch(`api.php?endpoint=get_property_tasks&property_id=${propertyId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayActivityTasks(data.tasks, data.counts);
        } else {
            document.getElementById('activityTasksContainer').innerHTML = 
                '<p style="text-align: center; color: #dc3545; padding: 40px;">Failed to load tasks</p>';
        }
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
        document.getElementById('activityTasksContainer').innerHTML = 
            '<p style="text-align: center; color: #dc3545; padding: 40px;">Error loading tasks</p>';
    });
}

function displayActivityTasks(tasks, counts) {
    currentActivityTasks = tasks;
    
    document.getElementById('todoCount').textContent = counts.todo || 0;
    document.getElementById('callCount').textContent = counts.call || 0;
    document.getElementById('emailCount').textContent = counts.email || 0;
    
    // Display all tasks in the Activities section
    displayAllTasks(tasks);
    
    // Display tasks by type in the tabbed section
    displayTasksByType(currentActiveTaskType);
}

function displayAllTasks(tasks) {
    const allTasksContainer = document.getElementById('allTasksContainer');
    
    // Combine all tasks from all types
    const allTasks = [...tasks.todo, ...tasks.call, ...tasks.email];
    
    // Filter to show only property-specific tasks (tasks with property_id)
    const propertyTasks = allTasks.filter(task => task.property_id != null);
    
    if (propertyTasks.length === 0) {
        allTasksContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No tasks for this property yet. Click "Add Task" to create one.</p>';
        return;
    }
    
    allTasksContainer.innerHTML = '';
    
    propertyTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'all-task-item';
        taskItem.setAttribute('data-task-id', task.id);
        
        const taskDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }) : '';
        
        let taskContent = `
            <input type="checkbox" class="task-checkbox-all" data-task-id="${task.id}">
            <div class="task-content-all">
                <div class="task-title-all">${task.title}</div>
                ${taskDate ? `<div class="task-date-all">${taskDate}</div>` : ''}
                ${task.assigned_to ? `<div class="task-assignee-all">${task.assigned_to}</div>` : ''}
        `;
        
        if (task.task_type === 'todo' && task.status && task.priority) {
            const statusClass = task.status.toLowerCase().replace(' ', '-');
            const priorityClass = task.priority.toLowerCase();
            
            taskContent += `
                <div class="task-details-all">
                    <span class="task-status-all status-${statusClass}">Status: ${task.status}</span>
                    <span class="task-priority-all priority-${priorityClass}">Priority: ${task.priority}</span>
                </div>
            `;
        }
        
        taskContent += '</div>';
        taskItem.innerHTML = taskContent;
        
        const checkbox = taskItem.querySelector('.task-checkbox-all');
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                handleActivityTaskComplete(task.id);
            }
        });
        
        allTasksContainer.appendChild(taskItem);
    });
}

function displayTasksByType(type) {
    const container = document.getElementById('activityTasksContainer');
    const tasks = currentActivityTasks[type] || [];
    
    if (tasks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No tasks found</p>';
        return;
    }
    
    container.innerHTML = '';
    
    tasks.forEach(task => {
        container.appendChild(createActivityTaskElement(task));
    });
}

function createActivityTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.className = 'activity-task-item';
    taskItem.setAttribute('data-task-id', task.id);
    
    const taskDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }) : '';
    
    let taskContent = `
        <input type="checkbox" class="task-checkbox" data-task-id="${task.id}">
        <div class="task-content-activity">
            <div class="task-title-activity">${task.title}</div>
    `;
    
    if (taskDate) {
        taskContent += `<div class="task-date-activity">${taskDate}</div>`;
    }
    
    if (task.assigned_to) {
        taskContent += `
            <div class="task-assignee-activity">
                <i class="fas fa-user"></i>
                <span>${task.assigned_to}</span>
            </div>
        `;
    }
    
    if (task.task_type === 'todo' && task.status && task.priority) {
        const statusClass = task.status.toLowerCase().replace(' ', '-');
        const priorityClass = task.priority.toLowerCase();
        
        taskContent += `
            <div class="task-details-activity">
                <div class="task-status-activity status-${statusClass}">Status: ${task.status}</div>
                <div class="task-priority-activity priority-${priorityClass}">Priority: ${task.priority}</div>
            </div>
        `;
    }
    
    if (task.notes) {
        taskContent += `<div class="task-notes-activity"><i class="fas fa-sticky-note"></i> ${task.notes}</div>`;
    }
    
    taskContent += '</div>';
    taskItem.innerHTML = taskContent;
    
    const checkbox = taskItem.querySelector('.task-checkbox');
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            handleActivityTaskComplete(task.id);
        }
    });
    
    return taskItem;
}

function handleActivityTaskComplete(taskId) {
    if (!confirm('Mark this task as completed?')) {
        const checkbox = document.querySelector(`[data-task-id="${taskId}"] .task-checkbox`);
        if (checkbox) checkbox.checked = false;
        const checkboxAll = document.querySelector(`[data-task-id="${taskId}"] .task-checkbox-all`);
        if (checkboxAll) checkboxAll.checked = false;
        return;
    }

    fetch('api.php?endpoint=complete_task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_id: taskId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadActivities(currentPropertyId);
        } else {
            alert('Error: ' + data.message);
            const checkbox = document.querySelector(`[data-task-id="${taskId}"] .task-checkbox`);
            if (checkbox) checkbox.checked = false;
            const checkboxAll = document.querySelector(`[data-task-id="${taskId}"] .task-checkbox-all`);
            if (checkboxAll) checkboxAll.checked = false;
        }
    })
    .catch(error => {
        console.error('Error completing task:', error);
        alert('An error occurred. Please try again.');
        const checkbox = document.querySelector(`[data-task-id="${taskId}"] .task-checkbox`);
        if (checkbox) checkbox.checked = false;
        const checkboxAll = document.querySelector(`[data-task-id="${taskId}"] .task-checkbox-all`);
        if (checkboxAll) checkboxAll.checked = false;
    });
}

function switchTaskTypeTab(type) {
    currentActiveTaskType = type;
    
    document.querySelectorAll('.task-type-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    displayTasksByType(type);
}

function openActivityTaskModal() {
    document.getElementById('taskPropertyId').value = currentPropertyId;
    document.getElementById('activityTaskModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    toggleActivityTaskFields();
}

function closeActivityTaskModal() {
    document.getElementById('activityTaskModal').classList.remove('show');
    document.body.style.overflow = 'auto';
    document.getElementById('activityTaskForm').reset();
    toggleActivityTaskFields();
}

function toggleActivityTaskFields() {
    const taskType = document.getElementById('activityTaskType').value;
    const statusGroup = document.getElementById('activity-status-group');
    const priorityGroup = document.getElementById('activity-priority-group');
    
    if (taskType === 'todo') {
        if (statusGroup) statusGroup.style.display = 'block';
        if (priorityGroup) priorityGroup.style.display = 'block';
    } else {
        if (statusGroup) statusGroup.style.display = 'none';
        if (priorityGroup) priorityGroup.style.display = 'none';
    }
}

function createActivityTask() {
    const form = document.getElementById('activityTaskForm');
    const formData = new FormData(form);
    
    const createBtn = document.querySelector('#activityTaskForm .btn-create');
    const originalText = createBtn.textContent;
    createBtn.textContent = 'Creating...';
    createBtn.disabled = true;
    
    fetch('api.php?endpoint=add_property_task', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Task created successfully!');
            closeActivityTaskModal();
            loadActivities(currentPropertyId);
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

function loadProperties() {
    const searchTerm = document.getElementById('searchProperties').value;

    let url = '/api.php?endpoint=get_properties';
    if (searchTerm) url += '&search=' + encodeURIComponent(searchTerm);
    
    return fetch(url)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            allProperties = data.properties;
            displayProperties(data.properties);
        } else {
            document.getElementById('propertyTableBody').innerHTML = 
                '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Failed to load properties</td></tr>';
        }
        return data; // Return data for chaining
    })
    .catch(error => {
        console.error('Error loading properties:', error);
        document.getElementById('propertyTableBody').innerHTML = 
            '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Error loading properties</td></tr>';
        throw error; // Re-throw for error handling
    });
}

function displayProperties(properties) {
    const tableBody = document.getElementById('propertyTableBody');
    
    if (properties.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">No properties found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    // Valid statuses list
    const validStatuses = ['New Lead', 'Proposal', 'Follow Up', 'On Progress', 'Negotiation', 'Signing Contract', 'Not Interested', 'Closed Deal'];
    
    properties.forEach(property => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        
        // Get status and validate it
        let statusValue = property.status || 'New Lead';
        
        // If status is not valid (like "Available"), default to "New Lead"
        if (!validStatuses.includes(statusValue)) {
            statusValue = 'New Lead';
        }
        
        const statusClass = 'status-' + statusValue.toLowerCase().replace(/ /g, '-');
        
        // Build address from new fields
        const fullAddress = `${property.street || ''}, ${property.barangay || ''}, ${property.city || 'Tarlac City'}, ${property.province || 'Tarlac'}`;
        
        // Format price safely
        const formattedPrice = property.price ? parseFloat(property.price).toLocaleString() : '0';
        
        row.innerHTML = `
            <td><strong>${property.owner_name || ''}</strong></td>
            <td>${fullAddress}<br>
                <small>₱${formattedPrice}</small></td>
            <td>${property.contact_number || ''}</td>
            <td>${property.email || ''}</td>
            <td>
                <span class="status-badge ${statusClass}">${statusValue}</span>
            </td>
            <td>
                <div class="action-buttons">
                  <button class="btn-action btn-edit" onclick="event.stopPropagation(); editProperty(${property.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="event.stopPropagation(); deleteProperty(${property.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        row.addEventListener('click', function(e) {
            showDetailView(property.id);
        });
        
        tableBody.appendChild(row);
    });
}



function updatePropertyTag(propertyId, newTag) {
    fetch('api.php?endpoint=update_property_tag', {    
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            property_id: propertyId,
            tag: newTag
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update property in local array
            const property = allProperties.find(p => p.id == propertyId);
            if (property) {
                property.status = newTag;
            }
            
            // Update the dropdown class to reflect new status
            const dropdown = document.querySelector('.status-dropdown');
            if (dropdown) {
                dropdown.className = 'status-dropdown';
                const statusClass = 'status-' + newTag.toLowerCase().replace(/ /g, '-');
                dropdown.classList.add(statusClass);
            }
            
            // Refresh the property list to update the table badge
            loadProperties();
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = 'position: fixed; top: 80px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 5px; z-index: 9999; box-shadow: 0 4px 8px rgba(0,0,0,0.2);';
            successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Status updated successfully!';
            document.body.appendChild(successMsg);
            
            setTimeout(() => {
                successMsg.remove();
            }, 3000);
        } else {
            alert('Error: ' + data.message);
            loadProperties();
        }
    })
    .catch(error => {
        console.error('Error updating tag:', error);
        alert('An error occurred. Please try again.');
        loadProperties();
    });
}

function searchProperties() {
    loadProperties();
}

function toggleSortDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    
    const dropdown = document.getElementById('sortDropdown');
    const isCurrentlyShowing = dropdown.classList.contains('show');
    
    if (isCurrentlyShowing) {
        // Close the dropdown
        dropdown.classList.remove('show');
    } else {
        // Open the dropdown
        dropdown.classList.add('show');
        
        // Close dropdown when clicking outside (after a small delay)
        setTimeout(() => {
            function closeDropdown(e) {
                if (!e.target.closest('.dropdown-sort')) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                }
            }
            document.addEventListener('click', closeDropdown);
        }, 10);
    }
}

function sortByTag(tagName) {
    const dropdown = document.getElementById('sortDropdown');
    dropdown.classList.remove('show');
    
    if (tagName === 'all') {
        // Show all properties in original order
        displayProperties(allProperties);
    } else {
        // Filter properties by selected tag
        const filteredProperties = allProperties.filter(property => {
            const status = property.status || 'New Lead';
            return status === tagName;
        });
        displayProperties(filteredProperties);
    }
}

function editProperty(propertyId) {
    console.log('=== EDIT PROPERTY CALLED ===');
    console.log('Property ID received:', propertyId);
    console.log('Property ID type:', typeof propertyId);
    
    const property = allProperties.find(p => p.id == propertyId);
    if (!property) {
        console.error('Property not found with ID:', propertyId);
        return;
    }
    
    console.log('Found property:', property);
    
    // Check if we're currently in detail view
    const detailView = document.getElementById('propertyDetailView');
    const isDetailViewVisible = detailView && detailView.style.display !== 'none';
    
    // Set flag if editing from detail view
    isEditingFromDetailView = isDetailViewVisible;
    console.log('Editing from detail view:', isEditingFromDetailView);
    
    // Hide list view and detail view
    document.getElementById('addPropertyBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'flex';
    document.getElementById('propertyList').style.display = 'none';
    if (detailView) detailView.style.display = 'none';
    document.getElementById('addPropertyForm').style.display = 'block';
    
    // Get the form element
    const form = document.getElementById('propertyForm');
    
    // CRITICAL: Set property ID in BOTH places for maximum reliability
    // 1. Set in hidden input field (this will be sent with FormData automatically)
    const hiddenInput = document.getElementById('property_id_hidden');
    if (hiddenInput) {
        hiddenInput.value = String(propertyId); // Convert to string
        console.log('✓ Set hidden input value:', hiddenInput.value);
    } else {
        console.error('✗ Hidden input field not found!');
    }
    
    // 2. Set as data attribute on form (backup method)
    form.setAttribute('data-property-id', String(propertyId));
    console.log('✓ Set data-property-id on form:', form.getAttribute('data-property-id'));
    
    // Change form title and button text
    document.querySelector('.form-header h2').textContent = 'Edit Property';
    document.querySelector('.btn-save').innerHTML = '<i class="fas fa-save"></i> Update Property';
    
    // Split owner_name into first and last name
    const ownerNameParts = (property.owner_name || '').trim().split(' ');
    const firstName = ownerNameParts[0] || '';
    const lastName = ownerNameParts.slice(1).join(' ') || '';
    
    // Populate form fields with existing property data
    document.getElementById('first_name').value = firstName;
    document.getElementById('last_name').value = lastName;
    document.getElementById('contact_number').value = property.contact_number || '';
    document.getElementById('email').value = property.email || '';
    document.getElementById('description').value = property.description || '';
    document.getElementById('price').value = property.price || '';
    
    // Set barangay FIRST
    if (property.barangay) {
        document.getElementById('barangay').value = property.barangay;
        // Trigger street loading
        loadStreets();
        
        // Set street after a small delay
        setTimeout(() => {
            if (property.street) {
                document.getElementById('street').value = property.street;
                // Trigger property type loading based on street
                loadPropertyTypesByStreet();
                
                // Set property type after a small delay
                setTimeout(() => {
                    if (property.property_type) {
                        document.getElementById('property_type').value = property.property_type;
                        // Trigger class loading based on street and property type
                        loadClassesByStreetAndType();
                        
                        // Set class after a small delay
                        setTimeout(() => {
                            if (property.class) {
                                document.getElementById('property_class').value = property.class;
                            }
                        }, 100);
                    }
                }, 100);
            }
        }, 100);
    }
    
    // Set other location fields
    document.getElementById('city').value = property.city || 'Tarlac City';
    document.getElementById('province').value = property.province || 'Tarlac';
    document.getElementById('bedrooms').value = property.bedrooms || '';
    document.getElementById('bathrooms').value = property.bathrooms || '';
    document.getElementById('floor_area').value = property.floor_area || '';
    document.getElementById('lot_area').value = property.lot_area || '';
    
    // Set the status/tag dropdown
    const statusSelect = document.getElementById('status');
    if (statusSelect && property.status) {
        statusSelect.value = property.status;
        console.log('Set status/tag to:', property.status);
    }
    
    // Double-check the property IDs are still set after 200ms
    setTimeout(() => {
        console.log('=== FINAL CHECK (after 200ms) ===');
        console.log('Hidden input value:', document.getElementById('property_id_hidden')?.value);
        console.log('Data attribute:', form.getAttribute('data-property-id'));
    }, 200);
}

function deleteProperty(propertyId) {
    const property = allProperties.find(p => p.id == propertyId);
    if (!property) return;
    
    if (!confirm(`Are you sure you want to delete this property?`)) {
        return;
    }

    fetch('api.php?endpoint=delete_property', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ property_id: propertyId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Property deleted successfully!');
            loadProperties();
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting property:', error);
        alert('An error occurred. Please try again.');
    });
}

function autoSaveNotes(propertyId, notes) {
    const saveIndicator = document.getElementById(`saveIndicator-${propertyId}`);

    fetch('api.php?endpoint=update_notes.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            property_id: propertyId,
            notes: notes
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const property = allProperties.find(p => p.id == propertyId);
            if (property) {
                property.description = notes;
            }
            
            if (saveIndicator) {
                saveIndicator.style.display = 'flex';
                setTimeout(() => {
                    saveIndicator.style.display = 'none';
                }, 2000);
            }
        }
    })
    .catch(error => {
        console.error('Error saving notes:', error);
    });
}