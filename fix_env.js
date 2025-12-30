
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');

try {
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath);

        // Strategy: Filter out all NULL bytes (0x00). 
        // This effectively converts UTF-16 (BE or LE) ASCII text to UTF-8/ASCII.
        const cleanBuffer = Buffer.from(content.filter(b => b !== 0x00));
        const cleanText = cleanBuffer.toString('utf8');

        console.log('--- Fixed Content Preview ---');
        console.log(cleanText);

        fs.writeFileSync(envPath, cleanText, 'utf8');
        console.log('Successfully converted .env to UTF-8.');
    } else {
        console.log('.env file NOT found.');
    }
} catch (err) {
    console.error('Error fixing .env:', err);
}
