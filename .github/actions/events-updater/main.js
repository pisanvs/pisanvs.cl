const fs = require('fs').promises;
const { readFile, readFileSync, writeFileSync } = require('fs')

fs.readFile('music.html', 'utf-8').then(async (f) => {
    f = `${f.split('<!--EVENTS START-->')[0]}<!--EVENTS START-->\n\t\t\t\t\t\t<!--EVENTS END-->${f.split('<!--EVENTS END-->')[1]}`
    console.log(f);
    await fs.writeFile('./music.html', f).then(() => {
        readFile('./events.json', (e, d) => {
            if (e) {
                console.error(e);
                return;
            }
            let evs;
            JSON.parse(d).forEach(ee => {
                console.log(`Updating ${ee.venue}`);
                let ev = `\n\t\t\t\t\t\t\t<div class="event flex-col"><div class="event-content-wrapper flex-row"><a class="event-text ev-link evl" href="//${ee.link}">${ee.venue}</a><span class="event-text evr">${ee.date} ${ee.time} CLT</span></div><hr class="event-div"></div>\n`;
                evs ? evs += ev : evs = ev;
            });
            let dd = readFileSync('./music.html', 'utf-8');
            let final;
            let fsplit = dd.toString().split("<!--EVENTS START-->");
            final = `${fsplit[0]}<!--EVENTS START-->\n${evs}${fsplit[1]}`;
            writeFileSync('./music.html', final);
        });
    });
})