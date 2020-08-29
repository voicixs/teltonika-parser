import crc from 'crc';
import { database } from './database'

const saveGPS = function (imei, timestamp, latitude, longitude, altitude, angle, sattelites, speed, deviceIp) {
  console.log("saveGPS", { timestamp, latitude, longitude, altitude, angle, sattelites, speed })
  if (imei) {
    const place = JSON.parse(JSON.stringify(
      {
        timestamp: timestamp || null,
        latitude: latitude || null,
        longitude: longitude || null,
        altitude: altitude || null,
        angle: angle || null,
        sattelites: sattelites || null,
        speed: speed || null,
      }
    ))

    database.ref('devices/' + imei + '/places')
      .push()
      .set(place);
      
  }
};

const isValidIMEI = function (IMEI, socket) {
  let imei_answer = new Buffer(1);
  //if == 359633107284213
  socket.imei = IMEI;
  imei_answer[0] = 1;
  socket.write(imei_answer);
  //else
  // imei_answer[0] = 0;
  // socket.end(imei_answer);
};

const lietenAndParseTeltonika = (socket) => {
  //https://github.com/sirfragles/Teltonika_GPS_Server_Node.js
  console.log('New connection.' + socket.remoteAddress);

  var deviceIp = socket.remoteAddress;
  if (deviceIp.substr(0, 7) == "::ffff:") {
    deviceIp = deviceIp.substr(7)
  }

  socket.imei = undefined;

  var socketOnData = function (data) {
    var processIO = function (n_bytes) {

      var io_id;
      var io_value;
      var n_byte_io = parseInt(data.slice(0, 1).toString('hex'), 16);

      // for (var i = 0; i < n_byte_io; i++) {
      //   io_id = parseInt(data.slice(1 + (i * (n_bytes + 1)), 2 + (i * (n_bytes + 1))).toString('hex'), 16);
      //   io_value = parseInt(data.slice(2 + (i * (n_bytes + 1)), (2 + n_bytes) + (i * (n_bytes + 1))).toString('hex'), 16);
      //   saveIO(n_bytes, timestamp, io_id, io_value);
      // }
      data = data.slice(1 + (n_byte_io * (1 + n_bytes)));
    };

    if (socket.imei === undefined) {
      if (data[0] === 0 && data[1] == 15) {
        if (data.length == 17)
          isValidIMEI(data.toString().substr(2, 15), socket);
        else
          socket.end();
      } else
        socket.end();

    } else {
      socket.avl_data_array_length = 0;
      if (socket.avl_data_array_length === 0) {
        if (data.length > 8) {
          if (data[0] === 0 && data[1] === 0 && data[2] === 0 && data[3] === 0) {
            var buf = new Buffer(4);
            buf = data.slice(4, 8);
            socket.avl_data_array_length = buf.readUInt32BE(0);
            if (data.length == socket.avl_data_array_length + 12) {
              var avl_packet_crc = new Buffer(4);
              avl_packet_crc = data.slice(-4);
              var calc_crc = crc.crc16(data.slice(8, -4));
              var acknowledges = new Buffer(4);
              if (avl_packet_crc.readUInt32BE(0) == calc_crc) {
                data = data.slice(8, -4);
                if (data[0] == 8) {
                  var number_of_data = data[1];
                  data = data.slice(2);
                  for (var data_no = 0; data_no < number_of_data; data_no++) {
                    var timestamp = parseInt(data.slice(0, 8).toString('hex'), 16) / 1000;
                    var longitude = parseInt(data.slice(9, 13).toString('hex'), 16) / 10000000;
                    var latitude = parseInt(data.slice(13, 17).toString('hex'), 16) / 10000000;
                    var altitude = parseInt(data.slice(17, 19).toString('hex'), 16);
                    var angle = parseInt(data.slice(19, 21).toString('hex'), 16);
                    var sattelites = parseInt(data.slice(21, 22).toString('hex'), 16);
                    var speed = parseInt(data.slice(22, 24).toString('hex'), 16);
                    saveGPS(socket.imei, timestamp, latitude, longitude, altitude, angle, sattelites, speed, deviceIp);

                    data = data.slice(24);

                    var event_io_id = data.slice(0, 1).toString('hex');
                    var n_of_total_io = data.slice(1, 2).toString('hex');

                    data = data.slice(2);
                    processIO(1);
                    processIO(2);
                    processIO(4);
                    processIO(8);
                  }

                  if (number_of_data == data.readUInt8(0)) {
                    var nod = new Buffer(4);
                    nod[0] = 0;
                    nod[1] = 0;
                    nod[2] = 0;
                    nod[3] = number_of_data;
                    socket.write(nod);
                  }
                } else {
                  socket.end();
                }


              } else {
                acknowledges[0] = 0;
                acknowledges[1] = 0;
                acknowledges[2] = 0;
                acknowledges[3] = 0;
                socket.end(acknowledges);
              }
            } else
              socket.end();
          }
          //console.timeEnd("Dane AVL");
        } else
          socket.end();
      }
    }
  };

  const socketOnClose = (error) => {
    console.log("Connection closed" + ":" + socket.imei + " - " + error);
  };

  const socketOnError = (error) => {
    console.log("Error socket IMEI" + ":" + socket.imei + " - " + error);
  };

  socket.on('data', socketOnData);
  socket.on('error', socketOnError);
  socket.on('close', socketOnClose);
}

export default lietenAndParseTeltonika;
