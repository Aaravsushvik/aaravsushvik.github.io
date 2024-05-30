<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Retrieve form data
    $name = $_POST["name"];
    $email = $_POST["email"];
    $message = $_POST["message"];

    // Email configuration
    $to = "saisushvik.pnt@gmail.com";
    $subject = "New Message from Website";
    $headers = "From: $email\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    // Construct email message
    $fullMessage = "Name: $name\n";
    $fullMessage .= "Email: $email\n\n";
    $fullMessage .= "Message:\n$message\n";

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
    // Debugging: Check the request method received by the server
    // echo $_SERVER["REQUEST_METHOD"];

    // Respond with a 405 Method Not Allowed status code
    http_response_code(405);
    echo "405 Method Not Allowed";
    exit(); // Stop further execution
}
?>    