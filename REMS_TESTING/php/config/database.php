
<?php
class Database {
    private $host = 'sql100.infinityfree.com';        // e.g., sql123.infinityfreeapp.com
    private $db_name = 'if0_40364904_real_estate_management';      // e.g., if0_12345678_realestate
    private $username = 'if0_40364904';    // e.g., if0_12345678
    private $password = 'sTAKYiiGn9k';    // Your actual password
    private $port = '3306';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed: " . $exception->getMessage());
        }
        
        return $this->conn;
    }
}
?>