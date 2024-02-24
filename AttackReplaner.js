// ==UserScript==
// @name         Attack Replaner
// @version      1.0
// @description
// @author       forti99
// @match     https://ds-ultimate.de/tools/attackPlanner*
// ==/UserScript==

(function () {
    //Timeout-Funktion sollte durch einen Button zum Klicken ersetzt werden
    buttonHinzufuegen();
})();

function buttonHinzufuegen() {
    const speichernBtn = document.querySelector('.btn.btn-sm.btn-success.float-right');
    const umplanenBtn = document.createElement('input');
    umplanenBtn.type = 'button';
    umplanenBtn.className = 'btn btn-sm btn-info float-left ml-4';
    umplanenBtn.value = 'Angriffe umplanen';
    umplanenBtn.onclick = openPopupEingabe;
    speichernBtn.parentNode.insertBefore(umplanenBtn, speichernBtn.nextSibling);
}

function calculateNewPlans(timesToRun, option) {
    const rows = document.getElementById('data1').children[1].children;
    let startPoints = [rows.length];
    let endPoints = [rows.length];
    const units = [rows.length];
    const arrivalTimes = [rows.length];
    getAttackPlanData(startPoints, endPoints, units, arrivalTimes, rows);

    const allGeneratedPlans = generateRandomAttackPlans(startPoints, endPoints, units, arrivalTimes, timesToRun);

    const processedAttackPlans = processAttackPlans(allGeneratedPlans);

    const bestAttackPlan = findBestAttackPlan(processedAttackPlans, option);

    return generateUltimatePlan(bestAttackPlan, false, units, arrivalTimes);
}

function findAndDisplayPlan() {
    const timesToRun = parseFloat(document.getElementById('number1').value);
    const option = parseFloat(document.getElementById('number2').value);
    const ultimatePlan = calculateNewPlans(timesToRun, option);

    let resultTextArea = document.getElementById('resultTextArea');
    resultTextArea.rows = ultimatePlan.length;
    resultTextArea.value = ultimatePlan.join('\n');

    let textWidth = ultimatePlan[0].length * 10
    resultTextArea.style.width = textWidth + 'px';

    let resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
}

function cancel() {
    let eingabeContainer = document.querySelector('.col-12.d-print-none');
    let popupDiv = eingabeContainer.querySelector('#inputForm').parentNode;
    eingabeContainer.removeChild(popupDiv);
}

function openPopupEingabe() {
    let eingabeContainer = document.querySelector('.col-12.d-print-none');

    let popupContent = `
        <h2>Eingabeformular</h2>
        <form id="inputForm">
            <label for="number1">Anzahl Rechenversuche:</label>
            <input type="number" id="number1" required><br><br>
            <label for="number2">ausgewählte Option:</label>
            <input type="number" id="number2" required><br><br>
            <button type="button" id="abbrechenButton">Abbrechen</button>
            <button type="button" id="planFindenButton">Plan finden</button>
        </form>
        <div id="result" style="display: none;">
            <h2>Ergebnis</h2>
            <textarea id="resultTextArea" rows="70" cols="100" readonly></textarea>
        </div>
    `;

    let popupDiv = document.createElement('div');
    popupDiv.className = "card mt-2";
    popupDiv.innerHTML = popupContent;

    eingabeContainer.appendChild(popupDiv);
    document.getElementById("abbrechenButton").onclick = cancel;
    document.getElementById("planFindenButton").onclick = findAndDisplayPlan;
}

function getAttackPlanData(startPoints, endPoints, units, arrivalTimes, rows) {
    fillStartAndEndPoints(startPoints, endPoints, rows);
    fillArrivalTimes(arrivalTimes, rows);
    fillUnits(units, rows);
}

function fillStartAndEndPoints(startPoints, endPoints, rows) {
    for (let i = 0; i < rows.length; i++) {
        const startPointText = rows[i].children[1].innerHTML;
        const endPointText = rows[i].children[3].innerHTML;

        const startPointCoordsWithSeperator = startPointText.match(/\[(.*?)]/)[1];
        const startPointCoords = startPointCoordsWithSeperator.split(/\|/);

        const endPointCoordsWithSeperator = endPointText.match(/\[(.*?)]/)[1];
        const endPointCoords = endPointCoordsWithSeperator.split(/\|/);

        let startPointId = startPointText.match(/\/(\d+)(?=")/)[1];
        let endPointId = endPointText.match(/\/(\d+)(?=")/)[1];

        startPoints[i] = new Point(parseInt(startPointCoords[0]), parseInt(startPointCoords[1]), parseInt(startPointId));
        endPoints[i] = new Point(parseInt(endPointCoords[0]), parseInt(endPointCoords[1]), parseInt(endPointId));
    }
}

function fillArrivalTimes(arrivalTimes, rows) {
    for (let i = 0; i < rows.length; i++) {
        const arrivalTimeText = rows[i].children[8].innerText;
        arrivalTimes[i] = textToDate(arrivalTimeText);
    }
}

function fillUnits(units, rows) {
    for (let i = 0; i < rows.length; i++) {
        const unitsText = rows[i].children[5].innerHTML;
        units[i] = unitsText.match(/\/([a-zA-Z]+)\./)[1];
    }
}

function textToDate(text) {
    const parts = text.split(/[ .:]/);
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6])).getTime();
}

function generateRandomAttackPlans(startPoints, endPoints, units, arrivalTimes, timesToRun) {
    let allGeneratedAttackPlans = new Set();
    let attackPlan = [];
    for (let i = 0; i < timesToRun; i++) {
        shuffleArray(startPoints);
        attackPlan = [];
        for (let i = 0; i < startPoints.length; i++) {
            const startPoint = startPoints[i];
            const endPoint = endPoints[i];
            const unit = units[i];
            const arrivalTime = arrivalTimes[i];
            const distance = startPoint.calculateDistance(endPoint);
            attackPlan.push(new Attack(startPoint, endPoint, unit, arrivalTime, distance));
        }
        attackPlan.sort(function (a, b) {
            if (a.distance < b.distance) return 1;
            if (a.distance > b.distance) return -1;
            return 0;
        })
        allGeneratedAttackPlans.add(attackPlan)
    }
    return allGeneratedAttackPlans;
}

function processAttackPlans(generatedPlans) {
    let processedPlans = [generatedPlans.size];
    let j = 0;
    for (const attackPlan of generatedPlans) {
        let maxDistance = Number.MIN_VALUE;
        let maxDistanceGap = Number.MIN_VALUE;

        if (attackPlan[0].distance > maxDistance) {
            maxDistance = attackPlan[0].distance;
        }
        for (let i = 0; i < attackPlan.length - 1; i++) {
            let distanceGap = attackPlan[i].distance - attackPlan[i + 1].distance;
            if (distanceGap > maxDistanceGap) {
                maxDistanceGap = distanceGap;
            }
        }
        processedPlans[j] = new processedAttackPlan(attackPlan, maxDistance, maxDistanceGap);
        j++;
    }
    return processedPlans;
}

function findBestAttackPlan(processedAttackPlans, option) {
    switch (option) {
        case 0: //biggest maxDistance
            return processedAttackPlans.reduce(function (prev, current) {
                return (prev && prev.maxDistance > current.maxDistance) ? prev : current;
            });
        case 1://shortest maxDistance
            return processedAttackPlans.reduce(function (prev, current) {
                return (prev && prev.maxDistance < current.maxDistance) ? prev : current;
            });
        case 2://biggest maxDistanceGap
            return processedAttackPlans.reduce(function (prev, current) {
                return (prev && prev.maxDistanceGap > current.maxDistanceGap) ? prev : current;
            });
        case 3://shortest maxDistanceGap
            return processedAttackPlans.reduce(function (prev, current) {
                return (prev && prev.maxDistanceGap < current.maxDistanceGap) ? prev : current;
            });
    }
}

function generateUltimatePlan(processedAttackPlan, isUTPlan, units, arrivalTimes) {
    let ultimatePlan = [processedAttackPlan.attacks.length];
    let ultimateStandardString;
    if (isUTPlan) {
        ultimateStandardString = '&0&false&true&spear=/sword=/axe=/archer=/spy=/light=/marcher=/heavy=/ram=/catapult=/knight=/snob=/militia=MA==';
    } else {
        ultimateStandardString = '&8&false&true&spear=/sword=/axe=/archer=/spy=/light=/marcher=/heavy=/ram=/catapult=/knight=/snob=/militia=MA=='
    }
    for (let i = 0; i < processedAttackPlan.attacks.length; i++) {
        const attack = processedAttackPlan.attacks[i];
        ultimatePlan[i] = attack.startPoint.pointId + '&' + attack.endPoint.pointId + '&' + units[i] + '&' + arrivalTimes[i] + '&' + ultimateStandardString;
    }
    return ultimatePlan;
}

function shuffleArray(array) {
    for (let i = 0; i < array.length; i++) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

class Point {
    constructor(x, y, pointId) {
        this.x = x;
        this.y = y;
        this.pointId = pointId;
    }

    calculateDistance(point2) {
        const xDistance = Math.abs(this.x - point2.x);
        const yDistance = Math.abs(this.y - point2.y);
        return Math.sqrt(xDistance * xDistance + yDistance * yDistance);
    }
}

class Attack {
    constructor(startPoint, endPoint, unit, arrivalTime, distance) {
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.unit = unit;
        this.arrivalTime = arrivalTime;
        this.distance = distance;
    }
}

class processedAttackPlan {
    constructor(attacks, maxDistance, maxDistanceGap) {
        this.attacks = attacks;
        this.maxDistance = maxDistance;
        this.maxDistanceGap = maxDistanceGap;
    }

}