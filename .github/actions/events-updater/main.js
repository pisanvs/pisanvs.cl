import { readFile, writeFile } from 'fs';

readFile('./music.html', (e, d) => {
    if (e) {
        console.error(e);
        return;
    }
    let ssplit = d.toString().split("<!--EVENTS START-->");
    let esplit = ssplit[1].split("<!--EVENTS END-->");
    let final = ssplit[0] + "<!--EVENTS START-->\n\n<!--EVENTS END-->" + esplit[1];
    writeFile('./music.html', final, (e) => {
        if (e) {
            console.error(e);
            return;
        }
        console.log("Updated events");
    });
});


readFile('./events.json', (e, d) => {
    if (e) {
        console.error(e);
        return;
    }
    const events = JSON.parse(d);
    events.forEach(e => {
        console.log(`Updating ${e.name}`);
        readFile('./music.html', (ee, d) => {
            if (ee) {
                console.error(ee);
                return;
            }

            let ev = `<div class="event">
            <div class="event-content-wrapper">
                <span class="event-text">${e.venue}</span><span class="ev-filler"></span>
                <span class="event-text">${e.date} ${e.time} CLT</span>
            </div>
            <hr class="event-div">
        </div>
        `

            let final;
            let fsplit = d.toString().split("<!--EVENTS START-->")
            final = fsplit[0] + ev + fsplit[1];
            writeFile('./music.html', final);
        });
    });
})