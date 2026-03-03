const fs = require('fs');

try {
    const content = fs.readFileSync('tmp_detailed.txt', 'utf8');
    console.log(content);
} catch (e) {
    console.log('Error reading as utf8');
}
