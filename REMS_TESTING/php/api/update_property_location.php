<?php
session_start();
require_once __DIR__ . '/../config/database.php';

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }
    
    $property_id = $data['property_id'] ?? null;
    $latitude = $data['latitude'] ?? null;
    $longitude = $data['longitude'] ?? null;
    
    // Validate input
    if (!$property_id || !is_numeric($property_id)) {
        echo json_encode(['success' => false, 'message' => 'Invalid property ID']);
        exit;
    }
    
    if (!is_numeric($latitude) || !is_numeric($longitude)) {
        echo json_encode(['success' => false, 'message' => 'Invalid coordinates']);
        exit;
    }
    
    // Validate coordinate ranges (Philippines bounds)
    if ($latitude < 4.0 || $latitude > 21.0 || $longitude < 116.0 || $longitude > 127.0) {
        echo json_encode(['success' => false, 'message' => 'Coordinates out of valid range for Philippines']);
        exit;
    }
    
    $agent_id = $_SESSION['user_id'];
    
    // Verify property belongs to this agent
    $check_query = "SELECT id FROM properties WHERE id = :property_id AND agent_id = :agent_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':property_id', $property_id);
    $check_stmt->bindParam(':agent_id', $agent_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() === 0) {
        echo json_encode(['success' => false, 'message' => 'Property not found or access denied']);
        exit;
    }
    
    // Check if latitude and longitude columns exist, if not create them
    try {
        // First, try to check if columns exist
        $column_check = "SHOW COLUMNS FROM properties LIKE 'latitude'";
        $result = $db->query($column_check);
        
        if ($result->rowCount() === 0) {
            // Columns don't exist, add them
            $alter_query = "ALTER TABLE properties 
                           ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER lot_area,
                           ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude";
            $db->exec($alter_query);
            error_log("Added latitude and longitude columns to properties table");
        }
    } catch (PDOException $e) {
        // Columns might already exist, continue
        error_log("Note: " . $e->getMessage());
    }
    
    // Update property location
    $query = "UPDATE properties 
              SET latitude = :latitude, 
                  longitude = :longitude,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = :property_id AND agent_id = :agent_id";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':latitude', $latitude);
    $stmt->bindParam(':longitude', $longitude);
    $stmt->bindParam(':property_id', $property_id);
    $stmt->bindParam(':agent_id', $agent_id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Location updated successfully',
            'latitude' => $latitude,
            'longitude' => $longitude
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update location']);
    }
    
} catch (Exception $e) {
    error_log("Update location error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>
