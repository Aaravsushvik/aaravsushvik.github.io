<?php
// Ensure the script is accessed via a web server with a valid request method
if (isset($_SERVER["REQUEST_METHOD"])) {
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        // Validate and sanitize form data
        $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
        $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
        $message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_STRING);

        if (!$name || !$email || !$message) {
            // Redirect back to the form with an error message if validation fails
            header("Location: index.html?status=validation_error");
            exit();
        }

        // Email configuration
        $to = "saisushvik.pnt@gmail.com";
        $subject = "New Message from Website";
        $headers = "From: " . htmlspecialchars($email) . "\r\n";
        $headers .= "Reply-To: " . htmlspecialchars($email) . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

        // Construct email message
        $fullMessage = "Name: " . htmlspecialchars($name) . "\n";
        $fullMessage .= "Email: " . htmlspecialchars($email) . "\n\n";
        $fullMessage .= "Message:\n" . htmlspecialchars($message) . "\n";

        // Attempt to send email
        if (mail($to, $subject, $fullMessage, $headers)) {
            // Redirect back to the form with a success message
            header("Location: index.html?status=success");
            exit(); // Stop further execution
        } else {
            // Redirect back to the form with an error message
            header("Location: index.html?status=error");
            exit(); // Stop further execution
        }
    } else {
        // Respond with a 405 Method Not Allowed status code
        http_response_code(405);
        echo "405 Method Not Allowed";
        exit(); // Stop further execution
    }
} else {
    // Respond with a 500 Internal Server Error status code if REQUEST_METHOD is not set
    http_response_code(500);
    echo "500 Internal Server Error";
    exit(); // Stop further execution
}
?>