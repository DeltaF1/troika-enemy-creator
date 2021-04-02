function addEnemy(enemyData) {
    const container = document.querySelector("#container")
    const element = generateEnemy(enemyData);
        
    // If an enemy with this ID already exists, replace it
    const existing = container.querySelector("#"+element.id);
    if (existing) {
        existing.replaceWith(element);
    } else {
        container.appendChild(element);
    }
}

function addEnemyList(list) {
    if (!Array.isArray(list)) {
        list = [list];
    }
    for (let enemy of list) {
        addEnemy(enemy)
    }
}

function serializeAll() {
    const arr = []
    document.querySelectorAll("#container .enemy").forEach(enemy => {
        arr.push(elementToJSON(enemy));
    });
    return arr;
}