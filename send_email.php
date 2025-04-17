<?php
// Configuration constants
define("ADMIN_EMAIL", "saisushvik.pnt@gmail.com");
define("REDIRECT_URL", "index.html");

// Enable error reporting for development (comment out in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Ensure the script is accessed via a valid request method
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    session_start();

    // CSRF token validation
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        http_response_code(403); // Forbidden
        echo "Invalid CSRF token.";
        exit();
    }

    // Validate and sanitize form data
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
    $message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

    // Check for required fields
    if (!$name || !$email || !$message) {
        header("Location: " . REDIRECT_URL . "?status=validation_error");
        exit();
    }

    // Email configuration
    $subject = "New Message from Website";

    // Construct headers securely
    $headers = [
        "From: " . htmlspecialchars($email),
        "Reply-To: " . htmlspecialchars($email),
        "Content-Type: text/plain; charset=UTF-8"
    ];

    // Construct email message securely
    $fullMessage = "Name: " . htmlspecialchars($name) . "\n";
    $fullMessage .= "Email: " . htmlspecialchars($email) . "\n\n";
    $fullMessage .= "Message:\n" . htmlspecialchars($message) . "\n";

    // Attempt to send email
    if (mail(ADMIN_EMAIL, $subject, $fullMessage, implode("\r\n", $headers))) {
        header("Location: " . REDIRECT_URL . "?status=success");
        exit();
    } else {
        header("Location: " . REDIRECT_URL . "?status=error");
        exit();
    }
} else {
    // Respond with a 405 Method Not Allowed status code
    http_response_code(405);
    echo "405 Method Not Allowed";
    exit();
}

// CSRF token generation (call this in your form)
function generateCsrfToken()
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}
?>