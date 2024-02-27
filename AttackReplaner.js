// ==UserScript==
// @name            Attack Replaner
// @version         1.0
// @description     Fügt in DS-Ultimate einen Button hinzu über den das Umplanen vorhandener Angriffe gestartet werden kann
// @author          forti99
// @match           https://ds-ultimate.de/tools/attackPlanner*
// ==/UserScript==

class Point {
    constructor(x, y, pointId) {
        this.x = x;
        this.y = y;
        this.pointId = pointId;
    }

    calculateDistance(point2) {
        const dx = this.x - point2.x;
        const dy = this.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
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

(function () {
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

function openPopupEingabe() {
    let eingabeContainer = document.querySelector('.col-12.d-print-none');

    let popupContent = `
        <h2>Eingabeformular</h2>
        <form id="inputForm">
            <label for="anzahlRechenversuche">Anzahl Rechenversuche:</label>
            <input type="number" id="anzahlRechenversuche" required><br><br>
            <label for="option">ausgewählte Option:</label>
            <input type="number" id="option" required><br><br>
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

function findAndDisplayPlan() {
    const timesToRun = parseInt(document.getElementById('anzahlRechenversuche').value);
    const option = parseInt(document.getElementById('option').value);
    const ultimatePlan = calculateNewPlans(timesToRun, option);

    let resultTextArea = document.getElementById('resultTextArea');
    let textWidth = ultimatePlan[0].length * 10

    resultTextArea.rows = ultimatePlan.length;
    resultTextArea.value = ultimatePlan.join('\n');
    resultTextArea.style.width = textWidth + 'px';

    let resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
}

function calculateNewPlans(timesToRun, option) {
    const rows = document.getElementById('data1').children[1].children;
    [startPoints, endPoints, units, arrivalTimes] = [[rows.length], [rows.length], [rows.length], [rows.length]];

    fillOriginalPlanData(startPoints, endPoints, units, arrivalTimes);

    const allGeneratedPlans = generateRandomAttackPlans(startPoints, endPoints, units, arrivalTimes, timesToRun);

    const processedAttackPlans = processAttackPlans(allGeneratedPlans);

    const bestAttackPlan = findBestAttackPlan(processedAttackPlans, option);

    return generateUltimatePlan(bestAttackPlan, false, units, arrivalTimes);
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
        });
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

function cancel() {
    let eingabeContainer = document.querySelector('.col-12.d-print-none');
    let popupDiv = eingabeContainer.querySelector('#inputForm').parentNode;
    eingabeContainer.removeChild(popupDiv);
}

function fillOriginalPlanData(startPoints, endPoints, rows, arrivalTimes, units) {
    for (let i = 0; i < rows.length; i++) {
        //startPoints and endPoints
        const startPointText = rows[i].children[1].innerHTML;
        const endPointText = rows[i].children[3].innerHTML;

        const startPointCoords = startPointText.match(/\[(.*?)]/)[1].split(/\|/);
        const endPointCoords = endPointText.match(/\[(.*?)]/)[1].split(/\|/);

        let startPointId = parseInt(startPointText.match(/\/(\d+)(?=")/)[1]);
        let endPointId = parseInt(endPointText.match(/\/(\d+)(?=")/)[1]);

        startPoints[i] = new Point(parseInt(startPointCoords[0]), parseInt(startPointCoords[1]), startPointId);
        endPoints[i] = new Point(parseInt(endPointCoords[0]), parseInt(endPointCoords[1]), endPointId);

        //arrivalTimes
        const dateParts = rows[i].children[8].innerText.split(/[ .:]/);
        arrivalTimes[i] = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(dateParts[3]), parseInt(dateParts[4]), parseInt(dateParts[5]), parseInt(dateParts[6])).getTime();

        //units
        units[i] = rows[i].children[5].innerHTML.match(/\/([a-zA-Z]+)\./)[1];
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
