const axios = require('axios');

async function testEndpoints() {
    try {
        console.log("Testing /api/master-data/companies...");
        const compRes = await axios.get('http://localhost:3000/api/master-data/companies');
        console.log(`Success! Found ${compRes.data.length} companies.`);

        console.log("Testing /api/master-data/personnel...");
        const persRes = await axios.get('http://localhost:3000/api/master-data/personnel');
        console.log(`Success! Found ${persRes.data.length} personnel.`);

    } catch (e) {
        console.error("Test failed:", e.message);
        if (e.response) {
            console.error("Response data:", e.response.data);
        }
    }
}

testEndpoints();
