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
    
    $agent_id = $_SESSION['user_id'];
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    $property_id = $input['property_id'] ?? null;
    
    if (!$property_id) {
        echo json_encode(['success' => false, 'message' => 'Property ID is required']);
        exit;
    }
    
    // Check if property belongs to current agent
    $check_query = "SELECT id FROM properties WHERE id = :property_id AND agent_id = :agent_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':property_id', $property_id);
    $check_stmt->bindParam(':agent_id', $agent_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() === 0) {
        echo json_encode(['success' => false, 'message' => 'Property not found or access denied']);
        exit;
    }
    
    // Delete property
    $delete_query = "DELETE FROM properties WHERE id = :property_id AND agent_id = :agent_id";
    $delete_stmt = $db->prepare($delete_query);
    $delete_stmt->bindParam(':property_id', $property_id);
    $delete_stmt->bindParam(':agent_id', $agent_id);
    
    if ($delete_stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Property deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete property']);
    }
    
} catch (Exception $e) {
    error_log("Delete property error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred']);
}
?>