// Construct the meta template for an enemy's stat block from the game data
const metaTemplate = `
{{=<% %>=}}

<div class="upper">
    <div class="upper-left">
        <h2 class="name" contenteditable>{{name}}</h1>
        <ul class="statblock">
            <%#stats%>
                <li><label for="<%lc%>{{id}}"><%uc%></label><input id="<%lc%>{{id}}" name="<%lc%>" type="number" value="{{stats.<%lc%>}}"/></li>
            <%/stats%>
            <li>
                <label for="damageType">Damage as</label>
                <select class="damageType">
                    <%#damageTypes%>
                        <option value="<%.%>"><%.%></option>
                    <%/damageTypes%>
                </select>
            </li>
        </ul>
    </div>
    <table class="mien">
        <thead>
            <th colspan="2" class="upper-bolded">Mien</th>
        </thead>
        </tbody>
        {{#mien}}
            <tr>
                <td class="roll">{{roll}}</td>
                <td class="mood" contenteditable>{{mood}}</td>
            </tr>
        {{/mien}}
        </tbody>
    </table>
</div>
<p class="flavour" contenteditable="true">{{{flavour}}}</p>
{{#img}}<img src="{{img.src}}" alt="{{img.alt}}"/>{{/img}}
`

const template = Mustache.render(metaTemplate, {
    "damageTypes": gameData.damageTypes,
    "stats": gameData.statNames.map(stat => {
        return {lc: stat.toLowerCase(), uc: stat}
      }),
    "uc": function() {
        return this.toLowerCase()
    }
});

const def = {
    name: "Name",
    flavour: "Description",
    stats: {skill: 0, initiative: 0, stamina: 0, armour: 0},
    mien: ["","","","","",""],
    img: {
        src: ""
    },
    damageType: "Small Beast"
};

function generateID() {
    const chars = "abcdefghjkmnopqrstuvwxyzABCDEFGHJKMNOP";
    let out = "";
    for (let i = 0; i < 8; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
}

function autoSave(event) {
    if (document.querySelector("#autoSave").checked) {
        const data = serializeAll();
        fetch("data/enemies.json", {method: 'PUT', body: JSON.stringify(data)})
        .then(() => {
            document.querySelector("#autoSaveError").innerText = "";
        })
        .catch((error)=>{
            document.querySelector("#autoSaveError").innerText = "AutoSave Error. Ignore if you are not running this on a server: "+error;
        });
    }
    
    // TODO
    //
    // Mark a dirty flag somewhere that is cleared by an autosave going through, or by hitting "save to file"
    // Warn the user of unsaved data if they try to leave
    /*
    https://stackoverflow.com/a/7317311
    window.addEventListener("beforeunload", function (e) {
    var confirmationMessage = 'It looks like you have been editing something. '
                            + 'If you leave before saving, your changes will be lost.';

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});
    */
}

// owencm @ https://stackoverflow.com/a/15832662
function downloadURI(uri, name) {
  var link = document.createElement("a");
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  delete link;
}

function handleImageClicks(event) {
    event.preventDefault();
    let isRightMB;
    
    // source: https://stackoverflow.com/questions/2405771/is-right-click-a-javascript-event
    if ("which" in event)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        isRightMB = event.which == 3; 
    else if ("button" in event)  // IE, Opera 
        isRightMB = event.button == 2; 
    
    // Left-click to edit Alt-text, right-click to delete
    if (!isRightMB) {
        const newAlt = window.prompt("Alt-text for this image", event.target.getAttribute("alt") || "A field of red flowers...");
        if (newAlt) {
            event.target.setAttribute("alt", newAlt);
            autoSave();
        }
    }
}

function handleImageContext(event) {
    event.preventDefault();
    event.target.setAttribute("src", "");
    event.target.setAttribute("alt", "");
    autoSave();
}

function handleImageDropEvent(event) {
    event.preventDefault();
    const url = event.dataTransfer.getData("URL")
    
    const elem = this;
    const localFileName = "images/"+elem.id+".jpg";
    if (url) {
        console.log("URL was dropped");
        fetch(url)
            .then(response => {
                response.arrayBuffer()            
                    .then(buffer => fetch(localFileName, {method: "PUT", body: buffer}))
                    .then(localStoreResponse => {
                        if (localStoreResponse.ok) {
                            let img = createOrGetImg(elem);
                            img.src = localFileName /* cache-reloading magic */ + "#" + new Date().getTime();
                            autoSave();
                        } else {
                            throw "Error "+localStoreResponse.status;
                        }
                    })
                    .catch((error) => {
                        let img = createOrGetImg(elem);
                        // Hotlink the resource instead
                        img.src = url;    
                        autoSave();                        
                    });
            }, ()=>{}); //Just fail silently if we couldn't retrieve for some other reason
    } else {
        const imageFile = event.dataTransfer.files[0];
        if (imageFile) {
            console.log("File was dropped");
            console.log(imageFile);
            // TODO: Double check if the image already exists. If so then we can still set it even if the PUT fails
            const localFileName = "images/"+elem.id+".jpg";
            imageFile.arrayBuffer()
                .then(buffer => {
                    fetch(localFileName, {method: 'PUT', body: buffer})
                    .then(localStoreResponse => {
                        if (localStoreResponse.ok) {
                            let img = createOrGetImg(elem);
                            img.src = localFileName /* cache-reloading magic */ + "#" + new Date().getTime();
                            autoSave();
                        } else {
                            throw "Error "+localStoreResponse.status;
                        }
                    })
                    .catch((error) => {
                        console.log("Caught the error: "+error);
                        let img = createOrGetImg(elem);
                        
                        // https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
                        const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                        // Create a data url from the image data and store it directly in the image
                        // https://stackoverflow.com/a/57704306
                        const dataUrl = `data:${imageFile.type};base64,${b64}`
                        img.src = dataUrl;
                        autoSave();
                    });
                });
        }
    }
    
    return false;
}

function createOrGetImg(elem) {
    let img = elem.querySelector("img");
    if (!img) {
        img = document.createElement("img");
        elem.appendChild(img);
        img.setAttribute("alt", "[Placeholder] Visual depiction of "+data.name);
        img.addEventListener("mousedown", handleImageClicks);
        img.addEventListener("contextmenu", handleImageContext);
    }
    return img;
}

function generateEnemy(data) {
    data = {...def, ...data};
    data.id = data.id || generateID();
    
    data.mien = data.mien.map((mood, idx) => {return {roll: idx+1, mood: mood}});
    
    const rendered = Mustache.render(template, data);

    const elem = document.createElement("div");
    elem.className = "enemy";
    elem.innerHTML = rendered;
    elem.id = data.id;
    
    elem.querySelector("option[value='"+data.damageType+"']").selected = true;
    
    elem.addEventListener("drop", handleImageDropEvent);
    elem.addEventListener("dragover", (event) => {event.preventDefault()});
    
    if (elem.querySelector("img")) {
        elem.querySelector("img").addEventListener("mousedown", handleImageClicks);
        elem.querySelector("img").addEventListener("contextmenu", handleImageContext);
    }
    
    return elem;
}

function elementToJSON(elem) {
    const data = {};
    
    data.id = elem.id;
    
    data.name = elem.querySelector(".name").innerText;
    data.stats = {};
    elem.querySelectorAll(".statblock input").forEach(input => {
        data.stats[input.name] = input.value
    })
    
    data.flavour = elem.querySelector(".flavour").innerHTML;
    
    data.mien = [];
    
    elem.querySelectorAll(".mien tbody tr").forEach(row => {
        const value = row.querySelector(".mood").innerText.trim();
        data.mien[row.querySelector(".roll").innerText - 1] = value;
    });
    
    data.damageType = elem.querySelector(".damageType option:checked").value;
    
    const img = elem.querySelector("img");
    if (img && img.getAttribute("src")) {
        data.img = {}
        data.img.src = img.getAttribute("src").split("#")[0];
        data.img.alt = img.getAttribute("alt");
    }
    
    return data;
}