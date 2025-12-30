
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');

try {
    if (fs.existsSync(envPath)) {
        const stats = fs.statSync(envPath);
        console.log(`File exists. Size: ${stats.size} bytes.`);

        if (stats.size > 0) {
            const content = fs.readFileSync(envPath);
            console.log('--- Content Start ---');
            console.log(content.toString('utf8'));
            console.log('--- Content End ---');

            console.log('--- Hex Dump (First 50 bytes) ---');
            console.log(content.subarray(0, 50).toString('hex'));
        } else {
            console.log('File is empty.');
        }
    } else {
        console.log('.env file NOT found.');
    }
} catch (err) {
    console.error('Error reading .env:', err);
}
