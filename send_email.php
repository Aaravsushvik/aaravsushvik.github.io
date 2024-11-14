<?php
// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Ensure the script is accessed via a web server with a valid request method
if (isset($_SERVER["REQUEST_METHOD"])) {
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        
        // Validate and sanitize form data
        $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
        $message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        // Check for required fields
        if (!$name || !$email || !$message) {
            header("Location: index.html?status=validation_error");
            exit();
        }

        // Email configuration
        $to = "saisushvik.pnt@gmail.com";
        $subject = "New Message from Website";

        // Construct headers
        $headers = "From: " . htmlspecialchars($email) . "\r\n";
        $headers .= "Reply-To: " . htmlspecialchars($email) . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

        // Construct email message
        $fullMessage = "Name: " . htmlspecialchars($name) . "\n";
        $fullMessage .= "Email: " . htmlspecialchars($email) . "\n\n";
        $fullMessage .= "Message:\n" . htmlspecialchars($message) . "\n";

        // Attempt to send email
        if (mail($to, $subject, $fullMessage, $headers)) {
            header("Location: index.html?status=success");
            exit();
        } else {
            header("Location: index.html?status=error");
            exit();
        }
    } else {
        // Respond with a 405 Method Not Allowed status code
        http_response_code(405);
        echo "405 Method Not Allowed";
        exit();
    }
} else {
    // Respond with a 500 Internal Server Error status code
    http_response_code(500);
    echo "500 Internal Server Error";
    exit();
}