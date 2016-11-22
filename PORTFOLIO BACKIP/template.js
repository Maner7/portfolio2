var express     = require('express');
var os          = require('os');
var fs          = require('fs');
var request     = require('request');
var bodyParser  = require('body-parser');
var mysql       = require('mysql');

var api = function() {
    var self = this;

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = '127.0.0.1';
        self.port      = 8045;
        self.dir       =  __dirname;
    };

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating server ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };
        self.posts  = { };

        //Default endpoint. TODO: Change to api description
        self.routes['/'] = function (req, res) {
            res.sendFile(self.dir + '/HTMLPage1.html');
            //res.setHeader('Content-Type', 'text/html');
            //res.end("API endpoints: /{description}");
        };
        
        //GET
        self.routes['/health'] = self.healthStatus;
        self.routes['/mysql'] = self.sqlTest;
        self.routes['/mysql/:id'] = self.sqlTest;
        self.routes['/users/id/:id'] = self.getUserById;
        self.routes['/test/:variable'] = self.printVar;

        //POST
        //self.posts['/upload/:path*']        = self.uploadFile;
    };

    /*
*     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
        
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }

        for (var p in self.posts) {
            self.app.post(p, self.posts[p]);
        }

        self.app.use(self.invalidPage);
    };

    /**
     *  Initializes the application.
     */
    self.initialize = function() {
        //Setup required variables (ip, port, terminators etc.)
        self.setupVariables();
        self.setupTerminationHandlers();
        // Create the express server and routes.
        self.initializeServer();
    };

    /**
     *  Start the server
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

    //----------------------------------------------------------------------------------------------

    self.healthStatus = function(req, res){
        res.writeHead(200);
        res.end("Server is alive and well");
    };

    self.printVar = function (req, res) {
        var v = req.params.variable;
        console.log(v);
        res.end(v);
    };

    self.sqlTest = function (req, res) {
        var id = req.params.id;

        var connection = mysql.createConnection({
            host: 'wt-220.ruc.dk',
            user: 'andjens',
            password: 'EfO5aVOS',
            database : 'andjens'
        });

        connection.connect(function (err) {
            if (err) {
                console.error('error connecting: ' + err.stack);
                res.end(err.stack);
                return;
            }
        });

        connection.query('SELECT * FROM users', function (err, rows, fields) {
            console.log('QUERY');
            console.log(rows);
            //TODO: Better error handling
            if (err) throw err;

            res.end(JSON.stringify(rows, null, 3));
            connection.end()
        })
    };

    self.getUserById = function (req, res) {
        var id = req.params.id;
        var query = 'SELECT * FROM users WHERE userid = ' + id;

        self.makeQuery(query, function (rows) {
            res.end(JSON.stringify(rows, null, 3))
        });
    }

    self.makeQuery = function (query, callback) {
        var connection = mysql.createConnection({
            host: 'wt-220.ruc.dk',
            user: 'andjens',
            password: 'EfO5aVOS',
            database: 'andjens'
        });

        connection.connect(function (err) {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return;
            }
        });

        connection.query(query, function (err, rows, fields) {
            //TODO: Better error handling
            if (err) {
                throw err;
            }
            connection.end()
            callback(rows);
        })
    }

    //----------------------------------------------------------------------------------------------

    self.invalidPage = function(req, res, next){
        res.status(404);

        // respond with html page
        if (req.accepts('html')) {
            res.end('404 Invalid Endpoint');
            return;
        }

        // respond with json
        if (req.accepts('json')) {
            res.send({ error: 'Not found' });
            return;
        }

        // default to plain-text. send()
        res.type('txt').send('Not found');
    }
}

var node = new api();
node.initialize();
node.start();