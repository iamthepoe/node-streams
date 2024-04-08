import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { TransformStream } from 'node:stream/web';
import csvtojson from 'csvtojson';
import { parse } from 'node:url';

const PORT = 3000;
let reqCount = 1;

createServer(async (req, res) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
    }

    const { query } = parse(req.url, true);
    const platform = query.platform;
    const abortController = new AbortController();
    let items = 0;

    req.once('close', _ => {
        console.timeEnd(`Processing time`);
        console.log(`Request #${reqCount} - Items: ${items}\n-------------`);
        reqCount++;
        abortController.abort();
    });

    try {
        console.time(`Processing time`);
        await Readable.toWeb(createReadStream('./all_games.csv'))
            .pipeThrough(Transform.toWeb(csvtojson()))
            .pipeThrough(new TransformStream({
                transform(chunk, controller) {
                    const data = JSON.parse(Buffer.from(chunk).toString());
                    if (platform && data.platform !== platform) return;
                    controller.enqueue(
                        JSON.stringify({
                            name: data.name,
                            platform: !!platform ? undefined : data.platform,
                            release_date: data.release_date,
                            score: data.meta_score,
                            description: data.summary
                        }).concat('\n')
                    );
                }
            }))
            .pipeTo(new WritableStream({
                write(chunk) {
                    items++;
                    res.write(chunk);
                },
                close() {
                    res.end();
                }
            }), { signal: abortController.signal });
    } catch(e) {
        if(!e.message.includes('aborted')) {
            res.writeHead(500, headers);
            res.end(e.message);
        }
    }
}).listen(PORT).on('listening', _ => console.log(`Server is running on http://localhost:${PORT}`));
