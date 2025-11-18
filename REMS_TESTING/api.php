<?php
// API Router for InfinityFree/Railway Deployment
// This file routes API requests to the appropriate backend PHP files

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the requested endpoint from GET or POST parameters
$endpoint = $_GET['endpoint'] ?? $_POST['endpoint'] ?? '';

// Define routes mapping to PHP files
$routes = [
    // Authentication
    'login' => 'php/login.php',
    'register' => 'php/register.php',
    'logout' => 'php/logout.php',
    'check_session' => 'php/check_session.php',
    'verify_session' => 'php/api/verify_session.php',
    
    // User Profile
    'get_profile' => 'php/api/get_profile.php',
    'update_profile' => 'php/api/update_profile.php',
    'update_password' => 'php/api/update_password.php',
    'get_user_settings' => 'php/api/get_user_settings.php',
    'update_settings' => 'php/api/update_settings.php',
    
    // Properties
    'get_properties' => 'php/api/get_properties.php',
    'get_locations' => 'php/api/get_properties.php', // Alias
    'add_property' => 'php/api/add_property.php',
    'update_property' => 'php/api/update_property.php',
    'update_property_location' => 'php/api/update_property_location.php', // Map coordinates
    'delete_property' => 'php/api/delete_property.php',
    'search_properties' => 'php/api/search_properties.php',
    
    // Tasks
    'get_tasks' => 'php/api/get_tasks.php',
    'add_task' => 'php/api/add_task.php',
    'update_task' => 'php/api/update_task.php',
    'complete_task' => 'php/api/complete_task.php',
    'add_property_task' => 'php/api/add_property_task.php',
    'get_property_tasks' => 'php/api/get_property_tasks.php',
    'update_property_tag' => 'php/api/update_property_tag.php',
    'update_notes' => 'php/api/update_notes.php',
    
    // Dashboard & Reports
    'dashboard_data' => 'php/api/dashboard_data.php',
    'get_report' => 'php/api/get_report.php',
    
    // Estimation & Zonal Values
    'calculate_estimation_zonal' => 'php/api/calculate_estimation_zonal.php',
    'get_zonal_value' => 'php/api/get_zonal_value.php',
];

// Check if endpoint exists
if (empty($endpoint)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'No endpoint specified',
        'usage' => 'Use ?endpoint=<endpoint_name>'
    ]);
    exit;
}

if (!isset($routes[$endpoint])) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid endpoint',
        'requested' => $endpoint,
        'available_endpoints' => array_keys($routes)
    ]);
    exit;
}

// Get the file path
$file = $routes[$endpoint];

// Check if file exists
if (!file_exists($file)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'API file not found',
        'endpoint' => $endpoint,
        'expected_path' => $file
    ]);
    error_log("API Router: File not found - $file");
    exit;
}

// Include and execute the requested PHP file
try {
    require_once $file;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
    error_log("API Router Error: " . $e->getMessage());
}
?>