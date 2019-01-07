//严格模式，不能使用未声明的变量
"use strict";

//const声明常量，被声明的常量不能更改且必须初始化。require似乎是node的模块。
const {app, protocol, shell, BrowserWindow} = require("electron");

//此变量似乎是用来描述npm包信息
const pkg      = require("./package.json");

//此模块是node中的文件系统模块
const fs       = require("fs");

//此模块是node中的路径模块,提供了一些处理文件路径的工具
const path     = require("path");

//下面两行代码作用是 为electron添加命令行开关以便其能访问本地文件
app.commandLine.appendSwitch("allow-file-access-from-files");
app.commandLine.appendSwitch("allow-file-access");

// Disable hardware acceleration by default for Linux
// TODO: implement a setting for this one and requires a restart after changing that value
//默认情况下禁用linux的硬件加速
if (process.platform.trim().toLowerCase() == "linux" && app.disableHardwareAcceleration) {
    console.log("Hardware acceleration disabled for Linux.");
    app.disableHardwareAcceleration();
}

//为node中的global对象增加一个shareObject属性，其值是app参数，process.的命令行参数
global.sharedObject = { appArguments: process.argv };

//处理重定向
var handleRedirect = (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
}

var mainWindow = null;
function createWindow() {
    var mainWindowProperties = {
        title: pkg.name,
        autoHideMenuBar: true,
        webPreferences: {
          webSecurity: false,
          allowRunningInsecureContent: true,
          allowDisplayingInsecureContent: true,
          defaultEncoding: "UTF-8"
        },
    };

    var iconFile = process.platform == "win32" ? "app.ico" : "css/images/logo-shadow.png";
    mainWindowProperties.icon = path.join(__dirname, iconFile);

    mainWindow = new BrowserWindow(mainWindowProperties);

    var devEnable = false;
    if (process.argv.indexOf("--enable-dev") >= 0) {
        devEnable = true;
    } else if (process.env.PENCIL_ENV === "development") {
        devEnable = true;
    }

    app.devEnable = devEnable;

    mainWindow.hide();
    mainWindow.maximize();

    if (devEnable) {
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.setMenu(null);
    }

    var mainUrl = "file://" + __dirname + "/app.xhtml";
    mainWindow.loadURL(mainUrl);
    mainWindow.show();

    //mainWindow.webContents.openDevTools();

    mainWindow.on("closed", function() {
        mainWindow = null;
        app.exit(0);
    });

    if (process.platform == 'darwin') {
        var {MacOSToolbar} = require('./views/toolbars/MacOSToolbar');
        MacOSToolbar.createMacOSToolbar();
    }

    mainWindow.webContents.on("will-navigate", handleRedirect);
    mainWindow.webContents.on("new-window", handleRedirect);

    app.mainWindow = mainWindow;
    global.mainWindow = mainWindow;

    // const updater = require('./updater');
    // setTimeout(function() {
    //     updater.checkForUpdates();
    // }, 3000);
}

// Quit when all windows are closed.
app.on("window-all-closed", function() {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on('ready', function() {
    protocol.registerBufferProtocol("ref", function(request, callback) {
        var path = request.url.substr(6);

        fs.readFile(path, function (err, data) {
            if (err) {
                callback({mimeType: "text/html", data: new Buffer("Not found")});
            } else {
                callback({mimeType: "image/jpeg", data: new Buffer(data)});
            }
        });

    }, function (error, scheme) {
        if (error) {
            console.log("ERROR REGISTERING", error);
        }
    });


    // Create the browser window.
    createWindow();

    const renderer = require("./pencil-core/common/renderer");
    renderer.start();

    const webPrinter = require("./pencil-core/common/webPrinter");
    webPrinter.start();
});
app.on("activate", function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    } else {
        app.show();
    }
});

process.on('uncaughtException', function (error) {
    console.error(error);
});
