const app = require("./service.js");
const logger = require("./logger.js");
const metrics = require("./metrics.js");

process.on("uncaughtException", (err) => {
  logger.log("error", "uncaught_exception", {
    message: err.message,
    stack: err.stack,
  });
});

process.on("unhandledRejection", (reason) => {
  logger.log("error", "unhandled_promise_rejection", {
    reason,
    stack: reason.stack,
  });
});

if (process.env.NODE_ENV !== "test") {
  app.use(metrics.track);
}

const port = process.argv[2] || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
