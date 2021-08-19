var express = require("express");
const path = require("path");
var app = express();
var port = process.env.PORT || 24689;

let timestamp = 0;
let int_handler = null;

// With middleware
app.use("/", function (req, res, next) {
   next();
});

app.get("/", function (req, res) {
   res.send("FYP Timestamp Server");
});

app.listen(port, function (err) {
   if (err) console.log(err);
   console.log("Server listening on port", port);
});

app.get("/get/", function (req, res) {
   res.set("Access-Control-Allow-Origin", "*");
   res.send("" + timestamp);
});

app.get("/set/:time", function (req, res) {
   res.set("Access-Control-Allow-Origin", "*");
   res.end();
   timestamp = parseInt(req.params.time);
   clearInterval(int_handler);
   int_handler = setInterval(() => {
      timestamp++;
   }, 5000);
});
