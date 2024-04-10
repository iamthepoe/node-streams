import { createServer } from 'node:http';
import { Readable } from 'node:stream';

const PORT = 3000;

const clearScreenText = '\u001b[2J\u001b[0;0H';
const frames = ['🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔'];

createServer(async (req, res)=>{
    const stream = new Readable();
    stream.pipe(res);
    stream._read = ()=>{};

    req.once('close', _=>stream.destroy());

    setInterval(()=>{
        stream.push(clearScreenText);
        stream.push(frames.join(' '));
        stream.push('\n');
        frames.push(frames.shift());
    }, 90);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    
}).listen(PORT).on('listening', ()=>console.log(`Server is running on port ${PORT}`));