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

// Function to capitalize first letter of each word
function capitalizeWords($str) {
    if (empty($str)) return '';
    return ucwords(strtolower($str));
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $user_id = $_SESSION['user_id'];
    
    // Get form data
    $first_name = capitalizeWords(trim($_POST['first_name'] ?? ''));
    $last_name = capitalizeWords(trim($_POST['last_name'] ?? ''));
    $email = trim($_POST['email'] ?? '');
    $contact_number = trim($_POST['contact_number'] ?? '');
    $gender = trim($_POST['gender'] ?? 'Not specified');
    $language = trim($_POST['language'] ?? 'English - United States');
    
    // Validate input
    $errors = [];
    if (empty($first_name)) $errors[] = 'First name is required';
    if (empty($last_name)) $errors[] = 'Last name is required';
    if (empty($email)) $errors[] = 'Email is required';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Invalid email format';
    
    if (!empty($errors)) {
        echo json_encode(['success' => false, 'message' => implode(', ', $errors)]);
        exit;
    }
    
    // Check if email is already taken by another user
    $check_query = "SELECT id FROM users WHERE email = :email AND id != :user_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':email', $email);
    $check_stmt->bindParam(':user_id', $user_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'Email is already in use by another account']);
        exit;
    }
    
    // First, check if the new columns exist in the database
    $table_check = "SHOW COLUMNS FROM users";
    $table_stmt = $db->prepare($table_check);
    $table_stmt->execute();
    $columns = $table_stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $has_gender = in_array('gender', $columns);
    $has_language = in_array('language', $columns);
    
    // If columns don't exist, add them
    if (!$has_gender) {
        try {
            $alter_query = "ALTER TABLE users ADD COLUMN gender VARCHAR(20) DEFAULT 'Not specified'";
            $db->exec($alter_query);
            $has_gender = true;
        } catch (Exception $e) {
            error_log("Could not add gender column: " . $e->getMessage());
        }
    }
    
    if (!$has_language) {
        try {
            $alter_query = "ALTER TABLE users ADD COLUMN language VARCHAR(50) DEFAULT 'English - United States'";
            $db->exec($alter_query);
            $has_language = true;
        } catch (Exception $e) {
            error_log("Could not add language column: " . $e->getMessage());
        }
    }
    
    // Build update query based on available columns
    $update_fields = [
        'first_name = :first_name',
        'last_name = :last_name',
        'email = :email',
        'contact_number = :contact_number'
    ];
    
    if ($has_gender) {
        $update_fields[] = 'gender = :gender';
    }
    if ($has_language) {
        $update_fields[] = 'language = :language';
    }
    
    $update_fields[] = 'updated_at = CURRENT_TIMESTAMP';
    
    $update_query = "UPDATE users SET " . implode(', ', $update_fields) . " WHERE id = :user_id";
    
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':first_name', $first_name);
    $update_stmt->bindParam(':last_name', $last_name);
    $update_stmt->bindParam(':email', $email);
    $update_stmt->bindParam(':contact_number', $contact_number);
    $update_stmt->bindParam(':user_id', $user_id);
    
    if ($has_gender) {
        $update_stmt->bindParam(':gender', $gender);
    }
    if ($has_language) {
        $update_stmt->bindParam(':language', $language);
    }
    
    if ($update_stmt->execute()) {
        // Update session data
        $_SESSION['user_email'] = $email;
        $_SESSION['user_name'] = $first_name . ' ' . $last_name;
        
        $message = 'Profile updated successfully!';
        if (!$has_gender || !$has_language) {
            $missing = [];
            if (!$has_gender) $missing[] = 'gender';
            if (!$has_language) $missing[] = 'language';
            $message .= ' Note: Some fields (' . implode(', ', $missing) . ') could not be saved due to database structure.';
        }
        
        echo json_encode([
            'success' => true,
            'message' => $message
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
    }
    
} catch (Exception $e) {
    error_log("Update profile error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>