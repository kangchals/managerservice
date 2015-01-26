"use strict";

exports.serviceName = 'MANAGER';
exports.moduleName = 'managerservice';
exports.container = null;

var monitoringInterval = null;

var containerList = [];

// container에서 호출 함
exports.init = function(container, callback) {

    exports.container = container;

    container.addListener('init', initService);
    container.addListener('extend', extendService);
/*
    container.getRouteTableJSON()[this.serviceName].status = 'on';
    container.saveRouteTable();
*/
    initProject();

    // 모니터링 실행
    monitoringInterval = setInterval(monitor, 10000);

    callback(null);
};

exports.close = function(callback) {

    if(monitoringInterval) {

        clearInterval(monitoringInterval);
    }

    callback(null);
};

exports.monitor = monitor;

function initService(req, res, next) {

    var routeTable = exports.container.getRouteTableJSON();
    var responseData = {
        serviceName : '',
        serviceInfo : {
            ip : '',
            port : ''
        }
    };

    if(req.data.serviceName) {

        // route table에 추가
        //exports.container.getRouteTable().add(req.data.serviceName, req.data.moduleName, {ip : '', port : ''});
        responseData.serviceName = req.data.serviceName;

        if(routeTable[req.data.serviceName]) {

            // routetable에 정보가 있다면
            responseData.serviceInfo = addDirection(routeTable[req.data.serviceName]);
        } else {

            responseData.serviceInfo = addRoute(req.data.serviceName, req.data.moduleName);
        }

    } else {

        // service name이 없으면 필요한 업무 할당

        for(var name in routeTable) {

            if(routeTable[name].status === 'off') {

                responseData.serviceName = name;
                responseData.serviceInfo = addDirection(routeTable[name]);
                break;
            }
        }
    }

    res.end(responseData);
    next();
}

function addRoute(serviceName, moduleName) {

    var route = exports.container.getRouteTable().add(serviceName, moduleName, []);

    return addDirection(route);
}

function addDirection(route) {

    var direction = {
        ip : '',
        port : ''
    };

    exports.container.getRouteTable().add(route.serviceName, route.moduleName, direction);

    return direction;
}

function extendService(req, res, next) {

    res.end('OK');
    next();
}

function monitor() {

    // 모니터링
    
    // route table 전체 container에 monitoring 호출
    exports.container.broadcast('monitor', {}, function(err, res) {

        exports.container.log(res.data);
    });

}

function initProject() {

    var forever = require('forever-monitor');

    var routeTable = exports.container.getRouteTableJSON();

    for(var name in routeTable) {

        if(routeTable[name].status === 'off') {

            var child = new (forever.Monitor)('index.js');

            child.on('start', function (process, data) {
                console.log(data);
            });

            child.on('error', function (err) {
                console.log(err);
            });

            child.start();
        }
    }
}