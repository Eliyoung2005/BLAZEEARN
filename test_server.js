const express = require('express');
const app = express();
const router = express.Router();

let routes = [];
app._router = { stack: [] }; // Mock

// Just run the server script directly to see if it loads successfully
require('./server.js');
