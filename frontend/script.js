// frontend/script.js

// Set this to your backend URL (use relative if same origin, else full URL)
const API_BASE_URL = window.location.origin; // Change if backend is on different domain

// Get MAC and IP from URL query parameters (passed by MikroTik)
const urlParams = new URLSearchParams(window.location.search);
const mac = urlParams.get('mac') || 'unknown';
const clientIp = urlParams.get('ip') || 'unknown';

function buyPlan(price, planName) {
    let phone = prompt("Enter your phone number (e.g., 0712345678):");

    if (!phone) {
        alert("Phone number is required!");
        return;
    }

    // Basic validation for Kenyan phone numbers (07xxxxxxxx or 01xxxxxxxx)
    const kenyanPhoneRegex = /^(07|01)\d{8}$/;
    if (!kenyanPhoneRegex.test(phone)) {
        alert("Please enter a valid Kenyan phone number starting with 07 or 01 (10 digits).");
        return;
    }

    const statusDiv = document.getElementById("status");
    statusDiv.innerHTML = '<div class="spinner"></div>⏳ Sending payment request...';
    statusDiv.style.color = "blue";

    fetch(`${API_BASE_URL}/stkpush`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            phone: phone,
            amount: price,
            plan: planName,
            mac: mac,
            ip: clientIp
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        if (data.status === "success") {
            statusDiv.innerHTML = `✅ Payment request sent to ${phone} for ${planName} plan.<br>Check your phone for M-Pesa prompt.`;
            statusDiv.style.color = "green";
            alert("STK Push sent! Please check your phone and enter your PIN.");
        } else {
            statusDiv.innerHTML = `❌ Error: ${data.message}`;
            statusDiv.style.color = "red";
            alert("Failed to send payment request. Please try again.");
        }
    })
    .catch(err => {
        console.error(err);
        statusDiv.innerHTML = "❌ Error sending payment request! Check backend server.";
        statusDiv.style.color = "red";
        alert("Failed to connect to server. Make sure backend is running.");
    });
}