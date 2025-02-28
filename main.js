const axios = require('axios');
const fs = require('fs');
const userAgent = require('user-agents');

const API_BASE_URL = "https://app-api.jp.stork-oracle.network/v1";

// Baca token dari file token.txt
const tokens = fs.readFileSync('token.txt', 'utf-8')
    .trim()
    .split('\n')
    .map(token => token.trim());

// Fungsi untuk membuat header dengan User-Agent random
function generateHeaders(authToken) {
    return {
        "Authorization": `Bearer ${authToken.replace("Bearer ", "").trim()}`,
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "User-Agent": new userAgent().toString(),
        "Content-Type": "application/json"
    };
}

// Fungsi untuk mendapatkan informasi akun
async function fetchMe(authToken) {
    try {
        const response = await axios.get(`${API_BASE_URL}/me`, {
            headers: generateHeaders(authToken)
        });

        const email = response.data.data.email || "Unknown Email";
        const validCount = response.data.data.stats?.stork_signed_prices_valid_count || 0;

        return { email, validCount };
    } catch (error) {
        console.error("❌ Error fetching user info:", error.response?.data || error.message);
        return { email: "Unknown Email", validCount: 0 };
    }
}


// Fungsi untuk mengambil harga terbaru dari API Stork Oracle
async function fetchPrices(authToken) {
    try {
        const response = await axios.get(`${API_BASE_URL}/stork_signed_prices`, {
            headers: generateHeaders(authToken)
        });

        const data = response.data.data;
        const firstAssetKey = Object.keys(data)[0];
        const msgHash = data[firstAssetKey]?.timestamped_signature?.msg_hash;

        return msgHash;
    } catch (error) {
        console.error("❌ Error fetching prices:", error.response?.data || error.message);
        return null;
    }
}

// Fungsi untuk memvalidasi harga
async function validatePrice(authToken, msgHash) {
    try {
        await axios.post(`${API_BASE_URL}/stork_signed_prices/validations`, 
            { msg_hash: msgHash, valid: true },
            { headers: generateHeaders(authToken) }
        );

        console.log("✅ Validate success");
    } catch (error) {
        console.error("❌ Error validating data:", error.response?.data || error.message);
    }
}

// Fungsi utama untuk satu akun
async function runAccount(authToken, index) {
    console.log(`\n---- Accounts Ke-${index + 1} ------`);

    const { email, validCount } = await fetchMe(authToken);
    console.log(`📧 ${email}`);
    console.log("⏳ Mengambil data sign...");
    const msgHash = await fetchPrices(authToken);

    if (msgHash) {
        console.log(`🔹 Validating`);
        await validatePrice(authToken, msgHash);
    }

    console.log(`✅ Verified messages: ${validCount}`);
    console.log(`---- End of Account ${index + 1} ------`);
}




// Loop utama menjalankan akun satu per satu
async function main() {
    while (true) {
        for (let i = 0; i < tokens.length; i++) {
            await runAccount(tokens[i], i);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Jeda antar akun 3 detik
        }
    }
}

// Jalankan program
main();
