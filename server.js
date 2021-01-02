let app = require("express")();
let mysql = require("mysql");
let http = require('http').Server(app);
let io = require("socket.io")(http);

let MySQLEvents = require('mysql-events');

/* Creating POOL MySQL connection.*/

let pool = mysql.createPool({
    connectionLimit: 100,
    host: host,
    user: user,
    password: password,
    database: database,
    debug: false
});


// Establish connection to DB
let db = mysql.createConnection({
    host: host,
    user: user,
    password: password,
    database: database
});

db.connect(function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log('success');
    }
});

// Establish connection to DB to watch for changes
let mysqlEventWatcher = MySQLEvents({
    host: host,
    user: user,
    password: password
});


/*  This is auto initiated event when Client connects to Your Machien.  */

io.on('connection', function (socket) {
    var hs = socket.handshake;
    // console.log(hs);
    // console.log('A socket with sessionID ' + hs + ' connected!');
    console.info(`Client connected [id=${socket.id}]`);
    io.emit('refresh feed', "status");
    socket.on('status added', function (status) {
        add_status(status, function (res) {
            if (res) {
                io.emit('refresh feed', status);
            } else {
                io.emit('error');
            }
        });
    });

    socket.on("pageReady", function (data) {
        console.log('pageReady called');
        return socket.emit('newline', '###SOCKET STARTED###');
    });

    socket.on('connect_error', function (err) {
        console.log("client connect_error: ", err);
    });

    socket.on('connect_timeout', function (err) {
        console.log("client connect_timeout: ", err);
    });

     let watcher_tracking = mysqlEventWatcher.add(
        database + '.fbstatus',
        function (oldRow, newRow, event) {
            // new rows created
            //row inserted
            if (oldRow === null) {
                //insert code goes here
            }

            //row deleted
            if (newRow === null) {
                //delete code goes here
            }

            //row updated
            if (oldRow !== null && newRow !== null) {
                //update code goes here
                console.log("row updated");
                io.emit('flight_tracking', oldRow)
            }

        }
    );
});

var add_status = function (status, callback) {
    console.log("add_status");
    console.log(status);
    pool.getConnection(function (err, connection) {
        if (err) {
            callback(false);
            return;
        }
        connection.query("INSERT INTO `fbstatus` (`s_text`) VALUES ('" + status + "');", function (err, rows) {
            connection.release();
            if (!err) {
                callback(true);
            }
        });
        connection.on('error', function (err) {
            callback(false);
            return;
        });
    });
}

http.listen(3000, function () {
    console.log("Listening on 3000");
});
