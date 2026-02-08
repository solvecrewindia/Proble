
import fs from 'fs';

try {
    const content = fs.readFileSync('old_global.tsx', 'utf16le');
    console.log(content);
} catch (e) {
    console.error(e);
}
