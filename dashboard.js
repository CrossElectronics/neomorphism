// @ts-ignore
let historySpd = 0;
Funbit.Ets.Telemetry.Dashboard.prototype.initialize = function (skinConfig, utils) {
    //
    // skinConfig - a copy of the skin configuration from config.json
    // utils - an object containing several utility functions (see skin tutorial for more information)
    //

    // this function is called before everything else, 
    // so you may perform any DOM or resource initializations / image preloading here

    utils.preloadImages([]);

    // return to menu by a click
    /*
    $(document).add('body').on('click', function () {
        window.history.back();
    });
    */
}

// @ts-ignore
Funbit.Ets.Telemetry.Dashboard.prototype.filter = function (data, utils) {
    //
    // data - telemetry data JSON object
    // utils - an object containing several utility functions (see skin tutorial for more information)
    //

    // This filter is used to change telemetry data 
    // before it is displayed on the dashboard.
    // You may convert km/h to mph, kilograms to tons, etc.
    data.distanceInteger = undefined;
    data.clock = undefined;
    data.hasJob = data.trailer.attached;
    // round truck speed
    data.truck.speedRounded = Math.abs(data.truck.speed > 0
        ? Math.floor(data.truck.speed)
        : Math.round(data.truck.speed));
    data.truck.cruiseControlSpeedRounded = data.truck.cruiseControlOn
        ? Math.floor(data.truck.cruiseControlSpeed)
        : 0;
    // convert kg to t
    data.trailer.mass = data.hasJob ? (Math.round(data.trailer.mass / 1000.0) + 't') : '';
    // convert gear to readable format
    data.truck.gear = data.truck.displayedGear; // use displayed gear
    data.truck.gear = data.truck.gear > 0
        ? 'D' + data.truck.gear
        : (data.truck.gear < 0 ? 'R' + Math.abs(data.truck.gear) : 'N');
    // convert rpm to rpm * 100
    data.truck.engineRpm = data.truck.engineRpm / 100;
    // calculate wear
    let wearSumPercent = data.truck.wearEngine * 100 +
        data.truck.wearTransmission * 100 +
        data.truck.wearCabin * 100 +
        data.truck.wearChassis * 100 +
        data.truck.wearWheels * 100;
    wearSumPercent = 100 - Math.min(wearSumPercent / 5, 100);
    data.truck.wearSum = Math.round(wearSumPercent) + '%';
    data.trailer.wear = (100 - Math.round(data.trailer.wear * 100)) + '%';
    data.truck.wearCabin = getIntegrity(data.truck.wearCabin);
    data.truck.wearEngine = getIntegrity(data.truck.wearEngine);
    data.truck.wearChassis = getIntegrity(data.truck.wearChassis);
    data.truck.wearWheels = getIntegrity(data.truck.wearWheels);
    data.truck.wearTransmission = getIntegrity(data.truck.wearTransmission);
    // return changed data to the core for rendering

    // Own data
    const now = new Date();
    data.clock = utils.formatInteger(now.getHours(), 2) + ":" + utils.formatInteger(now.getMinutes(), 2);
    if (data.game.connected) {
        data.fuelBarLength = data.truck.fuel / data.truck.fuelCapacity * 452 + "px";
        data.fuelPercentage = Math.round(data.truck.fuel / data.truck.fuelCapacity * 100) + "%";
        data.fob = Math.round(data.truck.fuel);
        data.fuelCapacity = Math.round(data.truck.fuelCapacity);
        //TODO: fix data streaming issue
        data.fuelConsump = utils.formatFloat(data.truck.fuelAverageConsumption*100, 2)
        data.fuelRange = utils.formatFloat(data.truck.fuel / data.truck.fuelAverageConsumption, 2)
        //if (data.fuelRange >= 10000) data.fuelRange = 9999.99;

        const now = new Date();
        if (data.game.timeScale > 10) {
            let remTime = 0;
            if (data.truck.cruiseControlOn) {
                remTime =
                    data.navigation.estimatedDistance / (data.truck.cruiseControlSpeed / 3.6) / data.game.timeScale;
            } else {
                remTime =
                    data.navigation.estimatedDistance / (data.truck.cruiseControlSpeed / 3.6) / data.game.timeScale;
            }
            if (remTime >= 99 * 3600) {
                remTime = 99 * 3600;
            }

            //console.log(new Date(remTime * 1000).toISOString())
            data.ete = new Date(remTime * 1000).toISOString().substring(11, 19);

            const eta = new Date(now.setSeconds(remTime * 1.5));
            data.eta = utils.formatInteger(eta.getHours(), 2) + ":" + utils.formatInteger(eta.getMinutes(), 2);
        } else {
            data.ete = "00:00:00"
            data.eta = data.clock;
        }
    } else {
        data.ete = "00:00:00"
        data.eta = data.clock;
    }

    data.gameSpeed = "x" + data.game.timeScale;

    const remainingDate = new Date(data.job.remainingTime)
    data.job.remainingTime = data.hasJob ?
        utils.formatInteger(remainingDate.getDate() - 1, 2) + ":" +
        utils.formatInteger(remainingDate.getHours(), 2) + ":" +
        utils.formatInteger(remainingDate.getMinutes(), 2) + ""
        :
        "-";
    const remainDist = data.navigation.estimatedDistance;
    const distInt = Math.floor(remainDist / 1000);
    data.distanceInteger = distInt;
    data.distanceDecimal = Math.floor((remainDist - distInt * 1000) / 100);
    data.speedPos = -1080 + data.truck.speed * 6.20;
    // speed trend
    const accelVct = data.truck.acceleration;
    const accel = Math.sqrt(accelVct.x ** 2 + accelVct.y ** 2 + accelVct.z ** 2);
    let spdTrendDelta = accel * 10;// speed trend after 10 sec
    if (data.truck.speed <= historySpd - 0.01) spdTrendDelta = -spdTrendDelta;
    data.ledCount = Math.max(Math.min(Math.round(spdTrendDelta / 2.5), 11), -19);
    if (Math.abs(data.ledCount) < 2) data.ledCount = 0;
    historySpd = data.truck.speed;

    data.altPos = -1080 + data.truck.placement.y * 3.2;

    const heading = Math.abs((data.truck.placement.heading - 1) * 360);
    data.compassPos = (256 - heading) * 3.33;
    return data;
};

Funbit.Ets.Telemetry.Dashboard.prototype.render = function (data, utils) {
    const asi = document.getElementById("attitude-indicator");
    asi.style.rotate = (data.truck.placement.roll * 360) + "deg";
    const pitch = 50 - data.truck.placement.pitch * 360 / 15 * 49;
    asi.style.backgroundPosition = "50% " + Math.round(pitch) + "%";

    const spdInd = document.getElementById("speed-indicator");
    spdInd.style.backgroundPosition = "50% " + Math.round(data.speedPos) + "px"

    const stiUpLed = data.ledCount > 0 ? data.ledCount : 0;
    const stiDnLed = data.ledCount < 0 ? Math.abs(data.ledCount) : 0;
    const stiUp = document.getElementById("sti-up");
    const stiDn = document.getElementById("sti-dn");
    stiUp.style.height = stiUpLed / 12 * 100 + "%";
    stiDn.style.height = stiDnLed / 20 * 100 + "%";

    const altimeter = document.getElementById("altimeter");
    altimeter.style.backgroundPosition = "50% " + Math.round(data.altPos) + "px";

    const compass = document.getElementById("compass");
    compass.style.backgroundPosition = data.compassPos + "px 50%";

    const fuelBar = document.getElementById("fuel-bar");
    fuelBar.style.width = data.fuelBarLength;

    //Odometer
    const odo = data.truck.odometer;
    const digDec = document.getElementById("odometer-decimal");
    const odoDec = Math.floor((odo - Math.floor(odo)) * 1000);
    digDec.style.backgroundPosition = "50% " + getDecimalOffset(odoDec, 100, 10.1 / 9) + "%";
    for (let i = 0; i < 6; i++) {
        const digitElem = document.getElementById("odometer-digit" + i);
        const intPart = Math.floor(odo);
        const workingPart = utils.formatInteger(intPart, 6).substring(i);
        const currentDigit = workingPart[0];
        const nextDigit = i === 5 ? 9 : parseInt(workingPart[1]);
        const fullString = utils.formatInteger(Math.floor(odo), 6) + "." + utils.formatInteger(odoDec, 3);
        const remainder = fullString.toString().substring(i + 1);
        const remainderFloat = parseFloat(remainder)
        //console.log(odo, remainder, remainderFloat)
        const offset = getDigitOffset(
            parseInt(currentDigit),
            nextDigit,
            remainderFloat,
            100,
            10.1 / 9);
        //console.log(i, intPart, workingPart, currentDigit, remainder, offset)
        digitElem.style.backgroundPosition = "50% " + offset + "%";
    }
}

function len(num) {
    return Math.ceil(Math.log10(num + 1))
}

function getDecimalOffset(deci, height, coefficient) {
    return deci / 10 ** 3 * height * coefficient;
}

function getDigitOffset(curr, next, rem, height, coefficient) {
    if (10 ** len(Math.floor(rem)) - rem < 0.1 && next === 9) {
        return ((curr + 1) / 10 + rem - 10 ** len(Math.floor(rem))) * height * coefficient;
    } else {
        return curr / 10 * height * coefficient;
    }
}

function getIntegrity(wear) {
    return (100 - Math.round(wear * 100) + "%")
}