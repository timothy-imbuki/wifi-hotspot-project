// frontend/script.js
function buyPlan(price, plan) {
    let phone = prompt("Enter your phone number (e.g., 0712345678):");

    if (!phone) {
        alert("Phone number is required!");
        return;
    }

    // Basic validation for Kenyan phone numbers (starts with 07 or 01, 10 digits)
    const kenyanPhoneRegex = /^(07|01)\d{8}$/;
    if (!kenyanPhoneRegex.test(phone)) {
        alert("Please enter a valid Kenyan phone number starting with 07 or 01 (10 digits).");
        return;
    }

    // Show loading status
    const statusDiv = document.getElementById("status");
    statusDiv.innerHTML = "⏳ Sending payment request...";
    statusDiv.style.color = "blue";

    // Send request to backend
    fetch("http://localhost:3000/stkpush", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            phone: phone,
            amount: price,
            plan: plan
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        if (data.status === "success") {
            statusDiv.innerHTML = `✅ Payment request sent to ${phone} for ${plan} plan.<br>Check your phone for M-Pesa prompt.`;
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