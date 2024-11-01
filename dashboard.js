﻿// @ts-ignore
let historySpd = 0;
Funbit.Ets.Telemetry.Dashboard.prototype.initialize = function (skinConfig, utils) {
    //
    // skinConfig - a copy of the skin configuration from config.json
    // utils - an object containing several utility functions (see skin tutorial for more information)
    //

    // this function is called before everything else, 
    // so you may perform any DOM or resource initializations / image preloading here

    utils.preloadImages([
        'images/bg-off.png', 'images/bg-on.png',
        'images/blinker-left-off.png', 'images/blinker-left-on.png',
        'images/blinker-right-off.png', 'images/blinker-right-on.png',
        'images/cruise-off.png', 'images/cruise-on.png',
        'images/highbeam-off.png', 'images/highbeam-on.png',
        'images/lowbeam-off.png', 'images/lowbeam-on.png',
        'images/parklights-off.png', 'images/parklights-on.png',
        'images/trailer-off.png', 'images/trailer-on.png'
    ]);

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
    // format odometer data as: 00000.0
    data.truck.odometer = utils.formatFloat(data.truck.odometer, 1);
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
    wearSumPercent = Math.min(wearSumPercent, 100);
    data.truck.wearSum = Math.round(wearSumPercent) + '%';
    data.trailer.wear = Math.round(data.trailer.wear * 100) + '%';
    // return changed data to the core for rendering

    // Own data
    const remainingDate = new Date(data.job.remainingTime)
    data.job.remainingTime =
        utils.formatInteger(remainingDate.getDate(), 2) + " d " +
        utils.formatInteger(remainingDate.getHours(), 2) + ":" +
        utils.formatInteger(remainingDate.getMinutes(), 2) + "";
    const now = new Date();
    data.clock = utils.formatInteger(now.getHours(), 2) + ":" + utils.formatInteger(now.getMinutes(), 2);
    const remainDist = data.navigation.estimatedDistance;
    const distInt = Math.floor(remainDist / 1000);
    data.distanceInteger = distInt;
    data.distanceDecimal = Math.floor((remainDist - distInt * 1000) / 100);
    data.speedPos = -1080 + data.truck.speed * 6.20;
    // speed trend
    const accelVct = data.truck.acceleration;
    const accel = Math.sqrt(accelVct.x**2 + accelVct.y**2 + accelVct.z**2);
    let spdTrendDelta = accel * 10;// speed trend after 10 sec
    if (data.truck.speed <= historySpd - 0.01) spdTrendDelta = -spdTrendDelta;
    data.ledCount = Math.max(Math.min(Math.round(spdTrendDelta / 2.5), 11), -19);
    historySpd = data.truck.speed;

    data.altPos = -1080 + data.truck.placement.y * 3.2;

    const heading = Math.abs((data.truck.placement.heading - 1) * 360);
    data.compassPos = (256 - heading) * 3.33;
    return data;
};
// @ts-ignore
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
}