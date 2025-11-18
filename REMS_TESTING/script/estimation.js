// Global variables
let selectedProperty = null;
let currentEstimationData = null;
let priceChart = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSearchFunction();
});

// Initialize search functionality
function initializeSearchFunction() {
    const searchInput = document.getElementById('propertySearch');
    let searchTimeout = null;
    let currentDropdown = null;
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        // Remove existing dropdown
        if (currentDropdown) {
            currentDropdown.remove();
            currentDropdown = null;
        }
        
        if (query.length < 2) {
            return;
        }
        
        // Show loading state
        currentDropdown = createSearchDropdown([{ type: 'loading' }]);
        searchInput.parentElement.parentElement.appendChild(currentDropdown);
        
        // Debounce search
        searchTimeout = setTimeout(async () => {
            await performSearch(query, currentDropdown);
        }, 300);
    });
    
    // Close dropdown on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-field-wrapper') && currentDropdown) {
            currentDropdown.remove();
            currentDropdown = null;
        }
    });
}

// Perform search
async function performSearch(query, dropdown) {
    try {
        const response = await fetch(`/api.php?endpoint=search_properties&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            updateSearchDropdown(dropdown, data.properties);
        } else {
            updateSearchDropdown(dropdown, [{ type: 'error', message: data.message }]);
        }
    } catch (error) {
        console.error('Search error:', error);
        updateSearchDropdown(dropdown, [{ type: 'error', message: 'Search failed' }]);
    }
}

// Create search dropdown
function createSearchDropdown(items) {
    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.style.display = 'block';
    
    if (items[0]?.type === 'loading') {
        dropdown.innerHTML = '<div class="search-item-loading">Searching...</div>';
    } else if (items[0]?.type === 'error') {
        dropdown.innerHTML = `<div class="search-item-error">${items[0].message}</div>`;
    } else if (items.length === 0) {
        dropdown.innerHTML = '<div class="search-item-empty">No properties found</div>';
    } else {
        dropdown.innerHTML = items.map(property => `
            <div class="search-item" data-property='${JSON.stringify(property)}'>
                <div class="search-item-name">${property.owner_name}</div>
                <div class="search-item-address">${property.full_address || property.barangay}</div>
                ${property.property_type ? `<div class="search-item-type">Type: ${property.property_type} | Class: ${property.property_class || 'N/A'}</div>` : ''}
            </div>
        `).join('');
    }
    
    // Add click handlers for property items
    dropdown.querySelectorAll('.search-item[data-property]').forEach(item => {
        item.addEventListener('click', function() {
            selectProperty(JSON.parse(this.dataset.property));
            dropdown.remove();
        });
    });
    
    return dropdown;
}

// Update search dropdown
function updateSearchDropdown(dropdown, items) {
    const newDropdown = createSearchDropdown(items);
    dropdown.innerHTML = newDropdown.innerHTML;
    
    // Re-add click handlers
    dropdown.querySelectorAll('.search-item[data-property]').forEach(item => {
        item.addEventListener('click', function() {
            selectProperty(JSON.parse(this.dataset.property));
            dropdown.remove();
        });
    });
}

// Select property from search - UPDATED to maintain original design
function selectProperty(property) {
    selectedProperty = property;
    
    // Clear search input
    document.getElementById('propertySearch').value = '';
    
    // Store values in hidden inputs
    document.getElementById('name').value = property.owner_name || '';
    document.getElementById('barangay').value = property.barangay || '';
    document.getElementById('street').value = property.street || '';
    document.getElementById('property-size').value = property.lot_area || '';
    document.getElementById('current-price').value = property.price || '';
    document.getElementById('property-type').value = property.property_type || '';
    document.getElementById('property-class').value = property.property_class || '';
    
    // Update the simple display values (maintaining original design)
    document.getElementById('name-display').textContent = `: ${property.owner_name || '---'}`;
    document.getElementById('barangay-display').textContent = `: ${property.barangay || '---'}`;
    document.getElementById('street-display').textContent = `: ${property.street || '---'}`;
    document.getElementById('size-display').textContent = `: ${property.lot_area || '---'} sqm`;
    document.getElementById('price-display').textContent = `: ₱${parseFloat(property.price || 0).toLocaleString()}`;
}

// Perform estimation
async function performEstimation() {
    // Get values
    const name = document.getElementById('name').value;
    const barangay = document.getElementById('barangay').value;
    const street = document.getElementById('street').value;
    const propertySize = parseFloat(document.getElementById('property-size').value);
    const propertyType = document.getElementById('property-type').value;
    const propertyClass = document.getElementById('property-class').value;
    
    // Validation
    if (!propertySize || propertySize <= 0) {
        alert('Please select a property or enter valid property size');
        return;
    }
    
    if (!propertyType || !propertyClass) {
        alert('Property type and class are required for zonal value estimation. Please select a property with complete information.');
        return;
    }
    
    // Show loading state
    const estimateBtn = document.querySelector('.btn-estimate');
    const originalText = estimateBtn.textContent;
    estimateBtn.textContent = 'Calculating...';
    estimateBtn.disabled = true;
    
    try {
        // Call the zonal value estimation endpoint
        const response = await fetch(`/api.php?endpoint=calculate_estimation_zonal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                barangay: barangay,
                street: street,
                property_size: propertySize,
                property_type: propertyType,
                property_class: propertyClass
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentEstimationData = data;
            displayResults(data);
        } else {
            alert(`Estimation failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Estimation error:', error);
        alert('An error occurred while performing the estimation. Please check your connection and try again.');
    } finally {
        estimateBtn.textContent = originalText;
        estimateBtn.disabled = false;
    }
}

// Display estimation results
function displayResults(data) {
    // Show results section
    document.getElementById('form-page').classList.add('hidden');
    document.getElementById('results-section').classList.add('active');
    
    // Update metrics
    const est = data.estimation;
    document.getElementById('current-price-display').textContent = `₱${est.current_price.toLocaleString()}`;
    document.getElementById('estimated-price-display').textContent = `₱${est.estimated_price.toLocaleString()}`;
    
    // Display price projection with percentage
    const profitSign = est.profit_projection >= 0 ? '+' : '';
    const percentageSign = est.percentage_growth >= 0 ? '+' : '';
    document.getElementById('profit-projection-display').textContent = `₱${est.profit_projection.toLocaleString()} (${percentageSign}${est.percentage_growth.toFixed(2)}%)`;
    
    // Update property info
    document.getElementById('info-name').textContent = `: ${data.property_info.name}`;
    document.getElementById('info-address').textContent = `: ${data.property_info.address || 'N/A'}`;
    document.getElementById('info-size').textContent = `: ${data.property_info.size} sqm`;
    document.getElementById('current-price-sqm').textContent = `: ₱${est.current_price_per_sqm.toLocaleString()}`;
    document.getElementById('price-2026').textContent = `: ₱${est.predicted_2026_price_per_sqm.toLocaleString()}`;
    
    // Update historical price per sqm display using zonal values
    if (data.price_per_sqm_history) {
        document.getElementById('price-2025').textContent = `: ₱${Math.round(data.price_per_sqm_history['2025'] || 0).toLocaleString()}`;
        document.getElementById('price-2024').textContent = `: ₱${Math.round(data.price_per_sqm_history['2024'] || 0).toLocaleString()}`;
        document.getElementById('price-2023').textContent = `: ₱${Math.round(data.price_per_sqm_history['2023'] || 0).toLocaleString()}`;
        document.getElementById('price-2022').textContent = `: ₱${Math.round(data.price_per_sqm_history['2022'] || 0).toLocaleString()}`;
        document.getElementById('price-2021').textContent = `: ₱${Math.round(data.price_per_sqm_history['2021'] || 0).toLocaleString()}`;
        document.getElementById('price-2020').textContent = `: ₱${Math.round(data.price_per_sqm_history['2020'] || 0).toLocaleString()}`;
    }
    
    // Draw chart with correct data
    drawPriceChart(data);
    
    // Scroll to results
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Draw price chart using Chart.js
function drawPriceChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (priceChart) {
        priceChart.destroy();
    }
    
    // Prepare chart data from the calculated total prices
    const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
    const prices = [];
    
    // Use calculated total prices (property_size × price_per_sqm)
    if (data.calculated_total_prices) {
        years.slice(0, 6).forEach(year => {
            prices.push(data.calculated_total_prices[year] || 0);
        });
    } else if (data.chart_data) {
        // Fallback to chart_data if available
        data.chart_data.forEach(item => {
            if (item.year <= 2025) {
                const totalPrice = item.price_per_sqm * data.property_info.size;
                prices.push(totalPrice);
            }
        });
    }
    
    // Add the predicted 2026 price
    prices.push(data.estimation.estimated_price);
    
    // Create gradient for the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 51, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 29, 158, 0.8)');
    
    // Create the chart
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Total Property Price',
                data: prices,
                borderColor: '#0033ff',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: function(context) {
                    return context.dataIndex === 6 ? '#ff4444' : '#0033ff';
                },
                pointBorderColor: function(context) {
                    return context.dataIndex === 6 ? '#ff4444' : '#001d9e';
                },
                pointRadius: function(context) {
                    return context.dataIndex === 6 ? 8 : 6;
                },
                pointHoverRadius: function(context) {
                    return context.dataIndex === 6 ? 10 : 8;
                },
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#333',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = '₱' + context.parsed.y.toLocaleString();
                            const year = context.label;
                            
                            if (year === '2026') {
                                return `${label} (Predicted): ${value}`;
                            }
                            return `${label}: ${value}`;
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#0033ff',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: false, // Hide x-axis since we have year labels below
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '₱' + (value / 1000000).toFixed(1) + 'M';
                        },
                        color: '#666',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Clear form
function clearForm() {
    // Clear inputs
    document.getElementById('name').value = '';
    document.getElementById('barangay').value = '';
    document.getElementById('street').value = '';
    document.getElementById('property-size').value = '';
    document.getElementById('current-price').value = '';
    document.getElementById('property-type').value = '';
    document.getElementById('property-class').value = '';
    
    // Clear display
    document.getElementById('name-display').textContent = ': ---';
    document.getElementById('barangay-display').textContent = ': ---';
    document.getElementById('street-display').textContent = ': ---';
    document.getElementById('size-display').textContent = ': ---';
    document.getElementById('price-display').textContent = ': ---';
    
    // Clear search
    document.getElementById('propertySearch').value = '';
    
    // Clear selected property
    selectedProperty = null;
    currentEstimationData = null;
}

// Clear results
function clearResults() {
    document.getElementById('results-section').classList.remove('active');
    document.getElementById('form-page').classList.remove('hidden');
    clearForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Download estimation report
function downloadReport() {
    if (!currentEstimationData) {
        alert('No estimation data available');
        return;
    }
    
    const data = currentEstimationData;
    const est = data.estimation;
    const reg = data.regression;
    const zonal = data.zonal_value_info;
    const quality = data.data_quality;
    
    const report = `
PRICE ESTIMATION REPORT (BIR - ZONAL VALUE)
========================================================
Generated: ${new Date().toLocaleDateString()}
Analysis Method: Linear Regression

PROPERTY INFORMATION:
--------------------
Owner Name: ${data.property_info.name}
Property Address: ${data.property_info.address}
Barangay: ${data.property_info.barangay}
Street: ${data.property_info.street}
Property Type: ${data.property_info.type}
Property Class: ${data.property_info.class}
Property Size: ${est.property_size} sqm

PRICE ESTIMATION AND PROFIT PROJECTION:
--------------
Estimated Price (2026): ₱${est.estimated_price.toLocaleString()}
Current Market Price (2025): ₱${est.current_price.toLocaleString()}
Projected Profit: ₱${est.profit_projection.toLocaleString()}
Expected Growth: ${est.percentage_growth.toFixed(2)}%

ZONAL VALUE DATA SOURCE:
-----------------------
Data Source: ${'BIR Zonal Value'}
Data Provider: ${'JMDM Realty'}
Similarity Score: ${zonal?.best_match?.similarity_score || 0}%
Historical Zonal Values and Prices (Price per SQM and Value):
2025 Price per sqm: ₱${data.price_per_sqm_history?.['2025'] ? Math.round(data.price_per_sqm_history['2025']).toLocaleString() : 'N/A'} ----->  2025 Value: ₱${data.calculated_total_prices?.['2025'] ? data.calculated_total_prices['2025'].toLocaleString() : 'N/A'}
2024 Price per sqm: ₱${data.price_per_sqm_history?.['2024'] ? Math.round(data.price_per_sqm_history['2024']).toLocaleString() : 'N/A'} ----->  2024 Value: ₱${data.calculated_total_prices?.['2024'] ? data.calculated_total_prices['2024'].toLocaleString() : 'N/A'}
2023 Price per sqm: ₱${data.price_per_sqm_history?.['2023'] ? Math.round(data.price_per_sqm_history['2023']).toLocaleString() : 'N/A'} ----->  2023 Value: ₱${data.calculated_total_prices?.['2023'] ? data.calculated_total_prices['2023'].toLocaleString() : 'N/A'}
2022 Price per sqm: ₱${data.price_per_sqm_history?.['2022'] ? Math.round(data.price_per_sqm_history['2022']).toLocaleString() : 'N/A'} ----->  2022 Value: ₱${data.calculated_total_prices?.['2022'] ? data.calculated_total_prices['2022'].toLocaleString() : 'N/A'}
2021 Price per sqm: ₱${data.price_per_sqm_history?.['2021'] ? Math.round(data.price_per_sqm_history['2021']).toLocaleString() : 'N/A'} ----->  2021 Value: ₱${data.calculated_total_prices?.['2021'] ? data.calculated_total_prices['2021'].toLocaleString() : 'N/A'}
2020 Price per sqm: ₱${data.price_per_sqm_history?.['2020'] ? Math.round(data.price_per_sqm_history['2020']).toLocaleString() : 'N/A'} ----->  2020 Value: ₱${data.calculated_total_prices?.['2020'] ? data.calculated_total_prices['2020'].toLocaleString() : 'N/A'}

MODEL STATISTICS:
----------------
Model Type: ${reg.model_type}
Confidence Score: ${est.confidence_score}%
R-Squared Value: ${reg.r_squared}

DISCLAIMER:
-----------
This Price Estimation and Profit Projection is for reference purposes only and is based on Zonal Values
Actual property values may vary due to economic factors, location, property condition, and market dynamics.
This is for Capstone Study purposes only and the system can be improve by the future researchers.

Regards,
Real Estate Management Team
    `;
    
    // Create downloadable file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Zonal_Value_Estimation_${data.property_info.name.replace(/\s+/g, '_')}_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Zonal value estimation report downloaded successfully!');
}