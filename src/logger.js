const config = require("./config.js");

class Logger {
  httpLogger = (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: JSON.stringify(req.body),
        responseTimeMs: Date.now() - startTime, // Capture response time
      };

      // Attach response body only for non-GET requests
      if (req.method !== "GET") {
        logData.resBody = JSON.stringify(res.locals.response || "");
      }

      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, "http", logData);
    });
    next();
  };

  log(level, type, logData) {
    //console.log("Logging to Grafana:", level, type, logData);
    const labels = {
      component: config.logging.source,
      level: level,
      type: type,
    };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    logData = JSON.stringify(logData);
    return logData.replace(
      /\\"password\\":\s*\\"[^"]*\\"/g,
      '\\"password\\": \\"*****\\"'
    );
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: "post",
      body: body,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
      },
    }).then((res) => {
      if (!res.ok) console.log("Failed to send log to Grafana");
    });
  }
}
module.exports = new Logger();
