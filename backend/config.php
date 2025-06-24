<?php
$host = "localhost";
$user = "root";
$password = ""; // or your actual password if set
$database = "pension_db";

$conn = new mysqli($host, $user, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
