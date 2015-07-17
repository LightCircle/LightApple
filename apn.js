/**
 * @file ios设备APN处理<br>
 *  iOS证书使用, 需要使用 .cer 和 .p12 文件进行转换。<br>
 *    https://github.com/argon/node-apn/wiki/Preparing-Certificates<br>
 *<br>
 *    $ openssl x509 -in cert.cer -inform DER -outform PEM -out cert.pem<br>
 *    $ openssl pkcs12 -in key.p12 -out key.pem -nodes<br>
 *<br>
 *    cert.cer是通过Apple开发者账户生成的文件，会有开发版和产品版两个文件<br>
 *     - aps_development.cer<br>
 *     - aps_production.cer<br>
 *<br>
 *    key.p12文件是从Keychain Access工具导出的。在 我的证书 里找到 IOS Push Services<br>
 *    导出子项中得钥匙标志的项目，默认即为.p12文件<br>
 * @module light.bridge.apple.apn
 * @author fzcs@live.cn
 * @version 1.0.0
 */

var light = require("light-framework")
  , apn   = require("apn")
  , conf  = light.util.config
  , log   = light.framework.log;

/**
 * @desc iOS平台发送推送通知
 * @param tokens 发送用的token
 * @param {Object} option 推送的相关参数
 * @param {String} option.text 通知消息
 * @param {Number} [option.expiry=1h] 过期时间
 * @param {Number} [option.badge=1] 提示角标
 * @param {Object} option.payload 通知提示音
 */
exports.push = function (tokens, option) {

  // 没有token， 什么也不做立即返回
  if (!tokens || tokens.length <= 0 || !option.text) {
    return;
  }

  var note = new apn.notification();
  note.setAlertText(option.text);
  note.expiry = option.expiry || Math.floor(Date.now() / 1000) + 3600;
  note.badge = option.badge || 1;
  note.sound = option.sound || "ping.aiff";

  if (option.payload) {
    note.payload = {"messageFrom": option.payload};
  }

  // 发送通知
  connection().pushNotification(note, tokens);
}

/**
 * @desc 建立连接
 * @returns {exports.connection} 建立的连接
 */
function connection() {

  var options = {}
    , path    = process.cwd();

  if (conf.push && conf.push.apn) {
    if (conf.push.apn.isDevelopment) {
      options.gateway = "gateway.sandbox.push.apple.com";
      options.cert = path + conf.push.apn.certDevelopment;
      options.key = path + conf.push.apn.key;
    } else {
      options.gateway = "gateway.push.apple.com";
      options.cert = path + conf.push.apn.certProduction;
      options.key = path + conf.push.apn.key;
    }
  }

  var service = new apn.connection(options);
  service.on("connected", function () {
    log.debug("Connected.");
  });

  service.on("transmitted", function (notification, device) {
    log.debug("Transmitted to: " + device.token.toString("hex"));
  });

  service.on("transmissionError", function (errCode, notification, device) {
    log.error("Notification caused error: " + errCode + " for device ", device);
  });

  service.on("timeout", function () {
    log.error("Connection Timeout");
  });

  service.on("disconnected", function () {
    log.error("Disconnected from APNS");
  });

  service.on("socketError", function (err) {
    log.error(err);
  });

  return service;
}
