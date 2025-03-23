const config = require("./config");
const os = require("os");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function calculateRevenue(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

let requests = {};
let authAttemptsSuccess = 0;
let authAttemptsFail = 0;
let activeUsers = 0;
let pizzaSold = 0;
let avgRevenue = 0.0;
let failedCreation = 0;
let history = {};
let latency = 0;
let pizzaLatency = 0;

function track(endpoint) {
  return (req, res, next) => {
    const start = Date.now();
    const method = req.method.toUpperCase();
    const key = `${method} ${endpoint}`;

    requests[key] = (requests[key] || 0) + 1;
    res.on("finish", () => {
      latency = Date.now() - start;
      console.log(`Latency for ${method}: ${latency}ms`);
    });
    next();
  };
}

function trackAuth() {
  return (req, res, next) => {
    if (res.statusCode === 200) {
      console.log("User logged in");
      console.log("Successful login attempt");
      authAttemptsSuccess++;
      activeUsers++;
    } else {
      console.log("Failed login attempt");
      authAttemptsFail++;
    }
    next();
  };
}

function trackLogout() {
  return (req, res, next) => {
    if (req.user) {
      console.log("User logged out");
      activeUsers--;
    }
    next();
  };
}

function trackPizzas() {
  return (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      pizzaLatency = Date.now() - start;

      if (res.statusCode === 200) {
        console.log("Pizza sold");
        pizzaSold += req.body.items.length;
        console.log("Revenue generated");
        avgRevenue += calculateRevenue(req.body.items);
      } else {
        failedCreation++;
        console.log("Failed to create pizza");
      }
    });

    next();
  };
}

function trackLatency() {
  return (req, res, next) => {
    next();
  };
}
// This will periodically send metrics to Grafana
setInterval(() => {
  console.log("Interval for HTTP requests is running");
  const timestamp = Date.now();

  Object.keys(requests).forEach((key) => {
    console.log(`Requests for ${key}: ${requests[key]}`);
    // Save current requests count
    if (!history[key]) history[key] = [];
    history[key].push({ time: timestamp, count: requests[key] });

    // Keep only last 6 entries (each representing 10 sec → 60 sec window)
    history[key] = history[key].slice(-6);

    // Calculate rolling total (sum of last 60 sec)
    const rollingTotal = history[key].reduce(
      (sum, entry) => sum + entry.count,
      0
    );

    console.log(`Rolling total for ${key}: ${rollingTotal}`);

    // Send metric with rolling total
    sendMetricToGrafana(
      "http_requests_per_min",
      rollingTotal,
      {
        endpoint: key,
      },
      "count"
    );
  });

  // Reset current interval count
  Object.keys(requests).forEach((key) => {
    requests[key] = 0;
  });
}, 10000);

setInterval(() => {
  const cpuUsage = getCpuUsagePercentage();
  const memoryUsage = getMemoryUsagePercentage();

  console.log("CPU Usage:", cpuUsage);
  console.log("Memory Usage:", memoryUsage);

  sendMetricToGrafana("cpu_usage", cpuUsage, {}, "%");
  sendMetricToGrafana("memory_usage", memoryUsage, {}, "%");
  sendMetricToGrafana("endpoint_latency", latency, {}, "ms");
  sendMetricToGrafana("pizza_creation_latency", pizzaLatency, {}, "ms");
}, 5000);

setInterval(() => {
  sendMetricToGrafana(
    "auth_successful_attempts",
    authAttemptsSuccess,
    {},
    "count"
  );
  sendMetricToGrafana("auth_failed_attempts", authAttemptsFail, {}, "count");
  sendMetricToGrafana("active_users", activeUsers, {}, "count");

  // Reset counter
  authAttemptsSuccess = 0;
  authAttemptsFail = 0;
  activeUsers = 0;
}, 10000);

setInterval(() => {
  sendMetricToGrafana("pizza_sold", pizzaSold, {}, "count");
  sendMetricToGrafana("avg_revenue", avgRevenue, {}, "BTC");
  sendMetricToGrafana("failed_pizza_creation", failedCreation, {}, "count");

  pizzaSold = 0;
  avgRevenue = 0;
  failedCreation = 0;
}, 60000);

function sendMetricToGrafana(metricName, metricValue, attributes, unit = "1") {
  attributes = { ...attributes, source: config.grafana.source };

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                sum: {
                  dataPoints: [
                    {
                      asDouble: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                  aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  Object.keys(attributes).forEach((key) => {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push(
      {
        key: key,
        value: { stringValue: attributes[key] },
      }
    );
  });

  console.log(`Pushing ${metricName} to Grafana url: ${config.grafana.url}`);

  fetch(`${config.grafana.url}`, {
    method: "POST",
    body: JSON.stringify(metric),
    headers: {
      Authorization: `Bearer ${config.grafana.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to push metrics data to Grafana");
        console.error(response);
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

module.exports = { track, trackAuth, trackLogout, trackPizzas };
