// ==UserScript==
// @name         Attack Replaner
// @version      1.0
// @description  A minimal aproach to improve TW by displaying summed info of a page and adding filters
// @author       forti99
// @match     https://ds-ultimate.de/tools/attackPlanner*
// ==/UserScript==

(function () {
    //Timeout-Funktion sollte durch einen Button zum Klicken ersetzt werden
    setTimeout(function () {
        getStartAndEndPoints()
    }, 1000);
})();

function getStartAndEndPoints() {
    const rows = document.getElementById('data1').children[1].children;
    let startPoints = [rows.length];
    let endPoints = [rows.length];

    for (let i = 0; i < rows.length; i++) {
        const startPointText = rows[i].children[1].innerText;
        const endPointText = rows[i].children[3].innerText;
        startPoints[i] = getPointFromInnerText(startPointText);
        endPoints[i] = getPointFromInnerText(endPointText);
    }
    console.log(rows);
    console.log(startPoints);
    console.log(endPoints);
}

function getPointFromInnerText(innerText) {
    const coordsWithSeperator = innerText.match(/\[([^)]{7})]/)[1]
    const coords = coordsWithSeperator.split('\|');
    return new Point(parseInt(coords[0]), parseInt(coords[1]));
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Attack {
    constructor(startPoint, endPoint, distance) {
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.distance = distance;
    }
}