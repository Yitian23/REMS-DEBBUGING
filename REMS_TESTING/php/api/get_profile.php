<?php
session_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated', 'session' => $_SESSION]);
    exit;
}

// Function to capitalize first letter of each word
function capitalizeWords($str) {
    if (empty($str)) return '';
    return ucwords(strtolower($str));
}

try {
    // This file is in /php/api/get_profile.php
    // Database config is in /php/config/database.php
    // So we need to go up one level and into config
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit;
    }
    
    $user_id = $_SESSION['user_id'];
    
    // Get user profile data - including gender and language if they exist in your database
    $query = "SELECT first_name, last_name, email, contact_number, gender, language, user_type, created_at FROM users WHERE id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    $user = $stmt->fetch();
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found', 'user_id' => $user_id]);
        exit;
    }
    
    // Format names with proper capitalization
    $first_name = capitalizeWords($user['first_name']);
    $last_name = capitalizeWords($user['last_name']);
    
    // Format the data for frontend
    $profile_data = [
        'full_name' => $first_name . ' ' . $last_name,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'email' => $user['email'],
        'phone_number' => $user['contact_number'] ?: 'Not provided',
        'gender' => $user['gender'] ?? 'Not specified',
        'language' => $user['language'] ?? 'English - United States',
        'user_type' => $user['user_type'],
        'member_since' => date('F Y', strtotime($user['created_at'])),
        'country' => 'Philippines',
        'timezone' => '(GMT+08:00) Philippine Standard Time'
    ];
    
    echo json_encode([
        'success' => true,
        'profile' => $profile_data
    ]);
    
} catch (PDOException $e) {
    // If columns don't exist, try without them
    if (strpos($e->getMessage(), 'Unknown column') !== false) {
        try {
            $query = "SELECT first_name, last_name, email, contact_number, user_type, created_at FROM users WHERE id = :user_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            $user = $stmt->fetch();
            
            if (!$user) {
                echo json_encode(['success' => false, 'message' => 'User not found']);
                exit;
            }
            
            // Format names with proper capitalization
            $first_name = capitalizeWords($user['first_name']);
            $last_name = capitalizeWords($user['last_name']);
            
            $profile_data = [
                'full_name' => $first_name . ' ' . $last_name,
                'first_name' => $first_name,
                'last_name' => $last_name,
                'email' => $user['email'],
                'phone_number' => $user['contact_number'] ?: 'Not provided',
                'gender' => 'Not specified',
                'language' => 'English - United States',
                'user_type' => $user['user_type'],
                'member_since' => date('F Y', strtotime($user['created_at'])),
                'country' => 'Philippines',
                'timezone' => '(GMT+08:00) Philippine Standard Time'
            ];
            
            echo json_encode([
                'success' => true,
                'profile' => $profile_data,
                'note' => 'Gender and language columns not found in database. Consider adding them.'
            ]);
        } catch (Exception $e2) {
            echo json_encode([
                'success' => false, 
                'message' => 'Database error: ' . $e2->getMessage()
            ]);
        }
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'Error: ' . $e->getMessage(),
        'file' => __FILE__,
        'looking_for_config' => __DIR__ . '/../config/database.php'
    ]);
}
?>