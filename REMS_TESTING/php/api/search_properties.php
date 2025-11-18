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
    
    $user_id = $_SESSION['user_id'];
    
    // Get search query
    $search_query = $_GET['query'] ?? '';
    
    if (empty($search_query)) {
        echo json_encode(['success' => true, 'properties' => []]);
        exit;
    }
    
    // Search properties by owner name, barangay, street, or email
    $query = "SELECT 
                id,
                owner_name,
                barangay,
                street,
                city,
                province,
                price,
                property_type,
                class,
                bedrooms,
                bathrooms,
                floor_area,
                lot_area,
                contact_number,
                email,
                status,
                description
              FROM properties 
              WHERE agent_id = :user_id 
              AND (
                  owner_name LIKE :search 
                  OR barangay LIKE :search 
                  OR street LIKE :search
                  OR email LIKE :search
                  OR CONCAT(barangay, ', ', city, ', ', province) LIKE :search
                  OR CONCAT(street, ', ', barangay, ', ', city) LIKE :search
              )
              ORDER BY owner_name ASC
              LIMIT 10";
    
    $stmt = $db->prepare($query);
    $search_param = '%' . $search_query . '%';
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':search', $search_param);
    $stmt->execute();
    
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the results for better display
    $formatted_properties = array_map(function($property) {
        // Build full address from street, barangay, city, province
        $address_parts = array_filter([
            $property['street'],
            $property['barangay'],
            $property['city'],
            $property['province']
        ]);
        $full_address = implode(', ', $address_parts);
        
        return [
            'id' => $property['id'],
            'owner_name' => $property['owner_name'],
            'full_address' => $full_address,
            'barangay' => $property['barangay'],
            'street' => $property['street'],
            'city' => $property['city'],
            'province' => $property['province'],
            'price' => $property['price'],
            'property_type' => $property['property_type'],
            'property_class' => $property['class'],
            'bedrooms' => $property['bedrooms'],
            'bathrooms' => $property['bathrooms'],
            'floor_area' => $property['floor_area'],
            'lot_area' => $property['lot_area'],
            'contact_number' => $property['contact_number'],
            'email' => $property['email'],
            'status' => $property['status'],
            'description' => $property['description'],
            'display_text' => $property['owner_name'] . ' - ' . $full_address
        ];
    }, $properties);
    
    echo json_encode([
        'success' => true,
        'properties' => $formatted_properties,
        'count' => count($formatted_properties)
    ]);
    
} catch (Exception $e) {
    error_log("Search properties error: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'An error occurred while searching',
        'error' => $e->getMessage()
    ]);
}
?>