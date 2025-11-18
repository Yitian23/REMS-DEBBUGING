// Report Page JavaScript
let allReportData = {};

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    
    loadReportData();
});

// Load report data from server
function loadReportData() {
    fetch('/api.php?endpoint=get_report')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            allReportData = data;
            displayReportData(data);
        } else {
            console.error('Failed to load report data:', data.message);
        }
    })
    .catch(error => {
        console.error('Error loading report data:', error);
    });
}

// Display report data in columns - ONLY 4 COLUMNS
function displayReportData(data) {
    const categories = [
        { key: 'Proposal', id: 'proposal' },
        { key: 'Negotiation', id: 'negotiation' },
        { key: 'Signing Contract', id: 'signing-contract' },
        { key: 'Closed Deal', id: 'closed-deal' }
    ];
    
    categories.forEach(category => {
        const properties = data.properties[category.key] || [];
        displayCategoryColumn(category.id, category.key, properties, data.counts[category.key] || 0);
    });
}

// Display cards for specific category
function displayCategoryColumn(categoryId, categoryName, properties, count) {
    const column = document.getElementById(`column-${categoryId}`);
    const badge = document.getElementById(`badge-${categoryId}`);
    
    // Update count badge
    badge.textContent = count;
    
    // Clear existing cards
    column.innerHTML = '';
    
    if (properties.length === 0) {
        return; // Just show empty column
    }
    
    // Add card for each property
    properties.forEach(property => {
        const card = createPropertyCard(property, categoryName);
        column.appendChild(card);
    });
}

// Create property card element
function createPropertyCard(property, status) {
    const card = document.createElement('div');
    card.className = 'report-item';
    
    // Construct full address from separate fields
    const addressParts = [];
    if (property.street) addressParts.push(property.street);
    if (property.barangay) addressParts.push(property.barangay);
    if (property.city) addressParts.push(property.city);
    if (property.province) addressParts.push(property.province);
    const fullAddress = addressParts.join(', ') || 'N/A';
    
    const formattedPrice = property.price ? '₱' + parseFloat(property.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A';
    const dateAdded = property.created_at ? formatDate(property.created_at) : '';
    
    card.innerHTML = `
        <div class="client-name">${property.owner_name || 'N/A'}</div>
        <div class="report-type">${status}</div>
        <div class="client-address">${fullAddress}</div>
        <div class="price">${formattedPrice}</div>
        ${dateAdded ? `<div class="report-date">${dateAdded}</div>` : ''}
    `;
    
    return card;
}

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Download report as CSV - Only 4 categories
function downloadReport() {
    if (!allReportData || !allReportData.properties) {
        alert('No data available to download');
        return;
    }
    
    // Create CSV content
    let csvContent = "REAL ESTATE LEADS REPORT\n";
    csvContent += `Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Total Leads in Report: ${(allReportData.counts['Proposal'] || 0) + (allReportData.counts['Negotiation'] || 0) + (allReportData.counts['Signing Contract'] || 0) + (allReportData.counts['Closed Deal'] || 0)}\n\n`;
    
    // Only 4 categories for report
    const categories = ['Proposal', 'Negotiation', 'Signing Contract', 'Closed Deal'];
    
    categories.forEach(category => {
        const properties = allReportData.properties[category] || [];
        
        if (properties.length > 0) {
            csvContent += `\n${category.toUpperCase()} (${properties.length})\n`;
            csvContent += "Owner Name,Status,Property Address,Contact Number,Price,Date Added\n";
            
            properties.forEach(property => {
                // Construct full address from separate fields
                const addressParts = [];
                if (property.street) addressParts.push(property.street);
                if (property.barangay) addressParts.push(property.barangay);
                if (property.city) addressParts.push(property.city);
                if (property.province) addressParts.push(property.province);
                const fullAddress = addressParts.join(', ') || 'N/A';
                
                const price = property.price ? parseFloat(property.price).toFixed(2) : '0.00';
                const dateAdded = property.created_at ? formatDate(property.created_at) : 'N/A';
                
                csvContent += `"${property.owner_name}","${category}","${fullAddress}","${property.contact_number}","${price}","${dateAdded}"\n`;
            });
        }
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Leads_Report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Report downloaded successfully!');
}