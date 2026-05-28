async function test() {
    try {
        const res = await fetch("https://chirpedbeo.online/api/mobile/auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: "test@example.com",
                password: "wrong-password"
            })
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data:", data);
    } catch (err) {
        console.error("Error:", err);
    }
}
test();
