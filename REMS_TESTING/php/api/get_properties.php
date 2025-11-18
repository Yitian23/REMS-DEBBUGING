<?php
session_start();
require_once __DIR__ . '/../config/database.php';

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

header('Content-Type: application/json');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $agent_id = $_SESSION['user_id'];
    
    // Get unique barangays, streets, property_types, and classes from zonal_value table
    $location_query = "SELECT DISTINCT barangay, street, property_type, class 
                       FROM zonal_value 
                       WHERE barangay IS NOT NULL 
                         AND street IS NOT NULL 
                         AND property_type IS NOT NULL 
                         AND class IS NOT NULL
                         AND is_active = 1
                       ORDER BY barangay, street";
    
    $location_stmt = $db->prepare($location_query);
    $location_stmt->execute();
    $locations = $location_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get search and filter parameters
    $search = $_GET['search'] ?? '';
    $status_filter = $_GET['status'] ?? '';
    
    // Build query for properties
    $query = "SELECT * FROM properties WHERE agent_id = :agent_id";
    $params = [':agent_id' => $agent_id];
    
    // Add search filter - including barangay and street
    if (!empty($search)) {
        $query .= " AND (barangay LIKE :search OR street LIKE :search OR owner_name LIKE :search OR email LIKE :search OR city LIKE :search OR property_type LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }
    
    // Add status filter
    if (!empty($status_filter)) {
        $query .= " AND status = :status";
        $params[':status'] = $status_filter;
    }
    
    $query .= " ORDER BY created_at DESC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return BOTH properties AND locations
    echo json_encode([
        'success' => true,
        'properties' => $properties,
        'locations' => $locations
    ]);
    
} catch (Exception $e) {
    error_log("Get properties/locations error: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred',
        'error' => $e->getMessage()
    ]);
}
?>